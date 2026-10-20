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


