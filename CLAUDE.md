# CLAUDE.md

Guia rápido do repositório para quem (humano ou agente) vai trabalhar neste código.

## 1. Visão de 30 segundos

FarmaConsulta / Telefarmacia: PWA de teleconsulta farmacêutica (BR). Modelo de **fila**, não de agenda por slot: paciente faz triagem -> paga -> recebe orientação do farmacêutico via WhatsApp. Pré-lançamento, sem usuários reais.

## 2. Stack e layout

Monorepo: `frontend/` (React 18 + Vite 5 + Tailwind v4) e `backend/` (Node ESM + Express 5 + Prisma 5 + PostgreSQL 15). **Monolito modular** — não é microserviço, e não deve ser fatiado sem decisão explícita do product owner.

Backend: `src/controllers` (30), `src/routes` (16), `src/services` (3), `src/middlewares`, `src/cronJobs.js` (10 jobs), `src/utils`.

## 3. Guardrails absolutos (quebrar = incidente)

- **Não renomeie nenhuma chave `@Telefarmacia:*`** do localStorage (`token`, `user`, `env`, `muteSom`, `pwaInstalada`). Renomear desloga 100% dos usuários.
- **Não altere o botão único de WhatsApp nem a geração automática de PDF** em `frontend/src/components/ConsultaModal.jsx` (213 linhas). Mudanças aqui exigem aprovação do product owner.
- **Não reintroduza Google Meet.** Foi removido do produto (ver comentário em `TriagemForm.jsx:102`). O canal de atendimento é WhatsApp, sempre.
- **Não exiba dado fabricado** — estrelas, avaliações, depoimentos, número de atendimentos, selos de segurança. Compliance de saúde: tudo tem que ser verificável ou sai da tela.
- **Admin não é role no Prisma.** É derivado da env `ADMIN_EMAILS` (usada em 5 arquivos de `backend/src`). Não crie `role: ADMIN` no schema.
- **Timezone `America/Sao_Paulo` é hardcoded** em todo o sistema. Não troque por UTC sem spec dedicada.
- **PIX está simulado de propósito.** Não "conserte" para cobrar de verdade sem a spec de pagamento aprovada.

## 4. Armadilhas conhecidas deste código

- **Colunas-sombra:** parte do backend usa SQL cru referenciando colunas criadas pelos scripts `backend/scripts/migrate-*.mjs` (26 no momento desta spec), que o `prisma migrate deploy` **não** executa. O `npm run build` do backend roda `migrate-all.mjs` justamente por isso. Esquecer esse passo já causou 500 em produção.
- **`npm install` no `backend/` falha em ambiente de agente/CI restrito** (download de binário do Prisma). Use `npm ci` e rode os comandos de build só onde há rede liberada.
- **Erros engolidos em `catch`**, sobretudo no código de push notification, escondem causa-raiz. Ao mexer ali, logue antes de silenciar.
- **Rate limiter compartilhado** nos endpoints de auth: tentativas de login e cadastro consomem a mesma cota.
- **Chrome não re-pergunta** permissão de push/instalação por ~90 dias após dispensada. Nenhum código contorna isso — não gaste tempo tentando.
- **Props de duplo papel** (ex.: `onClose`) servem a mais de uma função; remover UI que os chama tem efeito colateral.

## 5. Comandos

```bash
# backend
cd backend && npm ci && npx prisma generate
npm run dev          # nodemon
npm test             # vitest (gate de regressão)
npm run build        # prisma generate + migrate deploy + migrate-all.mjs

# frontend
cd frontend && npm ci
npm run dev
npm run lint         # --max-warnings 0, zero tolerância
npm run build        # gate de regressão
```

## 6. Onde está a documentação

`docs/TECHNICAL.md` (referência principal), `docs/DESIGN.md`, `docs/OPERACOES.md`, `especificacoes/` (specs por domínio), `casos-de-uso/`.

Regra: **documento pode estar desatualizado em relação ao repo.** Audite com `grep` antes de confiar.

## 7. Como trabalhar neste repo

- Audit-first: `grep -rln` com `--include=*.jsx --include=*.js` antes de assumir qualquer coisa.
- Grep negativo também é prova: confirmar que algo **não** existe vale tanto quanto confirmar que existe.
- Um commit por fase/entrega. `npm run build` + `npm test` verdes antes de commitar.
- Branch em kebab-case: `feature/...`, `fix/...`.
