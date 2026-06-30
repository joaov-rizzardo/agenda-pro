# Feature Specification: Cadastro e Gestão de Profissionais

**Feature Branch**: `006-professional-registration`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "Quero criar uma tela para cadastro de profissionais. Esse cadastro deve enviar um convite para o profissional participar por email. Cada profissional pode ter uma role ( OWNER, ADMIN ou MEMBER ). Poderá ter status, ativo ou inativo atrelado ao workspace. Caso o usuário ainda não esteja cadastrado na aplicação ele deverá passar pelo cadastro e em seguida ser inserido na empresa. O profissional também pode ter uma foto de perfil atrelado ao profissional e um cargo atralado ao workspace. Deveremos deixar pronta uma estrutura para configurar os serviços que o profissional irá realizar. ( Módulo de serviços será desenvolvido posteriormente )"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Convidar um novo profissional para o workspace (Priority: P1)

O proprietário ou administrador do workspace acessa a tela de profissionais e envia um convite por e-mail para um profissional que ainda não faz parte da equipe. O profissional recebe o convite, aceita, e passa pelo fluxo de cadastro (caso não tenha conta) ou confirma a adesão diretamente (caso já tenha conta). Ao final, o profissional aparece na lista da equipe com o cargo e a role definidos pelo convidante.

**Why this priority**: É o fluxo principal que permite a formação da equipe no workspace; sem ele, o módulo inteiro é bloqueado.

**Independent Test**: Pode ser testado de ponta a ponta enviando um convite para um e-mail e verificando que o profissional aparece na lista da equipe após aceitar.

**Acceptance Scenarios**:

1. **Given** um OWNER ou ADMIN autenticado no workspace, **When** ele preenche nome, e-mail, cargo e role e envia o convite, **Then** o sistema registra o convite com status "pendente" e envia um e-mail de convite ao endereço informado.
2. **Given** um e-mail de convite recebido por um usuário já cadastrado na plataforma, **When** ele clica no link de aceite, **Then** ele é adicionado ao workspace com a role e o cargo definidos no convite.
3. **Given** um e-mail de convite recebido por um usuário ainda não cadastrado, **When** ele clica no link e conclui o cadastro na plataforma, **Then** ele é automaticamente vinculado ao workspace com a role e o cargo definidos no convite.
4. **Given** um profissional que acabou de ser adicionado ao workspace (via aceite de convite), **When** ele faz login na plataforma, **Then** o workspace aparece disponível para acesso na tela de seleção de workspaces e ele consegue navegar para ele sem nenhuma etapa adicional.
5. **Given** um profissional membro de múltiplos workspaces, **When** ele faz login, **Then** todos os workspaces aos quais pertence (e estão ativos) são exibidos e acessíveis.
6. **Given** um convite pendente, **When** o prazo de validade expira (7 dias), **Then** o convite é marcado como expirado e o link de aceite deixa de funcionar.

---

### User Story 2 — Gerenciar profissionais existentes no workspace (Priority: P2)

O administrador acessa a lista de profissionais do workspace, visualiza o status (ativo/inativo) de cada membro, e pode editar o cargo, a role ou o status de qualquer profissional sem OWNER (exceto o próprio OWNER).

**Why this priority**: Permite que o workspace se mantenha atualizado conforme a equipe muda de função ou sai da empresa.

**Independent Test**: Pode ser testado alterando a role ou o status de um profissional existente e verificando que a mudança reflete imediatamente na lista.

**Acceptance Scenarios**:

1. **Given** um ADMIN ou OWNER na tela de profissionais, **When** ele edita o cargo de um profissional MEMBER, **Then** o novo cargo é salvo e exibido na lista.
2. **Given** um OWNER na tela de profissionais, **When** ele altera a role de um MEMBER para ADMIN, **Then** a role é atualizada e o profissional passa a ter permissões de ADMIN no workspace.
3. **Given** um OWNER ou ADMIN, **When** ele desativa um profissional, **Then** o status do profissional muda para "inativo" e ele perde acesso ao workspace.
4. **Given** um ADMIN, **When** ele tenta alterar a role ou status de um OWNER, **Then** o sistema bloqueia a ação e exibe mensagem de permissão insuficiente.

---

### User Story 3 — Gerenciar foto de perfil do profissional (Priority: P3)

O profissional (ou um administrador em seu nome) pode fazer o upload de uma foto de perfil que fica associada ao profissional dentro do workspace e é exibida na lista da equipe e em outras superfícies que utilizem o profissional (agenda, serviços etc.).

