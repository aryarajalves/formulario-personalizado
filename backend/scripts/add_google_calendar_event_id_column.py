"""
Script de migração para adicionar a coluna 'google_calendar_event_id' à tabela 'form_responses'.
"""
from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger

def run_migration():
    logger.info("Iniciando migração para adicionar 'google_calendar_event_id' em 'form_responses'...")
    with engine.connect() as conn:
        try:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);"))
            else:
                try:
                    conn.execute(text("ALTER TABLE form_responses ADD COLUMN google_calendar_event_id VARCHAR(255);"))
                except Exception:
                    pass
            conn.commit()
            logger.info("Coluna 'google_calendar_event_id' adicionada com sucesso em 'form_responses'!")
        except Exception as e:
            logger.error(f"Erro ao adicionar 'google_calendar_event_id': {e}")
            raise e

if __name__ == "__main__":
    run_migration()
