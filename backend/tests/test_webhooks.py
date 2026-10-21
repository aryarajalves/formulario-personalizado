import unittest.mock
import httpx
from tests.conftest import client
from app.core.config import settings
from app.core.rate_limiter import reset_rate_limits

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
