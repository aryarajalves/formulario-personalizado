# Business Rules & Decisões de Negócio

Este arquivo registra regras de negócio oficiais e perguntas respondidas pelo proprietário do projeto.

---

## 1. Fluxos Alternativos e Ramificações (Branching)

- [x] Como as questões fora do fluxo linear devem ser organizadas no menu lateral esquerdo do editor?
  - **Decisão:** Opção A aprovada pelo usuário. O editor possui blocos/grupos de **Fluxos e Ramificações** (Fluxo Principal e Ramificações adicionais como B, C, etc.), permitindo criar perguntas separadas da linha crescente principal.
- [x] Onde a lógica condicional deve ser exibida?
  - **Decisão:** A lógica condicional aparece **exclusivamente** para questões da categoria **ESCOLHAS** (`multiple_choice`, `dropdown`, `image_choice`, `yes_no`). Para quaisquer outros tipos de questão (texto, data, email, telefone, número, etc.), nenhuma seção de lógica condicional/pulo é exibida.
- [x] Ao concluir uma questão ou fluxo alternativo, qual deve ser o comportamento padrão?
  - **Decisão:** Cada fluxo avança apenas pelas questões pertencentes ao mesmo fluxo. Ao atingir o final de uma ramificação ou fluxo, o formulário é submetido e redirecionado para a Tela Final (a menos que uma condicional de salto redirecione para outro fluxo).

---

## 2. Nó de Término / Tela Informativa Sem Input (Desqualificação)

- [x] Qual o nome e categoria no modal para a questão de término sem input?
  - **Decisão:** Nome oficial: **'Mensagem de Término / Desqualificação'** (id: `statement` ou `disqualification_screen`), exibido na categoria **ESTRUTURA & TÉRMINO** (ou **TEXTO E NÚMERO** / informativo). Não possui campos de digitação (input field), exibindo título, descrição/conteúdo e botão de finalização ("Finalizar").
- [x] Qual a nomenclatura exata nos Resultados para indicar que o formulário foi concluído mas o lead não passou?
  - **Decisão:** O status de conclusão exibe a tag/badge **'Concluído (Não passou)'** com estilo âmbar/laranja de advertência suave, diferenciando de 'Concluído (100%)' (aprovado) e de 'Parcial' (incompleto).

---

## 3. Integração com Google Agenda e Calendário Interativo

- [x] Onde ficam as configurações de horários e dias de atendimento do expert?
  - **Decisão:** As configurações de disponibilidade do expert (dias da semana, horários de atendimento, duração da reunião) ficam centralizadas no card do **Google Agenda na aba Integrações** do formulário.
- [x] Como os horários com conflito/ocupados na agenda devem ser exibidos ao respondente?
  - **Decisão:** Horários ocupados ou com conflito na agenda real do Google simplesmente **não aparecem** na lista (apenas slots 100% livres são exibidos ao respondente).
- [x] Qual a duração padrão da reunião/atendimento e opções permitidas?
  - **Decisão:** O padrão inicial é **60 minutos**, com opção para o usuário selecionar outros intervalos (ex: 15, 30, 45, 60 minutos).
- [x] Como o respondente deve confirmar a escolha de data e horário no calendário?
  - **Decisão:** Ao selecionar um dia e um horário livre, o sistema **não** avança automaticamente. Um botão destacado de confirmação ('Confirmar Agendamento') é exibido logo abaixo do resumo no próprio card do calendário. Apenas quando o usuário clica neste botão a escolha é confirmada e o formulário avança para a próxima etapa/submissão.
- [x] Como o criador do formulário define turnos múltiplos e pausas (ex: almoço ou intervalos de atendimento)?
  - **Decisão:** A seção de horários permite adicionar múltiplos intervalos/turnos no mesmo dia (ex: 09:00 às 12:00 e 15:00 às 20:00). O período intermediário entre turnos (ex: 12:00 às 15:00) atua automaticamente como intervalo/pausa (almoço), sem gerar slots disponíveis para agendamento. O criador pode adicionar novos turnos via botão '+ Adicionar intervalo / turno' e remover turnos adicionais com ícone de lixeira.
- [x] Onde o criador pode visualizar como o calendário está ficando sem precisar abrir o formulário público?
  - **Decisão:** Diretamente dentro da aba 'Integrar' no card do Google Agenda, existe uma seção de **Prévia em Tempo Real (Live Preview)** do calendário interativo. Essa prévia reflete imediatamente as configurações de turnos e dias de atendimento salvas e possui botão dedicado para recarregar a prévia a qualquer momento.
