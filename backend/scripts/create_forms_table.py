"""
Script de migração para criar a tabela 'forms' compatível com PostgreSQL e SQLite.
Executado para garantir integridade do banco.
"""
from sqlalchemy import text
from app.core.database import engine, Base
from app.models.user import User
from app.models.backup import BackupSchedule, BackupHistory
from app.models.form import Form
from app.core.logger import logger

def run_migration():
    logger.info("Executando migração: Criação da tabela 'forms'...")
    try:
        # Usa Base.metadata.create_all que cria com compatibilidade exata no Postgres e SQLite
        Base.metadata.create_all(bind=engine)
        logger.info("Migração da tabela 'forms' concluída com sucesso via SQLAlchemy Metadata.")
    except Exception as e:
        logger.error(f"Erro ao executar migração da tabela 'forms': {e}")
        raise

if __name__ == "__main__":
    run_migration()
