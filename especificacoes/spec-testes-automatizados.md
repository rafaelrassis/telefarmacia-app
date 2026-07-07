# Spec — Testes Automatizados

## Objetivo

Criar a suíte de testes de integração do backend cobrindo os fluxos críticos do sistema (dinheiro, ciclo de vida das consultas, autorização), com CI no GitHub Actions. Hoje o projeto tem **zero testes** — este é o alicerce para as próximas evoluções (refatoração, redesign) sem regressões.

**Escopo**: testes de integração do backend (rotas HTTP reais + banco Postgres de teste). Testes de frontend ficam para depois do redesign (fora do escopo).

---

## Fase 0 — Infraestrutura de testes

### Stack

- **Vitest** (compatível com ESM, que o backend usa) + **Supertest** como devDependencies do backend.
- Script `"test": "vitest run"` e `"test:watch": "vitest"` no `backend/package.json`.

### Banco de teste — proteção obrigatória

- Variável `DATABASE_URL` própria via `.env.test` (ex.: banco `telefarmacia_test`), documentada no TECHNICAL.md.
- **Guard de segurança no setup global**: se a `DATABASE_URL` ativa não contiver a substring `test`, abortar imediatamente com erro explícito. Nenhum teste pode rodar contra dev/produção.
- Setup global (`tests/setup.js`):
  - Aplica o schema no banco de teste (`prisma db push` programático ou via script)
  - `TRUNCATE` de todas as tabelas entre arquivos de teste (respeitando FKs, `CASCADE`)
  - Seed mínimo: `SystemConfig` essencial (sistema aberto, preço, comissão padrão, horários cobrindo o dia inteiro para os testes não dependerem da hora em que rodam)

### Adaptações no app (mínimas)

- Garantir que `app.js` exporta o `app` sem `listen()` (o `server.js` já separa isso — confirmar) para o Supertest usar direto.
- Com `NODE_ENV=test`: crons **não** são agendados (as funções dos jobs devem ser exportadas para invocação direta nos testes) e `web-push`/`nodemailer` são substituídos por no-ops que registram as chamadas (mock injetável ou verificação de ambiente no serviço).

### Helpers

`tests/helpers.js`: criar paciente autenticado (registro + login → token), criar farmacêutico aprovado, criar consulta agendada/urgente em qualquer status, consultar saldo. Todos via API real (não inserção direta no banco), exceto onde a API não cobre (ex.: aprovar farmacêutico usa a rota admin real com um admin de teste via `ADMIN_EMAILS`).

---

## Fase 1 — Fluxos de dinheiro (prioridade máxima)

Arquivo `tests/carteira.test.js` + `tests/estornos.test.js`:

1. Recarga simulada credita o saldo e gera `TransacaoCarteira` com `saldoApos` correto.
2. Agendar consulta debita o valor vigente; saldo insuficiente → 400 **sem** debitar nem criar consulta.
3. Cancelamento pelo paciente → estorno integral, transação `'estorno'`, `saldoApos` consistente.
4. **Idempotência**: cancelar a mesma consulta duas vezes não estorna duas vezes (segundo request → 4xx, saldo inalterado).
5. Expiração (invocando a função do cron diretamente): agendada `aguardando` vencida → cancelada + estorno + notificação criada; consulta não vencida → intocada.
6. Ajuste manual do admin: sem motivo → 400; débito que negativaria o saldo → 400; ajuste válido → saldo, transação `'ajuste_admin'` e registro em `AdminAuditLog`.
7. Conclusão de consulta grava `comissao_percentual` vigente (padrão e específica do farmacêutico).

## Fase 2 — Ciclo de vida das consultas

Arquivo `tests/fila-agendada.test.js` + `tests/fila-urgente.test.js`:

1. Fluxo feliz completo: agendar → aceitar (grava `farmaceuticoId` e `aceitoEm`) → iniciar atendimento → concluir → avaliar. Avaliar segunda vez → 4xx.
2. Farmacêutico não aprovado (ou suspenso) não consegue aceitar → 403.
3. Dois farmacêuticos aceitando a mesma consulta: o segundo recebe erro e o vínculo não muda.
4. Urgente: com 2 urgentes na frente, `GET /fila/urgente/ativa` retorna `posicao: 3`.
5. Devolução → consulta volta a `aguardando` sem farmacêutico; sem-contato → cancelada com estorno.
6. Remarcação pelo paciente: respeita o limite de remarcações; cria notificação ao farmacêutico quando vinculado.
7. Bloqueio de agenda impede aceite no horário bloqueado.
8. Recibo PDF: dono + concluída → 200 com `content-type` PDF; outro paciente → 403/404; consulta não concluída → 4xx.
9. Histórico do paciente no atendimento: farmacêutico da consulta acessa; outro farmacêutico → 403; consultas de dependente não vazam para o histórico do titular (e vice-versa).

## Fase 3 — Auth e autorização

Arquivo `tests/auth.test.js` + `tests/admin-guards.test.js`:

1. Registro + login retornam JWT válido; senha errada → 401; token ausente/inválido em rota protegida → 401.
2. Rotas `/api/admin/*` com usuário comum → 403; com email em `ADMIN_EMAILS` → 200.
3. Gestão de admins: adicionar via UI dá acesso; remover o próprio email → bloqueado; email vindo do env não é removível.
4. Paciente não acessa consulta/receita/recibo de outro paciente (IDOR) — varrer as principais rotas com id de recurso alheio.
5. Exclusão de conta (LGPD) remove/anonimiza e invalida o login.

## Fase 4 — CI (GitHub Actions)

- Workflow `.github/workflows/tests.yml`: dispara em push/PR para `main`; service container `postgres:16` com banco `telefarmacia_test`; instala deps, aplica schema, roda `npm test`.
- Badge de status no README.
- Seção "Testes" no TECHNICAL.md: como rodar localmente, como criar o banco de teste, convenções dos helpers.

---

## Defaults adotados (revisar antes de executar)

1. Vitest + Supertest com banco Postgres real de teste (sem mock do Prisma — testes de integração de verdade).
2. Frontend fora do escopo nesta fase.
3. Cobertura: relatório habilitado (`vitest --coverage` como script separado), sem meta obrigatória por enquanto.
4. Crons testados por invocação direta das funções, nunca por espera de agendamento.
5. Push e email viram no-ops registráveis em ambiente de teste.

---

## Critérios de aceite

- [ ] `npm test` roda a suíte inteira verde, do zero, em um banco recém-criado
- [ ] Suíte aborta com erro claro se `DATABASE_URL` não for de teste
- [ ] Todos os cenários das Fases 1–3 implementados (dinheiro, ciclo de vida, autorização)
- [ ] Nenhum teste depende de ordem de execução nem de hora do dia
- [ ] CI verde no GitHub Actions em push para main
- [ ] TECHNICAL.md documenta o setup de testes
- [ ] Bugs reais encontrados durante a escrita foram reportados, não mascarados
