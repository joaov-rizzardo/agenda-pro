# Feature Specification: Agenda de Profissionais

**Feature Branch**: `008-professional-agenda`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Quero implementar o modo de agenda, quero algo parecido com o teams que mostra os agendamentos por horário. A agenda deverá ser por profissional. Profissionais com cargo de admin/owner poderam ver/manipular a agenda de outros. Deve ser possível agendar, remarcar e cancelar agendamentos por essa tela. Me ajude a pensar o que mais é imprescidivel nessa tela."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visualizar a agenda de um profissional por horário (Priority: P1)

Um profissional autenticado acessa a tela de agenda e visualiza seus próprios agendamentos organizados em uma grade por horário ao longo do dia, semelhante a um calendário de equipe (estilo Teams), mostrando cliente, serviço e horário de início/fim de cada agendamento.

**Why this priority**: É a funcionalidade base da tela — sem visualização por horário não há como agendar, remarcar ou cancelar com contexto visual.

**Independent Test**: Pode ser testado logando como um profissional com agendamentos existentes e verificando que todos aparecem na grade nos horários corretos.

**Acceptance Scenarios**:

1. **Given** um profissional autenticado com agendamentos no dia atual, **When** ele acessa a tela de agenda, **Then** os agendamentos aparecem na grade de horários, posicionados conforme hora de início e duração.
2. **Given** um profissional sem nenhum agendamento no dia, **When** ele acessa a agenda, **Then** a grade de horários é exibida vazia, sem erros.
3. **Given** um profissional autenticado, **When** ele navega para outro dia (anterior/posterior), **Then** a grade é atualizada para exibir os agendamentos do dia selecionado.
4. **Given** um agendamento na grade, **When** o profissional clica sobre ele, **Then** os detalhes do agendamento (cliente, serviço, duração, status) são exibidos.

---

### User Story 2 — ADMIN/OWNER visualizar e alternar entre agendas de outros profissionais (Priority: P1)

Um ADMIN ou OWNER acessa a tela de agenda e pode alternar entre a agenda de qualquer profissional ativo do workspace, visualizando os agendamentos de cada um da mesma forma que veria os próprios.

**Why this priority**: É o diferencial citado explicitamente pelo usuário e essencial para gestão centralizada da equipe — sem isso, ADMIN/OWNER não conseguem supervisionar ou apoiar o agendamento da equipe.

**Independent Test**: Pode ser testado logando como ADMIN, selecionando um profissional diferente na lista, e verificando que a grade exibe os agendamentos daquele profissional.

**Acceptance Scenarios**:

1. **Given** um ADMIN ou OWNER autenticado, **When** ele acessa a tela de agenda, **Then** um seletor de profissional é exibido com todos os profissionais ativos do workspace.
2. **Given** um ADMIN ou OWNER na tela de agenda, **When** ele seleciona outro profissional, **Then** a grade é atualizada para exibir os agendamentos desse profissional.
3. **Given** um profissional com role MEMBER, **When** ele acessa a tela de agenda, **Then** ele visualiza apenas a própria agenda, sem seletor de outros profissionais.
4. **Given** um MEMBER autenticado, **When** ele tenta acessar diretamente a agenda de outro profissional (ex.: via URL), **Then** o sistema bloqueia o acesso e exibe mensagem de permissão insuficiente.

---

### User Story 3 — Criar um novo agendamento pela tela de agenda (Priority: P1)

Um profissional (para si mesmo) ou um ADMIN/OWNER (para qualquer profissional) cria um novo agendamento diretamente na tela de agenda, selecionando um horário livre na grade, o serviço desejado e o cliente, e o agendamento passa a aparecer na grade imediatamente.

**Why this priority**: É a ação primária da tela — sem criar agendamentos, a agenda é apenas uma visualização passiva.

**Independent Test**: Pode ser testado clicando em um horário livre da grade, preenchendo serviço e cliente, salvando, e verificando que o agendamento aparece na posição correta.

