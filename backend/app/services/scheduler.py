"""
Agendador de Tarefas em Background (APScheduler) para Execução Periódica de Backups e Lembretes.
"""
from datetime import datetime, timedelta, timezone
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logger import logger
from app.core.database import SessionLocal
from app.models.backup import BackupSchedule
from app.models.form import ScheduledWebhook, WebhookDeliveryLog
from app.core.ssrf import is_ssrf_safe_url
from app.services.backup_service import create_backup_record

scheduler = BackgroundScheduler(timezone="UTC")

def parse_frequency_to_timedelta(freq_str: str) -> timedelta:
    """Converte '1h', '6h', '12h', '24h', '7d' em timedelta."""
    if freq_str == "1h":
        return timedelta(hours=1)
    elif freq_str == "6h":
        return timedelta(hours=6)
    elif freq_str == "12h":
        return timedelta(hours=12)
    elif freq_str == "24h":
        return timedelta(hours=24)
    elif freq_str == "7d":
        return timedelta(days=7)
    return timedelta(hours=6)

def run_scheduled_backup_job():
    """Job disparado pelo scheduler para backup."""
    logger.info("Executando rotina automática de backup do banco de dados...")
    db = SessionLocal()
    try:
        schedule = db.query(BackupSchedule).first()
        if not schedule or not schedule.is_active:
            logger.info("Rotina de backup está desativada no momento. Pulando execução.")
            return

        now = datetime.now(timezone.utc)
        delta = parse_frequency_to_timedelta(schedule.frequency)
        schedule.next_run_at = now + delta
        db.commit()

        # Cria o backup automático
        create_backup_record(db, backup_type="automatic")
        logger.info(f"Backup automático concluído com sucesso. Próximo backup em: {schedule.next_run_at}")
    except Exception as e:
        logger.error(f"Erro durante a execução do backup agendado: {e}")
    finally:
        db.close()

def dispatch_pending_scheduled_webhooks(db=None):
    """
    Varre e dispara os webhooks e lembretes programados de reuniões que atingiram o horário de execução.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        now_utc = datetime.now(timezone.utc)
        pending_webhooks = (
            db.query(ScheduledWebhook)
            .filter(
                ScheduledWebhook.status == "PENDING",
                ScheduledWebhook.scheduled_for <= now_utc
            )
            .order_by(ScheduledWebhook.scheduled_for.asc())
            .limit(50)
            .all()
        )

        if not pending_webhooks:
            return

        logger.info(f"[SCHEDULED WEBHOOKS] Processando {len(pending_webhooks)} lembrete(s) pendente(s)...")

        for item in pending_webhooks:
            target_url = (item.webhook_url or "").strip()
            is_safe, reason = is_ssrf_safe_url(target_url)
            if not is_safe:
                logger.warning(f"[SCHEDULED WEBHOOK SSRF BLOQUEADO] {target_url} - {reason}")
                item.status = "FAILED"
                item.error_message = f"SSRF Block: {reason}"
                item.sent_at = datetime.now(timezone.utc)
                db.commit()
                continue

            status_code = None
            is_success = False
            error_msg = None
            duration_ms = 0
            start_time = datetime.now(timezone.utc)

            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(target_url, json=item.payload)
                    status_code = resp.status_code
                    is_success = (200 <= status_code < 300)
                    if not is_success:
                        raw_text = (resp.text or "").strip()
                        if "<!doctype html" in raw_text.lower() or "<html" in raw_text.lower():
                            if status_code == 530:
                                error_msg = "HTTP 530: Servidor ou túnel Cloudflare offline (Error 1033)."
                            elif status_code == 502:
                                error_msg = "HTTP 502: Bad Gateway no servidor de destino."
                            elif status_code == 504:
                                error_msg = "HTTP 504: Gateway Timeout no servidor de destino."
                            else:
                                error_msg = f"HTTP {status_code}: Servidor retornou uma página HTML de erro."
                        else:
                            error_msg = f"HTTP {status_code}: {raw_text[:200]}"
            except Exception as e:
                error_msg = str(e)
                logger.error(f"[SCHEDULED WEBHOOK ERROR] Falha ao enviar para {target_url}: {e}")

            end_time = datetime.now(timezone.utc)
            duration_ms = int((end_time - start_time).total_seconds() * 1000)

            item.sent_at = end_time
            item.status_code = status_code
            if is_success:
                item.status = "SENT"
                item.error_message = None
                logger.info(f"[SCHEDULED WEBHOOK SUCCESS] Lembrete ({item.reminder_type}) enviado para {target_url} - Status: {status_code}")
            else:
                item.status = "FAILED"
                item.error_message = error_msg

            # Registra auditoria em WebhookDeliveryLog
            try:
                log_entry = WebhookDeliveryLog(
                    form_id=item.form_id,
                    response_id=item.response_id,
                    webhook_url=target_url,
                    status_code=status_code,
                    success=is_success,
                    error_message=error_msg,
                    duration_ms=duration_ms
                )
                db.add(log_entry)
            except Exception as log_err:
                logger.error(f"[SCHEDULED WEBHOOK AUDIT ERROR] {log_err}")

            db.commit()
    except Exception as e:
        logger.error(f"[SCHEDULED WEBHOOK WORKER ERROR] {e}")
    finally:
        if should_close:
            db.close()

def setup_scheduler():
    """Inicia ou reconfigura o agendamento a partir das preferências do banco."""
    db = SessionLocal()
    try:
        schedule = db.query(BackupSchedule).first()
        if not schedule:
            # Cria configuração padrão se não existir
            schedule = BackupSchedule(
                is_active=True,
                frequency="6h",
                destination_folder="projetobase/backups/",
                retention_max=30,
                next_run_at=datetime.now(timezone.utc) + timedelta(hours=6)
            )
            db.add(schedule)
            db.commit()
            db.refresh(schedule)

        # Remove job de backup existente se houver
        if scheduler.get_job("automated_backup_job"):
            scheduler.remove_job("automated_backup_job")

        if schedule.is_active:
            delta = parse_frequency_to_timedelta(schedule.frequency)
            hours = int(delta.total_seconds() // 3600)
            scheduler.add_job(
                run_scheduled_backup_job,
                trigger=IntervalTrigger(hours=hours),
                id="automated_backup_job",
                name="Job de Backup Automático do Banco de Dados",
                replace_existing=True
            )
            logger.info(f"Agendador de backup configurado com sucesso (a cada {hours}h).")
        else:
            logger.info("Agendador de backup configurado como desativado.")

        # Adiciona rotina periódica de verificação e disparo de lembretes agendados a cada 30 segundos
        if not scheduler.get_job("scheduled_webhooks_job"):
            scheduler.add_job(
                dispatch_pending_scheduled_webhooks,
                trigger=IntervalTrigger(seconds=30),
                id="scheduled_webhooks_job",
                name="Job de Disparo de Lembretes Agendados de Webhook",
                replace_existing=True
            )
            logger.info("Agendador de lembretes de reuniões configurado (a cada 30s).")

        if not scheduler.running:
            scheduler.start()
            logger.info("BackgroundScheduler iniciado com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao inicializar agendador: {e}")
    finally:
        db.close()