- [x] Como o criador do formulário personaliza o evento gerado na Google Agenda e para quem ele é enviado?
  - **Decisão:** O evento é criado automaticamente na agenda Google conectada do expert e o e-mail do lead informado no formulário é incluído como convidado (`attendees`), fazendo com que o Google Agenda envie convite e notificação por e-mail para ambos. O criador pode personalizar na parte superior do card: o **Título do Evento** (com tags inteligentes como `{nome}` e `{formulario}`), a **Descrição / Briefing** (com tags `{email}`, `{telefone}`, `{respostas}`) e a **Cor do Evento** no calendário (paleta com as 11 cores oficiais da API do Google Calendar).
- [x] Como as configurações do Google Agenda são organizadas para evitar acúmulo de informações e rolagem excessiva?
  - **Decisão:** O painel de configurações do Google Agenda na aba 'Integrar' é dividido em **4 sub-abas navegáveis**:
    1. **Horários e Turnos:** Dias disponíveis da semana, turnos/intervalos (ex: almoço), duração da reunião e buffer entre atendimentos, com botão 'Salvar Horários de Atendimento'.
    2. **Personalização do Evento:** Título inteligente com tags dinâmicas, descrição/briefing estruturado e paleta com as 11 cores oficiais da Google Agenda (com mini-card de prévia), com botão 'Salvar Configurações do Evento'.
    3. **Prévia do Calendário:** Visualização interativa e em tempo real do calendário idêntica à vista pelos respondentes, com botão 'Atualizar Prévia'.
    4. **Agendamentos:** Listagem completa de reuniões e horários marcados pelos respondentes no formulário, com data e horário em formato brasileiro legível (`dd/MM/yy HH:mm`), dados do lead (nome, e-mail, telefone) e status de sincronização com a Google Agenda.
- [x] Qual formato de data e horário deve ser exibido para agendamentos do Google Agenda nos resultados do formulário?
  - **Decisão:** A data e horário escolhidos são exibidos no formato brasileiro compacto e legível **dd/MM/yy HH:mm** (ex: `23/10/26 13:00`). Esse padrão é aplicado no modal de 'Detalhes da Resposta', nos chips de prévia da tabela de Resultados, no relatório PDF/impressão e nas exportações em planilha CSV/Excel, mantendo o armazenamento técnico interno em ISO para garantir sincronização precisa com a API do Google Agenda.
- [x] Como deve ser a exibição e paginação da lista de agendamentos na sub-aba Agendamentos da integração?
  - **Decisão:** A listagem de agendamentos possui sistema de paginação limitando a exibição a **20 itens por página**, com suporte no backend via query parameters `page` e `limit=20` e rodapé de paginação no frontend com contador ('Mostrando X de Y agendamentos (20 por página)'), indicador de página atual ('Página X de Y') e botões 'Anterior' e 'Próxima'.
- [x] Como funciona a exclusão de agendamentos realizados na aba Agendamentos da integração?
  - **Decisão:** Na tabela de agendamentos realizados, cada linha possui um botão 'Excluir'. Ao clicar, é aberto um popup centralizado com backdrop escuro translúcido (sem fechamento ao clicar fora). Ao confirmar, o sistema executa a exclusão em cascata:
    1. Cancela e apaga o evento correspondente na Google Agenda do expert conectado via API;
    2. Exclui todos os lembretes agendados associados (matinais ou de antecedência) da fila de disparos (`scheduled_webhooks`);
    3. Remove o registro da resposta do formulário (`form_responses`) e atualiza o total de respostas.
- [x] Como o sistema garante que o convidado visualize a mesma cor selecionada no Google Agenda?
  - **Decisão:** Na API do Google Calendar, a propriedade nativa `colorId` é estritamente privada da conta do organizador (o Google não permite que organizadores alterem a cor da agenda pessoal dos convidados, exibindo a cor padrão da conta do convidado). Para garantir que tanto o organizador quanto o convidado vejam a cor escolhida (na agenda, notificações e e-mails de convite), o sistema mapeia a paleta de cores para emojis coloridos oficiais (ex: 🟢 para Sálvia, 🟣 para Lavanda/Uva, 🔵 para Pavão/Mirtilo, 🔴 para Tomate/Flamingo, 🟡 para Banana, 🟠 para Tangerina, ⚫ para Grafite) e insere automaticamente o emoji no início do título do evento (ex: `🟢 Reunião com {nome}`).
- [x] Como os horários disponíveis devem ser exibidos quando há intervalos ou turnos múltiplos no dia?
  - **Decisão:** Quando há múltiplos turnos de atendimento configurados ou pausas/intervalos (ex: intervalo de almoço entre a manhã e a tarde), os horários disponíveis não devem ficar misturados no mesmo fluxo contínuo. O sistema separa cada turno em seu próprio bloco pulando linha, inserindo um divisor visual sutil ('Intervalo') entre os blocos para manter a listagem limpa, organizada e clara tanto na prévia do editor quanto no formulário público.



