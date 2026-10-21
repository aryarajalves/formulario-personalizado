"""
Script de migração para adicionar a coluna 'status_code' à tabela 'scheduled_webhooks'.
"""
from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger

def run_migration():
    logger.info("Iniciando migração para adicionar 'status_code' em 'scheduled_webhooks'...")
    with engine.connect() as conn:
        try:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE scheduled_webhooks ADD COLUMN IF NOT EXISTS status_code INTEGER;"))
            else:
                try:
                    conn.execute(text("ALTER TABLE scheduled_webhooks ADD COLUMN status_code INTEGER;"))
                except Exception:
                    pass
            conn.commit()
            logger.info("Coluna 'status_code' adicionada com sucesso em 'scheduled_webhooks'!")
        except Exception as e:
            logger.error(f"Erro ao adicionar 'status_code': {e}")
            raise e

if __name__ == "__main__":
    run_migration()
