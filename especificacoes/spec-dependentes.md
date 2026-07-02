# Spec: Cadastro e Gestão de Dependentes

## Visão geral

Permite que um titular cadastre até 6 perfis de dependentes (filhos, cônjuge, pais etc.) e realize consultas em nome deles. Créditos e pagamentos permanecem sempre vinculados ao titular.

---

## Modelo de dados

### `DependentProfile`

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `id` | UUID | sim | PK |
| `ownerId` | TEXT (FK User) | sim | Titular da conta |
| `nome` | TEXT | sim | Nome completo |
| `dataNascimento` | TIMESTAMP | sim | |
| `sexo` | TEXT | sim | `masculino`, `feminino`, `outro` |
| `parentesco` | TEXT | não | `filho_a`, `conjuge`, `pai_mae`, `irmao_a`, `outro` |
| `ativo` | BOOLEAN | sim | Default `true`; soft delete usa `false` |
| `aceitouResponsabilidade` | BOOLEAN | sim | Titular confirma responsabilidade ao cadastrar |
| `dadosSaude` | JSONB | não | Prefill de triagem (histórico de saúde, medicamentos, alergias) |
| `criadoEm` | TIMESTAMP | sim | |
| `atualizadoEm` | TIMESTAMP | sim | `@updatedAt` |

### Campos adicionados a tabelas existentes

| Tabela | Campo | Tipo | Notas |
|---|---|---|---|
| `FilaAgendada` | `dependentId` | TEXT? (FK DependentProfile) | `ON DELETE SET NULL` |
| `FilaUrgente` | `dependentId` | TEXT? (FK DependentProfile) | `ON DELETE SET NULL` |
| `PacienteProfile` | `dados_saude` | JSONB | Prefill do titular (raw SQL, fora do schema Prisma) |

---

## API

### Dependentes

| Verbo | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/dependentes` | Paciente | Lista dependentes ativos do titular |
| POST | `/api/dependentes` | Paciente | Cria (máx. 6 ativos) |
| PATCH | `/api/dependentes/:id` | Paciente | Atualiza (só do próprio titular) |
| DELETE | `/api/dependentes/:id` | Paciente | Soft delete (ativo=false) |
| GET | `/api/dependentes/:id/saude` | Paciente | Lê dadosSaude do dependente |
| PATCH | `/api/dependentes/:id/saude` | Paciente | Salva dadosSaude do dependente |

### Titular — dados de saúde

| Verbo | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/pacientes/dados-saude` | Paciente | Lê dados_saude do titular |
| PATCH | `/api/pacientes/dados-saude` | Paciente | Salva dados_saude do titular |

### Fila — campos adicionados

Os endpoints `POST /api/fila/agendar` e `POST /api/fila/urgente` agora aceitam `dependentId` no body. O backend valida que o `dependentId` pertence ao titular autenticado antes de aceitar; retorna 403 caso contrário.

---

## Segurança

- `ownerId` nunca vem do client; é sempre `req.user.id` no controller
- Qualquer operação sobre `DependentProfile` verifica `WHERE id = $1 AND ownerId = $2`; retorna 404 se não pertencer
- `POST /api/fila/*` com `dependentId` de outra conta retorna 403
- Conta A não pode listar, criar, editar, excluir ou ler saúde de dependentes da conta B
- Conta A não pode criar consulta usando `dependentId` da conta B

---

## Frontend

### Seletor de perfis (PatientDashboard)

- Posição: entre os botões de agendamento e a carteira de créditos
- Chips com scroll horizontal no mobile (≤768px) e flex-wrap no desktop
- Titular: chip fixo, sem botão de exclusão
- Dependentes: chip com `×` que abre confirmação inline antes de excluir
- `+ Adicionar perfil`: chip tracejado; desabilitado se 6 ativos já cadastrados
- Mini-modal inline de cadastro: nome*, data de nascimento*, sexo*, parentesco, checkbox de responsabilidade
- Após cadastro: novo perfil fica selecionado automaticamente
- Após exclusão: seleção volta para o titular

### Triagem (TriagemForm)

- Recebe props `preSelectedPerson` e `dependentes` do dashboard
- Inicializa a pessoa selecionada com `preSelectedPerson`; paciente ainda pode trocar dentro do fluxo
- Chip seletor compacto mostrado apenas quando há dependentes
- Nome da pessoa exibido como readonly no campo de identificação
- Sexo e peso pré-preenchidos do perfil da pessoa selecionada (editáveis)
- `dependentId` incluído no payload de triagem enviado ao backend

### Lista de consultas (MyAppointments)

- Cards exibem "Para: {pessoaNome}" quando a consulta foi feita para um dependente

---

## Regras de negócio

1. Limite de 6 dependentes ativos por titular
2. Soft delete: `ativo = false`; consultas antigas preservam o histórico
3. Créditos debitados sempre da carteira do titular, independente de para quem é a consulta
4. O titular aceita responsabilidade pelo dependente ao cadastrá-lo (`aceitouResponsabilidade = true`)
5. Dependente excluído: `dependentId` em FilaAgendada/FilaUrgente vira `NULL` (ON DELETE SET NULL)