**Acceptance Scenarios**:

1. **Given** a grade de horários de um profissional, **When** o usuário clica em um horário livre, **Then** um formulário de novo agendamento é aberto com o horário de início pré-preenchido.
2. **Given** o formulário de novo agendamento, **When** o usuário seleciona um serviço, **Then** a duração do agendamento é automaticamente calculada a partir da duração do serviço e o horário de término é ajustado.
3. **Given** o formulário de novo agendamento preenchido corretamente, **When** o usuário salva, **Then** o agendamento é criado com status "agendado" e aparece imediatamente na grade.
4. **Given** um horário que já possui um agendamento para aquele profissional, **When** o usuário tenta criar outro agendamento sobreposto para o mesmo profissional, **Then** o sistema bloqueia a ação e exibe mensagem de conflito de horário.
5. **Given** um serviço inativo no catálogo, **When** o usuário abre o formulário de novo agendamento, **Then** esse serviço não aparece como opção selecionável.
6. **Given** o formulário de novo agendamento, **When** o usuário tenta salvar sem selecionar serviço ou cliente, **Then** o sistema bloqueia o envio e exibe mensagem indicando os campos obrigatórios.

---

### User Story 4 — Remarcar um agendamento existente (Priority: P2)

Um profissional ou ADMIN/OWNER altera a data/horário (e, quando aplicável, o profissional responsável) de um agendamento já existente diretamente pela tela de agenda, e o cliente associado deve ser notificado da mudança.

**Why this priority**: Remarcação é uma operação frequente no dia a dia de negócios de agendamento, mas depende da criação (US3) já existir.

**Independent Test**: Pode ser testado selecionando um agendamento existente, alterando o horário para um novo horário livre, salvando, e verificando que ele aparece na nova posição e não mais na antiga.

**Acceptance Scenarios**:

1. **Given** um agendamento existente com status "agendado", **When** o usuário altera o horário de início para um horário livre no mesmo dia, **Then** o agendamento é movido para o novo horário e o horário anterior fica livre.
2. **Given** um agendamento existente, **When** o usuário tenta remarcá-lo para um horário que conflita com outro agendamento do mesmo profissional, **Then** o sistema bloqueia a ação e exibe mensagem de conflito de horário.
3. **Given** um ADMIN/OWNER, **When** ele remarca um agendamento de um profissional para outro profissional, **Then** o agendamento passa a aparecer na agenda do novo profissional responsável.
4. **Given** um agendamento remarcado, **When** a remarcação é concluída, **Then** o sistema registra a alteração no histórico do agendamento, incluindo horário anterior e novo horário.
5. **Given** um agendamento já concluído ou cancelado, **When** o usuário tenta remarcá-lo, **Then** o sistema bloqueia a ação, pois apenas agendamentos "agendados" podem ser remarcados.

---

### User Story 5 — Cancelar um agendamento (Priority: P2)

Um profissional ou ADMIN/OWNER cancela um agendamento existente diretamente pela tela de agenda, informando opcionalmente um motivo, liberando o horário na grade e notificando o cliente associado.

**Why this priority**: Cancelamento é essencial para manter a agenda confiável, mas depende da criação (US3) já existir.

**Independent Test**: Pode ser testado selecionando um agendamento existente, cancelando-o, e verificando que o status muda para "cancelado" e o horário fica livre na grade para novos agendamentos.

**Acceptance Scenarios**:

1. **Given** um agendamento com status "agendado", **When** o usuário clica em cancelar e confirma, **Then** o status do agendamento muda para "cancelado" e o horário passa a aceitar novos agendamentos.
2. **Given** um agendamento cancelado, **When** o usuário visualiza a grade, **Then** o agendamento cancelado é exibido de forma visualmente distinta (ex.: esmaecido/riscado) até ser removido da visualização padrão, ou não aparece mais na grade padrão, conforme filtro ativo.
3. **Given** um agendamento cancelado, **When** o cancelamento é concluído, **Then** o sistema registra o motivo (se informado) e o horário do cancelamento no histórico do agendamento.
4. **Given** um agendamento já concluído ou já cancelado, **When** o usuário tenta cancelá-lo novamente, **Then** o sistema bloqueia a ação.

