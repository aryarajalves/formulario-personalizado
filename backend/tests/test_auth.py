from tests.conftest import client, TestingSessionLocal
from app.core.config import settings
from app.core.rate_limiter import reset_rate_limits
from app.core.security import get_password_hash, verify_password
from app.models.user import RegistrationVerification

def test_health_and_root():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "Projeto Base" in res_root.json()["message"]

def test_login_superadmin_success():
    login_payload = {
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    }
    res = client.post("/api/v1/auth/login", json=login_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "superadmin"

def test_login_wrong_password():
    login_payload = {
        "email": settings.SUPERADMIN_EMAIL,
        "password": "WrongPassword123!"
    }
    res = client.post("/api/v1/auth/login", json=login_payload)
    assert res.status_code == 401

def test_create_invite_and_register_user():
    # Login superadmin to get token
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Tentar criar convite para superadmin (deve falhar)
    invalid_invite = client.post("/api/v1/auth/invites", json={"role": "superadmin", "duration_hours": 12}, headers=headers)
    assert invalid_invite.status_code == 422 or invalid_invite.status_code == 400

    # 2. Criar convite válido para admin
    invite_res = client.post("/api/v1/auth/invites", json={"role": "admin", "duration_hours": 24}, headers=headers)
    assert invite_res.status_code == 201
    invite_data = invite_res.json()
    invite_token = invite_data["token"]
    assert invite_token is not None

    # 3. Validar convite
    val_res = client.get(f"/api/v1/auth/invites/validate?token={invite_token}")
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True
    assert val_res.json()["role"] == "admin"

    # 4. Registrar usuário com senha fraca (deve falhar por validação de senha)
    weak_register = client.post("/api/v1/auth/register", json={
        "token": invite_token,
        "name": "Novo Admin",
        "email": "admin@teste.com",
        "password": "fraca"
    })
    assert weak_register.status_code == 422

    # 4.1 Registrar com senhas divergentes (deve falhar com 400)
    mismatch_reg = client.post("/api/v1/auth/register", json={
        "token": invite_token,
        "name": "Novo Admin",
        "email": "admin@teste.com",
        "password": "Password123456!",
        "password_confirm": "OutraSenha123456!"
    })
    assert mismatch_reg.status_code == 400
    assert "não coincidem" in mismatch_reg.json()["detail"]

    # 5. Iniciar registro de usuário com senha válida e confirmação coincidente (dispara OTP)
    valid_register = client.post("/api/v1/auth/register", json={
        "token": invite_token,
        "name": "Novo Admin",
        "email": "admin@teste.com",
        "password": "Password123456!",
        "password_confirm": "Password123456!"
    })
    assert valid_register.status_code == 200
    assert valid_register.json()["requires_verification"] is True

    # 5.1 Obter código OTP gerado no banco e validar código incorreto
    db = TestingSessionLocal()
    verif = db.query(RegistrationVerification).filter(RegistrationVerification.email == "admin@teste.com").first()
    assert verif is not None
    otp_code = verif.code
    db.close()

    wrong_code_res = client.post("/api/v1/auth/register/verify", json={
        "email": "admin@teste.com",
        "code": "000000"
    })
    assert wrong_code_res.status_code == 400
    assert "inválido" in wrong_code_res.json()["detail"]

    # 5.2 Validar código correto e concluir criação da conta
    verify_res = client.post("/api/v1/auth/register/verify", json={
        "email": "admin@teste.com",
        "code": otp_code
    })
    assert verify_res.status_code == 201
    new_user = verify_res.json()
    assert new_user["email"] == "admin@teste.com"
    assert new_user["role"] == "admin"

    # 6. Tentar usar o mesmo convite novamente (deve falhar pois já foi usado)
    reset_rate_limits()
    reuse_invite = client.post("/api/v1/auth/register", json={
        "token": invite_token,
        "name": "Outro Admin",
        "email": "outro@teste.com",
        "password": "Password123456!"
    })
    assert reuse_invite.status_code == 400

    # 7. Listar convites gerados
    list_inv = client.get("/api/v1/auth/invites", headers=headers)
    assert list_inv.status_code == 200
    inv_list_data = list_inv.json()
    assert len(inv_list_data) >= 1
    found_invite = next(i for i in inv_list_data if i["token"] == invite_token)
    assert found_invite["is_used"] is True
    assert found_invite["used_by_email"] == "admin@teste.com"
    assert "restantes" in found_invite["time_remaining"] or "Expirado" in found_invite["time_remaining"]

def test_duplicate_email_registration_forbidden():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    invite_res = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 24}, headers=headers)
    invite_token = invite_res.json()["token"]

    dup_res = client.post("/api/v1/auth/register", json={
        "token": invite_token,
        "name": "Tentativa Clone",
        "email": settings.SUPERADMIN_EMAIL,
        "password": "SecurePassword123!"
    })
    assert dup_res.status_code == 400
    assert "Já existe um usuário" in dup_res.json()["detail"]

