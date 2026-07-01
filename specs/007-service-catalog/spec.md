# Feature Specification: Cadastro e Gestão de Serviços

**Feature Branch**: `007-service-catalog`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Quero implementar o módulo de serviços. Nele deve ser possível cadastrar novos serviços com nome, descrição, duração em minutos, preço padrão, status ( ativo/inativo ). Posteriormente cada serviço pode ser atrelado a profssionais, isso deverá ser feito na tela de profissionais. O profissional pode usar o preço padrão ou ter um preço customizado especifico para ele."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cadastrar e gerenciar o catálogo de serviços (Priority: P1)

O proprietário ou administrador do workspace acessa a tela de serviços, cadastra um novo serviço informando nome, descrição, duração em minutos e preço padrão, e o serviço passa a ficar disponível como "ativo" no catálogo. Ele também pode editar serviços existentes e ativar/desativar qualquer serviço a qualquer momento.

**Why this priority**: Sem o catálogo de serviços cadastrado, não existe nada para associar aos profissionais — é a base de todo o módulo.

**Independent Test**: Pode ser testado cadastrando um serviço com todos os campos, verificando que ele aparece na lista com status "ativo", e em seguida editando e desativando esse mesmo serviço.

**Acceptance Scenarios**:

1. **Given** um OWNER ou ADMIN autenticado na tela de serviços, **When** ele preenche nome, duração (minutos) e preço padrão e salva, **Then** o serviço é criado com status "ativo" e aparece na lista de serviços.
2. **Given** o formulário de cadastro de serviço, **When** o usuário tenta salvar sem preencher nome, duração ou preço padrão, **Then** o sistema bloqueia o envio e exibe mensagem indicando os campos obrigatórios.
3. **Given** um serviço existente, **When** o ADMIN edita nome, descrição, duração ou preço padrão, **Then** as alterações são salvas e refletidas imediatamente na lista de serviços.
4. **Given** um serviço ativo, **When** o ADMIN altera seu status para "inativo", **Then** o serviço deixa de aparecer como opção selecionável para novas associações, mas associações já existentes com profissionais são preservadas.
5. **Given** um serviço inativo, **When** o ADMIN reativa o serviço, **Then** ele volta a aparecer como opção selecionável para novas associações.

---

### User Story 2 — Associar serviços a um profissional (Priority: P2)

O administrador acessa a tela/perfil de um profissional (feature de cadastro de profissionais) e, na seção "Serviços" — hoje um placeholder vazio —, seleciona quais serviços ativos do catálogo aquele profissional realiza. Serviços podem ser adicionados ou removidos da lista do profissional a qualquer momento.

**Why this priority**: É o elo entre o catálogo de serviços e a equipe; sem ele, o cadastro de serviços fica isolado e sem uso prático.

**Independent Test**: Pode ser testado abrindo o perfil de um profissional, associando um serviço ativo do catálogo, e verificando que ele passa a aparecer na lista de serviços do profissional (usando o preço padrão).

**Acceptance Scenarios**:

1. **Given** o perfil de um profissional e a lista de serviços ativos do workspace, **When** o ADMIN seleciona um ou mais serviços e salva, **Then** os serviços passam a aparecer associados ao profissional, utilizando o preço padrão de cada um.
2. **Given** um profissional com um serviço associado, **When** o ADMIN remove essa associação, **Then** o serviço deixa de aparecer vinculado ao profissional, sem afetar o serviço no catálogo geral nem outros profissionais.
3. **Given** um serviço associado a um profissional que é posteriormente desativado no catálogo, **When** o ADMIN visualiza o perfil do profissional, **Then** o serviço continua listado, porém identificado como "inativo", até que a associação seja removida manualmente.

---

### User Story 3 — Personalizar o preço de um serviço por profissional (Priority: P3)

Para um serviço já associado a um profissional, o administrador pode habilitar um preço personalizado específico para aquele profissional, em vez de usar o preço padrão do serviço. Essa personalização pode ser revertida a qualquer momento, voltando a usar o preço padrão.

**Why this priority**: Agrega valor ao permitir precificação diferenciada por profissional (ex.: profissionais sênior cobrando mais), mas depende das duas histórias anteriores e não bloqueia o uso básico do módulo.

**Independent Test**: Pode ser testado habilitando um preço personalizado em uma associação profissional-serviço, salvando um valor diferente do padrão, e depois revertendo para o preço padrão.

**Acceptance Scenarios**:

1. **Given** uma associação profissional-serviço usando o preço padrão, **When** o ADMIN habilita "preço personalizado" e informa um valor, **Then** esse valor passa a valer exclusivamente para aquele profissional, sem alterar o preço padrão do serviço nem afetar outros profissionais.
2. **Given** uma associação com preço personalizado ativo, **When** o ADMIN desativa a personalização ("usar preço padrão"), **Then** o preço aplicado volta a ser o preço padrão vigente do serviço.
3. **Given** um profissional com preço personalizado ativo para um serviço, **When** o preço padrão desse serviço é alterado no catálogo, **Then** o preço personalizado do profissional permanece inalterado.

---

### Edge Cases

- O que acontece ao tentar cadastrar um serviço com duração zero ou negativa? → O sistema rejeita e exige um valor inteiro positivo de minutos.
- O que acontece ao tentar cadastrar um serviço com preço negativo? → O sistema rejeita e exige um valor monetário maior ou igual a zero.
- O que acontece ao tentar excluir permanentemente um serviço? → Não é permitido; serviços só podem ser ativados ou desativados, preservando o histórico de associações.
- O que acontece se dois serviços forem cadastrados com o mesmo nome no mesmo workspace? → É permitido; não há restrição de nome único nesta versão.
- O que acontece se um preço personalizado for informado com o mesmo valor do preço padrão? → É aceito normalmente; a associação passa a ser tratada como personalizada até ser revertida manualmente.
- O que acontece com um profissional sem nenhum serviço associado? → Ele aparece normalmente no cadastro de profissionais, apenas com a seção "Serviços" vazia.

