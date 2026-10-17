import secrets
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import RedirectResponse, Response

from sqlalchemy import func, case
from sqlalchemy.orm import Session

import time
from app.core import database
from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.models.form import Form, FormResponseData, WebhookDeliveryLog
from app.schemas.form import FormCreate, FormResponse, FormUpdate
from app.core.logger import logger
from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.core.encryption import encrypt_token, decrypt_token
from app.core.ssrf import is_ssrf_safe_url
from app.services import google_calendar

router = APIRouter(prefix="/forms", tags=["forms"])
BRASILIA_TZ = ZoneInfo("America/Sao_Paulo")


def generate_unique_slug(db: Session, length: int = 8) -> str:
    for _ in range(10):
        slug = secrets.token_urlsafe(length)[:length].replace("-", "").replace("_", "")
        if not db.query(Form).filter(Form.slug == slug).first():
            return slug
    return secrets.token_hex(4)

@router.get("", response_model=List[FormResponse])
def list_forms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os formulários do usuário autenticado convertendo os horários para o fuso de Brasília."""
    logger.info(f"Listando formulários do usuário: {current_user.email}")
    forms = db.query(Form).filter(Form.user_id == current_user.id).order_by(Form.updated_at.desc()).all()
    for f in forms:
        if f.created_at:
            dt_utc = f.created_at if f.created_at.tzinfo else f.created_at.replace(tzinfo=timezone.utc)
            f.created_at = dt_utc.astimezone(BRASILIA_TZ)
        if f.updated_at:
            dt_utc = f.updated_at if f.updated_at.tzinfo else f.updated_at.replace(tzinfo=timezone.utc)
            f.updated_at = dt_utc.astimezone(BRASILIA_TZ)
    return forms

@router.post("", response_model=FormResponse, status_code=status.HTTP_201_CREATED)
def create_form(
    form_in: FormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um novo formulário com título e gera slug único."""
    title = form_in.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="O título do formulário não pode estar vazio.")

    logger.info(f"Criando novo formulário '{title}' para o usuário {current_user.email}")
    slug = generate_unique_slug(db)
    
    new_form = Form(
        title=title,
        slug=slug,
        status="PUBLICADO",
        responses_count=0,
        completion_rate=0.0,
        questions=form_in.questions or [],
        user_id=current_user.id
    )
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    logger.info(f"Formulário '{title}' criado com sucesso com ID {new_form.id} e slug {slug}")
    return new_form

@router.get("/{form_id}", response_model=FormResponse)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtém detalhes e questões de um formulário."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")
    return form

@router.put("/{form_id}", response_model=FormResponse)
def update_form(
    form_id: int,
    form_in: FormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza dados e questões do formulário."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    if form_in.title is not None:
        title = form_in.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="O título não pode estar vazio.")
        form.title = title

    if form_in.status is not None:
        form.status = form_in.status

    if form_in.questions is not None:
        form.questions = form_in.questions

    if form_in.welcome_screen is not None:
        form.welcome_screen = form_in.welcome_screen

    if form_in.ending_screens is not None:
        form.ending_screens = form_in.ending_screens

    if form_in.theme is not None:
        form.theme = form_in.theme

    if form_in.webhook_url is not None:
        clean_url = form_in.webhook_url.strip()
        if clean_url:
            is_safe, reason = is_ssrf_safe_url(clean_url)
            if not is_safe:
                raise HTTPException(status_code=400, detail=f"URL de Webhook inválida por segurança: {reason}")
            form.webhook_url = clean_url
        else:
            form.webhook_url = None

    if form_in.google_calendar_connected is not None:
        form.google_calendar_connected = form_in.google_calendar_connected

    if form_in.google_calendar_email is not None:
        form.google_calendar_email = form_in.google_calendar_email.strip() or None

    db.commit()
    db.refresh(form)
    logger.info(f"Formulário {form_id} atualizado com sucesso por {current_user.email}")
    return form