**Why this priority**: Melhora a identificação visual na equipe, mas não bloqueia o funcionamento do módulo.

**Independent Test**: Pode ser testado fazendo upload de uma imagem e verificando que ela aparece nos cards de profissional na lista da equipe.

**Acceptance Scenarios**:

1. **Given** um profissional ou ADMIN autenticado, **When** ele faz upload de uma imagem (JPEG ou PNG, máx. 5 MB), **Then** a foto é salva e exibida no perfil do profissional.
2. **Given** um profissional sem foto cadastrada, **When** ele é exibido na lista, **Then** o sistema exibe um avatar padrão com as iniciais do nome.
3. **Given** um arquivo inválido (formato não suportado ou tamanho acima do limite), **When** o usuário tenta fazer upload, **Then** o sistema rejeita o arquivo e exibe mensagem de erro descritiva.

---

### User Story 4 — Estrutura de serviços do profissional (Priority: P4)

A tela de perfil do profissional expõe uma seção de "Serviços" que indica quais serviços o profissional está habilitado a realizar. Por enquanto a seção é exibida como vazia/placeholder, aguardando a implementação do módulo de serviços.

**Why this priority**: Prepara a estrutura de dados e a interface para o módulo de serviços sem bloquear o lançamento do cadastro de profissionais.

**Independent Test**: Pode ser testado verificando que a seção de serviços é exibida no perfil do profissional (mesmo que vazia) sem erros.

**Acceptance Scenarios**:

1. **Given** um profissional cadastrado, **When** o ADMIN acessa o perfil dele, **Then** uma seção "Serviços" é exibida indicando que nenhum serviço foi configurado ainda.
2. **Given** o modelo de dados do profissional, **When** o módulo de serviços for implementado, **Then** a relação entre profissional e serviços já existe na estrutura de dados e não requer migração de schema.

---

### Edge Cases

- O que acontece quando um convite é enviado para um e-mail já vinculado ao workspace? → O sistema deve bloquear e informar que o profissional já é membro.
- O que acontece quando um convite é reenviado para um convite já pendente? → O sistema cancela o convite anterior e envia um novo, resetando o prazo de validade.
- O que acontece quando o único OWNER tenta se remover ou desativar? → O sistema bloqueia a ação e exige que outro membro seja promovido a OWNER primeiro.
- O que acontece quando um profissional inativo tenta acessar o workspace? → O sistema nega o acesso e exibe mensagem indicando que a conta está desativada neste workspace.
- Como são tratados convites de workspaces diferentes para o mesmo e-mail? → Cada convite é independente e o usuário pode pertencer a múltiplos workspaces simultaneamente.
- O que acontece se o e-mail de convite cair em spam e o profissional nunca aceitar? → O ADMIN pode reenviar o convite manualmente a qualquer momento enquanto o status for "pendente" ou "expirado".

---

## Requirements *(mandatory)*

### Functional Requirements

**Gestão de Convites**

- **FR-001**: O sistema DEVE permitir que OWNER e ADMIN enviem convites por e-mail para profissionais, informando nome, e-mail, cargo e role.
- **FR-002**: O sistema DEVE enviar um e-mail de convite contendo um link único e com validade de 7 dias.
- **FR-003**: O sistema DEVE registrar o convite com status "pendente" até ser aceito, expirado ou cancelado.
- **FR-004**: O sistema DEVE bloquear o envio de convite para um e-mail já vinculado ao workspace.
- **FR-005**: O sistema DEVE permitir que o ADMIN reenvie um convite pendente ou expirado, gerando um novo link e resetando o prazo.
- **FR-006**: Ao aceitar o convite, se o e-mail já tiver conta na plataforma, o usuário DEVE ser adicionado ao workspace diretamente.
- **FR-007**: Ao aceitar o convite, se o e-mail não tiver conta na plataforma, o usuário DEVE ser direcionado para o fluxo de cadastro e, ao concluí-lo, adicionado automaticamente ao workspace.

**Roles e Permissões**

- **FR-008**: Cada membro do workspace DEVE ter exatamente uma role: OWNER, ADMIN ou MEMBER.
- **FR-009**: Apenas OWNER DEVE poder convidar com role ADMIN ou OWNER.
- **FR-010**: O sistema DEVE impedir que um ADMIN altere a role ou o status de um OWNER.
- **FR-011**: O sistema DEVE impedir a remoção ou desativação do último OWNER de um workspace.

**Status e Acesso**

