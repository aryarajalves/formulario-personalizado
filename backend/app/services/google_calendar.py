import urllib.parse
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logger import logger
from app.models.form import Form

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email"
]

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
    """Atualiza o access_token utilizando o refresh_token salvo."""
    if not form.google_calendar_refresh_token:
        raise ValueError("Refresh token não disponível.")
    
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": form.google_calendar_refresh_token,
        "grant_type": "refresh_token"
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(GOOGLE_TOKEN_URL, data=data)
        if resp.status_code != 200:
            logger.error(f"Erro ao renovar token Google: {resp.text}")
            raise ValueError("Não foi possível renovar o token da Google.")
        
        token_data = resp.json()
        new_token = token_data.get("access_token")
        form.google_calendar_access_token = new_token
        db.commit()
        return new_token

def create_calendar_event(
    access_token: str,
    summary: str,
    description: str,
    start_iso: str,
    end_iso: str,
    attendee_email: str = None
) -> dict:
    """Cria um evento no calendário primário do Google."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_iso, "timeZone": "America/Sao_Paulo"},
        "end": {"dateTime": end_iso, "timeZone": "America/Sao_Paulo"},
    }
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(GOOGLE_CALENDAR_EVENTS_URL, headers=headers, json=event_body)
        if resp.status_code in [200, 201]:
            return resp.json()
        logger.error(f"Erro ao criar evento na Google Calendar: {resp.text}")
        raise ValueError(f"Falha ao criar evento: {resp.text}")
