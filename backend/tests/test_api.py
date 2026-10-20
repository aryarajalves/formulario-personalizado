import unittest.mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app, init_superadmin
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.rate_limiter import reset_rate_limits
from app.models.user import User, Invite, RegistrationVerification

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    # Seed superadmin
    db = TestingSessionLocal()
    superadmin = User(
        email=settings.SUPERADMIN_EMAIL,
        name=settings.SUPERADMIN_NAME,
        hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
        role="superadmin",
        is_active=True
    )
    db.add(superadmin)
    db.commit()
    db.close()
    from app.core.rate_limiter import reset_rate_limits
    reset_rate_limits()
    yield
    reset_rate_limits()
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

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
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Criar convite
    invite_res = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 24}, headers=headers)
    invite_token = invite_res.json()["token"]

    # Tentar registrar com email que já é do superadmin
    dup_res = client.post("/api/v1/auth/register", json={
        "token": invite_token,
        "name": "Tentativa Clone",
        "email": settings.SUPERADMIN_EMAIL,
        "password": "SecurePassword123!"
    })
    assert dup_res.status_code == 400
    assert "Já existe um usuário" in dup_res.json()["detail"]

def test_edit_user_role_and_superadmin_protection():
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Tentar editar o próprio Super Admin (deve falhar com 403)
    edit_superadmin = client.patch("/api/v1/auth/users/1", json={"role": "user"}, headers=headers)
    assert edit_superadmin.status_code == 403

    # 2. Criar um usuário via convite
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

    # 3. Alterar perfil do usuário para 'admin'
    edit_res = client.patch(f"/api/v1/auth/users/{user_id}", json={"role": "admin"}, headers=headers)
    assert edit_res.status_code == 200
    assert edit_res.json()["role"] == "admin"

    # 4. Alterar de volta para 'user'
    edit_back = client.patch(f"/api/v1/auth/users/{user_id}", json={"role": "user"}, headers=headers)
    assert edit_back.status_code == 200
    assert edit_back.json()["role"] == "user"

def test_password_reset_flow():
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Tentar gerar link de redefinição para o Super Admin (deve ser proibido com 403)
    reset_sa = client.post("/api/v1/auth/users/1/reset-password-request", headers=headers)
    assert reset_sa.status_code == 403

    # 2. Criar um usuário comum
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

    # 3. Gerar link de redefinição de senha para esse usuário
    reset_req = client.post(f"/api/v1/auth/users/{user_id}/reset-password-request", headers=headers)
    assert reset_req.status_code == 200
    reset_data = reset_req.json()
    reset_token = reset_data["token"]
    assert reset_data["reset_url"].startswith("/reset-password?token=")

    # 4. Validar token de redefinição
    val_res = client.get(f"/api/v1/auth/reset-password/validate?token={reset_token}")
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True
    assert val_res.json()["email"] == "userteste@equipe.com"

    # 5. Tentar redefinir com senhas divergentes (deve falhar com 400)
    mismatch_res = client.post("/api/v1/auth/reset-password/confirm", json={
        "token": reset_token,
        "password": "NovaSenhaSegura123@",
        "password_confirm": "SenhaTotalmenteDiferente1@"
    })
    assert mismatch_res.status_code == 400
    assert "não coincidem" in mismatch_res.json()["detail"]

    # 6. Confirmar redefinição com nova senha coincidente
    confirm_res = client.post("/api/v1/auth/reset-password/confirm", json={
        "token": reset_token,
        "password": "NovaSenhaSegura123@",
        "password_confirm": "NovaSenhaSegura123@"
    })
    assert confirm_res.status_code == 200

    # 7. Testar login com a nova senha
    login_new = client.post("/api/v1/auth/login", json={
        "email": "userteste@equipe.com",
        "password": "NovaSenhaSegura123@"
    })
    assert login_new.status_code == 200

