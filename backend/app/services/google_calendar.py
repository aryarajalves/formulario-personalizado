import urllib.parse
import re
from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logger import logger
from app.core.encryption import encrypt_token, decrypt_token
from app.models.form import Form, FormResponseData, ScheduledWebhook
from app.models.user import User
from app.core.formatters import format_answer_for_display
from app.core import database

ISO_DATETIME_REGEX = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy"

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email"
]

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")

DEFAULT_CALENDAR_SETTINGS = {
    "working_days": [1, 2, 3, 4, 5],  # 1 = Segunda ... 5 = Sexta (padrão útil para negócios)
    "time_ranges": [
        {"start_time": "09:00", "end_time": "18:00"}
    ],
    "start_time": "09:00",
    "end_time": "18:00",
    "slot_duration": 60,  # 60 minutos conforme decisão aprovada
    "buffer_minutes": 0,
    "event_title": "Reunião com {nome} - {formulario}",
    "event_description": (
        "Agendamento confirmado através do formulário '{formulario}'.\n\n"
        "Dados do Cliente:\n"
        "- Nome: {nome}\n"
        "- E-mail: {email}\n"
        "- Telefone: {telefone}\n\n"
        "Respostas do Formulário:\n"
        "{respostas}"
    ),
    "event_color_id": "9",
    "reminder_morning_enabled": True,
    "reminder_morning_time": "09:00",
    "reminder_before_enabled": True,
    "reminder_before_minutes": 30,
    "reminder_webhook_url": "",
}

GOOGLE_CALENDAR_COLOR_EMOJIS = {
    "1": "🟣",  # Lavanda (#7986cb)
    "2": "🟢",  # Sálvia (#33b679)
    "3": "🟣",  # Uva (#8e24aa)
    "4": "🔴",  # Flamingo (#e67c73)
    "5": "🟡",  # Banana (#f6bf26)
    "6": "🟠",  # Tangerina (#f4511e)
    "7": "🔵",  # Pavão (#039be5)
    "8": "⚫",  # Grafite (#616161)
    "9": "🔵",  # Mirtilo (#3f51b5)
    "10": "🟢", # Manjericão (#0b8043)
    "11": "🔴", # Tomate (#d50000)
}

def get_google_auth_url(form_id: int) -> str:
    """Gera a URL de consentimento OAuth 2.0 para o formulário especificado."""
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID não configurado no servidor.")
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": str(form_id)
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

def exchange_code_for_tokens(code: str) -> dict:
    """Troca o authorization code pelo access_token e refresh_token."""
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(GOOGLE_TOKEN_URL, data=data)
        if resp.status_code != 200:
            logger.error(f"Erro ao trocar code por token no Google: {resp.text}")
            raise ValueError(f"Falha ao autenticar com o Google: {resp.text}")
        return resp.json()

def get_user_email_from_token(access_token: str) -> str:
    """Obtém o e-mail da conta Google autenticada."""
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(GOOGLE_USERINFO_URL, headers=headers)
        if resp.status_code == 200:
            return resp.json().get("email", "")
        return ""

def refresh_google_access_token(form: Form, db: Session) -> str:
    """Atualiza o access_token utilizando o refresh_token salvo (descriptografa antes do envio)."""
    raw_refresh_token = decrypt_token(form.google_calendar_refresh_token)
    if not raw_refresh_token:
        raise ValueError("Refresh token não disponível ou não pôde ser descriptografado.")
    
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": raw_refresh_token,
        "grant_type": "refresh_token"
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(GOOGLE_TOKEN_URL, data=data)
        if resp.status_code != 200:
            logger.error(f"Erro ao renovar token Google: {resp.text}")
            raise ValueError("Não foi possível renovar o token da Google.")
        
        token_data = resp.json()
        new_token = token_data.get("access_token")
        form.google_calendar_access_token = encrypt_token(new_token)
        db.commit()
        return new_token

