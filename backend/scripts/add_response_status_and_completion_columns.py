import os
import sys
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração para adicionar colunas de status e conclusão na tabela form_responses...")
    with engine.connect() as conn:
        # Coluna status: 'PARCIAL' ou 'CONCLUIDO'
        try:
            conn.execute(text("ALTER TABLE form_responses ADD COLUMN status VARCHAR DEFAULT 'CONCLUIDO';"))
            conn.commit()
            print("Coluna 'status' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'status' já existe ou erro: {e}")

        # Coluna completion_percent: Float
        try:
            conn.execute(text("ALTER TABLE form_responses ADD COLUMN completion_percent FLOAT DEFAULT 100.0;"))
            conn.commit()
            print("Coluna 'completion_percent' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'completion_percent' já existe ou erro: {e}")

        # Coluna updated_at: TIMESTAMP
        try:
            conn.execute(text("ALTER TABLE form_responses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.commit()
            print("Coluna 'updated_at' adicionada com sucesso.")
        except Exception as e:
            print(f"Coluna 'updated_at' já existe ou erro: {e}")

if __name__ == "__main__":
    migrate()
