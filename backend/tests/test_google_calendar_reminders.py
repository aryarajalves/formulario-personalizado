import pytest
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from tests.conftest import client, TestingSessionLocal
from app.core.config import settings
from app.models.form import Form, FormResponseData, ScheduledWebhook
from app.services.scheduler import dispatch_pending_scheduled_webhooks

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")

def test_booking_submission_schedules_webhooks():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar formulário com webhook_url configurada
    create_res = client.post("/api/v1/forms", json={
        "title": "Formulário de Agendamento com Lembretes",
        "webhook_url": "https://webhook.site/test-booking-reminders"
    }, headers=headers)
    assert create_res.status_code == 201
    form_id = create_res.json()["id"]
    form_slug = create_res.json()["slug"]

    # 3. Configurar lembretes no Google Calendar settings
    settings_res = client.put(f"/api/v1/forms/{form_id}/integrations/google-calendar/settings", json={
        "reminder_morning_enabled": True,
        "reminder_morning_time": "09:00",
        "reminder_before_enabled": True,
        "reminder_before_minutes": 30,
        "reminder_webhook_url": "https://webhook.site/test-booking-reminders"
    }, headers=headers)
    assert settings_res.status_code == 200

    # 4. Simular submissão com agendamento para daqui a 3 dias às 14:00
    future_date = datetime.now(BRAZIL_TZ) + timedelta(days=3)
    future_booking = future_date.replace(hour=14, minute=0, second=0, microsecond=0)
    future_iso = future_booking.isoformat()

    sub_res = client.post(f"/api/v1/forms/public/{form_slug}/submit", json={
        "contact_name": "Cliente Reunião",
        "contact_email": "cliente@teste.com",
        "contact_phone": "+55 85 99999-8888",
        "answers": [
            {
                "question_title": "Escolha data e horário",
                "question_type": "google_calendar",
                "answer": future_iso
            }
        ]
    })
    assert sub_res.status_code == 200

    # 5. Consultar lembretes agendados via endpoint
    reminders_res = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders", headers=headers)
    assert reminders_res.status_code == 200
    data = reminders_res.json()
    assert data["success"] is True
    assert data["total"] == 2  # 1 matinal + 1 antecedência

    types = [r["reminder_type"] for r in data["reminders"]]
    assert "morning" in types
    assert "before_meeting" in types

def test_dispatch_pending_scheduled_webhooks_worker():
    # Inserir um lembrete pendente com data no passado para o worker processar
    db = TestingSessionLocal()
    form = Form(title="Form Worker Test", slug="form-worker-test", user_id=1, webhook_url="https://webhook.site/worker-test")
    db.add(form)
    db.commit()

    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    item = ScheduledWebhook(
        form_id=form.id,
        reminder_type="morning",
        scheduled_for=past_time,
        webhook_url="https://webhook.site/worker-test",
        payload={"event": "booking_reminder_morning", "test": True},
        status="PENDING"
    )
    db.add(item)
    db.commit()
    item_id = item.id

    # Executa o worker passando a sessão do banco de testes
    dispatch_pending_scheduled_webhooks(db=db)

    # Verifica status atualizado
    updated = db.query(ScheduledWebhook).filter(ScheduledWebhook.id == item_id).first()
    assert updated.status in ["SENT", "FAILED"]  # Processado (não está mais PENDING)
    assert updated.sent_at is not None
    db.close()

def test_test_reminder_endpoint_validation():
    # Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/forms", json={"title": "Form Test Reminders"}, headers=headers)
    form_id = create_res.json()["id"]

    # Teste sem webhook url deve falhar com 400
    res_no_url = client.post(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders/test", json={}, headers=headers)
    assert res_no_url.status_code == 400

    # Teste com URL bloqueada SSRF (metadados de nuvem)
    res_ssrf = client.post(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders/test", json={
        "webhook_url": "http://169.254.169.254/latest/meta-data"
    }, headers=headers)
    assert res_ssrf.status_code == 400
    assert "bloqueada por segurança" in res_ssrf.json()["detail"]