def get_google_busy_intervals(
    access_token: str,
    time_min_iso: str,
    time_max_iso: str
) -> list:
    """Consulta os intervalos ocupados na agenda primária do Google via FreeBusy API."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "timeMin": time_min_iso,
        "timeMax": time_max_iso,
        "timeZone": "America/Sao_Paulo",
        "items": [{"id": "primary"}]
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(GOOGLE_FREEBUSY_URL, headers=headers, json=body)
            if resp.status_code == 200:
                data = resp.json()
                primary = data.get("calendars", {}).get("primary", {})
                return primary.get("busy", [])
            logger.warning(f"Erro ao consultar FreeBusy na Google Agenda (status {resp.status_code}): {resp.text}")
            return []
    except Exception as e:
        logger.error(f"Exceção ao consultar FreeBusy no Google: {e}")
        return []

def get_available_slots(form: Form, start_date_str: str, end_date_str: str, db: Session = None) -> dict:
    """Gera a grade de horários disponíveis entre as datas informadas, cruzando com a ocupação real do Google Calendar."""
    settings_data = {**DEFAULT_CALENDAR_SETTINGS, **(form.google_calendar_settings or {})}
    
    working_days = settings_data.get("working_days", [1, 2, 3, 4, 5])
    start_time_str = settings_data.get("start_time", "09:00")
    end_time_str = settings_data.get("end_time", "18:00")
    slot_duration = int(settings_data.get("slot_duration", 60))
    buffer_minutes = int(settings_data.get("buffer_minutes", 0))

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except Exception:
        today = datetime.now(BRAZIL_TZ).date()
        start_date = today
        end_date = today + timedelta(days=30)

    # Limita o alcance a no máximo 60 dias para eficiência
    if (end_date - start_date).days > 60:
        end_date = start_date + timedelta(days=60)

    now = datetime.now(BRAZIL_TZ)

    # Consulta FreeBusy se a conta Google estiver conectada
    busy_intervals = []
    if form.google_calendar_connected and form.google_calendar_access_token:
        access_token = decrypt_token(form.google_calendar_access_token)
        time_min_iso = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=BRAZIL_TZ).isoformat()
        time_max_iso = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=BRAZIL_TZ).isoformat()

        raw_busy = get_google_busy_intervals(access_token, time_min_iso, time_max_iso)
        # Se falhou por token expirado, tenta renovar
        if not raw_busy and form.google_calendar_refresh_token and db:
            try:
                new_token = refresh_google_access_token(form, db)
                raw_busy = get_google_busy_intervals(new_token, time_min_iso, time_max_iso)
            except Exception as ref_err:
                logger.warning(f"Não foi possível renovar token Google durante consulta de slots: {ref_err}")

        for b in raw_busy:
            try:
                b_start = datetime.fromisoformat(b["start"].replace("Z", "+00:00")).astimezone(BRAZIL_TZ)
                b_end = datetime.fromisoformat(b["end"].replace("Z", "+00:00")).astimezone(BRAZIL_TZ)
                busy_intervals.append((b_start, b_end))
            except Exception:
                pass

    # Consulta agendamentos já registrados no banco de dados para este formulário
    active_db = db
    close_local_db = False
    if active_db is None:
        try:
            active_db = database.SessionLocal()
            close_local_db = True
        except Exception:
            active_db = None

    if active_db:
        try:
            booked_responses = (
                active_db.query(FormResponseData)
                .filter(FormResponseData.form_id == form.id)
                .all()
            )
            for resp in booked_responses:
                for a in (resp.answers or []):
                    val = a.get("answer") or a.get("value")
                    if val and isinstance(val, str) and ("T" in val):
                        try:
                            clean_iso = val.strip().replace("Z", "+00:00")
                            b_start = datetime.fromisoformat(clean_iso)
                            if b_start.tzinfo is None:
                                b_start = b_start.replace(tzinfo=BRAZIL_TZ)
                            else:
                                b_start = b_start.astimezone(BRAZIL_TZ)
                            b_end = b_start + timedelta(minutes=slot_duration)
                            busy_intervals.append((b_start, b_end))
                        except Exception:
                            pass
        except Exception as db_err:
            logger.warning(f"Erro ao verificar agendamentos locais para ocupação: {db_err}")
        finally:
            if close_local_db and active_db:
                active_db.close()

    custom_settings = form.google_calendar_settings or {}
    if "time_ranges" in custom_settings and isinstance(custom_settings["time_ranges"], list) and len(custom_settings["time_ranges"]) > 0:
        raw_ranges = custom_settings["time_ranges"]
    elif "start_time" in custom_settings or "end_time" in custom_settings:
        raw_ranges = [{
            "start_time": custom_settings.get("start_time", start_time_str),
            "end_time": custom_settings.get("end_time", end_time_str)
        }]
    else:
        raw_ranges = settings_data.get("time_ranges", [{
            "start_time": start_time_str,
            "end_time": end_time_str
        }])

    time_ranges = []
    if isinstance(raw_ranges, list) and len(raw_ranges) > 0:
        for r in raw_ranges:
            if isinstance(r, dict) and "start_time" in r and "end_time" in r:
                try:
                    s_h, s_m = map(int, str(r["start_time"]).split(":"))
                    e_h, e_m = map(int, str(r["end_time"]).split(":"))
                    if (s_h, s_m) < (e_h, e_m):
                        time_ranges.append((s_h, s_m, e_h, e_m))
                except Exception:
                    pass

    if not time_ranges:
        time_ranges.append((9, 0, 18, 0))

    slots_by_date = {}
    current_d = start_date

    while current_d <= end_date:
        d_str = current_d.strftime("%Y-%m-%d")
        slots_by_date[d_str] = []

        # Verifica se o dia da semana atende (1=Segunda, 7=Domingo)
        if current_d.isoweekday() in working_days:
            for range_idx, (s_h, s_m, e_h, e_m) in enumerate(time_ranges):
                range_start_dt = datetime(current_d.year, current_d.month, current_d.day, s_h, s_m, tzinfo=BRAZIL_TZ)
                range_end_dt = datetime(current_d.year, current_d.month, current_d.day, e_h, e_m, tzinfo=BRAZIL_TZ)

                slot_start_dt = range_start_dt
                while slot_start_dt + timedelta(minutes=slot_duration) <= range_end_dt:
                    slot_end_dt = slot_start_dt + timedelta(minutes=slot_duration)

                    # Ignora horários passados
                    if slot_start_dt > now:
                        # Verifica sobreposição com intervalos ocupados da Google Agenda
                        is_busy = False
                        for b_start, b_end in busy_intervals:
                            if max(slot_start_dt, b_start) < min(slot_end_dt, b_end):
                                is_busy = True
                                break

                        # Regra de negócio aprovada: Horários ocupados NÃO aparecem na lista
                        if not is_busy:
                            slots_by_date[d_str].append({
                                "time": slot_start_dt.strftime("%H:%M"),
                                "end_time": slot_end_dt.strftime("%H:%M"),
                                "start_iso": slot_start_dt.isoformat(),
                                "end_iso": slot_end_dt.isoformat(),
                                "range_idx": range_idx
                            })

                    slot_start_dt += timedelta(minutes=slot_duration + buffer_minutes)

            # Ordena os horários do dia em ordem cronológica
            slots_by_date[d_str].sort(key=lambda s: s["start_iso"])

        current_d += timedelta(days=1)

    busy_list = [
        {
            "start": b_start.isoformat(),
            "end": b_end.isoformat()
        }
        for b_start, b_end in busy_intervals
    ]

    return {
        "settings": settings_data,
        "slots_by_date": slots_by_date,
        "busy_intervals": busy_list
    }

def create_calendar_event(
    access_token: str,
    summary: str,
    description: str,
    start_iso: str,
    end_iso: str,
    attendee_email: str = None,
    color_id: str = None
) -> dict:
    """Cria um evento no calendário primário do Google."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Adiciona o emoji correspondente à cor no início do título para que o convidado
    # também visualize a mesma cor na agenda pessoal e no e-mail dele
    final_summary = (summary or "Reunião").strip()
    if color_id and str(color_id).strip():
        cid = str(color_id).strip()
        emoji = GOOGLE_CALENDAR_COLOR_EMOJIS.get(cid)
        if emoji and not any(final_summary.startswith(em) for em in GOOGLE_CALENDAR_COLOR_EMOJIS.values()):
            final_summary = f"{emoji} {final_summary}"

    event_body = {
        "summary": final_summary,
        "description": description,
        "start": {"dateTime": start_iso, "timeZone": "America/Sao_Paulo"},
        "end": {"dateTime": end_iso, "timeZone": "America/Sao_Paulo"},
    }
    if color_id and str(color_id).strip():
        event_body["colorId"] = str(color_id).strip()
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(GOOGLE_CALENDAR_EVENTS_URL, headers=headers, json=event_body)
        if resp.status_code in [200, 201]:
            return resp.json()
        logger.error(f"Erro ao criar evento na Google Calendar: {resp.text}")
        raise ValueError(f"Falha ao criar evento: {resp.text}")

