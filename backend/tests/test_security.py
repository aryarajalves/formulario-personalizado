from tests.conftest import client, TestingSessionLocal
from app.core.config import settings
from app.core.rate_limiter import reset_rate_limits
from app.core.encryption import encrypt_token, decrypt_token
from app.core.ssrf import is_ssrf_safe_url
from app.models.user import User
from app.models.form import Form

def test_rate_limiting_protections():
    """Testa se os limites de requisição por IP bloqueiam abusos e retornam 429."""
    reset_rate_limits()

    # 1. Testar rate limit no login (limite: 5 req/min)
    for i in range(5):
        res = client.post("/api/v1/auth/login", json={
            "email": "wrong@example.com",
            "password": "WrongPassword123!"
        })
        assert res.status_code == 401

    blocked_login = client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com",
        "password": "WrongPassword123!"
    })
    assert blocked_login.status_code == 429
    assert "Muitas requisições" in blocked_login.json()["detail"]
    assert "Retry-After" in blocked_login.headers

    # 2. Testar rate limit no formulário público submit (limite: 30 req/min)
    reset_rate_limits()
    for i in range(30):
        client.post("/api/v1/forms/public/inexistent-slug/submit", json={"answers": []})

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
    assert res_disallowed.headers.get("access-control-allow-origin") != disallowed_origin

    # 3. Testa propriedade cors_origins_list do settings
    assert isinstance(settings.cors_origins_list, list)
    assert "http://localhost:3002" in settings.cors_origins_list

def test_encryption_module_and_oauth_tokens_at_rest():
    """Valida a criptografia simétrica (Fernet) de tokens OAuth do Google no banco de dados."""
    # 1. Testar ciclo de encrypt / decrypt direto
    raw_token = "ya29.a0AfH6SMD_ExemploTokenGoogleSuperSecreto12345"
    encrypted = encrypt_token(raw_token)
    assert encrypted is not None
    assert encrypted.startswith("enc:")
    assert encrypted != raw_token

    decrypted = decrypt_token(encrypted)
    assert decrypted == raw_token

    double_encrypt = encrypt_token(encrypted)
    assert double_encrypt == encrypted

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

    assert form.google_calendar_access_token.startswith("enc:")
    assert form.google_calendar_refresh_token.startswith("enc:")
    assert "access-token-secreto" not in form.google_calendar_access_token
    assert "refresh-token-secreto" not in form.google_calendar_refresh_token

    assert decrypt_token(form.google_calendar_access_token) == "access-token-secreto"
    assert decrypt_token(form.google_calendar_refresh_token) == "refresh-token-secreto"
    db.close()

def test_ssrf_protection_dev_vs_prod():
    """Valida o bloqueio dinâmico contra SSRF (Server-Side Request Forgery) em Dev vs Prod."""
    # 1. Em desenvolvimento (allow_local=True)
    safe, reason = is_ssrf_safe_url("http://localhost:3000/webhook", allow_local=True)
    assert safe is True

    safe_127, _ = is_ssrf_safe_url("http://127.0.0.1:8000/hook", allow_local=True)
    assert safe_127 is True

    file_safe, _ = is_ssrf_safe_url("file:///etc/passwd", allow_local=True)
    assert file_safe is False

    # 2. Em produção (allow_local=False)
    prod_local_safe, reason = is_ssrf_safe_url("http://localhost:3000/webhook", allow_local=False)
    assert prod_local_safe is False
    assert "produção" in reason

    prod_127_safe, _ = is_ssrf_safe_url("http://127.0.0.1:5432/hook", allow_local=False)
    assert prod_127_safe is False

    meta_safe, reason_meta = is_ssrf_safe_url("http://169.254.169.254/latest/meta-data/", allow_local=False)
    assert meta_safe is False
    assert "metadados" in reason_meta

    private_safe, reason_priv = is_ssrf_safe_url("http://192.168.1.100:8080/webhook", allow_local=False)
    assert private_safe is False
    assert "privada" in reason_priv

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

    ssrf_attack = client.put(f"/api/v1/forms/{form_id}", json={
        "webhook_url": "http://169.254.169.254/latest/meta-data/"
    }, headers=headers)
    assert ssrf_attack.status_code == 400
    assert "URL de Webhook inválida por segurança" in ssrf_attack.json()["detail"]

    client.delete(f"/api/v1/forms/{form_id}", headers=headers)