def test_update_and_delete_scheduled_reminder(monkeypatch):
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/forms", json={"title": "Form Crud Reminders"}, headers=headers)
    form_id = create_res.json()["id"]

    db = TestingSessionLocal()
    future_time = datetime.now(timezone.utc) + timedelta(days=2)
    reminder = ScheduledWebhook(
        form_id=form_id,
        reminder_type="morning",
        scheduled_for=future_time,
        webhook_url="https://webhook.site/crud-test",
        payload={"contact_name": "João Original", "contact_phone": "+55 11 99999-0000"},
        status="PENDING"
    )
    db.add(reminder)
    db.commit()
    reminder_id = reminder.id
    db.close()

    # 1. Update reminder (PATCH)
    new_scheduled = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    patch_res = client.patch(
        f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders/{reminder_id}",
        json={
            "scheduled_for": new_scheduled,
            "contact_name": "João Atualizado",
            "contact_phone": "+55 11 98888-7777"
        },
        headers=headers
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["success"] is True
    assert patch_data["reminder"]["contact_name"] == "João Atualizado"
    assert patch_data["reminder"]["contact_phone"] == "+55 11 98888-7777"

    # 2. Manual Dispatch (POST .../dispatch)
    class MockResponse:
        status_code = 200
        text = '{"status": "ok"}'

    class MockClient:
        def __init__(self, *args, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def post(self, url, json=None): return MockResponse()

    monkeypatch.setattr("httpx.Client", MockClient)

    dispatch_res = client.post(
        f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders/{reminder_id}/dispatch",
        headers=headers
    )
    assert dispatch_res.status_code == 200
    assert dispatch_res.json()["success"] is True
    assert dispatch_res.json()["status_code"] == 200

    # 3. Delete reminder (DELETE)
    del_res = client.delete(
        f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders/{reminder_id}",
        headers=headers
    )
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Confirm deletion
    db2 = TestingSessionLocal()
    deleted = db2.query(ScheduledWebhook).filter(ScheduledWebhook.id == reminder_id).first()
    assert deleted is None
    db2.close()


def test_get_form_scheduled_reminders_pagination_and_filters():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/forms", json={"title": "Form Paginação Lembretes"}, headers=headers)
    form_id = create_res.json()["id"]

    db = TestingSessionLocal()
    # Inserir 25 lembretes (20 pendentes e 5 disparados)
    for i in range(25):
        st = "SENT" if i < 5 else "PENDING"
        item = ScheduledWebhook(
            form_id=form_id,
            reminder_type="morning",
            scheduled_for=datetime.now(timezone.utc) + timedelta(days=i + 1),
            webhook_url="https://webhook.site/page-test",
            payload={"contact_name": f"Contato {i}"},
            status=st
        )
        db.add(item)
    db.commit()
    db.close()

    # 1. Página 1 com 20 itens por padrão
    res_p1 = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders?page=1&limit=20", headers=headers)
    assert res_p1.status_code == 200
    p1 = res_p1.json()
    assert p1["total"] == 25
    assert p1["page"] == 1
    assert p1["limit"] == 20
    assert p1["total_pages"] == 2
    assert len(p1["reminders"]) == 20
    assert p1["total_all"] == 25
    assert p1["total_dispatched"] == 5
    assert p1["total_pending"] == 20

    # 2. Página 2 com 5 itens restantes
    res_p2 = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders?page=2&limit=20", headers=headers)
    assert res_p2.status_code == 200
    p2 = res_p2.json()
    assert p2["page"] == 2
    assert len(p2["reminders"]) == 5

    # 3. Filtro por 'dispatched' (apenas 5 itens, 1 página)
    res_disp = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders?status_filter=dispatched", headers=headers)
    assert res_disp.status_code == 200
    disp_data = res_disp.json()
    assert disp_data["total"] == 5
    assert len(disp_data["reminders"]) == 5
    assert all(r["status"] == "SENT" for r in disp_data["reminders"])

    # 4. Filtro por 'pending' (20 itens)
    res_pend = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/reminders?status_filter=pending", headers=headers)
    assert res_pend.status_code == 200
    pend_data = res_pend.json()
    assert pend_data["total"] == 20
    assert len(pend_data["reminders"]) == 20
    assert all(r["status"] == "PENDING" for r in pend_data["reminders"])

