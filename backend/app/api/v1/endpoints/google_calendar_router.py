import re
import math
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.models.form import Form, FormResponseData, ScheduledWebhook, WebhookDeliveryLog
from app.core.formatters import format_answer_for_display
from app.core.ssrf import is_ssrf_safe_url
from app.core.logger import logger
import httpx

router = APIRouter(prefix="/forms", tags=["google-calendar"])

ISO_DATETIME_REGEX = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})")

@router.get("/{form_id}/integrations/google-calendar/bookings")
def get_form_calendar_bookings(
    form_id: int,
    page: int = Query(1, ge=1, description="Número da página"),
    limit: int = Query(20, ge=1, le=100, description="Quantidade de itens por página"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retorna a lista paginada de agendamentos (datas e horários marcados) realizados
    através do formulário conectado à Google Agenda.
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    # Busca todas as respostas deste formulário ordenadas da mais recente para a mais antiga
    responses = (
        db.query(FormResponseData)
        .filter(FormResponseData.form_id == form_id)
        .order_by(FormResponseData.created_at.desc())
        .all()
    )

    bookings = []
    for r in responses:
        answers = r.answers or []
        for ans in answers:
            q_type = ans.get("question_type") or ans.get("type")
            q_title = ans.get("question_title") or ans.get("title") or "Agendamento"
            val = ans.get("answer") or ans.get("value")

            if not val or not isinstance(val, str):
                continue

            str_val = val.strip()
            # Identifica respostas de agendamento por tipo google_calendar ou padrão ISO datetime
            is_calendar_ans = (q_type == "google_calendar") or bool(ISO_DATETIME_REGEX.match(str_val))

            if is_calendar_ans:
                formatted_dt = format_answer_for_display(str_val)
                bookings.append({
                    "response_id": r.id,
                    "contact_name": r.contact_name or "Anônimo",
                    "contact_email": r.contact_email or "",
                    "contact_phone": r.contact_phone or "",
                    "question_title": q_title,
                    "scheduled_iso": str_val,
                    "formatted_datetime": formatted_dt,
                    "response_status": r.status or "CONCLUIDO",
                    "submitted_at": r.created_at.isoformat() if r.created_at else None,
                    "google_calendar_connected": bool(form.google_calendar_connected)
                })

    total = len(bookings)
    total_pages = max(1, math.ceil(total / limit)) if total > 0 else 1
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_bookings = bookings[start_idx:end_idx]

    return {
        "success": True,
        "form_id": form.id,
        "google_calendar_connected": bool(form.google_calendar_connected),
        "google_calendar_email": form.google_calendar_email or "",
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "bookings": paginated_bookings
    }


@router.get("/{form_id}/integrations/google-calendar/reminders")
def get_form_scheduled_reminders(
    form_id: int,
    page: int = Query(1, ge=1, description="Número da página"),
    limit: int = Query(20, ge=1, le=100, description="Quantidade de itens por página"),
    status_filter: Optional[str] = Query(None, description="Filtro de status: all, dispatched, pending"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retorna a lista paginada de lembretes e webhooks agendados para este formulário (20 por página).
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    base_query = db.query(ScheduledWebhook).filter(ScheduledWebhook.form_id == form_id)

    # Contagens gerais para as abas de filtro
    total_all = base_query.count()
    total_dispatched = base_query.filter(ScheduledWebhook.status.in_(["SENT", "FAILED"])).count()
    total_pending = base_query.filter(ScheduledWebhook.status == "PENDING").count()

    filtered_query = base_query
    if status_filter == "dispatched":
        filtered_query = base_query.filter(ScheduledWebhook.status.in_(["SENT", "FAILED"]))
    elif status_filter == "pending":
        filtered_query = base_query.filter(ScheduledWebhook.status == "PENDING")

    total = filtered_query.count()
    total_pages = max(1, math.ceil(total / limit)) if total > 0 else 1

    reminders = (
        filtered_query
        .order_by(ScheduledWebhook.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for r in reminders:
        p = r.payload or {}
        items.append({
            "id": r.id,
            "response_id": r.response_id,
            "reminder_type": r.reminder_type,
            "reminder_label": p.get("reminder_label") or ("Lembrete Matinal" if r.reminder_type == "morning" else ("Disparo de Teste" if r.reminder_type == "test" else "Lembrete Antecedência")),
            "contact_name": p.get("contact_name") or ("Teste Manual" if r.reminder_type == "test" else "Contato"),
            "contact_phone": p.get("contact_phone") or "",
            "contact_email": p.get("contact_email") or "",
            "meeting_datetime": p.get("formatted_datetime") or p.get("scheduled_datetime") or "",
            "scheduled_for_iso": r.scheduled_for.isoformat() if r.scheduled_for else None,
            "webhook_url": r.webhook_url,
            "status": r.status,
            "status_code": r.status_code,
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {
        "success": True,
        "form_id": form.id,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "total_all": total_all,
        "total_dispatched": total_dispatched,
        "total_pending": total_pending,
        "reminders": items
    }


@router.post("/{form_id}/integrations/google-calendar/reminders/test")
def test_dispatch_calendar_reminder(
    form_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dispara imediatamente um webhook de teste de lembrete com payload simulado
    para validar a integração com n8n, Zapier, WhatsApp ou CRM.
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    webhook_url = (payload.get("webhook_url") or "").strip()
    if not webhook_url:
        webhook_url = (form.webhook_url or "").strip()

    if not webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma URL de webhook informada ou configurada no formulário."
        )

    is_safe, reason = is_ssrf_safe_url(webhook_url)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL bloqueada por segurança: {reason}"
        )

    reminder_type = payload.get("reminder_type", "morning")
    test_payload = {
        "event": "booking_reminder_morning" if reminder_type == "morning" else "booking_reminder_before_meeting",
        "reminder_type": reminder_type,
        "is_test": True,
        "form_id": form.id,
        "form_title": form.title,
        "contact_name": "Lead Teste",
        "contact_email": current_user.email,
        "contact_phone": "+55 85 99999-9999",
        "scheduled_datetime": "2026-10-23T14:00:00-03:00",
        "formatted_datetime": "23/10/26 14:00",
        "reminder_label": "Teste de Lembrete de Reunião"
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(webhook_url, json=test_payload)
            success = (200 <= resp.status_code < 300)
            status_code = resp.status_code
            if not success:
                raw_text = (resp.text or "").strip()
                if "<!doctype html" in raw_text.lower() or "<html" in raw_text.lower():
                    if status_code == 530:
                        error_message = "HTTP 530: Servidor ou túnel Cloudflare offline (Error 1033)."
                    elif status_code == 502:
                        error_message = "HTTP 502: Bad Gateway no servidor de destino."
                    elif status_code == 504:
                        error_message = "HTTP 504: Gateway Timeout no servidor de destino."
                    else:
                        error_message = f"HTTP {status_code}: Servidor retornou uma página HTML de erro."
                else:
                    error_message = f"HTTP {status_code}: {raw_text[:200]}"
            else:
                error_message = None
    except Exception as e:
        success = False
        status_code = None
        error_message = str(e)

    # Registra no histórico de logs
    try:
        log_entry = WebhookDeliveryLog(
            form_id=form.id,
            webhook_url=webhook_url,
            status_code=status_code,
            success=success,
            error_message=error_message,
            duration_ms=100
        )
        db.add(log_entry)

        now_utc = datetime.now(timezone.utc)
        test_scheduled = ScheduledWebhook(
            form_id=form.id,
            reminder_type="test",
            scheduled_for=now_utc,
            webhook_url=webhook_url,
            payload=test_payload,
            status="SENT" if success else "FAILED",
            status_code=status_code,
            sent_at=now_utc,
            error_message=error_message
        )
        db.add(test_scheduled)
        db.commit()
    except Exception as db_err:
        logger.error(f"Erro ao registrar log de teste de lembrete: {db_err}")

    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao enviar webhook de teste: {error_message}"
        )

    return {
        "success": True,
        "message": f"Webhook de teste enviado com sucesso! Status: {status_code}",
        "status_code": status_code
    }


@router.patch("/{form_id}/integrations/google-calendar/reminders/{reminder_id}")
def update_scheduled_reminder(
    form_id: int,
    reminder_id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Atualiza as informações de um lembrete agendado (data/hora prevista ou dados do destinatário).
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    reminder = db.query(ScheduledWebhook).filter(
        ScheduledWebhook.id == reminder_id,
        ScheduledWebhook.form_id == form_id
    ).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lembrete não encontrado."
        )

    # Atualiza scheduled_for se informado
    scheduled_for_raw = data.get("scheduled_for")
    if scheduled_for_raw:
        try:
            parsed_dt = datetime.fromisoformat(str(scheduled_for_raw).replace("Z", "+00:00"))
            if parsed_dt.tzinfo is None:
                parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
            reminder.scheduled_for = parsed_dt.astimezone(timezone.utc)
        except Exception as dt_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de data inválido: {dt_err}"
            )

    # Atualiza dados no payload (nome, telefone, email)
    p = dict(reminder.payload or {})
    if "contact_name" in data:
        p["contact_name"] = str(data["contact_name"]).strip()
    if "contact_phone" in data:
        p["contact_phone"] = str(data["contact_phone"]).strip()
    if "contact_email" in data:
        p["contact_email"] = str(data["contact_email"]).strip()

    reminder.payload = p
    flag_modified(reminder, "payload")

    db.commit()
    db.refresh(reminder)

    return {
        "success": True,
        "message": "Informações do lembrete atualizadas com sucesso.",
        "reminder": {
            "id": reminder.id,
            "scheduled_for_iso": reminder.scheduled_for.isoformat() if reminder.scheduled_for else None,
            "contact_name": (reminder.payload or {}).get("contact_name"),
            "contact_phone": (reminder.payload or {}).get("contact_phone"),
            "status": reminder.status
        }
    }


@router.delete("/{form_id}/integrations/google-calendar/reminders/{reminder_id}")
def delete_scheduled_reminder(
    form_id: int,
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Exclui um lembrete agendado ou histórico de disparo do formulário.
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    reminder = db.query(ScheduledWebhook).filter(
        ScheduledWebhook.id == reminder_id,
        ScheduledWebhook.form_id == form_id
    ).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lembrete não encontrado."
        )

    db.delete(reminder)
    db.commit()

    return {
        "success": True,
        "message": "Lembrete excluído com sucesso."
    }


@router.post("/{form_id}/integrations/google-calendar/reminders/{reminder_id}/dispatch")
def manual_dispatch_scheduled_reminder(
    form_id: int,
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dispara imediatamente o webhook deste lembrete específico de forma manual.
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    reminder = db.query(ScheduledWebhook).filter(
        ScheduledWebhook.id == reminder_id,
        ScheduledWebhook.form_id == form_id
    ).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lembrete não encontrado."
        )

    target_url = (reminder.webhook_url or form.webhook_url or "").strip()
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma URL de webhook configurada para este lembrete."
        )

    is_safe, reason = is_ssrf_safe_url(target_url)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL bloqueada por segurança: {reason}"
        )

    payload = dict(reminder.payload or {})
    payload["manual_dispatch"] = True
    now_utc = datetime.now(timezone.utc)
    payload["dispatched_at"] = now_utc.isoformat()

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(target_url, json=payload)
            status_code = resp.status_code
            success = (200 <= status_code < 300)
            if not success:
                raw_text = (resp.text or "").strip()
                if "<!doctype html" in raw_text.lower() or "<html" in raw_text.lower():
                    if status_code == 530:
                        error_message = "HTTP 530: Servidor ou túnel Cloudflare offline (Error 1033)."
                    elif status_code == 502:
                        error_message = "HTTP 502: Bad Gateway no servidor de destino."
                    elif status_code == 504:
                        error_message = "HTTP 504: Gateway Timeout no servidor de destino."
                    else:
                        error_message = f"HTTP {status_code}: Servidor retornou uma página HTML de erro."
                else:
                    error_message = f"HTTP {status_code}: {raw_text[:200]}"
            else:
                error_message = None
    except Exception as e:
        success = False
        status_code = None
        error_message = str(e)

    # Atualiza o lembrete
    reminder.status = "SENT" if success else "FAILED"
    reminder.status_code = status_code
    reminder.sent_at = now_utc
    reminder.error_message = error_message
    reminder.payload = payload
    flag_modified(reminder, "payload")

    # Registra no log de auditoria
    try:
        log_entry = WebhookDeliveryLog(
            form_id=form.id,
            webhook_url=target_url,
            status_code=status_code,
            success=success,
            error_message=error_message,
            duration_ms=100
        )
        db.add(log_entry)
        db.commit()
    except Exception as log_err:
        logger.error(f"Erro ao salvar log de entrega manual: {log_err}")
        db.commit()

    return {
        "success": success,
        "status_code": status_code,
        "error_message": error_message,
        "message": f"Webhook disparado com sucesso! Status: {status_code}" if success else f"Falha no disparo: {error_message}"
    }


@router.delete("/{form_id}/integrations/google-calendar/bookings/{response_id}")
def delete_calendar_booking(
    form_id: int,
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Exclui um agendamento realizado:
    1. Cancela/exclui o evento correspondente na Google Agenda conectada;
    2. Remove os lembretes agendados associados (scheduled_webhooks);
    3. Exclui o registro da resposta do formulário;
    4. Atualiza os contadores de respostas do formulário.
    """
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulário não encontrado."
        )

    response = db.query(FormResponseData).filter(
        FormResponseData.id == response_id,
        FormResponseData.form_id == form_id
    ).first()
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento/Resposta não encontrada."
        )

    # 1. Localiza a data do agendamento nas respostas (para busca fallback se necessário)
    booking_iso = None
    for a in (response.answers or []):
        val = a.get("answer") or a.get("value")
        if val and isinstance(val, str) and ISO_DATETIME_REGEX.match(val.strip()):
            booking_iso = val.strip()
            break

    # 2. Exclui o evento da Google Agenda (se conectado)
    if form.google_calendar_connected and form.google_calendar_access_token:
        try:
            from app.services.google_calendar import find_and_delete_calendar_event
            find_and_delete_calendar_event(
                form=form,
                db=db,
                event_id=response.google_calendar_event_id,
                start_iso=booking_iso
            )
        except Exception as cal_err:
            logger.error(f"[DELETE BOOKING] Erro ao excluir evento da Google Calendar: {cal_err}")

    # 3. Exclui os lembretes agendados vinculados a este response_id
    deleted_reminders = db.query(ScheduledWebhook).filter(
        ScheduledWebhook.response_id == response_id
    ).delete(synchronize_session=False)
    logger.info(f"[DELETE BOOKING] {deleted_reminders} lembretes agendados excluídos para a resposta {response_id}.")

    # 4. Exclui a resposta do formulário
    db.delete(response)

    if form.responses_count and form.responses_count > 0:
        form.responses_count -= 1

    db.commit()

    return {
        "success": True,
        "message": "Agendamento, lembretes e evento da Google Agenda excluídos com sucesso."
    }
