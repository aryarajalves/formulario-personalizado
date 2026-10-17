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
- **Apenas Exibir se Ultrapassar o Limite (MANDATÓRIO):** O agente **NÃO DEVE** exibir contagem de linhas ou listas de arquivos quando todos estiverem dentro do limite estabelecido. A listagem/alerta DEVE aparecer na resposta **ÚNICA E EXCLUSIVAMENTE se algum arquivo ultrapassar o limite permitido** (mais de 500 linhas no Frontend/CSS ou mais de 1.000 linhas no Backend). Se todos estiverem dentro dos limites, não mencione nem liste contagens de linhas.
- **Alerta Imediato de Refatoração:** Se o arquivo modificado ultrapassar o limite, o agente DEVE obrigatoriamente informar o usuário de forma destacada ao final da resposta, alertando quantas linhas o arquivo possui, que o limite foi excedido e que o código precisa ser refatorado/modularizado.
- **Autorização Prévia para Modularização:** O agente deve perguntar ao usuário se deseja realizar a modularização (quebra do arquivo em componentes, hooks, módulos CSS ou serviços menores) antes de executar a quebra.
- **Relatório de Pendências ao Final de Cada Refatoração (MANDATÓRIO):** Toda vez que o agente terminar de refatorar um código, ele DEVE obrigatoriamente listar ao final da resposta todos os demais arquivos do projeto que ainda ultrapassam os limites e continuam pendentes de refatoração, informando a quantidade de linhas de cada um.
- Ao propor a modularização, priorize a extração de componentes/hooks/estilos modulares (frontend) e serviços/utilitários (backend) para arquivos separados e aguarde a confirmação do usuário.

Isso evita poluir as respostas quando o código já está em conformidade, alertando o usuário no momento exato em que um arquivo ultrapassa o limite e precisa de refatoração.


