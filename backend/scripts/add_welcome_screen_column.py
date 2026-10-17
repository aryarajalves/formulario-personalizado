import os
import sys
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração para adicionar coluna 'welcome_screen' na tabela forms...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE forms ADD COLUMN welcome_screen JSON DEFAULT '{}'::json;"))
            conn.commit()
            print("Coluna 'welcome_screen' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'welcome_screen' já existe ou erro: {e}")

if __name__ == "__main__":
    migrate()
