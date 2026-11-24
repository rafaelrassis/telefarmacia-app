# Contribuindo

Leitura obrigatória antes do primeiro PR: [CLAUDE.md](./CLAUDE.md).

## Setup (4 comandos)

```bash
git clone <repo> && cd telefarmacia-app
(cd backend && npm ci) && (cd frontend && npm ci)
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
(cd backend && npx prisma migrate dev && node scripts/seed-dev-users.mjs)
```

## Fluxo

1. Branch em kebab-case: `feature/...`, `fix/...`.
2. Commit -> push.
3. PR para `main`.
4. CI verde (`.github/workflows/tests.yml`: Node 20, Postgres 16, vitest no backend).
5. 1 review.
6. Merge.

## Definition of done

- `npm test` passa.
- `npm run lint` sem warning.
- `npm run build` passa nos dois lados (frontend e backend).
- Nenhum guardrail do [CLAUDE.md](./CLAUDE.md) violado.
- Se houve coluna nova via SQL cru, há migration manual em `backend/scripts/migrate-*.mjs`.

## Migrations

Toda coluna nova precisa de migration Prisma **e** entrada no `migrate-all.mjs` se for acessada por SQL cru.

## Secrets

Nunca commitar `.env`. `backend/.env.test` é commitado de propósito e não contém segredo real.
