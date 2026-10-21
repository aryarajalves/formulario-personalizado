from tests.conftest import client
from app.core.config import settings
from app.services.docker_logs_service import format_to_brasilia_time

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
    nginx_sample = '172.31.0.1 - - [29/Sep/2026:17:59:35 +0000] "GET / HTTP/1.1" 200 123'
    converted = format_to_brasilia_time(nginx_sample)
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