---

### User Story 6 — Configurar o horário de funcionamento do workspace (Priority: P3)

Um OWNER ou ADMIN configura o horário de funcionamento único do workspace (dias da semana e horário de abertura/fechamento), que passa a delimitar a grade de horários e as regras de criação/remarcação de agendamentos para todos os profissionais.

**Why this priority**: Delimita a grade e evita agendamentos fora do expediente, mas a agenda funciona com um horário padrão razoável mesmo antes dessa configuração ser feita manualmente — por isso não bloqueia as histórias P1/P2.

**Independent Test**: Pode ser testado alterando o horário de funcionamento do workspace e verificando que a grade de horários e as validações de criação/remarcação passam a respeitar o novo intervalo.

**Acceptance Scenarios**:

1. **Given** um workspace recém-criado sem configuração explícita, **When** um usuário acessa a agenda, **Then** o sistema aplica um horário de funcionamento padrão (08:00–18:00, todos os dias) até que seja alterado.
2. **Given** um OWNER ou ADMIN autenticado, **When** ele altera os dias e o horário de abertura/fechamento do workspace, **Then** a grade de horários e as regras de criação/remarcação passam a refletir o novo horário para todos os profissionais.
3. **Given** um dia da semana marcado como fechado, **When** um usuário tenta criar ou remarcar um agendamento nesse dia, **Then** o sistema bloqueia a ação e exibe mensagem informando que o workspace está fechado nesse dia.

---

### Edge Cases

- O que acontece quando dois usuários tentam agendar o mesmo horário para o mesmo profissional simultaneamente? → O sistema deve garantir que apenas o primeiro salvamento seja aceito; o segundo recebe erro de conflito e é orientado a escolher outro horário.
- O que acontece quando um agendamento é criado para um profissional que está inativo no workspace? → O sistema deve bloquear, pois profissionais inativos não devem receber novos agendamentos.
- O que acontece quando o serviço associado a um agendamento é desativado no catálogo após o agendamento já ter sido criado? → O agendamento existente permanece válido e visível normalmente; apenas novos agendamentos não podem usar o serviço desativado.
- O que acontece ao tentar remarcar um agendamento para uma data/horário no passado? → O sistema bloqueia e exibe mensagem informando que não é possível agendar no passado.
- Como o sistema trata um agendamento cujo horário já passou mas nunca teve seu status atualizado (nem concluído nem cancelado)? → Ele continua visível na agenda com status "agendado"; a atualização para "concluído" ou "não compareceu" é uma ação manual do profissional/ADMIN.
- O que acontece se o único horário livre do dia for menor que a duração do serviço selecionado? → O sistema bloqueia a criação/remarcação por conflito, já que o intervalo não comporta a duração do serviço.

## Requirements *(mandatory)*

### Functional Requirements

**Visualização da Agenda**

- **FR-001**: O sistema DEVE exibir, para um profissional selecionado, uma grade de horários do dia com os agendamentos posicionados conforme horário de início e duração.
- **FR-002**: O sistema DEVE permitir a navegação entre dias (dia anterior/posterior e retorno ao dia atual).
- **FR-002a**: O sistema DEVE restringir a criação e remarcação de agendamentos ao horário de funcionamento configurado para o workspace, aplicado uniformemente a todos os profissionais (sem configuração individual por profissional nesta versão).
- **FR-003**: Cada agendamento exibido na grade DEVE mostrar, no mínimo, nome do cliente, serviço e horário de início/fim.
- **FR-004**: O sistema DEVE permitir visualizar os detalhes completos de um agendamento ao selecioná-lo na grade.
- **FR-005**: Profissionais com role MEMBER DEVEM visualizar e manipular exclusivamente a própria agenda.
- **FR-006**: Profissionais com role ADMIN ou OWNER DEVEM poder selecionar e visualizar a agenda de qualquer profissional ativo do workspace, um profissional por vez, através de um seletor.
- **FR-007**: O sistema DEVE bloquear, no servidor, qualquer tentativa de um MEMBER acessar ou manipular a agenda de outro profissional, independentemente do que a interface exibir.