@router.post("/{form_id}/test-webhook")
def execute_test_webhook(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envia uma carga de teste para a URL de webhook cadastrada no formulário e registra no histórico de auditoria."""
    import httpx
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")
    
    if not form.webhook_url:
        raise HTTPException(status_code=400, detail="Nenhuma URL de webhook configurada para este formulário.")

    # Validação rigorosa Anti-SSRF antes do disparo
    is_safe, reason = is_ssrf_safe_url(form.webhook_url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"URL de Webhook bloqueada por segurança: {reason}")

    payload = {
        "event": "form_submission",
        "form_id": form.id,
        "form_title": form.title,
        "form_slug": form.slug,
        "is_test": True,
        "answers": [
            {"question": "Qual é o seu nome completo?", "answer": "João da Silva"},
            {"question": "Qual é o seu WhatsApp?", "answer": "+5511999998888"},
            {"question": "Qual é o seu e-mail?", "answer": "joao@exemplo.com"}
        ],
        "created_at": form.created_at.isoformat() if form.created_at else ""
    }

    start_time = time.time()
    status_code = None
    success = False
    error_message = None

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(form.webhook_url, json=payload)
            status_code = resp.status_code
            success = (200 <= resp.status_code < 300)
            if not success:
                error_message = f"HTTP {resp.status_code}: {resp.text[:150]}"
            logger.info(f"Webhook disparado para {form.webhook_url}: Status {resp.status_code}")
    except Exception as e:
        error_message = str(e)
        logger.error(f"Falha ao disparar webhook para {form.webhook_url}: {e}")

    duration_ms = int((time.time() - start_time) * 1000)

    # Registra no log de auditoria
    log_entry = WebhookDeliveryLog(
        form_id=form.id,
        response_id=None,
        webhook_url=form.webhook_url,
        status_code=status_code,
        success=success,
        error_message=error_message,
        duration_ms=duration_ms
    )
    db.add(log_entry)
    db.commit()

    if not success:
        raise HTTPException(status_code=502, detail=f"Erro ao conectar ao webhook: {error_message or 'Falha'}")

    return {
        "success": True,
        "status_code": status_code,
        "duration_ms": duration_ms,
        "message": f"Webhook disparado com sucesso! Resposta da plataforma: {status_code}"
    }

@router.get("/{form_id}/integrations/google-calendar/auth-url")
def get_google_calendar_auth_url(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gera a URL de consentimento OAuth 2.0 da Google para conectar a agenda."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_CLIENT_ID não configurado no servidor. Preencha as credenciais no .env."
        )

    auth_url = google_calendar.get_google_auth_url(form_id=form.id)
    return {"auth_url": auth_url}

@router.get("/integrations/google-calendar/callback")
def google_calendar_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Callback chamado pela Google após consentimento do usuário."""
    try:
        form_id = int(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="State inválido no callback do Google.")

    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado para este retorno.")

    try:
        token_data = google_calendar.exchange_code_for_tokens(code)
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        
        # Recupera o email da conta Google conectada
        user_email = google_calendar.get_user_email_from_token(access_token)
        
        form.google_calendar_connected = True
        form.google_calendar_email = user_email or form.google_calendar_email or "Conta Conectada"
        form.google_calendar_access_token = encrypt_token(access_token)
        if refresh_token:
            form.google_calendar_refresh_token = encrypt_token(refresh_token)
        
        db.commit()
        db.refresh(form)
        logger.info(f"Google Calendar conectado com sucesso para o formulário {form.id} ({form.google_calendar_email})")

        # Redireciona o popup/navegador para fechar ou voltar com sucesso
        return RedirectResponse(url=f"/#form-{form.id}-google-calendar-success")
    except Exception as e:
        logger.error(f"Erro no processamento do callback do Google Calendar: {e}")
        return RedirectResponse(url=f"/#form-{form.id}-google-calendar-error?error={str(e)}")

@router.post("/{form_id}/integrations/google-calendar/disconnect")
def disconnect_google_calendar(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Desconecta a integração do Google Calendar para o formulário."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    form.google_calendar_connected = False
    form.google_calendar_email = None
    form.google_calendar_access_token = None
    form.google_calendar_refresh_token = None
    form.google_calendar_token_expiry = None
    db.commit()
    logger.info(f"Google Calendar desconectado do formulário {form.id} por {current_user.email}")
    return {"success": True, "message": "Google Agenda desconectado com sucesso."}

@router.delete("/{form_id}", status_code=status.HTTP_200_OK)

def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove um formulário pertencente ao usuário."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")
    
    db.delete(form)
    db.commit()
    logger.info(f"Formulário {form_id} removido com sucesso por {current_user.email}")
    return {"message": "Formulário removido com sucesso.", "id": form_id}

@router.get("/public/{slug}")
def get_public_form(slug: str, db: Session = Depends(get_db)):
    """Retorna dados públicos do formulário para o usuário final responder."""
    form = db.query(Form).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado ou inativo.")
    return {
        "id": form.id,
        "title": form.title,
        "slug": form.slug,
        "status": form.status,
        "questions": form.questions or [],
        "welcome_screen": form.welcome_screen or {},
        "ending_screens": form.ending_screens or [],
        "theme": form.theme or {}
    }



@router.post(
    "/public/{slug}/save-partial",
    dependencies=[Depends(rate_limiter(max_requests=settings.RATE_LIMIT_PUBLIC_FORMS, key_prefix="public_forms"))]
)
def save_partial_form(slug: str, payload: dict, db: Session = Depends(get_db)):
    """Salva ou atualiza uma resposta em andamento (lead capture/auto-save desde a primeira pergunta)."""
    form = db.query(Form).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    response_id = payload.get("response_id")
    answers = payload.get("answers", [])
    current_step = payload.get("current_step", 1)
    total_questions = max(1, len(form.questions or []))
    completion_percent = round(min(100.0, (current_step / total_questions) * 100.0), 1)

    # Extrai dados de contato principais das respostas parciais
    contact_name = None
    contact_email = None
    contact_phone = None

    for item in answers:
        q_title = str(item.get("question_title", "")).lower()
        ans_val = str(item.get("answer", "")).strip()
        if not ans_val:
            continue

        if not contact_name and ("nome" in q_title or "name" in q_title):
            contact_name = ans_val
        elif not contact_email and ("email" in q_title or "e-mail" in q_title or "@" in ans_val):
            contact_email = ans_val
        elif not contact_phone and ("telefone" in q_title or "whatsapp" in q_title or "celular" in q_title):
            contact_phone = ans_val

    if not contact_name and answers:
        first_ans = str(answers[0].get("answer", "")).strip()
        if first_ans and not "@" in first_ans:
            contact_name = first_ans

    response_record = None
    if response_id:
        response_record = db.query(FormResponseData).filter(
            FormResponseData.id == response_id,
            FormResponseData.form_id == form.id
        ).first()

    if response_record:
        if contact_name:
            response_record.contact_name = contact_name
        if contact_email:
            response_record.contact_email = contact_email
        if contact_phone:
            response_record.contact_phone = contact_phone
        response_record.answers = answers
        response_record.completion_percent = completion_percent
        # Não rebaixa status caso já estivesse CONCLUIDO
        if response_record.status != "CONCLUIDO":
            response_record.status = "PARCIAL"
    else:
        response_record = FormResponseData(
            form_id=form.id,
            contact_name=contact_name or "Anônimo",
            contact_email=contact_email,
            contact_phone=contact_phone,
            answers=answers,
            status="PARCIAL",
            completion_percent=completion_percent
        )
        db.add(response_record)
        form.responses_count = (form.responses_count or 0) + 1

    db.commit()
    db.refresh(response_record)
    return {"success": True, "response_id": response_record.id, "status": response_record.status}


def dispatch_webhook_in_background(form_id: int, webhook_url: str, payload: dict, form_slug: str, response_id: int = None):
    """Executa o envio do webhook de forma assíncrona em background e persiste o log de auditoria no banco."""
    import httpx
    start_time = time.time()
    status_code = None
    success = False
    error_message = None

    # Valida novamente no background por defesa em profundidade
    is_safe, reason = is_ssrf_safe_url(webhook_url)
    if not is_safe:
        error_message = f"Bloqueado por segurança SSRF: {reason}"
        logger.warning(f"[WEBHOOK BACKGROUND BLOQUEADO SSRF] {webhook_url} (Formulário: {form_slug}): {reason}")
    else:
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(webhook_url, json=payload)
                status_code = resp.status_code
                success = (200 <= resp.status_code < 300)
                if not success:
                    error_message = f"HTTP {resp.status_code}: {resp.text[:200]}"
                logger.info(f"[WEBHOOK BACKGROUND] Webhook disparado para {webhook_url} (Formulário: {form_slug}) - Status: {resp.status_code}")
        except Exception as e:
            error_message = str(e)
            logger.error(f"[WEBHOOK BACKGROUND] Falha ao disparar webhook para {webhook_url} (Formulário: {form_slug}): {e}")

    duration_ms = int((time.time() - start_time) * 1000)

    # Persiste log de entrega de webhook com sessão de banco isolada
    try:
        db = database.SessionLocal()
        log_entry = WebhookDeliveryLog(
            form_id=form_id,
            response_id=response_id,
            webhook_url=webhook_url,
            status_code=status_code,
            success=success,
            error_message=error_message,
            duration_ms=duration_ms
        )
        db.add(log_entry)
        db.commit()
        db.close()
    except Exception as db_err:
        logger.error(f"[WEBHOOK LOG DB ERROR] Erro ao persistir log de webhook: {db_err}")

@router.post(
    "/public/{slug}/submit",
    dependencies=[Depends(rate_limiter(max_requests=settings.RATE_LIMIT_PUBLIC_FORMS, key_prefix="public_forms"))]
)
def submit_public_form(
    slug: str, 
    answers_payload: dict, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Recebe as respostas finais do usuário, marca como CONCLUIDO 100% e agenda webhook em background."""
    form = db.query(Form).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")
    
    response_id = answers_payload.get("response_id")
    answers = answers_payload.get("answers", [])
    
    # Extrai dados de contato principais das respostas para facilitar visualização
    contact_name = None
    contact_email = None
    contact_phone = None

    for item in answers:
        q_title = str(item.get("question_title", "")).lower()
        ans_val = str(item.get("answer", "")).strip()
        if not ans_val:
            continue

        if not contact_name and ("nome" in q_title or "name" in q_title):
            contact_name = ans_val
        elif not contact_email and ("email" in q_title or "e-mail" in q_title or "@" in ans_val):
            contact_email = ans_val
        elif not contact_phone and ("telefone" in q_title or "whatsapp" in q_title or "celular" in q_title):
            contact_phone = ans_val

    # Se não identificou nome por título mas há primeira resposta textual
    if not contact_name and answers:
        first_ans = str(answers[0].get("answer", "")).strip()
        if first_ans and not "@" in first_ans:
            contact_name = first_ans

    response_record = None
    if response_id:
        response_record = db.query(FormResponseData).filter(
            FormResponseData.id == response_id,
            FormResponseData.form_id == form.id
        ).first()

    if response_record:
        response_record.contact_name = contact_name or response_record.contact_name or "Anônimo"
        response_record.contact_email = contact_email or response_record.contact_email
        response_record.contact_phone = contact_phone or response_record.contact_phone
        response_record.answers = answers
        response_record.status = "CONCLUIDO"
        response_record.completion_percent = 100.0
    else:
        response_record = FormResponseData(
            form_id=form.id,
            contact_name=contact_name or "Anônimo",
            contact_email=contact_email,
            contact_phone=contact_phone,
            answers=answers,
            status="CONCLUIDO",
            completion_percent=100.0
        )
        db.add(response_record)
        form.responses_count = (form.responses_count or 0) + 1

    # Garante que as alterações pendentes estão visíveis na sessão para o cálculo agregado
    db.flush()

    # Otimização de alta performance: agregação única compatível com PostgreSQL e SQLite
    stats = db.query(
        func.count(FormResponseData.id).label("total"),
        func.coalesce(func.sum(case((FormResponseData.status == "CONCLUIDO", 1), else_=0)), 0).label("completed")
    ).filter(FormResponseData.form_id == form.id).first()

    total_resp = stats.total if stats and stats.total is not None else 1
    completed_resp = stats.completed if stats and stats.completed is not None else 0
    form.completion_rate = round((completed_resp / max(1, total_resp)) * 100.0, 1)

    db.commit()
    db.refresh(response_record)

    # Disparo de Webhook em background assíncrono via FastAPI BackgroundTasks
    if form.webhook_url:
        webhook_data = {
            "event": "form_submission",
            "form_id": form.id,
            "form_title": form.title,
            "form_slug": form.slug,
            "response_id": response_record.id,
            "contact_name": response_record.contact_name,
            "contact_email": response_record.contact_email,
            "contact_phone": response_record.contact_phone,
            "status": response_record.status,
            "completion_percent": response_record.completion_percent,
            "answers": answers,
            "submitted_at": datetime.utcnow().isoformat()
        }
        background_tasks.add_task(
            dispatch_webhook_in_background,
            form.id,
            form.webhook_url,
            webhook_data,
            form.slug,
            response_record.id
        )
        logger.info(f"Webhook enfileirado em background para {form.webhook_url} (Formulário: {form.slug})")

    return {"success": True, "message": "Respostas enviadas com sucesso!", "id": response_record.id}


@router.get("/{form_id}/responses")
def get_form_responses(
    form_id: int,
    page: int = 1,
    limit: int = 20,
    status_filter: str = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna a lista paginada de contatos e respostas com suporte a filtro por status (TODOS, CONCLUIDO, PARCIAL)."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    query = db.query(FormResponseData).filter(FormResponseData.form_id == form_id)

    # Contagens gerais para badges/tabs
    total_all = query.count()
    total_completed = db.query(FormResponseData).filter(
        FormResponseData.form_id == form_id,
        FormResponseData.status == "CONCLUIDO"
    ).count()
    total_partial = db.query(FormResponseData).filter(
        FormResponseData.form_id == form_id,
        FormResponseData.status == "PARCIAL"
    ).count()

    if status_filter and status_filter.upper() in ["CONCLUIDO", "PARCIAL"]:
        query = query.filter(FormResponseData.status == status_filter.upper())

    filtered_total = query.count()
    offset = (page - 1) * limit

    responses = (
        query
        .order_by(FormResponseData.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for r in responses:
        created_str = None
        if r.created_at:
            dt_utc = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
            dt_bsb = dt_utc.astimezone(BRASILIA_TZ)
            created_str = dt_bsb.isoformat()

        items.append({
            "id": r.id,
            "contact_name": r.contact_name,
            "contact_email": r.contact_email,
            "contact_phone": r.contact_phone,
            "status": r.status or "CONCLUIDO",
            "completion_percent": r.completion_percent if r.completion_percent is not None else 100.0,
            "answers": r.answers or [],
            "created_at": created_str
        })

    return {
        "items": items,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (filtered_total + limit - 1) // limit),
        "counts": {
            "all": total_all,
            "completed": total_completed,
            "partial": total_partial
        }
    }


@router.get("/{form_id}/responses/export")
def export_form_responses_csv(
    form_id: int,
    status_filter: str = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exporta todas as respostas do formulário em formato CSV com cabeçalhos dinâmicos das perguntas."""
    import csv
    import io

    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    query = db.query(FormResponseData).filter(FormResponseData.form_id == form_id)
    if status_filter and status_filter.upper() in ["CONCLUIDO", "PARCIAL"]:
        query = query.filter(FormResponseData.status == status_filter.upper())

    responses = query.order_by(FormResponseData.created_at.desc()).all()

    # Mapeia perguntas para colunas fixas do CSV
    questions = form.questions or []
    question_titles = [q.get("title") or f"Pergunta {i+1}" for i, q in enumerate(questions)]

    output = io.StringIO()
    # Adiciona BOM UTF-8 para compatibilidade perfeita com Excel no Windows
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

    # Cabeçalho do CSV
    header = ["ID", "Contato", "E-mail", "Telefone", "Status", "Progresso (%)", "Data de Envio"] + question_titles
    writer.writerow(header)

    for r in responses:
        created_str = ""
        if r.created_at:
            dt_utc = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
            dt_bsb = dt_utc.astimezone(BRASILIA_TZ)
            created_str = dt_bsb.strftime("%d/%m/%Y %H:%M")

        answers_map = {}
        for a in (r.answers or []):
            q_id = a.get("question_id")
            q_title = a.get("question_title")
            val = a.get("answer") or ""
            if q_id:
                answers_map[q_id] = val
            if q_title:
                answers_map[q_title] = val

        answers_cols = []
        for i, q in enumerate(questions):
            q_id = q.get("id")
            q_title = q.get("title") or f"Pergunta {i+1}"
            val = answers_map.get(q_id) or answers_map.get(q_title) or ""
            answers_cols.append(val)

        row = [
            r.id,
            r.contact_name or "Anônimo",
            r.contact_email or "",
            r.contact_phone or "",
            "Concluído" if (r.status == "CONCLUIDO") else "Parcial",
            f"{r.completion_percent:.0f}%" if r.completion_percent is not None else "100%",
            created_str
        ] + answers_cols

        writer.writerow(row)

    csv_data = output.getvalue()
    filename = f"respostas_formulario_{form.slug}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{form_id}/webhook/logs")
def get_webhook_delivery_logs(
    form_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna os registros recentes de auditoria de disparos de webhook do formulário."""
    form = db.query(Form).filter(Form.id == form_id, Form.user_id == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Formulário não encontrado.")

    logs = (
        db.query(WebhookDeliveryLog)
        .filter(WebhookDeliveryLog.form_id == form_id)
        .order_by(WebhookDeliveryLog.created_at.desc())
        .limit(min(limit, 50))
        .all()
    )

    result = []
    for l in logs:
        created_str = ""
        if l.created_at:
            dt_utc = l.created_at if l.created_at.tzinfo else l.created_at.replace(tzinfo=timezone.utc)
            created_str = dt_utc.astimezone(BRASILIA_TZ).strftime("%d/%m/%Y %H:%M:%S")

        result.append({
            "id": l.id,
            "form_id": l.form_id,
            "response_id": l.response_id,
            "webhook_url": l.webhook_url,
            "status_code": l.status_code,
            "success": l.success,
            "error_message": l.error_message,
            "duration_ms": l.duration_ms,
            "created_at": created_str
        })

    return {"logs": result, "total": len(result)}