---

## 4. Gestão e Exclusão em Lote de Formulários (Bulk Delete)

- [x] Como deve funcionar a seleção e exclusão de múltiplos formulários na listagem?
  - **Decisão:** A tabela de formulários conta com checkboxes em cada linha e um checkbox mestre no cabeçalho para marcar/desmarcar todos os itens visíveis. Ao marcar 1 ou mais itens, surge uma barra de ações (`BulkActionBar`) indicando a quantidade de selecionados com as ações 'Desmarcar' e 'Excluir selecionados'.
- [x] Como deve ser a confirmação de exclusão em massa?
  - **Decisão:** Segue estritamente a regra de experiência do usuário: popup centralizado com backdrop escuro translúcido cobrindo o fundo, impedindo fechamento por clique fora (apenas via botão de Cancelar ou no botão principal de confirmação). Apresenta estado de carregamento ('Excluindo...') durante a requisição.
- [x] Como o backend garante segurança e integridade na exclusão em lote?
  - **Decisão:** Endpoint `POST /api/v1/forms/bulk-delete` que valida a posse dos formulários (`user_id == current_user.id`), impedindo acesso indevido (anti-IDOR), excluindo em lote e cascateando para respostas, perguntas e webhooks.

---

## 5. Histórico de Disparos de Webhook (Visualização e Recolhimento)

- [x] Como o histórico de disparos de webhook deve ser exibido para manter o layout clean?
  - **Decisão:** Por padrão, a listagem exibe apenas os 2 disparos mais recentes. Caso existam mais de 2 registros, um botão tracejado 'Mostrar mais (X disparos restantes)' permite expandir a lista completa, e 'Recolher para os 2 primeiros disparos' para condensá-la novamente. Além disso, o cabeçalho possui um botão com chevron que permite recolher ou expandir a seção inteira a qualquer momento.

---

## 6. Lembretes e Webhooks Agendados de Reunião

- [x] Onde as configurações de lembretes agendados de reunião devem ser posicionadas na interface?
  - **Decisão:** Como uma **5ª sub-aba 'Lembretes'** (ou 'Lembretes & Webhooks') dentro do card de configurações da Google Agenda na aba 'Integrar' (ao lado de 'Horários e Turnos', 'Personalização do Evento', 'Prévia do Calendário' e 'Agendamentos').
- [x] Quais gatilhos de lembrete devem estar disponíveis para ativação e customização?
  - **Decisão:** Dois tipos de lembretes complementares com alternadores (toggles) independentes:
    1. **Lembrete Matinal no Dia da Reunião:** Disparo às 09:00 (ou horário selecionável) da manhã do próprio dia do agendamento, informando que a reunião acontecerá hoje.
    2. **Lembrete de Antecedência Imediata:** Disparo X minutos antes do horário exato do início da reunião (ex: 15 min, 30 min, 45 min, 60 min antes).
- [x] Como o sistema trata lembretes cujo horário já passou no momento do agendamento?
  - **Decisão:** Se o formulário for respondido após o horário do lembrete matinal (ex: agendou para hoje às 15:00, mas já são 11:00), o lembrete matinal das 09:00 é automaticamente ignorado (não dispara retroativo), mantendo apenas o lembrete de antecedência minutos antes da reunião.
- [x] Quais ações de gerenciamento individual estão disponíveis para cada lembrete na listagem?
  - **Decisão:** Cada registro na listagem de lembretes possui 3 ações:
    1. **Disparar Manualmente (com popup):** Dispara imediatamente o webhook do lembrete com payload atualizado, precedido obrigatoriamente por um popup de confirmação centralizado com backdrop translúcido.
    2. **Editar Informações:** Abre modal para atualizar a data/horário previsto de disparo e os dados de contato do lead (Nome e Telefone/WhatsApp).
    3. **Excluir Lembrete (com popup):** Remove o lembrete da fila de agendamentos, impedindo seu envio futuro, com confirmação via popup de exclusão centralizado.
- [x] Como deve funcionar a paginação da listagem de Histórico de Disparos e Lembretes Agendados?
  - **Decisão:** A tabela de lembretes possui sistema de paginação limitando a exibição a **20 itens por página**, com suporte via query parameters `page` e `limit=20` no backend e rodapé de paginação no frontend com indicador ('Mostrando X de Y lembretes (20 por página)'), indicador de página atual ('Página X de Y') e botões de navegação 'Anterior' e 'Próxima', mantendo contadores independentes para as abas 'Todos', 'Disparados' e 'Agendados'.




