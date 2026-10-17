import os
import sys
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração para adicionar colunas de tokens do Google Calendar na tabela forms...")
    with engine.connect() as conn:
        # Verifica se as colunas já existem
        for col, col_type in [
            ("google_calendar_access_token", "TEXT"),
            ("google_calendar_refresh_token", "TEXT"),
            ("google_calendar_token_expiry", "TIMESTAMP")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE forms ADD COLUMN {col} {col_type};"))
                conn.commit()
                print(f"Coluna '{col}' adicionada com sucesso.")
            except Exception as e:
                print(f"Coluna '{col}' já existe ou erro: {e}")

if __name__ == "__main__":
    migrate()