- **FR-012**: Cada vínculo profissional–workspace DEVE ter um status: ativo ou inativo.
- **FR-013**: Profissionais inativos NÃO DEVEM ter acesso ao workspace até serem reativados.
- **FR-014**: OWNER e ADMIN DEVEM poder ativar ou desativar qualquer profissional (exceto OWNER, para ADMINs).
- **FR-021**: Após ser adicionado a um workspace (via aceite de convite), o profissional DEVE encontrar esse workspace listado e acessível na tela de seleção de workspaces assim que fizer login.
- **FR-022**: O sistema DEVE exibir apenas workspaces com vínculo ativo na tela de seleção de workspaces; workspaces com vínculo inativo NÃO DEVEM aparecer como acessíveis.

**Perfil do Profissional**

- **FR-015**: Cada profissional DEVE poder ter uma foto de perfil associada, exibida na lista da equipe e nas superfícies que consomem dados de profissional.
- **FR-016**: O sistema DEVE aceitar imagens nos formatos JPEG e PNG com tamanho máximo de 5 MB.
- **FR-017**: Profissionais sem foto DEVEM ter um avatar padrão gerado a partir das iniciais do nome.
- **FR-018**: Cada profissional DEVE ter um cargo (título de função) definido por workspace, independente do cargo em outros workspaces.

**Estrutura de Serviços**

- **FR-019**: O modelo de dados DEVE incluir uma estrutura de relacionamento entre profissional e serviços, mesmo que a seção de configuração seja exibida como vazia até o módulo de serviços ser implementado.
- **FR-020**: A tela de perfil do profissional DEVE exibir uma seção "Serviços" com estado vazio e indicação de que a configuração estará disponível em breve.

### Key Entities

- **Profissional (WorkspaceMember)**: Representa o vínculo de um usuário com um workspace. Atributos principais: role (OWNER, ADMIN, MEMBER), status (ativo/inativo), cargo (título de função no workspace). Pertence a exatamente um usuário e a exatamente um workspace.
- **Usuário (User)**: Conta na plataforma. Pode pertencer a múltiplos workspaces com roles diferentes. Possui foto de perfil global.
- **Convite (WorkspaceInvite)**: Representa um convite pendente de entrada no workspace. Atributos: e-mail destinatário, role pretendida, cargo pretendido, token único, data de expiração, status (pendente, aceito, expirado, cancelado). Pertence a um workspace.
- **Workspace**: Entidade tenant que agrupa profissionais, serviços e agendamentos de um negócio.
- **Serviço (Service)** *(placeholder)*: Entidade que representa um serviço oferecido pelo negócio. A relação com profissional existe no modelo mas o conteúdo será populado pelo módulo de serviços.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: OWNER ou ADMIN consegue enviar um convite e o profissional convidado recebe o e-mail em até 2 minutos.
- **SC-002**: O fluxo completo de convite → cadastro (novo usuário) → login → acesso ao workspace é concluído em menos de 5 minutos pelo profissional, sem nenhuma etapa manual adicional após o login.
- **SC-003**: 100% dos convites expirados deixam de funcionar após 7 dias do envio, sem possibilidade de aceite.
- **SC-004**: A lista de profissionais do workspace exibe status, role, cargo e foto de todos os membros sem necessidade de recarregamento manual.
- **SC-005**: Nenhuma ação de ADMIN consegue alterar a role ou o status de um OWNER — verificado por cenário de teste explícito.
- **SC-006**: A seção de serviços no perfil do profissional é exibida sem erros e sem dados fictícios, pronta para receber conteúdo quando o módulo de serviços for implementado.

---

## Assumptions

- O workspace já existe e o usuário autenticado é OWNER ou ADMIN — o cadastro de profissionais não cobre a criação do workspace em si (coberta pela feature 005).
- O sistema de e-mail transacional já está ou será configurado para disparar convites; o template de e-mail seguirá o padrão visual e em pt-BR conforme Princípio X da constituição.
- A foto de perfil do profissional é global ao usuário na plataforma (não por workspace), mas pode ser atualizada pelo próprio profissional ou por um ADMIN no contexto do workspace.
- Apenas um OWNER por workspace é permitido na criação; a transferência de propriedade (promover outro membro a OWNER) é suportada mas é uma operação separada, não coberta por esta spec como fluxo principal.
- O módulo de serviços será desenvolvido posteriormente; esta feature cria apenas a estrutura relacional e o placeholder de UI.
- Convites são enviados por e-mail; outros canais (SMS, link direto) estão fora do escopo desta feature.
- A remoção permanente de um profissional do workspace (vs. desativação) está fora do escopo desta feature — apenas a mudança de status (ativo/inativo) é coberta.