**Criação de Agendamento**

- **FR-008**: O sistema DEVE permitir criar um novo agendamento a partir de um horário selecionado na grade, exigindo profissional, serviço, e nome e telefone do cliente informados em texto livre no momento do agendamento (sem cadastro de clientes persistente nesta versão).
- **FR-009**: A duração do agendamento DEVE ser calculada automaticamente a partir da duração do serviço selecionado, sendo ajustável apenas dentro de regras de conflito de horário.
- **FR-010**: O sistema DEVE impedir a criação de um agendamento cujo intervalo de horário se sobreponha a outro agendamento ativo ("agendado") do mesmo profissional.
- **FR-011**: O sistema NÃO DEVE permitir selecionar serviços inativos ao criar um novo agendamento.
- **FR-012**: O sistema NÃO DEVE permitir criar agendamentos para profissionais inativos no workspace.
- **FR-013**: O sistema NÃO DEVE permitir criar ou remarcar agendamentos para um horário no passado.
- **FR-014**: Todo novo agendamento DEVE ser criado com status "agendado".

**Remarcação**

- **FR-015**: O sistema DEVE permitir alterar a data, o horário e, quando o usuário for ADMIN/OWNER, o profissional responsável de um agendamento com status "agendado".
- **FR-016**: O sistema DEVE aplicar as mesmas regras de conflito de horário (FR-010) e de horário no passado (FR-013) também na remarcação.
- **FR-017**: O sistema NÃO DEVE permitir remarcar agendamentos com status "concluído" ou "cancelado".
- **FR-018**: O sistema DEVE registrar, no histórico do agendamento, o horário anterior e o novo horário sempre que uma remarcação ocorrer.

**Cancelamento**

- **FR-019**: O sistema DEVE permitir cancelar um agendamento com status "agendado", liberando o horário correspondente na grade.
- **FR-020**: O sistema DEVE solicitar confirmação explícita antes de efetivar o cancelamento de um agendamento.
- **FR-021**: O sistema NÃO DEVE permitir cancelar um agendamento que já esteja "concluído" ou "cancelado".
- **FR-022**: O sistema DEVE registrar o motivo do cancelamento (quando informado) junto ao agendamento cancelado.
- **FR-023**: O sistema DEVE distinguir visualmente agendamentos cancelados dos demais na grade (ou removê-los da visualização padrão, mantendo-os disponíveis por filtro/histórico).

**Disponibilidade do Workspace**

- **FR-026**: O sistema DEVE permitir que OWNER e ADMIN configurem o horário de funcionamento do workspace (dias da semana e horário de abertura/fechamento), aplicado uniformemente a todos os profissionais.
- **FR-027**: Na ausência de configuração explícita, o sistema DEVE aplicar um horário de funcionamento padrão (08:00–18:00, todos os dias).
- **FR-028**: O sistema NÃO DEVE permitir criar ou remarcar agendamentos fora do horário de funcionamento configurado ou em dias marcados como fechados.

**Permissões e Isolamento**

- **FR-024**: Todas as operações de leitura e escrita de agendamentos DEVEM ser restritas ao workspace do usuário autenticado, conforme Princípio I da constituição do projeto.
- **FR-025**: O sistema DEVE re-validar no servidor a role do usuário autenticado antes de permitir visualizar ou manipular a agenda de um profissional diferente dele mesmo.

### Key Entities

