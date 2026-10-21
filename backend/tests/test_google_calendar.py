import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient

from app.main import app
from app.models.form import Form
from app.models.user import User
from app.services import google_calendar
from app.core.config import settings

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")
client = TestClient(app)

def test_get_available_slots_working_days_and_hours():
    """Valida se get_available_slots gera corretamente os slots dentro dos horários e dias configurados."""
    form = Form(
        id=999,
        title="Form Teste Slots",
        slug="form-teste-slots",
        google_calendar_connected=False,
        google_calendar_settings={
            "working_days": [1, 2, 3, 4, 5],
            "start_time": "14:00",
            "end_time": "17:00",
            "slot_duration": 60,
            "buffer_minutes": 0
        }
    )

    # Escolhe uma data futura (próxima segunda-feira)
    today = datetime.now(BRAZIL_TZ).date()
    days_until_monday = (0 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    future_monday = today + timedelta(days=days_until_monday)
    future_sunday = future_monday + timedelta(days=6)

    result = google_calendar.get_available_slots(
        form=form,
        start_date_str=future_monday.strftime("%Y-%m-%d"),
        end_date_str=future_sunday.strftime("%Y-%m-%d")
    )

    monday_str = future_monday.strftime("%Y-%m-%d")
    sunday_str = future_sunday.strftime("%Y-%m-%d")

    # Segunda-feira deve ter slots das 14:00 às 17:00 (14:00, 15:00, 16:00)
    monday_slots = result["slots_by_date"].get(monday_str, [])
    assert len(monday_slots) == 3
    assert monday_slots[0]["time"] == "14:00"
    assert monday_slots[1]["time"] == "15:00"
    assert monday_slots[2]["time"] == "16:00"

    # Domingo não deve ter nenhum slot (fora dos dias de atendimento)
    sunday_slots = result["slots_by_date"].get(sunday_str, [])
    assert len(sunday_slots) == 0

def test_get_available_slots_filters_busy_intervals():
    """Valida se intervalos ocupados retornados pelo Google Calendar são excluídos da lista (Opção A)."""
    form = Form(
        id=998,
        title="Form Teste FreeBusy",
        slug="form-teste-freebusy",
        google_calendar_connected=True,
        google_calendar_access_token="fake_token",
        google_calendar_settings={
            "working_days": [1, 2, 3, 4, 5],
            "start_time": "09:00",
            "end_time": "12:00",
            "slot_duration": 60,
            "buffer_minutes": 0
        }
    )

    today = datetime.now(BRAZIL_TZ).date()
    days_until_tuesday = (1 - today.weekday()) % 7
    if days_until_tuesday == 0:
        days_until_tuesday = 7
    target_date = today + timedelta(days=days_until_tuesday)
    target_date_str = target_date.strftime("%Y-%m-%d")

    # Simula intervalo ocupado das 10:00 às 11:00
    busy_start = datetime(target_date.year, target_date.month, target_date.day, 10, 0, tzinfo=BRAZIL_TZ).isoformat()
    busy_end = datetime(target_date.year, target_date.month, target_date.day, 11, 0, tzinfo=BRAZIL_TZ).isoformat()

    with patch("app.services.google_calendar.decrypt_token", return_value="raw_token"), \
         patch("app.services.google_calendar.get_google_busy_intervals", return_value=[{"start": busy_start, "end": busy_end}]):

        result = google_calendar.get_available_slots(
            form=form,
            start_date_str=target_date_str,
            end_date_str=target_date_str
        )

        slots = result["slots_by_date"].get(target_date_str, [])
        slot_times = [s["time"] for s in slots]

        # 09:00 e 11:00 devem estar disponíveis; 10:00 foi filtrado por estar ocupado
        assert "09:00" in slot_times
        assert "11:00" in slot_times
        assert "10:00" not in slot_times

def test_google_calendar_settings_api():
    """Testa endpoints GET e PUT de configurações de atendimento do Google Agenda."""
    # Login superadmin
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Cria formulário
    create_res = client.post("/api/v1/forms", headers=headers, json={"title": "Form Calendário Teste"})
    assert create_res.status_code == 201
    form_id = create_res.json()["id"]
    slug = create_res.json()["slug"]

    # Consulta settings padrão
    get_res = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/settings", headers=headers)
    assert get_res.status_code == 200
    settings_data = get_res.json()["settings"]
    assert settings_data["slot_duration"] == 60
    assert settings_data["working_days"] == [1, 2, 3, 4, 5]

    # Atualiza settings
    new_settings = {
        "working_days": [1, 2, 3],
        "start_time": "10:00",
        "end_time": "16:00",
        "slot_duration": 30
    }
    put_res = client.put(f"/api/v1/forms/{form_id}/integrations/google-calendar/settings", headers=headers, json=new_settings)
    assert put_res.status_code == 200
    assert put_res.json()["settings"]["slot_duration"] == 30
    assert put_res.json()["settings"]["working_days"] == [1, 2, 3]

    # Testa endpoint público de slots
    public_slots_res = client.get(f"/api/v1/forms/public/{slug}/calendar-slots")
    assert public_slots_res.status_code == 200
    assert "slots_by_date" in public_slots_res.json()
    assert public_slots_res.json()["settings"]["slot_duration"] == 30

def test_get_available_slots_multiple_time_ranges_with_break():
    """Valida se múltiplos intervalos de horário (ex: 09:00-12:00 e 15:00-20:00) geram slots com intervalo/pausa."""
    form = Form(
        id=997,
        title="Form Teste Turnos",
        slug="form-teste-turnos",
        google_calendar_connected=False,
        google_calendar_settings={
            "working_days": [1, 2, 3, 4, 5, 6, 7],
            "time_ranges": [
                {"start_time": "09:00", "end_time": "12:00"},
                {"start_time": "15:00", "end_time": "18:00"}
            ],
            "slot_duration": 60,
            "buffer_minutes": 0
        }
    )

    today = datetime.now(BRAZIL_TZ).date()
    future_day = today + timedelta(days=2)
    day_str = future_day.strftime("%Y-%m-%d")

    result = google_calendar.get_available_slots(
        form=form,
        start_date_str=day_str,
        end_date_str=day_str
    )

    day_slots = result["slots_by_date"].get(day_str, [])
    times = [s["time"] for s in day_slots]

    # Turno 1 (09:00 - 12:00): 09:00, 10:00, 11:00
    assert "09:00" in times
    assert "10:00" in times
    assert "11:00" in times

    # Horários da pausa (12:00 às 15:00) NÃO devem existir
    assert "12:00" not in times
    assert "13:00" not in times
    assert "14:00" not in times

    # Turno 2 (15:00 - 18:00): 15:00, 16:00, 17:00
    assert "15:00" in times
    assert "16:00" in times
    assert "17:00" in times

    # 18:00 é o término do turno 2, não deve gerar reunião após 18:00
    assert "18:00" not in times

def test_create_calendar_event_with_color_and_custom_template():
    """Valida se create_calendar_event inclui colorId e customização de título e descrição."""
    with patch("httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "event_123", "status": "confirmed"}
        mock_client.__enter__.return_value = mock_client
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value = mock_client

        res = google_calendar.create_calendar_event(
            access_token="fake_token",
            summary="Reunião com Carlos - Teste",
            description="Detalhes do cliente e respostas",
            start_iso="2026-10-22T10:00:00-03:00",
            end_iso="2026-10-22T11:00:00-03:00",
            attendee_email="lead@teste.com",
            color_id="11"
        )
        assert res["id"] == "event_123"

        call_args = mock_client.post.call_args
        body = call_args[1]["json"]
        assert body["summary"] == "🔴 Reunião com Carlos - Teste"
        assert body["description"] == "Detalhes do cliente e respostas"
        assert body["colorId"] == "11"
        assert body["attendees"] == [{"email": "lead@teste.com"}]

