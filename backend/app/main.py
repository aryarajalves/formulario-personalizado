import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.core.logger import logger
from app.models.user import User
from app.models.backup import BackupSchedule, BackupHistory
from app.models.form import Form
from app.api.v1.api import api_router
from app.services.scheduler import setup_scheduler, scheduler

def init_superadmin():
    db: Session = SessionLocal()
    try:
        superadmin = db.query(User).filter(User.role == "superadmin").first()
        if not superadmin:
            # Check if email is used or create initial superadmin
            existing_email = db.query(User).filter(User.email == settings.SUPERADMIN_EMAIL).first()
            if not existing_email:
                superadmin = User(
                    email=settings.SUPERADMIN_EMAIL,
                    name=settings.SUPERADMIN_NAME,
                    hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
                    role="superadmin",
                    is_active=True
                )
                db.add(superadmin)
                db.commit()
            else:
                existing_email.role = "superadmin"
                existing_email.hashed_password = get_password_hash(settings.SUPERADMIN_PASSWORD)
                existing_email.name = settings.SUPERADMIN_NAME
                db.commit()
        else:
            # Superadmin exists: sync email, name and password from env if user updated .env
            superadmin.email = settings.SUPERADMIN_EMAIL
            superadmin.name = settings.SUPERADMIN_NAME
            superadmin.hashed_password = get_password_hash(settings.SUPERADMIN_PASSWORD)
            superadmin.is_active = True
            db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Ensure columns and performance indexes exist on already created tables
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS flows JSON DEFAULT '[]'::json;"))
                conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS google_calendar_settings JSON DEFAULT '{}'::json;"))
            else:
                try:
                    conn.execute(text("ALTER TABLE forms ADD COLUMN flows JSON DEFAULT '[]';"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE forms ADD COLUMN google_calendar_settings JSON DEFAULT '{}';"))
                except Exception:
                    pass
            conn.execute(text("ALTER TABLE invites ADD COLUMN IF NOT EXISTS used_by_email VARCHAR;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_form_responses_form_status ON form_responses (form_id, status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_form_responses_form_created ON form_responses (form_id, created_at);"))
            conn.commit()
        except Exception:
            pass
    # Seed initial superadmin from env
    init_superadmin()
    # Inicializa agendador de backup automático em background
    setup_scheduler()
    yield
    # Finaliza scheduler se estiver rodando
    if scheduler.running:
        scheduler.shutdown()

# Autenticação HTTP Basic para Documentação Privada
docs_security = HTTPBasic()

def authenticate_docs(credentials: HTTPBasicCredentials = Depends(docs_security)):
    """Valida usuário e senha para acesso à documentação da API."""
    user_ok = secrets.compare_digest(credentials.username, settings.DOCS_USERNAME)
    pass_ok = secrets.compare_digest(credentials.password, settings.DOCS_PASSWORD)
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas para acessar a documentação.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Inicializa FastAPI com documentação pública desativada por padrão
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url=None,      # Desativa /docs público
    redoc_url=None,     # Desativa /redoc público
    openapi_url=None,   # Desativa /openapi.json público
    lifespan=lifespan
)

# Rotas de documentação privada protegidas por HTTP Basic Auth
@app.get("/docs", include_in_schema=False)
def get_private_swagger(username: str = Depends(authenticate_docs)):
    return get_swagger_ui_html(openapi_url=f"{settings.API_V1_STR}/openapi.json", title=f"{app.title} - Swagger")

@app.get("/redoc", include_in_schema=False)
def get_private_redoc(username: str = Depends(authenticate_docs)):
    return get_redoc_html(openapi_url=f"{settings.API_V1_STR}/openapi.json", title=f"{app.title} - ReDoc")

@app.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
@app.get("/openapi.json", include_in_schema=False)
def get_private_openapi(username: str = Depends(authenticate_docs)):
    return get_openapi(title=app.title, version="1.0.0", routes=app.routes)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro inesperado em {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor. Tente novamente mais tarde."}
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

@app.get("/")
def root():
    return {"message": f"Bem-vindo ao {settings.PROJECT_NAME}"}
