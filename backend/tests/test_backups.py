import io
from datetime import datetime
from zoneinfo import ZoneInfo
from tests.conftest import client
from app.core.config import settings

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
    b_now = datetime.now(ZoneInfo("America/Sao_Paulo"))

    manual_res = client.post("/api/v1/backups/manual", json={"custom_name": "teste_brasilia"}, headers=headers)
    assert manual_res.status_code == 201
    bkp = manual_res.json()
    assert bkp["backup_type"] == "manual"
    assert bkp["filename"].startswith("teste_brasilia_")
    assert bkp["filename"].endswith(".dump.gz")
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
