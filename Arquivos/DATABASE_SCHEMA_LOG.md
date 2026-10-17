# Log de Integridade e Histórico de Esquema do Banco de Dados

Registro de migrações e atualizações estruturais do banco de dados (PostgreSQL/SQLite) do **Projeto Base**.

---

### [24/09/2026] - Criação Inicial do Esquema de Usuários e Autenticação
- **Tabelas Criadas:**
  - `users`: Armazena os usuários do sistema com criptografia Argon2id + Pepper.
  - `invites`: Gerenciamento de convites com tempo de expiração e role.
  - `password_reset_tokens`: Tokens seguros para redefinição de senha com validade de 24h.
  - `registration_verifications`: Verificação OTP de 6 dígitos via Brevo API para validação de e-mail.

---

### [24/09/2026] - Sistema de Backup Automático e Histórico (Backblaze B2 / S3)
- **Tabelas Criadas:**
  - `backup_schedules`: Armazena a rotina de agendamento automático de backups (`is_active`, `frequency`, `destination_folder`, `retention_max`, `last_run_at`, `next_run_at`, `updated_at`).
  - `backup_histories`: Histórico de dumps gerados, baixados, restaurados e importados (`filename`, `s3_key`, `file_size_bytes`, `backup_type`, `status`, `error_message`, `created_at`).
- **Script de Migração:** `backend/scripts/migrate_backup_tables.py`

---

### [16/10/2026] - Criação do Módulo de Formulários
- **Tabelas Criadas:**
  - `forms`: Gerenciamento e listagem dos formulários criados (`id`, `title`, `slug`, `status`, `responses_count`, `completion_rate`, `questions`, `webhook_url`, `user_id`, `created_at`, `updated_at`).
  - `form_responses`: Armazenamento individual de submissões de formulários com dados de contato e respostas em JSON (`id`, `form_id`, `contact_name`, `contact_email`, `contact_phone`, `answers`, `created_at`).
- **Script de Migração:** `backend/scripts/create_forms_table.py`, `backend/scripts/add_questions_column.py`, `backend/scripts/add_webhook_column.py`, `backend/scripts/create_form_responses_table.py`---

### [16/10/2026] - Integração com Google Agenda (Google Calendar - OAuth 2.0 Tokens)
- **Tabelas Afetadas:**
  - `forms`: Adicionadas colunas `google_calendar_access_token` (TEXT), `google_calendar_refresh_token` (TEXT) e `google_calendar_token_expiry` (TIMESTAMP).
- **Script de Migração:** `backend/scripts/add_google_calendar_tokens_columns.py`

---

### [16/10/2026] - Telas Finais com Redirecionamento Personalizado
- **Tabelas Afetadas:**
  - `forms`: Adicionada coluna `ending_screens` (JSON DEFAULT '[]').
- **Script de Migração:** `backend/scripts/add_ending_screens_column.py`

---

### [16/10/2026] - Tela de Boas-Vindas (Welcome Screen) com Botão de Início
- **Tabelas Afetadas:**
  - `forms`: Adicionada coluna `welcome_screen` (JSON DEFAULT '{}').
- **Script de Migração:** `backend/scripts/add_welcome_screen_column.py`

---

### [16/10/2026] - Captura de Respostas Parciais, Status de Conclusão e Exportação
- **Tabelas Afetadas:**
  - `form_responses`: Adicionadas colunas `status` (VARCHAR DEFAULT 'CONCLUIDO'), `completion_percent` (FLOAT DEFAULT 100.0) e `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
- **Script de Migração:** `backend/scripts/add_response_status_and_completion_columns.py`

---

### [17/10/2026] - Personalização de Cores e Temas do Formulário (Design)
- **Tabelas Afetadas:**
  - `forms`: Adicionada coluna `theme` (JSON DEFAULT '{}').
- **Script de Migração:** `backend/scripts/add_theme_column.py`