---

## Requirements *(mandatory)*

### Functional Requirements

**Cadastro de Serviços**

- **FR-001**: O sistema DEVE permitir que OWNER e ADMIN cadastrem um novo serviço informando nome, descrição (opcional), duração em minutos e preço padrão.
- **FR-002**: Nome, duração e preço padrão são campos obrigatórios; descrição é opcional.
- **FR-003**: A duração DEVE ser um número inteiro positivo, representando minutos.
- **FR-004**: O preço padrão DEVE ser um valor monetário maior ou igual a zero.
- **FR-005**: Todo novo serviço DEVE ser criado com status "ativo" por padrão.
- **FR-006**: O sistema DEVE permitir que OWNER e ADMIN editem nome, descrição, duração e preço padrão de um serviço existente.
- **FR-007**: O sistema DEVE permitir que OWNER e ADMIN alternem o status de um serviço entre "ativo" e "inativo" a qualquer momento.
- **FR-008**: Serviços inativos NÃO DEVEM aparecer como opção selecionável para novas associações com profissionais, mas associações já existentes DEVEM ser preservadas.
- **FR-009**: O sistema NÃO DEVE permitir exclusão permanente de serviços; apenas a alteração de status é suportada.
- **FR-010**: A lista de serviços DEVE exibir nome, duração, preço padrão e status de cada serviço cadastrado no workspace.

**Associação de Serviços a Profissionais**

- **FR-011**: A seção "Serviços" da tela de perfil do profissional (atualmente placeholder) DEVE permitir que OWNER e ADMIN selecionem, a partir dos serviços ativos do workspace, quais serviços o profissional realiza.
- **FR-012**: O sistema DEVE permitir que OWNER e ADMIN removam a associação entre um profissional e um serviço a qualquer momento.
- **FR-013**: Ao associar um serviço a um profissional, o sistema DEVE aplicar o preço padrão do serviço por padrão.
- **FR-014**: Uma associação profissional-serviço já existente cujo serviço tenha sido desativado no catálogo DEVE permanecer visível no perfil do profissional, identificada como inativa, até ser removida manualmente.

**Preço Personalizado**

- **FR-015**: O sistema DEVE permitir que OWNER e ADMIN habilitem um preço personalizado para uma associação profissional-serviço específica, substituindo o preço padrão apenas para aquele profissional.
- **FR-016**: O preço personalizado DEVE seguir as mesmas regras de validação do preço padrão (valor monetário maior ou igual a zero).
- **FR-017**: O sistema DEVE permitir reverter uma associação de preço personalizado para voltar a usar o preço padrão do serviço.
- **FR-018**: Quando o preço padrão de um serviço é alterado, o sistema DEVE refletir automaticamente o novo valor para todos os profissionais que utilizam o preço padrão, sem afetar profissionais com preço personalizado ativo.

### Key Entities

- **Serviço (Service)**: Representa um serviço oferecido pelo negócio. Atributos: nome, descrição, duração (minutos), preço padrão, status (ativo/inativo). Pertence a exatamente um workspace.
- **Associação Profissional-Serviço**: Representa o vínculo entre um profissional e um serviço que ele realiza. Atributos: indicador de uso de preço padrão ou personalizado, valor do preço personalizado (quando aplicável). Pertence a um profissional e a um serviço.
- **Profissional (WorkspaceMember)**: Entidade já existente (feature de cadastro de profissionais); passa a poder ter zero ou mais serviços associados.
- **Workspace**: Entidade tenant que agrupa os serviços, profissionais e demais dados do negócio.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: OWNER ou ADMIN consegue cadastrar um novo serviço completo (nome, duração, preço padrão) em menos de 1 minuto.
- **SC-002**: 100% dos serviços criados ou editados aparecem atualizados na lista de serviços imediatamente, sem necessidade de recarregar a página manualmente.
- **SC-003**: ADMIN consegue associar um serviço existente a um profissional em até 3 interações a partir do perfil do profissional.
- **SC-004**: Uma alteração no preço padrão de um serviço é refletida automaticamente para 100% dos profissionais que usam o preço padrão, sem exigir edição manual em cada profissional.
- **SC-005**: Nenhuma associação profissional-serviço é perdida quando o serviço correspondente é desativado — verificado por cenário de teste explícito.
- **SC-006**: 100% das tentativas de cadastro com duração ou preço inválidos (zero, negativo ou vazio) são bloqueadas com mensagem de erro descritiva.

---

## Assumptions

- Serviços são escopados por workspace (tenant), seguindo o Princípio I da constituição do projeto — cada workspace só visualiza e gerencia seu próprio catálogo.
- Apenas OWNER e ADMIN podem gerenciar o catálogo de serviços e as associações com profissionais, seguindo o mesmo padrão de permissões já adotado no cadastro de profissionais.
- Não há exclusão definitiva de serviços nesta versão; apenas ativação/desativação, para preservar o histórico de associações e futuros agendamentos que venham a referenciá-los.
- Nomes de serviços duplicados dentro do mesmo workspace são permitidos, sem restrição de unicidade nesta versão.
- Preço padrão e preço personalizado são expressos em Real (R$), consistente com o mercado-alvo do produto.
- A estrutura de relacionamento profissional-serviço prevista como placeholder na feature de cadastro de profissionais é a base a ser utilizada/expandida por esta feature.
- O uso efetivo dos serviços associados em fluxos de agendamento (booking) está fora do escopo desta feature; aqui é entregue apenas o cadastro do catálogo e a associação aos profissionais, incluindo a precificação.
