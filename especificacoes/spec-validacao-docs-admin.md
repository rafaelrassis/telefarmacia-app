# Spec — Validação da documentação (`/documentacao` + Doc. técnica admin)

Commits: `af3d721` (página pública) e `2e0af5f` (doc técnica servida pelo backend).
CI do `2e0af5f`: **verde** (backend-tests, incluindo 3 testes novos).

Não há migração de banco e nenhuma variável de ambiente nova. Esta spec só valida em produção.
A Fase 2 é **opcional**.

---

## Etapa 0 — Validar o estado do repositório (obrigatório, não alterar nada)

```bash
git checkout main && git pull
git log --oneline -3 | grep -c "2e0af5f\|af3d721"            # esperado: 2
grep -c "admin/docs" backend/src/routes/adminRoutes.js        # esperado: 1
grep -c "it(" backend/tests/admin-guards.test.js              # esperado: 13
grep -c "documentacao" frontend/src/App.jsx                   # esperado: 1
grep -c "documentacao" frontend/src/components/home/Footer.jsx # esperado: 1
grep -c "'docs'" frontend/src/components/AdminPanel.jsx       # esperado: 3
ls frontend/src/components/docs/                              # esperado: só DocsUI.jsx
test -f frontend/src/components/docs/DocsTecnico.jsx && echo "ERRO - arquivo antigo existe" || echo "OK - removido"
```

Se alguma contagem divergir: **PARE** e reporte o resultado. Não tente corrigir.

---

## Fase 1 — Validação (sem alteração de código)

### 1.1 Build do frontend sem conteúdo sensível

```bash
cd frontend && npm ci --silent 2>&1 | tail -5 && npm run build 2>&1 | tail -5
grep -l "MERCADOPAGO_WEBHOOK_SECRET\|ENCRYPTION_KEY\|sem_contato_log\|VAPID_PRIVATE_KEY" dist/assets/*.js \
  && echo "ERRO - conteúdo sensível no bundle" || echo "OK - bundle limpo"
cd ..
```

### 1.2 Backend: não rodar `npm install` aqui

Os testes já passaram no CI. **Não** rode `npm install` nem `npm test` em `backend/` neste ambiente, porque o download do binário do Prisma é bloqueado. Para confirmar:

```bash
gh run list -R rafaelrassis/telefarmacia-app -L 1    # esperado: completed success no 2e0af5f
```

### 1.3 Smoke test em produção

Descubra a URL da API (variável `VITE_API_URL` no projeto da Vercel, ou o domínio do serviço no Railway) e exporte:

```bash
export API="https://<backend-em-producao>"
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/health"        # esperado: 200
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/admin/docs"    # esperado: 401 ou 403
```

Se `/api/admin/docs` retornar **404**: o Railway ainda não fez o deploy do `2e0af5f`. Verifique o deploy e repita. Não faça redeploy forçado sem me avisar.

Teste com o token de admin. **Rafael** copia o valor de `@Telefarmacia:token` no DevTools do navegador, logado como admin, e cola só no terminal:

```bash
read -s TOKEN
curl -s "$API/api/admin/docs" -H "Authorization: Bearer $TOKEN" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);
    const n=j.endpoints.reduce((a,g)=>a+g.rotas.length,0);
    console.log("endpoints:",n);
    console.log("env ausentes:",j.env.backend.filter(e=>!e.configurada).map(e=>e.nome));
    console.log("commit:",j.sistema.commit, "| env:", j.sistema.nodeEnv);})'
unset TOKEN
```

Esperado:
- `endpoints:` 175 ou mais.
- `env ausentes:` lista vazia, ou só variáveis opcionais. **Reporte a lista exata.**
- `commit:` é `2e0af5f`, ou `null` se o Railway não expõe `RAILWAY_GIT_COMMIT_SHA` (reporte qual dos dois).

**Guardrails:** nunca imprima, salve em arquivo nem commite o token. Nunca imprima valores de env.

### 1.4 Checagem visual (Rafael, no celular)

- [ ] O rodapé tem o link "Documentação", que abre `/documentacao`.
- [ ] Logado como paciente, a página não mostra nada técnico (endpoints/env).
- [ ] Logado como admin, o Painel tem Sistema → **Doc. técnica**, com a busca de endpoints funcionando.

### Critérios de aceite da Fase 1

- Etapa 0 com todas as contagens batendo.
- `OK - bundle limpo`.
- `/api/health` = 200; `/api/admin/docs` sem token = 401/403; com token de admin = JSON válido.
- Relatório final com: número de endpoints, env ausentes e commit.

---

## Fase 2 — OPCIONAL: auditar acesso à doc técnica

Só execute se Rafael confirmar.

**Objetivo:** registrar em `AdminAuditLog` quem abriu a doc técnica, no máximo 1 registro por admin por dia.

**Arquivo:** `backend/src/controllers/DocsController.js`. Nenhum outro.

1. Importe `PrismaClient` (mesmo padrão de `PublicStatsController.js`) e `logAdminAction` de `../utils/logAdminAction.js`.
2. No início de `getDocsTecnico`, antes do `res.json`, sem bloquear a resposta (fire-and-forget):
   - Procure um `adminAuditLog` com `adminId: req.user.id`, `acao: 'DOCS_TECNICO_VISUALIZADO'` e `createdAt >= início do dia em America/Sao_Paulo`.
   - Se não existir: `logAdminAction(prisma, { adminId: req.user.id, acao: 'DOCS_TECNICO_VISUALIZADO' })`.
   - Erros vão para `console.error`. **Nunca** podem impedir a resposta.
3. Campo de data: `createdAt` (já existe índice `[adminId, createdAt]`).

**Guardrails:**
- Não alterar o schema Prisma nem criar migração.
- Não alterar `adminMiddleware` nem a assinatura de `logAdminAction`.
- Não tocar em `ConsultaModal.jsx` nem nas chaves `@Telefarmacia:*`.

**Teste:** em `backend/tests/admin-guards.test.js`, chame `/api/admin/docs` 2x com o token de admin e espere exatamente 1 registro `DOCS_TECNICO_VISUALIZADO` para esse admin. Ele roda no CI, não localmente (ver 1.2).

**Commit (direto na main):**

```bash
git add backend/src/controllers/DocsController.js backend/tests/admin-guards.test.js
git commit -m "feat: auditar acesso diário à doc técnica admin"
git push origin main
git log origin/main -1 --oneline        # obrigatório: confirmar o push
gh run watch -R rafaelrassis/telefarmacia-app --exit-status   # CI verde
```

**Aceite da Fase 2:** push confirmado em `origin/main`, CI verde e o evento aparecendo na aba Logs/Auditoria do painel.
