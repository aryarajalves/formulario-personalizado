"""
Script de migração para criar a tabela 'scheduled_webhooks' utilizada no
agendamento e disparo de lembretes automáticos de reuniões via Webhook.
"""
from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger

def run_migration():
    logger.info("Iniciando migração para criação da tabela 'scheduled_webhooks'...")
    with engine.connect() as conn:
        try:
            if engine.dialect.name == "postgresql":
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS scheduled_webhooks (
                        id SERIAL PRIMARY KEY,
                        form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                        response_id INTEGER REFERENCES form_responses(id) ON DELETE CASCADE,
                        reminder_type VARCHAR(50) NOT NULL,
                        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
                        webhook_url TEXT NOT NULL,
                        payload JSONB NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                        sent_at TIMESTAMP WITH TIME ZONE,
                        error_message TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                    );
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_pending 
                    ON scheduled_webhooks (status, scheduled_for);
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_form_id 
                    ON scheduled_webhooks (form_id);
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS scheduled_webhooks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                        response_id INTEGER REFERENCES form_responses(id) ON DELETE CASCADE,
                        reminder_type VARCHAR(50) NOT NULL,
                        scheduled_for DATETIME NOT NULL,
                        webhook_url TEXT NOT NULL,
                        payload JSON NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                        sent_at DATETIME,
                        error_message TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_pending 
                    ON scheduled_webhooks (status, scheduled_for);
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_form_id 
                    ON scheduled_webhooks (form_id);
                """))
            conn.commit()
            logger.info("Tabela 'scheduled_webhooks' e índices criados com sucesso!")
        except Exception as e:
            logger.error(f"Erro ao executar migração de 'scheduled_webhooks': {e}")
            raise e

if __name__ == "__main__":
    run_migration()
