# Operações — FarmaConsulta

Guia de operação em produção: backup/restore do banco, rotação de segredos e checklist de deploy. Complementa `docs/TECHNICAL.md` (arquitetura) e `docs/DESIGN.md` (design system).

## 1. Backup do PostgreSQL

### 1.1 Estratégia

- **`pg_dump` diário**, formato custom (`-Fc`) — mais compacto e permite restauração seletiva de tabelas se necessário.
- Reter os últimos 30 dumps diários (rotação simples por idade de arquivo) + 1 dump mensal guardado por 12 meses.
- Guardar os dumps **fora do host do banco** (bucket de object storage, ou volume separado com backup próprio) — um backup no mesmo disco do banco não protege contra perda do disco/host.

### 1.2 Exemplo de cron de backup

```bash
#!/usr/bin/env bash
# /etc/cron.daily/backup-telefarmacia (ou job de cron equivalente)
set -euo pipefail

DATA=$(date +%Y-%m-%d)
DEST_DIR="/var/backups/telefarmacia"
mkdir -p "$DEST_DIR"

pg_dump -Fc "$DATABASE_URL" > "$DEST_DIR/telefarmacia_${DATA}.dump"

# Rotação: apaga dumps diários com mais de 30 dias
find "$DEST_DIR" -name 'telefarmacia_*.dump' -mtime +30 -delete
```

Agendar via `crontab -e` (ex.: `0 3 * * * /etc/cron.daily/backup-telefarmacia`) ou o agendador equivalente do provedor de hospedagem (muitos bancos gerenciados — RDS, Cloud SQL, Neon, Supabase — já oferecem backup automático diário nativo; nesse caso, usar o nativo em vez de reimplementar).

### 1.3 Restauração (testar periodicamente, não só documentar)

```bash
# Banco novo, vazio, para não sobrescrever produção por engano:
createdb telefarmacia_restore_test

pg_restore -d telefarmacia_restore_test /var/backups/telefarmacia/telefarmacia_2026-07-09.dump

# Validar: contar linhas de uma tabela central e comparar com o esperado
psql telefarmacia_restore_test -c 'SELECT count(*) FROM "User";'
```

Restauração real (substituindo o banco em uso) segue o mesmo `pg_restore`, mas contra o banco de produção — sempre com o app parado (evita gravações durante a restauração) e um dump do estado atual tirado antes, por segurança.

**Frequência recomendada de teste de restauração:** trimestral, ou antes de qualquer migração de schema arriscada. Um backup nunca testado é um backup que não se sabe se funciona.

## 2. Rotação de segredos

| Segredo | O que invalida ao trocar | Como rotacionar com segurança |
|---|---|---|
| `JWT_SECRET` | **Todas as sessões ativas** — todo usuário logado precisa logar de novo | Trocar em janela de baixo tráfego; comunicar aos usuários que talvez precisem logar de novo |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Todas as inscrições de Web Push existentes (o navegador rejeita push assinado com a chave antiga) | Gerar novo par (`web-push generate-vapid-keys`), aceitar que notificações push param de chegar até o usuário reabrir o app e reinscrever |
| `SMTP_USER` / `SMTP_PASS` | Nada em uso — só afeta envios futuros | Trocar a qualquer momento, sem downtime |
| `GOOGLE_CLIENT_ID` | Login via Google (frontend e backend precisam do mesmo valor) | Trocar nos dois `.env` simultaneamente; usuários que já têm sessão local não são afetados até o próximo login Google |
| `DATABASE_URL` (senha do Postgres) | Conexões abertas do backend | Trocar a senha no Postgres, atualizar a env var, reiniciar o backend (pool de conexões reconecta) |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Nada em uso — só afeta captura de erros futura | Trocar a qualquer momento |

Nenhum segredo deve ser commitado — todos vêm de variáveis de ambiente (ver `.env.example` em `backend/` e `frontend/`).

## 3. Checklist de deploy

1. **Antes de subir:**
   - [ ] `npm test` verde no backend
   - [ ] `npm run build` do frontend sem erros
   - [ ] Toda variável de ambiente nova (ver `.env.example`) configurada no ambiente de destino
   - [ ] Se houver migração de schema: `npx prisma migrate deploy` testado num banco de staging/cópia antes de rodar em produção
   - [ ] Se houver script de migração manual (`backend/scripts/migrate-*.mjs`, colunas fora do schema Prisma — ver `docs/TECHNICAL.md` §3.2), rodá-lo contra produção como parte do deploy (são idempotentes, usam `ADD COLUMN IF NOT EXISTS`)
2. **Deploy:**
   - [ ] Build do frontend (`npm run build` em `frontend/`) publicado/servido
   - [ ] Backend reiniciado com o código novo
   - [ ] Migrations do Prisma aplicadas (`npx prisma migrate deploy`) **antes** de trocar o código do backend, se a migração for aditiva; **depois**, se for uma migração que remove algo que o código antigo ainda usa
3. **Depois de subir:**
   - [ ] `GET /api/health` retorna `200`
   - [ ] Login (paciente e farmacêutico) funcional
   - [ ] Um fluxo de ponta a ponta (agendar consulta) funcional
   - [ ] Sem novo erro inesperado no Sentry (se configurado) ou nos logs (`X-Request-Id` facilita correlacionar um erro relatado por um usuário com a linha de log correspondente — ver `docs/TECHNICAL.md`)

## 4. Auditoria de dependências (`npm audit`)

Rodar `npm audit` em `backend/` e `frontend/` antes de cada release e corrigir o que `npm audit fix` (sem `--force`) resolver sem mudança de major.

**Status em 2026-07-10:**

- `backend/`: 0 vulnerabilidades.
- `frontend/`: 2 vulnerabilidades (1 moderate, 1 high) — `esbuild <=0.24.2` (usado pelo dev server do Vite) e uma decorrente em `vite <=6.4.2`. **Não corrigido nesta rodada** — a única correção disponível é `npm audit fix --force`, que sobe o Vite direto para a major 8 (atualmente na `^5.1.0`, pulando a 6 e a 7). É uma mudança de build tooling arriscada o bastante (plugins do projeto — `@tailwindcss/vite`, `@vitejs/plugin-react`, `vite-plugin-pwa` — precisariam ser revalidados contra a nova major) para não ser aplicada sem teste dedicado. Mitigação: as duas vulnerabilidades afetam **só o servidor de desenvolvimento do Vite** (uma delas permite que um site arbitrário acesse o dev server; a outra é bypass de path em `server.fs.deny`) — nenhuma das duas atinge o bundle de produção gerado por `npm run build`, que não roda o dev server. Ação recomendada: agendar o upgrade do Vite (mínimo viável: major 6, que já usa `esbuild ^0.25.0` corrigido) como uma tarefa própria, com teste completo do build e do dev server antes de mesclar.
