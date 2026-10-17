"""
Script de migração para criação da tabela de auditoria e histórico de webhooks.
Tabela: webhook_delivery_logs
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

def create_webhook_logs_table():
    with engine.connect() as conn:
        print("Criando tabela webhook_delivery_logs...")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
                    id SERIAL PRIMARY KEY,
                    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                    response_id INTEGER REFERENCES form_responses(id) ON DELETE SET NULL,
                    webhook_url VARCHAR NOT NULL,
                    status_code INTEGER,
                    success BOOLEAN NOT NULL DEFAULT FALSE,
                    error_message VARCHAR,
                    duration_ms INTEGER,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
                );
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_webhook_logs_form_created 
                ON webhook_delivery_logs (form_id, created_at);
            """))
            conn.commit()
            print("Tabela webhook_delivery_logs criada com sucesso!")
        except Exception as e:
            print(f"Erro ao criar tabela webhook_delivery_logs: {e}")

if __name__ == "__main__":
    create_webhook_logs_table()
