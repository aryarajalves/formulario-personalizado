# 📋 Plataforma de Formulários Personalizados (Formulário Personalizado)

Plataforma completa, moderna e flexível para **Criação, Edição, Compartilhamento e Análise de Formulários Interativos**, construída com **FastAPI (Backend)**, **React + Vite (Frontend)**, **PostgreSQL** e arquitetura containerizada via **Docker**.

A solução oferece uma experiência intuitiva no estilo *Typeform* com transições suaves, múltiplos tipos de perguntas, lógica condicional visual, personalização de identidade visual, painel completo de respostas detalhadas e parciais, além de integrações diretas com **Webhooks** e **Google Calendar**.

---

## ✨ Principais Funcionalidades

### 🎨 Criador & Editor de Formulários (Form Builder)
- **Editor Visual Interativo:** Criação fluida com tela de boas-vindas (*Welcome Screen*), tela de perguntas modulares e tela de finalização (*Ending Screen*).
- **Importação & Exportação em JSON:** Backup e portabilidade completa de formulários entre instâncias e contas com validação de esquema.
- **Ramificações & Múltiplos Fluxos (Branching):** Organização em blocos de fluxos (*Fluxo Principal, Ramificação B, C, etc.*), com suporte a saltos direcionados entre ramificações e perguntas.
- **Salvamento Sob Demanda:** Botão manual "Salvar" na barra superior com indicador de alterações pendentes (pulse dot), eliminando salvamentos automáticos concorrentes e excesso de notificações.
- **Responsividade Mobile Completa:**
  - Alternador móvel inteligente entre painéis (`Questões`, `Preview`, `Configuração`);
  - Navegação superior em grid de 4 colunas acessível (`Editar`, `Integrar`, `Compartilhar`, `Resultados`);
  - Área de compartilhamento público responsiva com cópia rápida e botões de ação sem sobreposição ou corte;
  - Sidebar retrátil (Drawer) com backdrop translúcido e fechamento seguro.
- **Tipos Diversificados de Pergunta:**
  - 📝 **Texto Curto / Texto Longo (Parágrafo)**;
  - 🔘 **Múltipla Escolha, Menu Suspenso & Escolha de Imagem**;
  - ✉️ **E-mail & Telefone/WhatsApp** (com validações de formato e seletor DDI internacional);
  - 🔢 **Números & Escala de Avaliação / Estrelas**;
  - 🛑 **Mensagem de Término / Desqualificação (Sem Input):** Nó de finalização de fluxo com texto explicativo e botão de conclusão, registrando a resposta como desqualificada;
  - 📅 **Agendamento com Google Calendar** (seleção de horários disponíveis em tempo real).
- **Personalização de Design:** Cores primárias/secundárias, plano de fundo, tipografia e tema claro/escuro.
- **Configurações Globais:** Personalização de título, descrição, slug público único e mensagens personalizadas.

### 🌐 Resposta Pública (Public Respondent)
- **Experiência Imersiva (Estilo Typeform):** Navegação fluida pergunta a pergunta, atalhos de teclado (Enter, setas) e suporte total a dispositivos móveis.
- **Otimização Mobile:** Ajustes de espaçamento em inputs, textos alinhados e remoção de excesso de margens em telas menores.
- **Captura Parcial Automática:** Captura respostas a partir da primeira pergunta preenchida, permitindo visualizar leads incompletos e taxa de abandono do formulário.
- **Validação em Tempo Real:** Verificação imediata de campos obrigatórios e formatos de contato.

