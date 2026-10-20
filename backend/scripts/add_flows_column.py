import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração para adicionar coluna 'flows' na tabela forms...")
    dialect_name = engine.dialect.name
    with engine.connect() as conn:
        try:
            if dialect_name == "postgresql":
                conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS flows JSON DEFAULT '[]'::json;"))
            else:
                conn.execute(text("ALTER TABLE forms ADD COLUMN flows JSON DEFAULT '[]';"))
            conn.commit()
            print("Coluna 'flows' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'flows' já existe ou erro: {e}")

if __name__ == "__main__":
    migrate()
