"""
Script de migração para adicionar as colunas google_calendar_connected e google_calendar_email à tabela forms.
"""
from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger

def run_migration():
    logger.info("Executando migração: Adicionando colunas de Google Calendar na tabela 'forms'...")
    try:
        with engine.connect() as conn:
            # PostgreSQL / SQLite compatível
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS google_calendar_email VARCHAR(255);"))
            conn.commit()
        logger.info("Colunas de Google Calendar adicionadas com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao adicionar colunas de Google Calendar: {e}")
        raise

if __name__ == "__main__":
    run_migration()
