import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_bulk_delete_forms_success():
    """Valida a exclusão em lote de múltiplos formulários pertencentes ao usuário."""
    # 1. Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Cria 3 formulários para teste
    form_ids = []
    for i in range(3):
        create_res = client.post("/api/v1/forms", headers=headers, json={"title": f"Form Bulk {i+1}"})
        assert create_res.status_code == 201
        form_ids.append(create_res.json()["id"])

    assert len(form_ids) == 3

    # 3. Dispara bulk delete dos 3 formulários
    bulk_res = client.post("/api/v1/forms/bulk-delete", headers=headers, json={"form_ids": form_ids})
    assert bulk_res.status_code == 200
    res_data = bulk_res.json()
    assert "3 formulários excluídos com sucesso" in res_data["message"]
    assert set(res_data["deleted_ids"]) == set(form_ids)

    # 4. Verifica que nenhum dos 3 formulários existe mais
    for fid in form_ids:
        get_res = client.get(f"/api/v1/forms/{fid}", headers=headers)
        assert get_res.status_code == 404

def test_bulk_delete_forms_empty_or_invalid():
    """Valida erros quando nenhum ID é enviado ou nenhum formulário é encontrado."""
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Lista vazia -> 400
    empty_res = client.post("/api/v1/forms/bulk-delete", headers=headers, json={"form_ids": []})
    assert empty_res.status_code == 400

    # IDs inexistentes -> 404
    not_found_res = client.post("/api/v1/forms/bulk-delete", headers=headers, json={"form_ids": [99999, 88888]})
    assert not_found_res.status_code == 404
