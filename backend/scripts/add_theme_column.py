import os
import sys

# Garante inclusão do diretório raiz da aplicação no sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração para adicionar coluna 'theme' na tabela forms...")
    dialect_name = engine.dialect.name
    with engine.connect() as conn:
        try:
            if dialect_name == "postgresql":
                conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS theme JSON DEFAULT '{}'::json;"))
            else:
                conn.execute(text("ALTER TABLE forms ADD COLUMN theme JSON DEFAULT '{}';"))
            conn.commit()
            print("Coluna 'theme' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'theme' já existe ou erro: {e}")

if __name__ == "__main__":
    migrate()