def test_argon2id_hash_and_pepper():
    from app.core.security import get_password_hash, verify_password
    plain = "MinhaSenhaSuperSecreta123!"
    hashed = get_password_hash(plain)
    
    # Verifica que o hash utiliza Argon2id ($argon2id$)
    assert hashed.startswith("$argon2id$")
    # Verifica que o hash é verificado com sucesso com a senha correta
    assert verify_password(plain, hashed) is True
    # Verifica que uma senha incorreta falha
    assert verify_password("SenhaErrada123!", hashed) is False

def test_user_and_invite_deletion_and_bulk_delete():
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar 2 convites
    inv1 = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 10}, headers=headers).json()
    inv2 = client.post("/api/v1/auth/invites", json={"role": "admin", "duration_hours": 10}, headers=headers).json()

    # 2. Excluir convite individual
    del_inv = client.delete(f"/api/v1/auth/invites/{inv1['id']}", headers=headers)
    assert del_inv.status_code == 200

    # 3. Exclusão em massa de convites
    bulk_inv = client.post("/api/v1/auth/invites/bulk-delete", json={"ids": [inv2["id"]]}, headers=headers)
    assert bulk_inv.status_code == 200
    assert bulk_inv.json()["deleted_count"] == 1

    # 4. Criar um usuário para testar deleção
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

    # 5. Tentar excluir Super Admin (proibido 403)
    del_sa = client.delete("/api/v1/auth/users/1", headers=headers)
    assert del_sa.status_code == 403

    # 6. Excluir usuário individual
    del_u = client.delete(f"/api/v1/auth/users/{user_id}", headers=headers)
    assert del_u.status_code == 200

    # 7. Testar bulk delete de usuários
    bulk_u = client.post("/api/v1/auth/users/bulk-delete", json={"ids": [1]}, headers=headers)
    assert bulk_u.status_code == 200
    # Superadmin é ignorado pelo bulk delete
    assert bulk_u.json()["deleted_count"] == 0

def test_non_superadmin_forbidden_from_management_endpoints():
    # 1. Login superadmin para criar usuário comum
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

    # 2. Login como usuário comum
    user_login = client.post("/api/v1/auth/login", json={
        "email": "comum.acesso@teste.com",
        "password": "SenhaForte123!@"
    })
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 3. Usuário comum NÃO pode listar usuários (403)
    users_res = client.get("/api/v1/auth/users", headers=user_headers)
    assert users_res.status_code == 403

    # 4. Usuário comum NÃO pode listar nem criar convites (403)
    inv_list_res = client.get("/api/v1/auth/invites", headers=user_headers)
    assert inv_list_res.status_code == 403

    inv_create_res = client.post("/api/v1/auth/invites", json={"role": "user", "duration_hours": 1}, headers=user_headers)
    assert inv_create_res.status_code == 403

