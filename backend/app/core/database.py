from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

connect_args = {}
engine_kwargs = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Otimizações de pool de conexões para PostgreSQL em ambiente concorrente/alta escala
    engine_kwargs.update({
        "pool_size": 20,         # 20 conexões permanentes ativas
        "max_overflow": 30,      # Até 30 conexões sob demanda em picos (total 50 simultâneas)
        "pool_pre_ping": True,   # Verifica saúde da conexão antes de entregar para a requisição
        "pool_recycle": 300,     # Recicla conexões a cada 5 minutos prevenindo timeouts de firewall
    })

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