def test_edit_user_role_and_superadmin_protection():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    edit_superadmin = client.patch("/api/v1/auth/users/1", json={"role": "user"}, headers=headers)
    assert edit_superadmin.status_code == 403

    inv_res = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 10}, headers=headers)
    inv_tok = inv_res.json()["token"]
    reg_res = client.post("/api/v1/auth/register", json={
        "token": inv_tok,
        "name": "Membro Equipe",
        "email": "membro@equipe.com",
        "password": "MinhaSenhaForte1@",
        "password_confirm": "MinhaSenhaForte1@"
    })
    assert reg_res.status_code == 200

    db = TestingSessionLocal()
    verif = db.query(RegistrationVerification).filter(RegistrationVerification.email == "membro@equipe.com").first()
    otp_code = verif.code
    db.close()

    verify_res = client.post("/api/v1/auth/register/verify", json={
        "email": "membro@equipe.com",
        "code": otp_code
    })
    assert verify_res.status_code == 201
    user_id = verify_res.json()["id"]

    edit_res = client.patch(f"/api/v1/auth/users/{user_id}", json={"role": "admin"}, headers=headers)
    assert edit_res.status_code == 200
    assert edit_res.json()["role"] == "admin"

    edit_back = client.patch(f"/api/v1/auth/users/{user_id}", json={"role": "user"}, headers=headers)
    assert edit_back.status_code == 200
    assert edit_back.json()["role"] == "user"

def test_password_reset_flow():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    reset_sa = client.post("/api/v1/auth/users/1/reset-password-request", headers=headers)
    assert reset_sa.status_code == 403

    inv_res = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 10}, headers=headers)
    inv_tok = inv_res.json()["token"]
    reg_res = client.post("/api/v1/auth/register", json={
        "token": inv_tok,
        "name": "Usuario Teste",
        "email": "userteste@equipe.com",
        "password": "SenhaAntiga12345!",
        "password_confirm": "SenhaAntiga12345!"
    })
    assert reg_res.status_code == 200

    db = TestingSessionLocal()
    verif = db.query(RegistrationVerification).filter(RegistrationVerification.email == "userteste@equipe.com").first()
    otp_code = verif.code
    db.close()

    verify_res = client.post("/api/v1/auth/register/verify", json={
        "email": "userteste@equipe.com",
        "code": otp_code
    })
    assert verify_res.status_code == 201
    user_id = verify_res.json()["id"]

    reset_req = client.post(f"/api/v1/auth/users/{user_id}/reset-password-request", headers=headers)
    assert reset_req.status_code == 200
    reset_data = reset_req.json()
    reset_token = reset_data["token"]
    assert reset_data["reset_url"].startswith("/reset-password?token=")

    val_res = client.get(f"/api/v1/auth/reset-password/validate?token={reset_token}")
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True
    assert val_res.json()["email"] == "userteste@equipe.com"

    mismatch_res = client.post("/api/v1/auth/reset-password/confirm", json={
        "token": reset_token,
        "password": "NovaSenhaSegura123@",
        "password_confirm": "SenhaTotalmenteDiferente1@"
    })
    assert mismatch_res.status_code == 400
    assert "não coincidem" in mismatch_res.json()["detail"]

    confirm_res = client.post("/api/v1/auth/reset-password/confirm", json={
        "token": reset_token,
        "password": "NovaSenhaSegura123@",
        "password_confirm": "NovaSenhaSegura123@"
    })
    assert confirm_res.status_code == 200

    login_new = client.post("/api/v1/auth/login", json={
        "email": "userteste@equipe.com",
        "password": "NovaSenhaSegura123@"
    })
    assert login_new.status_code == 200