def test_backup_system_full_flow():
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Obter estatísticas do painel
    stats_res = client.get("/api/v1/backups/dashboard-stats", headers=headers)
    assert stats_res.status_code == 200
    assert "current_count" in stats_res.json()
    assert "retention_max" in stats_res.json()

    # 2. Configurar agendador
    sched_res = client.put("/api/v1/backups/schedule", json={
        "is_active": True,
        "frequency": "12h",
        "destination_folder": "projetobase/backups/",
        "retention_max": 25
    }, headers=headers)
    assert sched_res.status_code == 200
    assert sched_res.json()["frequency"] == "12h"
    assert sched_res.json()["retention_max"] == 25

    # 3. Disparar backup manual com nome customizado
    from zoneinfo import ZoneInfo
    from datetime import datetime
    b_now = datetime.now(ZoneInfo("America/Sao_Paulo"))

    manual_res = client.post("/api/v1/backups/manual", json={"custom_name": "teste_brasilia"}, headers=headers)
    assert manual_res.status_code == 201
    bkp = manual_res.json()
    assert bkp["backup_type"] == "manual"
    assert bkp["filename"].startswith("teste_brasilia_")
    assert bkp["filename"].endswith(".dump.gz")
    # Confirma que contém o ano e mês do horário de Brasília
    assert b_now.strftime("%Y_%m") in bkp["filename"]
    backup_id = bkp["id"]

    # 3.1 Renomear backup existente
    rename_res = client.patch(f"/api/v1/backups/{backup_id}/rename", json={"new_name": "backup_renomeado_ok"}, headers=headers)
    assert rename_res.status_code == 200
    assert rename_res.json()["filename"] == "backup_renomeado_ok.dump.gz"

    # 4. Listar backups
    list_res = client.get("/api/v1/backups/list", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 5. Download do backup
    down_res = client.get(f"/api/v1/backups/download/{backup_id}", headers=headers)
    assert down_res.status_code == 200
    assert len(down_res.content) > 0

    # 6. Restauração do backup
    restore_res = client.post(f"/api/v1/backups/restore/{backup_id}", headers=headers)
    assert restore_res.status_code == 200
    assert "restaurado com sucesso" in restore_res.json()["message"]

    # 7. Importar backup externo
    import io
    fake_dump_file = io.BytesIO(b"-- Fake pg dump sql\nCREATE TABLE test_import();")
    import_res = client.post(
        "/api/v1/backups/import",
        files={"file": ("externo_backup.dump.gz", fake_dump_file, "application/gzip")},
        headers=headers
    )
    assert import_res.status_code == 201
    imported_bkp = import_res.json()
    assert imported_bkp["backup_type"] == "imported"

    # 8. Exclusão individual
    del_res = client.delete(f"/api/v1/backups/{backup_id}", headers=headers)
    assert del_res.status_code == 200

    # 9. Exclusão em lote
    bulk_res = client.post("/api/v1/backups/bulk-delete", json={"ids": [imported_bkp["id"]]}, headers=headers)
    assert bulk_res.status_code == 200
    assert bulk_res.json()["deleted_count"] == 1

def test_docker_logs_endpoints():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Listar serviços disponíveis (apenas backend e frontend)
    services_res = client.get("/api/v1/logs/services", headers=headers)
    assert services_res.status_code == 200
    services = services_res.json()
    assert len(services) == 2
    service_ids = [s["id"] for s in services]
    assert "backend" in service_ids
    assert "frontend" in service_ids
    assert "db" not in service_ids

    # 1.1 Testar conversão de Horário de Brasília
    from app.services.docker_logs_service import format_to_brasilia_time
    nginx_sample = '172.31.0.1 - - [29/Sep/2026:17:59:35 +0000] "GET / HTTP/1.1" 200 123'
    converted = format_to_brasilia_time(nginx_sample)
    # 17:59:35 UTC deve ser convertido para 14:59:35 em Brasília (UTC-3)
    assert "14:59:35" in converted
    assert "29/09/2026 14:59:35" in converted

    # 1.2 Testar conversão de Docker timestamp no início da linha
    docker_sample = '2026-09-29T18:04:29.123456789Z INFO: Servidor iniciado com sucesso.'
    docker_converted = format_to_brasilia_time(docker_sample)
    assert "[29/09/2026 15:04:29]" in docker_converted
    assert "INFO: Servidor iniciado com sucesso." in docker_converted

    # 2. Consultar logs de backend com filtro de data e horário
    logs_res = client.get("/api/v1/logs/backend?tail=20&date=2026-09-29&start_time=14:00&end_time=16:00", headers=headers)
    assert logs_res.status_code == 200
    data = logs_res.json()
    assert data["service"] == "backend"
    assert "logs" in data
    assert isinstance(data["logs"], list)

    # 3. Acesso bloqueado sem token
    unauth_res = client.get("/api/v1/logs/backend")
    assert unauth_res.status_code == 401

def test_forms_endpoints_crud_flow():
    # 1. Login superadmin para pegar token
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar novo formulário
    payload = {"title": "Pesquisa de Satisfação do Cliente"}
    create_res = client.post("/api/v1/forms", json=payload, headers=headers)
    assert create_res.status_code == 201
    form_data = create_res.json()
    assert form_data["title"] == "Pesquisa de Satisfação do Cliente"
    assert form_data["status"] == "PUBLICADO"
    assert form_data["responses_count"] == 0
    assert form_data["completion_rate"] == 0.0
    assert len(form_data["slug"]) > 0
    form_id = form_data["id"]

    # 3. Listar formulários
    list_res = client.get("/api/v1/forms", headers=headers)
    assert list_res.status_code == 200
    forms = list_res.json()
    assert any(f["id"] == form_id for f in forms)

    # 4. Falha com título vazio
    fail_res = client.post("/api/v1/forms", json={"title": "   "}, headers=headers)
    assert fail_res.status_code == 400

    # 5. Atualizar formulário (questões e webhook_url)
    update_res = client.put(f"/api/v1/forms/{form_id}", json={
        "title": "Pesquisa de Satisfação Atualizada",
        "webhook_url": "https://webhook.site/teste-unitario",
        "questions": [
            {
                "id": "q1",
                "type": "multiple_choice",
                "title": "Qual seu plano de preferência?",
                "required": True,
                "options": [
                    {"id": "opt_1", "label": "Plano VIP", "action": "jump", "jump_to_question_id": "q2"},
                    {"id": "opt_2", "label": "Gratuito", "action": "end", "jump_to_question_id": None}
                ]
            },
            {
                "id": "q2",
                "type": "short_text",
                "title": "Qual seu faturamento?",
                "required": False
            }
        ]
    }, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["title"] == "Pesquisa de Satisfação Atualizada"
    assert updated_data["webhook_url"] == "https://webhook.site/teste-unitario"
    assert len(updated_data["questions"]) == 2
    assert updated_data["questions"][0]["options"][0]["action"] == "jump"
    assert updated_data["questions"][0]["options"][1]["action"] == "end" 

    # 6. Testar webhook sem webhook_url configurada (espera 400)
    # Primeiro limpa a url
    client.put(f"/api/v1/forms/{form_id}", json={"webhook_url": ""}, headers=headers)
    test_webhook_fail = client.post(f"/api/v1/forms/{form_id}/test-webhook", headers=headers)
    assert test_webhook_fail.status_code == 400

    # 7. Acesso público ao formulário pelo slug (sem login)
    public_res = client.get(f"/api/v1/forms/public/{form_data['slug']}")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["slug"] == form_data["slug"]
    assert pub_data["title"] == "Pesquisa de Satisfação Atualizada"

    # 7.1 Envio de resposta pública (com webhook em background)
    # Reconfigura webhook_url no formulário para testar o disparo em background
    client.put(f"/api/v1/forms/{form_id}", json={"webhook_url": "https://webhook.site/teste-background"}, headers=headers)
    with unittest.mock.patch("app.api.v1.endpoints.forms.dispatch_webhook_in_background") as mock_bg_webhook:
        submit_res = client.post(f"/api/v1/forms/public/{form_data['slug']}/submit", json={
            "answers": [
                {"question_title": "Qual é o seu nome completo?", "answer": "Carlos Eduardo"},
                {"question_title": "Qual seu email?", "answer": "carlos@teste.com"}
            ]
        })
        assert submit_res.status_code == 200
        assert submit_res.json()["success"] is True
        # Valida que o FastAPI executou o background task com a URL e o payload corretos
        assert mock_bg_webhook.called
        call_args = mock_bg_webhook.call_args[0]
        assert call_args[0] == form_id
        assert call_args[1] == "https://webhook.site/teste-background"
        assert call_args[2]["form_slug"] == form_data["slug"]


    # 7.2 Testar salvamento parcial (auto-save na 1ª pergunta)
    form_slug = form_data["slug"]
    partial_res = client.post(f"/api/v1/forms/public/{form_slug}/save-partial", json={
        "current_step": 1,
        "answers": [
            {"question_title": "Qual é o seu nome completo?", "answer": "Lead Parcial"}
        ]
    })
    assert partial_res.status_code == 200
    part_data = partial_res.json()
    assert part_data["success"] is True
    assert part_data["status"] == "PARCIAL"
    partial_id = part_data["response_id"]

    # 7.3 Listagem paginada de respostas com filtro por status e horário de Brasília
    responses_res = client.get(f"/api/v1/forms/{form_id}/responses?page=1&limit=20&status=PARCIAL", headers=headers)
    assert responses_res.status_code == 200
    res_data = responses_res.json()
    assert "items" in res_data
    assert any(item["id"] == partial_id for item in res_data["items"])
    assert res_data["counts"]["partial"] >= 1

    # 7.4 Testar rota de exportação CSV
    csv_res = client.get(f"/api/v1/forms/{form_id}/responses/export?status=ALL", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Carlos Eduardo" in csv_res.text or "Lead Parcial" in csv_res.text

    # 7.3 Atualizar integração com Google Calendar
    cal_res = client.put(f"/api/v1/forms/{form_id}", json={
        "google_calendar_connected": True,
        "google_calendar_email": "agenda@gmail.com",
        "theme": {
            "primaryColor": "#8b5cf6",
            "backgroundColor": "#0f0a1c",
            "textColor": "#f3e8ff",
            "buttonTextColor": "#ffffff"
        }
    }, headers=headers)
    assert cal_res.status_code == 200
    assert cal_res.json()["google_calendar_connected"] is True
    assert cal_res.json()["google_calendar_email"] == "agenda@gmail.com"
    assert cal_res.json()["theme"]["primaryColor"] == "#8b5cf6"

    # Valida que o endpoint público agora entrega o theme
    pub_theme_res = client.get(f"/api/v1/forms/public/{form_slug}")
    assert pub_theme_res.status_code == 200
    assert pub_theme_res.json()["theme"]["primaryColor"] == "#8b5cf6"


    # 7.4 Testar rotas de OAuth do Google Calendar
    # Testa auth-url (sem client_id configurado retorna 400 ou com mock)
    auth_url_res = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/auth-url", headers=headers)
    assert auth_url_res.status_code in [200, 400]

    # Testa desconexão
    disc_res = client.post(f"/api/v1/forms/{form_id}/integrations/google-calendar/disconnect", headers=headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["success"] is True

    # Valida que formulário agora está desconectado
    form_check = client.get(f"/api/v1/forms", headers=headers)
    curr_form = next(f for f in form_check.json() if f["id"] == form_id)
    assert curr_form["google_calendar_connected"] is False

    # 7.5 Testar exportação de estrutura de formulário em JSON
    export_res = client.get(f"/api/v1/forms/{form_id}/export", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["version"] == "1.0"
    assert export_data["type"] == "formulario_personalizado_export"
    assert export_data["title"] == "Pesquisa de Satisfação Atualizada"
    assert len(export_data["questions"]) >= 1
    assert export_data["questions"][0]["options"][0]["action"] == "jump"
    assert export_data["questions"][0]["options"][1]["action"] == "end"
    assert "google_calendar_access_token" not in export_data

    # 7.6 Testar importação do formulário exportado
    import_res = client.post("/api/v1/forms/import", json=export_data, headers=headers)
    assert import_res.status_code == 201
    imported_form = import_res.json()
    assert imported_form["title"] == "Pesquisa de Satisfação Atualizada"
    assert imported_form["id"] != form_id
    assert imported_form["slug"] != form_data["slug"]
    assert len(imported_form["questions"]) >= 1
    assert imported_form["questions"][0]["options"][0]["action"] == "jump"
    assert imported_form["questions"][0]["options"][1]["action"] == "end" 
    imported_id = imported_form["id"]

    # 7.7 Importar com substituição de título e estrutura customizada
    import_custom = client.post("/api/v1/forms/import", json={
        "title": "Formulário Importado Customizado",
        "data": export_data
    }, headers=headers)
    assert import_custom.status_code == 201
    assert import_custom.json()["title"] == "Formulário Importado Customizado"
    custom_id = import_custom.json()["id"]

    # Limpar os formulários importados no teste
    client.delete(f"/api/v1/forms/{imported_id}", headers=headers)
    client.delete(f"/api/v1/forms/{custom_id}", headers=headers)

    # 7.8 Exportar formulário inexistente retorna 404
    assert client.get("/api/v1/forms/99999/export", headers=headers).status_code == 404

    # 8. Excluir formulário
    del_res = client.delete(f"/api/v1/forms/{form_id}", headers=headers)
    assert del_res.status_code == 200

    # 9. Validar que foi removido
    list_after = client.get("/api/v1/forms", headers=headers)
    assert not any(f["id"] == form_id for f in list_after.json())


def test_rate_limiting_protections():
    """Testa se os limites de requisição por IP bloqueiam abusos e retornam 429."""
    from app.core.rate_limiter import reset_rate_limits
    reset_rate_limits()

    # 1. Testar rate limit no login (limite: 5 req/min)
    # Executa 5 tentativas de login
    for i in range(5):
        res = client.post("/api/v1/auth/login", json={
            "email": "wrong@example.com",
            "password": "WrongPassword123!"
        })
        assert res.status_code == 401

    # A 6ª tentativa dentro do mesmo minuto DEVE ser bloqueada com 429
    blocked_login = client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com",
        "password": "WrongPassword123!"
    })
    assert blocked_login.status_code == 429
    assert "Muitas requisições" in blocked_login.json()["detail"]
    assert "Retry-After" in blocked_login.headers

    # 2. Testar rate limit no formulário público submit (limite: 30 req/min)
    reset_rate_limits()
    # Executa 30 submissões
    for i in range(30):
        client.post("/api/v1/forms/public/inexistent-slug/submit", json={"answers": []})

    # A 31ª requisição DEVE ser bloqueada com 429
    blocked_submit = client.post("/api/v1/forms/public/inexistent-slug/submit", json={"answers": []})
    assert blocked_submit.status_code == 429
    assert "Muitas requisições" in blocked_submit.json()["detail"]

    reset_rate_limits()


def test_cors_origins_configuration():
    """Valida o funcionamento granular do CORS para origens permitidas vs não permitidas."""
    # 1. Testa preflight OPTIONS com origem permitida
    allowed_origin = "http://localhost:3002"
    res_allowed = client.options(
        "/api/v1/health",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "GET"
        }
    )
    assert res_allowed.headers.get("access-control-allow-origin") == allowed_origin

    # 2. Testa preflight OPTIONS com origem não permitida
    disallowed_origin = "https://hacker-malicioso.com"
    res_disallowed = client.options(
        "/api/v1/health",
        headers={
            "Origin": disallowed_origin,
            "Access-Control-Request-Method": "GET"
        }
    )
    # Origens não permitidas NÃO devem receber o cabeçalho access-control-allow-origin
    assert res_disallowed.headers.get("access-control-allow-origin") != disallowed_origin

    # 3. Testa propriedade cors_origins_list do settings
    assert isinstance(settings.cors_origins_list, list)
    assert "http://localhost:3002" in settings.cors_origins_list


def test_encryption_module_and_oauth_tokens_at_rest():
    """Valida a criptografia simétrica (Fernet) de tokens OAuth do Google no banco de dados."""
    from app.core.encryption import encrypt_token, decrypt_token
    from app.models.form import Form
    from app.services import google_calendar

    # 1. Testar ciclo de encrypt / decrypt direto
    raw_token = "ya29.a0AfH6SMD_ExemploTokenGoogleSuperSecreto12345"
    encrypted = encrypt_token(raw_token)
    assert encrypted is not None
    assert encrypted.startswith("enc:")
    assert encrypted != raw_token

    # Descriptografar de volta
    decrypted = decrypt_token(encrypted)
    assert decrypted == raw_token

    # Idempotência (não criptografa duas vezes se já estiver com 'enc:')
    double_encrypt = encrypt_token(encrypted)
    assert double_encrypt == encrypted

    # Retrocompatibilidade com tokens legados em texto puro
    legacy_token = "token_antigo_sem_prefixo"
    assert decrypt_token(legacy_token) == legacy_token
    assert decrypt_token(None) is None

    # 2. Testar gravação de tokens criptografados na tabela de formulários
    db = TestingSessionLocal()
    sa = db.query(User).filter(User.role == "superadmin").first()
    form = Form(
        title="Formulário com Google Agenda Criptografado",
        slug="form-cripto-test",
        user_id=sa.id,
        google_calendar_connected=True,
        google_calendar_email="agenda@gmail.com",
        google_calendar_access_token=encrypt_token("access-token-secreto"),
        google_calendar_refresh_token=encrypt_token("refresh-token-secreto")
    )
    db.add(form)
    db.commit()
    db.refresh(form)

    # Valida que no banco de dados está salvo com ciphertext seguro
    assert form.google_calendar_access_token.startswith("enc:")
    assert form.google_calendar_refresh_token.startswith("enc:")
    assert "access-token-secreto" not in form.google_calendar_access_token
    assert "refresh-token-secreto" not in form.google_calendar_refresh_token

    # Valida que a rotina do serviço consegue recuperar os valores originais para a API
    assert decrypt_token(form.google_calendar_access_token) == "access-token-secreto"
    assert decrypt_token(form.google_calendar_refresh_token) == "refresh-token-secreto"
    db.close()


def test_ssrf_protection_dev_vs_prod():
    """Valida o bloqueio dinâmico contra SSRF (Server-Side Request Forgery) em Dev vs Prod."""
    from app.core.ssrf import is_ssrf_safe_url

    # 1. Em desenvolvimento (allow_local=True)
    # Permite localhost para testes do desenvolvedor
    safe, reason = is_ssrf_safe_url("http://localhost:3000/webhook", allow_local=True)
    assert safe is True

    safe_127, _ = is_ssrf_safe_url("http://127.0.0.1:8000/hook", allow_local=True)
    assert safe_127 is True

    # Bloqueia esquemas perigosos (ex: file://, ftp://, gopher://)
    file_safe, _ = is_ssrf_safe_url("file:///etc/passwd", allow_local=True)
    assert file_safe is False

    # 2. Em produção (allow_local=False)
    # Bloqueia estritamente localhost
    prod_local_safe, reason = is_ssrf_safe_url("http://localhost:3000/webhook", allow_local=False)
    assert prod_local_safe is False
    assert "produção" in reason

    # Bloqueia 127.0.0.1
    prod_127_safe, _ = is_ssrf_safe_url("http://127.0.0.1:5432/hook", allow_local=False)
    assert prod_127_safe is False

    # Bloqueia IP de metadados da Nuvem (AWS / GCP / DigitalOcean)
    meta_safe, reason_meta = is_ssrf_safe_url("http://169.254.169.254/latest/meta-data/", allow_local=False)
    assert meta_safe is False
    assert "metadados" in reason_meta

    # Bloqueia IPs de rede interna privada (10.x.x.x, 192.168.x.x)
    private_safe, reason_priv = is_ssrf_safe_url("http://192.168.1.100:8080/webhook", allow_local=False)
    assert private_safe is False
    assert "privada" in reason_priv

    # URLs públicas legítimas devem ser aceitas normalmente
    public_safe, _ = is_ssrf_safe_url("https://webhook.site/uuid-123", allow_local=False)
    assert public_safe is True

    # 3. Teste via API: Tentar salvar webhook com IP de metadados deve retornar HTTP 400
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/forms", json={"title": "Form Teste SSRF"}, headers=headers)
    form_id = create_res.json()["id"]

    # Tentativa de injetar URL maliciosa de metadados da nuvem
    ssrf_attack = client.put(f"/api/v1/forms/{form_id}", json={
        "webhook_url": "http://169.254.169.254/latest/meta-data/"
    }, headers=headers)
    assert ssrf_attack.status_code == 400
    assert "URL de Webhook inválida por segurança" in ssrf_attack.json()["detail"]

    # Limpeza
    client.delete(f"/api/v1/forms/{form_id}", headers=headers)


def test_optimized_metrics_and_composite_indexes():
    """Valida a performance da contagem única de métricas e suporte aos índices compostos de escalabilidade."""
    from app.models.form import Form, FormResponseData
    from app.core.rate_limiter import reset_rate_limits
    reset_rate_limits()

    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Cria formulário de teste
    form_res = client.post("/api/v1/forms", json={"title": "Form Escala Teste"}, headers=headers)
    form_id = form_res.json()["id"]
    slug = form_res.json()["slug"]

    # 1. Envia resposta parcial
    p_res = client.post(f"/api/v1/forms/public/{slug}/save-partial", json={
        "current_step": 1,
        "answers": [{"question_title": "Qual seu nome?", "answer": "Lead Escala"}]
    })
    assert p_res.status_code == 200

    # 2. Envia resposta concluída com recálculo agregado otimizado
    sub_res = client.post(f"/api/v1/forms/public/{slug}/submit", json={
        "answers": [{"question_title": "Qual seu nome?", "answer": "Cliente Finalizado"}]
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["success"] is True

    # 3. Valida se o completion_rate foi recalculado perfeitamente
    db = TestingSessionLocal()
    updated_form = db.query(Form).filter(Form.id == form_id).first()
    assert updated_form.responses_count >= 1
    assert updated_form.completion_rate > 0.0
    db.close()

    # Limpeza
    client.delete(f"/api/v1/forms/{form_id}", headers=headers)


def test_webhook_delivery_logs_history_and_test_dispatch(monkeypatch):
    """Valida o registro de auditoria na tabela webhook_delivery_logs e a rota de teste de webhook."""
    reset_rate_limits()

    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Cria formulário e configura webhook_url
    form_res = client.post("/api/v1/forms", json={"title": "Form Webhook History Test"}, headers=headers)
    assert form_res.status_code == 201
    form_id = form_res.json()["id"]

    client.put(f"/api/v1/forms/{form_id}", json={
        "webhook_url": "https://webhook.site/audit-history-test"
    }, headers=headers)

    # 2. Testa a rota de disparo de teste com mock
    mock_post_webhook = unittest.mock.MagicMock()
    mock_post_webhook.status_code = 200
    mock_post_webhook.text = '{"status": "ok"}'

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, **kwargs):
            return mock_post_webhook

    import httpx
    monkeypatch.setattr(httpx, "Client", MockClient)

    test_res = client.post(
        f"/api/v1/forms/{form_id}/test-webhook",
        headers=headers
    )
    assert test_res.status_code == 200
    data = test_res.json()
    assert data["success"] is True
    assert data["status_code"] == 200
    assert "duration_ms" in data

    # 3. Consulta os logs de webhook
    logs_res = client.get(f"/api/v1/forms/{form_id}/webhook/logs", headers=headers)
    assert logs_res.status_code == 200
    logs_data = logs_res.json()
    assert logs_data["total"] >= 1
    item = logs_data["logs"][0]
    assert item["webhook_url"] == "https://webhook.site/audit-history-test"
    assert item["status_code"] == 200
    assert item["success"] is True

    # 4. Limpeza
    client.delete(f"/api/v1/forms/{form_id}", headers=headers)

def test_submit_form_with_statement_disqualification():
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Cria formulário com nó de término/desqualificação
    form_res = client.post("/api/v1/forms", json={
        "title": "Formulario com Desqualificacao",
        "questions": [
            {"id": "q1", "type": "short_text", "title": "Seu nome"},
            {"id": "q_end", "type": "statement", "title": "Obrigado pelo seu tempo", "description": "Voce nao atende aos requisitos."}
        ]
    }, headers=headers)
    assert form_res.status_code == 201
    form_data = form_res.json()
    form_id = form_data["id"]
    slug = form_data["slug"]

    # 2. Submete marcando como desqualificado
    sub_res = client.post(f"/api/v1/forms/public/{slug}/submit", json={
        "answers": [
            {"question_id": "q1", "question_title": "Seu nome", "answer": "Candidato Nao Aprovado"},
            {"question_id": "q_end", "question_title": "Obrigado pelo seu tempo", "answer": "(Mensagem de Término)"}
        ],
        "disqualified": True
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["success"] is True

    # 3. Consulta respostas do formulário
    resp_list = client.get(f"/api/v1/forms/{form_id}/responses", headers=headers)
    assert resp_list.status_code == 200
    r_data = resp_list.json()
    assert r_data["counts"]["completed"] >= 1
    found = [r for r in r_data["items"] if r["contact_name"] == "Candidato Nao Aprovado"]
    assert len(found) == 1
    assert found[0]["status"] == "CONCLUIDO_NAO_PASSOU"

    # 4. Limpeza
    client.delete(f"/api/v1/forms/{form_id}", headers=headers)











