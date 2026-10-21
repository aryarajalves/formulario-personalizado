import pytest
from tests.conftest import client, TestingSessionLocal
from app.core.config import settings
from app.models.form import Form, FormResponseData

def test_get_calendar_bookings_flow():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar formulário
    create_res = client.post("/api/v1/forms", json={"title": "Formulário de Agendamento"}, headers=headers)
    assert create_res.status_code == 201
    form_id = create_res.json()["id"]

    # 3. Consultar bookings inicialmente vazio
    res_empty = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/bookings", headers=headers)
    assert res_empty.status_code == 200
    data_empty = res_empty.json()
    assert data_empty["success"] is True
    assert data_empty["total"] == 0
    assert len(data_empty["bookings"]) == 0

    # 4. Inserir resposta simulada com agendamento do Google Agenda
    db = TestingSessionLocal()
    resp = FormResponseData(
        form_id=form_id,
        contact_name="Aryaraj Alves Fernandes",
        contact_email="aryaraj@gmail.com",
        contact_phone="+55 85988146141",
        status="CONCLUIDO",
        completion_percent=100.0,
        answers=[
            {"question_title": "Qual o seu nome?", "answer": "Aryaraj Alves Fernandes"},
            {
                "question_title": "Escolha a data e horário da reunião",
                "question_type": "google_calendar",
                "answer": "2026-10-23T13:00:00-03:00"
            }
        ]
    )
    db.add(resp)
    db.commit()
    db.close()

    # 5. Consultar bookings novamente
    res_bookings = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/bookings", headers=headers)
    assert res_bookings.status_code == 200
    data = res_bookings.json()
    assert data["success"] is True
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total_pages"] == 1
    booking = data["bookings"][0]
    assert booking["contact_name"] == "Aryaraj Alves Fernandes"
    assert booking["contact_email"] == "aryaraj@gmail.com"
    assert booking["contact_phone"] == "+55 85988146141"
    assert booking["scheduled_iso"] == "2026-10-23T13:00:00-03:00"
    assert booking["formatted_datetime"] == "23/10/26 13:00"

def test_get_calendar_bookings_pagination():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar formulário
    create_res = client.post("/api/v1/forms", json={"title": "Formulário com 25 Agendamentos"}, headers=headers)
    form_id = create_res.json()["id"]

    # 3. Inserir 25 agendamentos no banco
    db = TestingSessionLocal()
    for i in range(1, 26):
        resp = FormResponseData(
            form_id=form_id,
            contact_name=f"Lead {i}",
            contact_email=f"lead{i}@teste.com",
            contact_phone=f"+55 8598814{i:04d}",
            status="CONCLUIDO",
            completion_percent=100.0,
            answers=[
                {
                    "question_title": "Agendamento de Reunião",
                    "question_type": "google_calendar",
                    "answer": f"2026-10-23T{10 + (i % 10):02d}:00:00-03:00"
                }
            ]
        )
        db.add(resp)
    db.commit()
    db.close()

    # 4. Consultar Página 1 (default limit=20)
    res_p1 = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/bookings?page=1&limit=20", headers=headers)
    assert res_p1.status_code == 200
    p1_data = res_p1.json()
    assert p1_data["total"] == 25
    assert p1_data["page"] == 1
    assert p1_data["limit"] == 20
    assert p1_data["total_pages"] == 2
    assert len(p1_data["bookings"]) == 20

    # 5. Consultar Página 2 (limit=20, deve trazer os 5 restantes)
    res_p2 = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/bookings?page=2&limit=20", headers=headers)
    assert res_p2.status_code == 200
    p2_data = res_p2.json()
    assert p2_data["total"] == 25
    assert p2_data["page"] == 2
    assert p2_data["limit"] == 20
    assert p2_data["total_pages"] == 2
    assert len(p2_data["bookings"]) == 5

def test_get_calendar_bookings_unauthorized():
    res = client.get("/api/v1/forms/999/integrations/google-calendar/bookings")
    assert res.status_code == 401


def test_delete_calendar_booking_cascades_reminders_and_events(monkeypatch):
    from datetime import datetime, timezone, timedelta
    from app.models.form import ScheduledWebhook

    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/forms", json={"title": "Form Para Exclusao Agendamento"}, headers=headers)
    form_id = create_res.json()["id"]

    db = TestingSessionLocal()
    resp = FormResponseData(
        form_id=form_id,
        contact_name="Lead Para Deletar",
        contact_email="deletar@teste.com",
        contact_phone="+55 85 91234-5678",
        status="CONCLUIDO",
        google_calendar_event_id="mock_event_123",
        answers=[
            {"question_title": "Agendamento", "question_type": "google_calendar", "answer": "2026-10-23T14:00:00-03:00"}
        ]
    )
    db.add(resp)
    db.commit()
    response_id = resp.id

    reminder = ScheduledWebhook(
        form_id=form_id,
        response_id=response_id,
        reminder_type="morning",
        scheduled_for=datetime.now(timezone.utc) + timedelta(days=1),
        webhook_url="https://webhook.site/del-test",
        payload={"contact_name": "Lead Para Deletar"},
        status="PENDING"
    )
    db.add(reminder)
    db.commit()
    reminder_id = reminder.id
    db.close()

    deleted_called = []
    def mock_find_and_delete(form, db, event_id=None, start_iso=None):
        deleted_called.append((event_id, start_iso))
        return True

    monkeypatch.setattr("app.services.google_calendar.find_and_delete_calendar_event", mock_find_and_delete)

    # Executa a rota DELETE
    del_res = client.delete(
        f"/api/v1/forms/{form_id}/integrations/google-calendar/bookings/{response_id}",
        headers=headers
    )
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verifica se a resposta foi excluída do banco
    db2 = TestingSessionLocal()
    found_resp = db2.query(FormResponseData).filter(FormResponseData.id == response_id).first()
    assert found_resp is None

    # Verifica se o lembrete associado foi excluído
    found_rem = db2.query(ScheduledWebhook).filter(ScheduledWebhook.id == reminder_id).first()
    assert found_rem is None
    db2.close()


def test_create_calendar_event_prepends_color_emoji(monkeypatch):
    from app.services.google_calendar import create_calendar_event, GOOGLE_CALENDAR_COLOR_EMOJIS

    captured_requests = []
    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, headers=None, json=None):
            captured_requests.append({"url": url, "headers": headers, "json": json})
            class MockResp:
                status_code = 201
                def json(self):
                    return {"id": "created_evt_999", "summary": json.get("summary")}
            return MockResp()

    monkeypatch.setattr("httpx.Client", MockClient)

    # Teste 1: Cor '2' (Sálvia) deve adicionar o emoji 🟢
    res = create_calendar_event(
        access_token="fake_token",
        summary="Reunião com Hinata",
        description="Briefing",
        start_iso="2026-10-23T19:00:00-03:00",
        end_iso="2026-10-23T20:00:00-03:00",
        attendee_email="lead@teste.com",
        color_id="2"
    )
    assert captured_requests[-1]["json"]["summary"] == "🟢 Reunião com Hinata"
    assert captured_requests[-1]["json"]["colorId"] == "2"

    # Teste 2: Se já tiver o emoji correspondente ou outro emoji de cor, não duplica
    res2 = create_calendar_event(
        access_token="fake_token",
        summary="🟢 Reunião com Hinata",
        description="Briefing",
        start_iso="2026-10-23T19:00:00-03:00",
        end_iso="2026-10-23T20:00:00-03:00",
        attendee_email="lead@teste.com",
        color_id="2"
    )
    assert captured_requests[-1]["json"]["summary"] == "🟢 Reunião com Hinata"

