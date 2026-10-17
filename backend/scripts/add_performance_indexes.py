"""
Script de migração para criação de índices de alta performance para escalabilidade.
Tabela: form_responses
Índices:
  - idx_form_responses_form_status (form_id, status)
  - idx_form_responses_form_created (form_id, created_at)
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

def add_performance_indexes():
    with engine.connect() as conn:
        print("Criando índices de alta performance em form_responses...")
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_form_responses_form_status ON form_responses (form_id, status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_form_responses_form_created ON form_responses (form_id, created_at);"))
            conn.commit()
            print("Índices criados com sucesso!")
        except Exception as e:
            print(f"Erro ao criar índices: {e}")

if __name__ == "__main__":
    add_performance_indexes()
