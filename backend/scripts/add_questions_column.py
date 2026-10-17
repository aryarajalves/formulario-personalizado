"""
Script de migração para adicionar a coluna 'questions' (JSON) na tabela 'forms'.
Compatível com PostgreSQL e SQLite.
"""
from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger

def run_migration():
    logger.info("Executando migração: Adição da coluna 'questions' na tabela 'forms'...")
    try:
        with engine.connect() as conn:
            # Verifica e adiciona coluna questions
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS questions JSON DEFAULT '[]'::json;"))
            conn.commit()
        logger.info("Coluna 'questions' adicionada com sucesso na tabela 'forms'.")
    except Exception as e:
        logger.warning(f"Tentando adicionar para SQLite ou dialect alternativo: {e}")
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE forms ADD COLUMN questions JSON DEFAULT '[]';"))
                conn.commit()
            logger.info("Coluna 'questions' adicionada com sucesso via fallback.")
        except Exception as e2:
            logger.info(f"Coluna já existe ou não foi necessária alteração: {e2}")

if __name__ == "__main__":
    run_migration()
