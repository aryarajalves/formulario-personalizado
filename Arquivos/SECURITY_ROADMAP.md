# 🛡️ Roadmap de Segurança e Proteção de Dados

Este documento registra todas as melhorias e proteções de segurança planejadas para o sistema, organizadas em ordem de prioridade de execução.
Toda vez que uma melhoria for implementada, seu status deve ser marcado como concluído `[x]` e o relatório das pendências restantes deve ser apresentado ao usuário.

---

## 📋 Lista de Prioridades de Implementação

### 🔴 Prioridade 1 (Crítico) - Webhook Assíncrono em Background & Proteção Anti-SSRF
- [x] **1.1 Envio de Webhook em Segundo Plano (`BackgroundTasks`)**:
  - *Problema:* O envio atual do webhook é síncrono no momento da finalização do formulário, podendo atrasar a resposta ao respondente em até 8 segundos ou travar a experiência caso o webhook de destino esteja lento/fora do ar.
  - *Ação:* Mover o disparo HTTP do webhook para ser processado de forma assíncrona/background pelo FastAPI, liberando a tela de conclusão instantaneamente (em menos de 100ms) para o usuário final.
- [x] **1.2 Proteção Dinâmica contra SSRF (Server-Side Request Forgery)**:
  - *Problema:* Usuários podiam inserir URLs de webhook apontando para a rede interna do servidor (`localhost`, `127.0.0.1`, portas do banco de dados ou painel de metadados de nuvem).
  - *Ação:* Implementado módulo `app.core.ssrf` com validação estrita de esquemas HTTP/HTTPS, resolução e checagem de IPs privados/loopback e metadados de nuvem em ambiente de Produção, permitindo `localhost` apenas quando em Desenvolvimento (`ENVIRONMENT=development`).

---

### 🔴 Prioridade 2 (Crítico) - Rate Limiting & Proteção contra Ataques de Força Bruta / Spam
- [x] **2.1 Proteção contra Brute Force no Login**:
  - *Problema:* Endpoint `POST /api/v1/auth/login` sem limitação de tentativas, permitindo ataques de força bruta automatizados.
  - *Ação:* Implementar middleware de rate limit (ex: máximo de 5 tentativas por minuto por IP com resposta HTTP 429 Too Many Requests).
- [x] **2.2 Proteção contra Spam nos Formulários Públicos e Rotas Privadas**:
  - *Problema:* Endpoints públicos `/public/{slug}/submit` e `/public/{slug}/save-partial` podiam ser bombardeados por bots maliciosos para inundar o banco de dados.
  - *Ação:* Aplicar rate limit por IP (30 req/min nos formulários públicos, 3 req/min no registro OTP, e 200 req/min nas rotas privadas autenticadas).

---

### 🟠 Prioridade 3 (Alta) - Criptografia em Repouso dos Tokens OAuth do Google
- [x] **3.1 Criptografia Simétrica de `access_token` e `refresh_token`**:
  - *Problema:* Os tokens de acesso e renovação do Google Calendar ficavam salvos em texto puro na tabela `forms`.
  - *Ação:* Implementada criptografia em repouso com algoritmo Fernet (AES-128-CBC + HMAC-SHA256) via `app.core.encryption`, com chave secreta no `.env` (`SECURITY_ENCRYPTION_KEY`) e retrocompatibilidade com tokens legados.

---

### 🟡 Prioridade 4 (Média) - Restrição de Domínios no CORS
- [x] **4.1 Configuração Granular de Origens Permitidas no CORS**:
  - *Problema:* A aplicação usava `allow_origins=["*"]` com `allow_credentials=True` no `main.py`.
  - *Ação:* Configurar a lista de domínios autorizados via variável de ambiente `CORS_ORIGINS` (ex: `http://localhost:3000,http://localhost:3001,http://localhost:3002`), bloqueando origens externas desconhecidas.

---

## 📊 Status do Roadmap

| Item | Nível | Descrição | Status |
| :--- | :--- | :--- | :--- |
| **1.1** | 🔴 Crítico | Webhook em Segundo Plano (`BackgroundTasks`) | ✅ Concluído |
| **1.2** | 🔴 Crítico | Proteção Dinâmica contra SSRF (Dev vs Prod) | ✅ Concluído |
| **2.1** | 🔴 Crítico | Rate Limiting no Login (Anti-Brute Force) | ✅ Concluído |
| **2.2** | 🔴 Crítico | Rate Limiting nos Formulários Públicos & Privados | ✅ Concluído |
| **3.1** | 🟠 Alta | Criptografia de Tokens OAuth do Google no Banco | ✅ Concluído |
| **4.1** | 🟡 Média | Restrição Granular de Domínios no CORS | ✅ Concluído |

---

> 📌 **Protocolo do Agente:** Sempre que qualquer um desses itens for implementado, marque com `[x]` neste arquivo e exiba ao final da resposta o resumo das pendências que ainda faltam ser executadas.