### 📊 Painel de Resultados & Análise (Analytics)
- **Métricas em Tempo Real:** Total de respostas, respostas completas vs. parciais, taxa de conclusão e visualizações calculadas via agregações otimizadas.
- **Filtros Avançados:** Filtragem rápida por status (`Todos`, `Concluídas`, `Parciais`) e busca textual por dados do lead.
- **Diferenciação de Qualificação:** Status visualmente identificáveis na tabela e modal: `Concluído (100%)`, `Concluído (Não passou)` e `Parcial`.
- **Visualização Detalhada em Modal:** Modal dinâmico para inspecionar respostas completas de cada participante individualmente.
- **Exportação de Dados:** Exportação individual em **PDF** formatado para impressão/arquivamento e exportação global em planilha **CSV** (compatível com Excel).
- **Timestamps em Horário de Brasília (America/Sao_Paulo):** Exibição cronológica ajustada no fuso local (UTC-3).

### 🔗 Integrações, Agendamento Inteligente & Automação
- **Google Calendar Sync & Agendador Completo (5 Sub-abas):**
  - **Horários e Turnos:** Configuração de turnos múltiplos (ex: manhã e tarde) com pausas automáticas para almoço e seleção de dias da semana;
  - **Personalização de Evento & Sincronização de Cores:** Título e briefing dinâmicos com tags inteligentes (`{nome}`, `{formulario}`, `{email}`, `{telefone}`, `{respostas}`) e mapeamento automático das 11 cores oficiais do Google Agenda para emojis visuais (ex: `🟢 Reunião com {nome}`), garantindo que tanto o expert quanto o lead convidado visualizem a mesma cor nas suas agendas e e-mails;
  - **Agrupamento Inteligente de Horários:** Horários livres separados por turnos pulando linha em intervalos/pausas de almoço com divisor sutil (`── Intervalo ──`), mantendo a visualização organizada na prévia e no formulário público;
  - **Prévia do Calendário em Tempo Real:** Live preview visual interativo para validação instantânea da experiência do respondente;
  - **Agendamentos Realizados com Paginação & Exclusão em Cascata:** Tabela de reuniões marcadas com fatiamento de 20 itens por página, formatação amigável brasileira `dd/MM/yy HH:mm` e exclusão em cascata (cancela o evento no Google Agenda, deleta lembretes pendentes e remove a resposta);
  - **Lembretes & Webhooks Agendados com Paginação:** Disparo automático de lembretes matinais (ex: às 09:00 do dia da reunião) e de antecedência imediata (15, 30, 45, 60 min antes) via worker em background (APScheduler), histórico de disparos em tempo real com paginação de 20 itens por página, status HTTP e motivo do retorno, edição de informações e data de disparo, exclusão com popup seguro e disparo manual sob demanda com confirmação prévia;
  - **Filtro FreeBusy:** Consulta de disponibilidade em tempo real via Google Calendar API ocultando horários ocupados.
- **Webhooks Customizados com Logs de Auditoria:** Disparo de payloads HTTP JSON automáticos com histórico de auditoria, medição de latência em milissegundos, status HTTP e botão de teste manual.
- **Gestão e Exclusão em Lote (Bulk Delete):** Seleção múltipla de formulários na listagem com barra de ações flutuante, modal de confirmação com backdrop seguro e exclusão em lote com proteção anti-IDOR.
- **Lógica Condicional (Saltos Lógicos / Branching):** Redirecionamento dinâmico e inteligente entre perguntas ou finalização com base nas respostas selecionadas pelo participante.

### 🛡️ Administração, Segurança & Infraestrutura
- **Segurança Reforçada (Anti-SSRF & Rate Limiting):** Bloqueio de IP spoofing/DNS rebinding em requisições de webhook e limitação granular de taxa de requisições por IP.
- **Alta Escalabilidade & Performance:** Otimização de pool de conexões PostgreSQL (`pool_size=20`, `max_overflow=30`, `pool_recycle=300`) e índices compostos de busca rápida.
- **Autenticação Segura JWT (Argon2id + Pepper):** Proteção criptográfica moderna com perfis de acesso (Superadmin, Admin e Usuário).
- **Tratamento Global de Exceções:** Handlers centralizados de erro JSON padronizados, prevenindo vazamento de stack traces e falhas na interface.
- **Gestão de Convites & Usuários:** Links de convite com expiração automática e recuperação de acesso.
- **Backups Automáticos & Manuais em Nuvem:**
  - Snapshots compactados (`.dump.gz`) salvos localmente ou em provedores compatíveis com S3 (AWS S3 / Backblaze B2);
  - Agendamento periódico configurável via APScheduler com rotação automática FIFO.
