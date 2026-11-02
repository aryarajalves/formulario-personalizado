import base64
from tests.conftest import client
from app.core.config import settings

def test_private_docs_requires_authentication():
    # 1. Acesso sem credenciais a /docs deve ser bloqueado com 401
    res_docs = client.get("/docs")
    assert res_docs.status_code == 401
    assert "WWW-Authenticate" in res_docs.headers

    # 2. Acesso sem credenciais a /openapi.json deve ser bloqueado com 401
    res_openapi = client.get("/openapi.json")
    assert res_openapi.status_code == 401

    # 3. Acesso com credenciais incorretas deve ser rejeitado com 401
    bad_auth = base64.b64encode(b"usuario_errado:senha_errada").decode("ascii")
    res_bad = client.get("/docs", headers={"Authorization": f"Basic {bad_auth}"})
    assert res_bad.status_code == 401

    # 4. Acesso com credenciais corretas deve retornar 200
    valid_auth = base64.b64encode(f"{settings.DOCS_USERNAME}:{settings.DOCS_PASSWORD}".encode("utf-8")).decode("ascii")
    res_ok_docs = client.get("/docs", headers={"Authorization": f"Basic {valid_auth}"})
    assert res_ok_docs.status_code == 200
    assert "Swagger" in res_ok_docs.text

    # 5. Acesso ao contrato /openapi.json com credenciais corretas
    res_ok_schema = client.get("/openapi.json", headers={"Authorization": f"Basic {valid_auth}"})
    assert res_ok_schema.status_code == 200
    schema_data = res_ok_schema.json()
    assert "openapi" in schema_data
    assert "paths" in schema_data


def test_cyberpulse_catalog_endpoint_security_and_format():
    # 1. Sem header X-CyberPulse-Secret -> 401 Unauthorized
    res_no_secret = client.get("/api/v1/cyberpulse/catalog")
    assert res_no_secret.status_code == 401
    assert "não autorizado" in res_no_secret.json()["detail"].lower()

    # 2. Com chave incorreta -> 401 Unauthorized
    res_wrong_secret = client.get(
        "/api/v1/cyberpulse/catalog",
        headers={"X-CyberPulse-Secret": "chave_falsa_e_invalida"}
    )
    assert res_wrong_secret.status_code == 401

    # 3. Com chave correta -> 200 OK com contrato oficial CyberPulse
    res_success = client.get(
        "/api/v1/cyberpulse/catalog",
        headers={"X-CyberPulse-Secret": settings.CYBERPULSE_AUDIT_SECRET}
    )
    assert res_success.status_code == 200
    data = res_success.json()

    assert "app_name" in data
    assert "environment" in data
    assert "total_endpoints" in data
    assert "endpoints" in data
    assert isinstance(data["endpoints"], list)
    assert data["total_endpoints"] == len(data["endpoints"])
    assert data["total_endpoints"] > 0

    # Valida estrutura obrigatória de cada endpoint auditado
    paths = [ep["path"] for ep in data["endpoints"]]
    assert "/api/v1/auth/login" in paths

    for ep in data["endpoints"]:
        assert "path" in ep
        assert "methods" in ep
        assert isinstance(ep["methods"], list)
        assert len(ep["methods"]) > 0
        assert "requires_auth" in ep
        assert isinstance(ep["requires_auth"], bool)
        assert "has_rate_limit" in ep
        assert isinstance(ep["has_rate_limit"], bool)
        assert "description" in ep
        assert isinstance(ep["description"], str)
        assert len(ep["description"]) > 0