- **Agendamento (Appointment)**: Representa um compromisso entre um profissional e um cliente para a realização de um serviço em um intervalo de tempo específico. Atributos principais: data/hora de início, data/hora de término (derivada da duração do serviço), status (agendado, concluído, cancelado, não compareceu), nome e telefone do cliente (texto livre, não persistente como cadastro), motivo de cancelamento (opcional), histórico de remarcações. Pertence a um workspace, a um profissional e a um serviço.
- **Horário de Funcionamento (BusinessHours)**: Representa a configuração de dias e horário de abertura/fechamento aplicada uniformemente a todos os profissionais de um workspace. Pertence a exatamente um workspace.
- **Profissional (WorkspaceMember)**: Entidade já existente; passa a ter uma agenda de agendamentos associada.
- **Serviço (Service)**: Entidade já existente; define a duração usada para calcular o horário de término do agendamento.
- **Workspace**: Entidade tenant que agrupa profissionais, serviços, horário de funcionamento e agendamentos do negócio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um profissional ou ADMIN/OWNER consegue criar um novo agendamento em menos de 1 minuto a partir da tela de agenda.
- **SC-002**: A grade de horários exibe os agendamentos do dia selecionado em até 2 segundos após a seleção do profissional ou da data.
- **SC-003**: ADMIN/OWNER consegue alternar entre a agenda de dois profissionais diferentes em até 2 interações.
- **SC-004**: 0% dos agendamentos criados ou remarcados resultam em sobreposição de horário para o mesmo profissional — verificado por cenário de teste explícito.
- **SC-005**: 100% das tentativas de um MEMBER acessar a agenda de outro profissional são bloqueadas — verificado por cenário de teste explícito.
- **SC-006**: 100% dos cancelamentos e remarcações ficam registrados no histórico do agendamento, com horário anterior/novo e motivo (quando informado) — verificado por cenário de teste explícito.
- **SC-007**: 100% das tentativas de criar ou remarcar um agendamento fora do horário de funcionamento configurado do workspace são bloqueadas — verificado por cenário de teste explícito.

## Assumptions

- O cadastro de profissionais (feature 006) e o catálogo de serviços (feature 007) já existem e são reutilizados como base para seleção de profissional e serviço nesta feature.
- A visualização padrão da agenda é por dia, com um profissional por vez; visões adicionais (semana, mês, múltiplos profissionais lado a lado) não são obrigatórias para esta versão e podem ser adicionadas posteriormente sem impacto no modelo de dados.
- O intervalo mínimo de granularidade da grade de horários é de 15 minutos, suficiente para a maioria dos serviços cadastrados.
- O cliente é identificado apenas por nome e telefone informados em texto livre no momento do agendamento, sem cadastro persistente; não há coleta de e-mail do cliente nesta versão. Consequentemente, notificações automáticas ao cliente (por e-mail ou SMS/WhatsApp) estão fora do escopo desta feature — cancelamentos e remarcações ficam registrados no histórico do agendamento para que o profissional/ADMIN possa comunicar o cliente manualmente (ex.: telefone). Um módulo de cadastro de clientes e notificação automática pode ser tratado em iteração futura.
- O horário de funcionamento é único por workspace (mesmos dias/horário para todos os profissionais); disponibilidade individual por profissional (folgas, intervalos, jornadas diferentes) está fora do escopo desta versão.
- Estados de agendamento cobertos nesta versão: agendado, concluído, cancelado e não compareceu; a transição para "concluído"/"não compareceu" é uma ação manual do profissional/ADMIN, não automática por horário.
- Feriados e bloqueios de agenda pontuais (ex.: folgas, férias) estão fora do escopo desta feature e podem ser tratados em uma iteração futura, junto com disponibilidade individual por profissional.
- A tela de agenda aqui especificada é a área autenticada (interna) do workspace; não se confunde com a futura página pública de agendamento pelo cliente final, que é uma superfície separada.
