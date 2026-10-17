import os
import sys
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração para adicionar coluna 'ending_screens' na tabela forms...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE forms ADD COLUMN ending_screens JSON DEFAULT '[]'::json;"))
            conn.commit()
            print("Coluna 'ending_screens' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'ending_screens' já existe ou erro: {e}")

if __name__ == "__main__":
    migrate()
