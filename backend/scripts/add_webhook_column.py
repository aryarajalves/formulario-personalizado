"""
Script de migração para adicionar a coluna 'webhook_url' na tabela 'forms'.
"""
from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger

def run_migration():
    logger.info("Executando migração: Adição da coluna 'webhook_url' na tabela 'forms'...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS webhook_url VARCHAR;"))
            conn.commit()
        logger.info("Coluna 'webhook_url' adicionada com sucesso na tabela 'forms'.")
    except Exception as e:
        logger.warning(f"Tentativa alternativa para SQLite: {e}")
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE forms ADD COLUMN webhook_url VARCHAR;"))
                conn.commit()
            logger.info("Coluna 'webhook_url' adicionada com sucesso via fallback.")
        except Exception as e2:
            logger.info(f"Coluna já existe ou não foi necessária alteração: {e2}")

if __name__ == "__main__":
    run_migration()