- **Terminal de Logs dos Contêineres:**
  - Monitoramento dos logs do backend e frontend em tempo real via socket Docker nativo;
  - Filtro por período, classificação visual (`Info`, `Avisos`, `Erros`, status HTTP) e cópia simplificada.

---

## 📁 Estrutura do Projeto

```text
formulario-personalizado/
├── backend/                       # API FastAPI (Python 3.11+)
│   ├── app/
│   │   ├── api/v1/endpoints/      # Rotas (forms, users, backups, logs)
│   │   ├── core/                  # Configurações, segurança, database e logger
│   │   ├── models/                # Modelos SQLAlchemy (Form, FormResponse, User, Backup)
│   │   ├── schemas/               # Schemas Pydantic para validação e serialização
│   │   ├── services/              # Serviços de negócio (Google Calendar, Webhooks, S3, Logs)
│   │   └── main.py                # Ponto de entrada do FastAPI
│   ├── scripts/                   # Scripts de migração de banco de dados
│   ├── tests/                     # Testes unitários com Pytest
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                      # Aplicação Web em React + Vite
│   ├── src/
│   │   ├── components/            # Componentes visuais
│   │   │   ├── forms/             # Módulo completo de formulários
│   │   │   │   ├── editor/        # Canvas, painéis e abas de edição e resultados
│   │   │   │   ├── PublicFormRespondent.jsx # Interface pública para o respondente
│   │   │   │   └── FormsManagement.jsx      # Listagem e gestão de formulários
│   │   │   ├── automated-backup/  # Modais e gestão de backups
│   │   │   ├── user-management/   # Gestão de usuários e permissões
│   │   │   ├── LogManagement.jsx  # Visualizador de logs dos contêineres
│   │   │   └── Sidebar.jsx        # Menu de navegação lateral
│   │   ├── context/               # Provedores de contexto (Toast, Auth)
│   │   ├── services/              # Cliente HTTP com interceptor JWT
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── scripts/                       # Utilitários e auditoria de segurança (audit_security.py)
├── docker/                        # Orquestração com Docker Compose
│   └── docker-compose.yml
└── README.md
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados;
- Portas `3000`, `8000` e `5435` livres no ambiente.

### 1. Clonar o Repositório
```bash
git clone https://github.com/aryarajalves/formulario-personalizado.git
cd formulario-personalizado
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e configure suas variáveis de ambiente:
```bash
cp backend/.env.example backend/.env
```

### 3. Subir os Contêineres Docker
```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Acessos disponíveis:
- **Aplicação Web (Frontend):** `http://localhost:3000`
- **API FastAPI (Backend):** `http://localhost:8000`
- **Documentação Interativa Swagger:** `http://localhost:8000/docs`
- **Banco PostgreSQL:** `localhost:5435`

---

## 🧪 Testes Unitários e Validação

### Executar Testes do Frontend (Vitest)
```bash
cd frontend
npm test -- --run
```

### Executar Testes do Backend (Pytest)
```bash
# Via container Docker:
docker compose -f docker/docker-compose.yml exec backend pytest

# Ou localmente (com ambiente virtual ativo):
cd backend
pytest
```

### Auditoria Unificada de Segurança das Dependências
Para verificar vulnerabilidades conhecidas em pacotes Python (`pip-audit`) e Node (`npm audit`):
```bash
python scripts/audit_security.py
```

---

## 📄 Licença
Distribuído sob licença proprietária. Todos os direitos reservados.