def process_calendar_booking_for_submission(
    form_id: int,
    answers: list,
    contact_name: str = None,
    contact_email: str = None,
    contact_phone: str = None,
    response_id: int = None
):
    """Executado em background após submissão de formulário para criar agendamento no Google Calendar."""
    db = database.SessionLocal()
    try:
        form = db.query(Form).filter(Form.id == form_id).first()
        if not form or not form.google_calendar_connected or not form.google_calendar_access_token:
            logger.warning(f"[GOOGLE CALENDAR EVENT] Form {form_id} não possui Google Calendar conectado ou token.")
            return

        # Mapa de tipos de questões baseado no cadastro do formulário
        question_types = {q.get("id"): q.get("type") for q in (form.questions or []) if isinstance(q, dict)}

        # Localiza se há resposta para questão do tipo google_calendar
        booking_val = None
        for a in answers:
            q_id = a.get("question_id") or a.get("id")
            q_type = a.get("question_type") or a.get("type") or question_types.get(q_id)
            val = a.get("answer") or a.get("value")
            if not val:
                continue

            str_val = str(val).strip() if isinstance(val, str) else ""
            if (
                q_type == "google_calendar"
                or bool(ISO_DATETIME_REGEX.match(str_val))
                or "data/hora" in str(a.get("question_title", "")).lower()
            ):
                booking_val = val
                break

        if not booking_val:
            logger.warning(f"[GOOGLE CALENDAR EVENT] Nenhuma resposta de agendamento identificada para o form {form_id}.")
            return

        start_iso = None
        end_iso = None
        if isinstance(booking_val, dict):
            start_iso = booking_val.get("start_iso")
            end_iso = booking_val.get("end_iso")
        elif isinstance(booking_val, str) and booking_val:
            # Pode ser start_iso direto ou string de data/hora
            start_iso = booking_val.strip()

        if not start_iso:
            logger.warning(f"[GOOGLE CALENDAR EVENT] start_iso não extraído para form {form_id}.")
            return

        duration = 60
        if form.google_calendar_settings and "slot_duration" in form.google_calendar_settings:
            try:
                duration = int(form.google_calendar_settings["slot_duration"])
            except Exception:
                duration = 60

        try:
            st = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
            if st.tzinfo is None:
                st = st.replace(tzinfo=BRAZIL_TZ)
            start_iso = st.isoformat()
            if not end_iso:
                et = st + timedelta(minutes=duration)
                end_iso = et.isoformat()
            else:
                et = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
                if et.tzinfo is None:
                    et = et.replace(tzinfo=BRAZIL_TZ)
                end_iso = et.isoformat()
        except Exception as parse_err:
            logger.error(f"[GOOGLE CALENDAR EVENT ERROR] Erro ao parsear data/hora do agendamento ({start_iso}): {parse_err}")
            return

        access_token = decrypt_token(form.google_calendar_access_token)
        cal_settings = {**DEFAULT_CALENDAR_SETTINGS, **(form.google_calendar_settings or {})}

        # Formata respostas para a descrição
        formatted_answers = []
        for ans in answers:
            q_title = ans.get("question_title") or ans.get("title") or "Pergunta"
            val = ans.get("answer") or ans.get("value")
            if val is not None and str(val).strip():
                formatted_answers.append(f"• {q_title}: {format_answer_for_display(val)}")
        answers_str = "\n".join(formatted_answers) if formatted_answers else "Nenhuma resposta adicional."

        template_title = cal_settings.get("event_title") or DEFAULT_CALENDAR_SETTINGS["event_title"]
        template_desc = cal_settings.get("event_description") or DEFAULT_CALENDAR_SETTINGS["event_description"]
        color_id = cal_settings.get("event_color_id") or "9"

        placeholders = {
            "{nome}": contact_name or "Cliente",
            "{formulario}": form.title or "Formulário",
            "{email}": contact_email or "Não informado",
            "{telefone}": contact_phone or "Não informado",
            "{respostas}": answers_str
        }

        summary = template_title
        description = template_desc
        for tag, replacement in placeholders.items():
            summary = summary.replace(tag, replacement)
            description = description.replace(tag, replacement)

        created_event = None
        try:
            created_event = create_calendar_event(
                access_token=access_token,
                summary=summary,
                description=description,
                start_iso=start_iso,
                end_iso=end_iso,
                attendee_email=contact_email if contact_email and "@" in contact_email else None,
                color_id=color_id
            )
            logger.info(f"[GOOGLE CALENDAR EVENT] Evento criado com sucesso para o form {form.id} - {summary}")
        except Exception as evt_err:
            # Tenta renovar o token e tentar novamente
            if form.google_calendar_refresh_token:
                try:
                    new_token = refresh_google_access_token(form, db)
                    created_event = create_calendar_event(
                        access_token=new_token,
                        summary=summary,
                        description=description,
                        start_iso=start_iso,
                        end_iso=end_iso,
                        attendee_email=contact_email if contact_email and "@" in contact_email else None,
                        color_id=color_id
                    )
                    logger.info(f"[GOOGLE CALENDAR EVENT] Evento criado após renovação de token para o form {form.id}")
                except Exception as retry_err:
                    logger.error(f"[GOOGLE CALENDAR EVENT ERROR] Falha ao criar evento após renovação: {retry_err}")
            else:
                logger.error(f"[GOOGLE CALENDAR EVENT ERROR] Falha ao criar evento na Google Calendar: {evt_err}")

        # Salva o ID do evento na resposta para permitir exclusão/cancelamento futuro
        if created_event and response_id:
            try:
                resp_rec = db.query(FormResponseData).filter(FormResponseData.id == response_id).first()
                if resp_rec:
                    resp_rec.google_calendar_event_id = created_event.get("id")
                    db.commit()
            except Exception as save_err:
                logger.error(f"[GOOGLE CALENDAR EVENT] Erro ao salvar event_id na resposta: {save_err}")
    finally:
        db.close()