def test_argon2id_hash_and_pepper():
    plain = "MinhaSenhaSuperSecreta123!"
    hashed = get_password_hash(plain)
    assert hashed.startswith("$argon2id$")
    assert verify_password(plain, hashed) is True
    assert verify_password("SenhaErrada123!", hashed) is False

def test_user_and_invite_deletion_and_bulk_delete():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    inv1 = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 10}, headers=headers).json()
    inv2 = client.post("/api/v1/auth/invites", json={"role": "admin", "duration_hours": 10}, headers=headers).json()

    del_inv = client.delete(f"/api/v1/auth/invites/{inv1['id']}", headers=headers)
    assert del_inv.status_code == 200

    bulk_inv = client.post("/api/v1/auth/invites/bulk-delete", json={"ids": [inv2["id"]]}, headers=headers)
    assert bulk_inv.status_code == 200
    assert bulk_inv.json()["deleted_count"] == 1

    inv3 = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 10}, headers=headers).json()
    reg = client.post("/api/v1/auth/register", json={
        "token": inv3["token"],
        "name": "Deletar Usuario",
        "email": "deletar@teste.com",
        "password": "SenhaForte123!@",
        "password_confirm": "SenhaForte123!@"
    })
    assert reg.status_code == 200
    db = TestingSessionLocal()
    code = db.query(RegistrationVerification).filter(RegistrationVerification.email == "deletar@teste.com").first().code
    db.close()
    verif = client.post("/api/v1/auth/register/verify", json={"email": "deletar@teste.com", "code": code})
    user_id = verif.json()["id"]

    del_sa = client.delete("/api/v1/auth/users/1", headers=headers)
    assert del_sa.status_code == 403

    del_u = client.delete(f"/api/v1/auth/users/{user_id}", headers=headers)
    assert del_u.status_code == 200

    bulk_u = client.post("/api/v1/auth/users/bulk-delete", json={"ids": [1]}, headers=headers)
    assert bulk_u.status_code == 200
    assert bulk_u.json()["deleted_count"] == 0

def test_non_superadmin_forbidden_from_management_endpoints():
    sa_login = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    inv = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 2}, headers=sa_headers).json()
    client.post("/api/v1/auth/register", json={
        "token": inv["token"],
        "name": "Comum Acesso",
        "email": "comum.acesso@teste.com",
        "password": "SenhaForte123!@",
        "password_confirm": "SenhaForte123!@"
    })
    db = TestingSessionLocal()
    code = db.query(RegistrationVerification).filter(RegistrationVerification.email == "comum.acesso@teste.com").first().code
    db.close()
    client.post("/api/v1/auth/register/verify", json={"email": "comum.acesso@teste.com", "code": code})

    user_login = client.post("/api/v1/auth/login", json={
        "email": "comum.acesso@teste.com",
        "password": "SenhaForte123!@"
    })
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    users_res = client.get("/api/v1/auth/users", headers=user_headers)
    assert users_res.status_code == 403

    inv_list_res = client.get("/api/v1/auth/invites", headers=user_headers)
    assert inv_list_res.status_code == 403

    inv_create_res = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 1}, headers=user_headers)
    assert inv_create_res.status_code == 403
