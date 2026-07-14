# Deploy gratuito

Guia para colocar o FarmaConsulta no ar sem custo, usando:

- **Neon** (ou Supabase) — PostgreSQL gerenciado, tier free sem expiração
- **Render** — backend Express (free web service)
- **Vercel** — frontend estático (build do Vite)

---

## 1. Banco de dados (Neon)

1. Crie uma conta em https://neon.tech e um projeto novo.
2. Copie a *connection string* (formato `postgresql://usuario:senha@host/db?sslmode=require`).
3. Guarde — será o `DATABASE_URL` do backend.

> Alternativa: Supabase (Database → Connection string → modo "Transaction pooler").

---

## 2. Backend (Render)

1. Crie uma conta em https://render.com e conecte o repositório GitHub.
2. Render detecta o `render.yaml` na raiz automaticamente ("Blueprint"). Se preferir configurar manualmente:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Defina as variáveis de ambiente marcadas como `sync: false` no `render.yaml` (Dashboard → Environment):
   - `DATABASE_URL` — string do Neon/Supabase
   - `JWT_SECRET` — string aleatória com 32+ caracteres (`openssl rand -base64 32`)
   - `FRONTEND_URL` — URL do Vercel (passo 3); pode ter múltiplas separadas por vírgula
   - Demais (`GOOGLE_*`, `SMTP_*`) são opcionais — só necessárias se for usar login Google ou envio de e-mail
4. Deploy. O `npm run build` roda `prisma migrate deploy`, aplicando as migrations no banco automaticamente.

**Limitações do free tier do Render:**
- O serviço "dorme" após ~15 min sem tráfego; a próxima requisição demora alguns segundos para acordar.
- O disco é efêmero — arquivos gravados em `UPLOAD_DIR` (receitas, documentos, fotos) **não persistem** entre deploys/restarts. Para produção real, migre o upload (`backend/src/utils/multerConfig.js`) para um storage externo (ex: Cloudinary, S3-compatible) — não incluído neste setup inicial.

---

## 3. Frontend (Vercel)

1. Crie uma conta em https://vercel.com e importe o repositório.
2. Configure o projeto:
   - **Root Directory**: `frontend`
   - Framework preset: Vite (detectado automaticamente; usa o `vercel.json` incluso)
3. Variáveis de ambiente (Project Settings → Environment Variables):
   - `VITE_API_URL` — URL pública do backend no Render (ex: `https://telefarmacia-backend.onrender.com`)
   - `VITE_GOOGLE_CLIENT_ID` — opcional, se for usar login Google
4. Deploy. Copie a URL gerada (ex: `https://telefarmacia.vercel.app`).
5. Volte no Render e atualize `FRONTEND_URL` com essa URL (necessário para o CORS liberar as requisições do frontend).

---

## 4. Checklist final

- [ ] `DATABASE_URL` configurado no Render, migrations aplicadas sem erro no log de build
- [ ] `FRONTEND_URL` no Render aponta para a URL do Vercel
- [ ] `VITE_API_URL` no Vercel aponta para a URL do Render
- [ ] Acessar `https://<seu-backend>.onrender.com/api/health` retorna `{"status":"OK"}`
- [ ] Acessar o frontend no Vercel, cadastrar usuário de teste e validar o fluxo básico

---

## Custos e limites (referência)

| Serviço | Free tier | Limite relevante |
|---|---|---|
| Neon | 0.5 GB storage, 1 projeto | Sem expiração |
| Render | 750h/mês web service | Dorme após inatividade; disco efêmero |
| Vercel | 100 GB banda/mês | Sem limite de projetos hobby |