def delete_calendar_event(access_token: str, event_id: str) -> bool:
    """Exclui um evento do Google Calendar primário pelo seu event_id."""
    if not event_id:
        return True
    url = f"{GOOGLE_CALENDAR_EVENTS_URL}/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=10.0) as client:
        resp = client.delete(url, headers=headers)
        if resp.status_code in [200, 204, 404, 410]:
            logger.info(f"[GOOGLE CALENDAR DELETE] Evento {event_id} excluído com sucesso (status {resp.status_code}).")
            return True
        logger.error(f"[GOOGLE CALENDAR DELETE ERROR] Status {resp.status_code}: {resp.text}")
        raise ValueError(f"Falha ao excluir evento no Google Calendar: {resp.text}")


def find_and_delete_calendar_event(
    form: Form,
    db: Session,
    event_id: str = None,
    start_iso: str = None
) -> bool:
    """Localiza e exclui o evento correspondente no Google Calendar."""
    if not form or not form.google_calendar_connected or not form.google_calendar_access_token:
        return True

    access_token = decrypt_token(form.google_calendar_access_token)
    if not access_token:
        return False

    def do_delete(token: str) -> bool:
        if event_id:
            return delete_calendar_event(token, event_id)
        elif start_iso:
            try:
                st = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
                if st.tzinfo is None:
                    st = st.replace(tzinfo=BRAZIL_TZ)
                min_t = (st - timedelta(minutes=15)).astimezone(timezone.utc).isoformat()
                max_t = (st + timedelta(minutes=15)).astimezone(timezone.utc).isoformat()
                headers = {"Authorization": f"Bearer {token}"}
                with httpx.Client(timeout=10.0) as client:
                    list_res = client.get(
                        f"{GOOGLE_CALENDAR_EVENTS_URL}?timeMin={min_t}&timeMax={max_t}",
                        headers=headers
                    )
                    if list_res.status_code == 200:
                        items = list_res.json().get("items", [])
                        for item in items:
                            ev_id = item.get("id")
                            if ev_id:
                                delete_calendar_event(token, ev_id)
                                return True
            except Exception as search_err:
                logger.error(f"[GOOGLE CALENDAR SEARCH ERROR] Erro ao localizar evento por horário: {search_err}")
        return False

    try:
        return do_delete(access_token)
    except Exception as first_err:
        if form.google_calendar_refresh_token:
            try:
                new_token = refresh_google_access_token(form, db)
                return do_delete(new_token)
            except Exception as ref_err:
                logger.error(f"[GOOGLE CALENDAR DELETE] Falha após renovação de token: {ref_err}")
                return False
        logger.error(f"[GOOGLE CALENDAR DELETE] Falha ao excluir evento: {first_err}")
        return False
    finally:
        db.close()


