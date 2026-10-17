---
trigger: always_on
---

# Regra de Limites de Código (Clean Code)

Para garantir que o projeto permaneça manutenível e que o agente consiga processar os arquivos sem perder o contexto, estabelecemos limites rígidos de tamanho de arquivo.

**Limites Obrigatórios:**
1. **Backend (Python):** Nenhum arquivo deve ultrapassar **1.000 linhas**.
2. **Frontend (React, JSX, JS, TS, TSX e CSS):** Nenhum arquivo deve ultrapassar **500 linhas** (arquivos CSS também são considerados Frontend e têm o limite de 500 linhas).

**Ações ao atingir o limite e Verificação Proativa:**
- **Verificação Automática Obrigatória:** Toda vez que o agente criar ou atualizar qualquer arquivo no sistema, ele DEVE verificar se o arquivo alterado ultrapassou os limites estabelecidos (ou se já estava acima).
- **Alerta Imediato de Refatoração:** Se o arquivo modificado estiver acima do limite, o agente DEVE obrigatoriamente informar o usuário de forma destacada ao final da resposta, alertando quantas linhas o arquivo possui, que o limite foi excedido e que o código precisa ser refatorado/modularizado.
- **Autorização Prévia para Modularização:** O agente deve perguntar ao usuário se deseja realizar a modularização (quebra do arquivo em componentes, hooks, módulos CSS ou serviços menores) antes de executar a quebra.
- **Relatório de Pendências ao Final de Cada Refatoração (MANDATÓRIO):** Toda vez que o agente terminar de refatorar um código, ele DEVE obrigatoriamente listar ao final da resposta todos os demais arquivos do projeto que ainda ultrapassam os limites e continuam pendentes de refatoração, informando a quantidade de linhas de cada um.
- Ao propor a modularização, priorize a extração de componentes/hooks/estilos modulares (frontend) e serviços/utilitários (backend) para arquivos separados e aguarde a confirmação do usuário.

Isso evita a criação de "Arquivos Monolíticos" que são difíceis de testar e debugar, mantendo o usuário sempre ciente e no controle do fluxo de refatoração.

