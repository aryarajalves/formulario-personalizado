from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Boolean, Index
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="PUBLICADO", nullable=False) # 'PUBLICADO', 'RASCUNHO', 'ARQUIVADO'
    responses_count = Column(Integer, default=0, nullable=False)
    completion_rate = Column(Float, default=0.0, nullable=False)
    questions = Column(JSON, default=list, nullable=False)
    webhook_url = Column(String, nullable=True)
    google_calendar_connected = Column(Boolean, default=False, nullable=False)
    google_calendar_email = Column(String, nullable=True)
    google_calendar_access_token = Column(String, nullable=True)
    google_calendar_refresh_token = Column(String, nullable=True)
    google_calendar_token_expiry = Column(DateTime, nullable=True)
    welcome_screen = Column(JSON, default=dict, nullable=True)
    ending_screens = Column(JSON, default=list, nullable=False)
    flows = Column(JSON, default=list, nullable=False)
    theme = Column(JSON, default=dict, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class FormResponseData(Base):
    __tablename__ = "form_responses"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    status = Column(String, default="CONCLUIDO", nullable=False) # 'CONCLUIDO', 'PARCIAL'
    completion_percent = Column(Float, default=100.0, nullable=False)
    answers = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("idx_form_responses_form_status", "form_id", "status"),
        Index("idx_form_responses_form_created", "form_id", "created_at"),
    )


class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    response_id = Column(Integer, ForeignKey("form_responses.id", ondelete="SET NULL"), nullable=True, index=True)
    webhook_url = Column(String, nullable=False)
    status_code = Column(Integer, nullable=True)
    success = Column(Boolean, default=False, nullable=False)
    error_message = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        Index("idx_webhook_logs_form_created", "form_id", "created_at"),
    )