def schedule_booking_webhook_reminders(
    db: Session,
    form: Form,
    response_record: FormResponseData,
    answers: list
):
    """
    Agenda lembretes via webhook para o agendamento da reunião:
    1. Lembrete Matinal no dia do agendamento (ex: às 09:00).
    2. Lembrete de Antecedência minutos antes da reunião (ex: 30 minutos antes).
    """
    # 1. Verifica se há respostas com agendamento
    booking_iso = None
    for ans in answers:
        q_type = ans.get("question_type") or ans.get("type")
        val = ans.get("answer") or ans.get("value")
        if not val or not isinstance(val, str):
            continue
        str_val = val.strip()
        if (q_type == "google_calendar") or bool(ISO_DATETIME_REGEX.match(str_val)):
            booking_iso = str_val
            break

    if not booking_iso:
        return

    # 2. Obtém configurações de lembrete
    cal_settings = {**DEFAULT_CALENDAR_SETTINGS, **(form.google_calendar_settings or {})}
    reminder_webhook_url = (cal_settings.get("reminder_webhook_url") or "").strip()
    target_webhook_url = reminder_webhook_url or (form.webhook_url or "").strip()

    if not target_webhook_url:
        logger.info(f"Nenhum webhook configurado para agendar lembretes do formulário {form.id}.")
        return

    # 3. Faz o parse do horário agendado
    try:
        booking_dt = datetime.fromisoformat(booking_iso)
        if booking_dt.tzinfo is None:
            booking_dt = booking_dt.replace(tzinfo=BRAZIL_TZ)
        else:
            booking_dt = booking_dt.astimezone(BRAZIL_TZ)
    except Exception as e:
        logger.warning(f"Não foi possível interpretar data/hora do agendamento '{booking_iso}': {e}")
        return

    now_br = datetime.now(BRAZIL_TZ)
    formatted_dt = format_answer_for_display(booking_iso)

    # 4. Lembrete Matinal no Dia da Reunião
    if cal_settings.get("reminder_morning_enabled", True):
        morning_time_str = cal_settings.get("reminder_morning_time", "09:00")
        try:
            m_hour, m_minute = map(int, morning_time_str.split(":"))
        except Exception:
            m_hour, m_minute = 9, 0

        morning_dt = booking_dt.replace(hour=m_hour, minute=m_minute, second=0, microsecond=0)
        # Só agenda se for no futuro
        if morning_dt > now_br:
            morning_utc = morning_dt.astimezone(timezone.utc)
            payload_morning = {
                "event": "booking_reminder_morning",
                "reminder_type": "morning",
                "form_id": form.id,
                "form_title": form.title,
                "form_slug": form.slug,
                "response_id": response_record.id,
                "contact_name": response_record.contact_name or "Cliente",
                "contact_email": response_record.contact_email or "",
                "contact_phone": response_record.contact_phone or "",
                "scheduled_datetime": booking_iso,
                "formatted_datetime": formatted_dt,
                "scheduled_for": morning_dt.strftime("%d/%m/%Y %H:%M"),
                "reminder_label": f"Lembrete do dia da reunião ({morning_time_str})"
            }
            db.add(ScheduledWebhook(
                form_id=form.id,
                response_id=response_record.id,
                reminder_type="morning",
                scheduled_for=morning_utc,
                webhook_url=target_webhook_url,
                payload=payload_morning,
                status="PENDING"
            ))
            logger.info(f"[REMINDER SCHEDULED] Lembrete matinal agendado para {morning_dt} (UTC: {morning_utc})")

    # 5. Lembrete de Antecedência Imediata (X minutos antes)
    if cal_settings.get("reminder_before_enabled", True):
        try:
            minutes_before = int(cal_settings.get("reminder_before_minutes", 30))
        except Exception:
            minutes_before = 30

        before_dt = booking_dt - timedelta(minutes=minutes_before)
        # Só agenda se for no futuro
        if before_dt > now_br:
            before_utc = before_dt.astimezone(timezone.utc)
            payload_before = {
                "event": "booking_reminder_before_meeting",
                "reminder_type": "before_meeting",
                "minutes_before": minutes_before,
                "form_id": form.id,
                "form_title": form.title,
                "form_slug": form.slug,
                "response_id": response_record.id,
                "contact_name": response_record.contact_name or "Cliente",
                "contact_email": response_record.contact_email or "",
                "contact_phone": response_record.contact_phone or "",
                "scheduled_datetime": booking_iso,
                "formatted_datetime": formatted_dt,
                "scheduled_for": before_dt.strftime("%d/%m/%Y %H:%M"),
                "reminder_label": f"Lembrete {minutes_before} minutos antes da reunião"
            }
            db.add(ScheduledWebhook(
                form_id=form.id,
                response_id=response_record.id,
                reminder_type="before_meeting",
                scheduled_for=before_utc,
                webhook_url=target_webhook_url,
                payload=payload_before,
                status="PENDING"
            ))
            logger.info(f"[REMINDER SCHEDULED] Lembrete de antecedência ({minutes_before}m) agendado para {before_dt} (UTC: {before_utc})")

    db.commit()
