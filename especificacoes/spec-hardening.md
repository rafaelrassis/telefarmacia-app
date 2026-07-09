# Spec — Hardening de Produção

## Objetivo

Fechar as lacunas de robustez operacional que ainda restam: cabeçalhos de segurança HTTP, visibilidade sobre erros em produção, logs que não vazam dados sensíveis, documentação de operação (backup/restore, rotação de segredos, checklist de deploy) e dependências sem vulnerabilidades conhecidas de alta severidade.

## Diagnóstico (levantado por pesquisa no código atual)

- **`backend/src/app.js`** não usa `helmet` nem nenhum outro middleware de cabeçalhos de segurança. CORS já é restrito a `FRONTEND_URL`, mas faltam `X-Content-Type-Options`, `X-Frame-Options`/CSP, etc.
- Não há nenhum SDK de monitoramento de erros (Sentry ou similar) no backend nem no frontend — erros em produção só aparecem em `console.error`, sem alerta nem agregação.
- Logging é `console.log`/`console.error` cru, sem nível, sem request id, espalhado em ~27 arquivos de controllers/serviços. Alguns logs de erro já fazem `console.error('X error:', err)` (só a mensagem do erro, não o payload da requisição), mas não há garantia estrutural de que um `console.log(req.body)` futuro não vaze senha/token/dados de saúde — falta uma trava (redação) na camada de log.
- `docs/` tem `DESIGN.md` e `TECHNICAL.md`, mas nenhum documento de operações (backup, rotação de segredos, checklist de deploy).
- Não existe `.env.example` documentando as variáveis usadas (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `VAPID_*`, `SMTP_*`, `ADMIN_EMAILS`, `ADMIN_NOTIFICATION_EMAIL`, `FRONTEND_URL`, `BACKEND_URL`, `UPLOAD_DIR`, `PRECO_CONSULTA_PADRAO`, `TERMOS_*`).
- `npm audit` ainda não foi rodado neste ciclo em nenhum dos dois projetos.

## Regras obrigatórias

1. Zero mudança de comportamento visível ao usuário final — esta spec é infraestrutura/observabilidade, não feature.
2. Um commit por item (6 itens, numerados como no prompt original), com `npm test` verde no backend ao final de cada um; `npm run build` do frontend sem erros nos itens que tocam o frontend.
3. Toda chave/segredo (Sentry DSN, etc.) só via variável de ambiente, com o recurso desligado (no-op) quando a variável não está configurada — nunca hardcoded, nunca exigido para rodar localmente.
4. Nunca logar senha, token (JWT, VAPID, SMTP), ou o campo `dados_saude`/`dadosSaude` em texto — nem em `console.*`, nem em qualquer logger novo.
5. Vulnerabilidades de `npm audit` de severidade alta/crítica: corrigir via `npm audit fix` (ou bump manual) só se não houver risco de quebra; caso a correção exija mudança maior (major version, API diferente), reportar em vez de aplicar.

## Fases (uma por item do escopo)

### Item 1 — `helmet`

- Adicionar `helmet` ao Express, configurado para não quebrar o servimento de `/uploads` (imagens/PDFs) nem o consumo pelo frontend (CORS já tratado separadamente). CSP inicialmente permissiva o bastante para não quebrar o app (ou desligada explicitamente), documentando o porquê.

### Item 2 — Monitoramento de erros (Sentry, gratuito, desligado por padrão)

- Backend: `@sentry/node`, inicializado só se `SENTRY_DSN` estiver setado; captura erros não tratados e handler de erro do Express.
- Frontend: `@sentry/react`, inicializado só se `VITE_SENTRY_DSN` estiver setado; captura erros de render (error boundary) e promessas não tratadas.
- Sem DSN configurado, zero overhead — não tenta conectar em lugar nenhum.

### Item 3 — Logs estruturados sem dados sensíveis

- Logger backend com níveis (`info`/`warn`/`error`) e request id por requisição (middleware que gera/propaga um id curto, incluído em cada log da requisição).
- Helper de redação usado pelo logger: nunca serializa campos `senha`/`password`, `token`, `dados_saude`/`dadosSaude`, `Authorization`.
- Não é obrigatório migrar todo `console.*` existente — focar no logger novo para o middleware de requisição e nos pontos de erro não tratado; documentar o padrão para uso futuro.

### Item 4 — `docs/OPERACOES.md`

- Estratégia de backup do PostgreSQL (`pg_dump` agendado, exemplo de cron, onde guardar o dump) e passo a passo de restauração testada.
- Rotação de segredos (`JWT_SECRET`, `VAPID_*`, credenciais SMTP, `GOOGLE_CLIENT_ID`/secret) — o que cada um invalida ao trocar, e ordem segura de rotação.
- Checklist de deploy (migrations, variáveis de ambiente obrigatórias, build do frontend, health check pós-deploy).
- `.env.example` no backend e no frontend, com todas as variáveis hoje lidas via `process.env`/`import.meta.env`, sem valores reais.

### Item 5 — `npm audit`

- Rodar `npm audit` em `backend/` e `frontend/`; aplicar `npm audit fix` (sem `--force`) onde resolver sem mudança de major; para o que sobrar de alto/crítico exigindo major bump, reportar em vez de aplicar.

### Item 6 — Suíte verde final

- `npm test` (backend) verde e `npm run build` (frontend) sem erros com todos os itens acima aplicados.

## Critérios de aceite

- [ ] `helmet` ativo sem quebrar uploads nem o frontend
- [ ] Sentry (ou equivalente) integrado nos dois lados, no-op sem DSN configurado
- [ ] Logger estruturado com request id, com trava de redação para dados sensíveis
- [ ] `docs/OPERACOES.md` cobrindo backup/restore, rotação de segredos e checklist de deploy
- [ ] `.env.example` (backend e frontend) documentando todas as variáveis usadas
- [ ] `npm audit` rodado nos dois projetos; altas/críticas corrigidas ou reportadas
- [ ] `npm test` verde e `npm run build` sem erros ao final
- [ ] Um commit por item
