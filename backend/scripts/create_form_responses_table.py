"""
Script de migração para criar a tabela 'form_responses' para rastrear respostas enviadas.
"""
from app.core.database import engine, Base
from app.models.form import Form, FormResponseData
from app.core.logger import logger

def run_migration():
    logger.info("Executando migração: Criação da tabela 'form_responses'...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Migração da tabela 'form_responses' concluída com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao criar tabela 'form_responses': {e}")
        raise

if __name__ == "__main__":
    run_migration()
