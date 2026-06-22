# Spec — Autenticação e Onboarding

## O que faz

Autentica usuários via Google OAuth2, emite JWT próprio, e conduz o onboarding de escolha de papel (PACIENTE ou FARMACEUTICO). Inclui endpoint de refresh de sessão.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/google` | Pública | Login com token Google |
| `GET` | `/api/auth/me` | JWT | Retorna usuário atual + novo JWT |
| `PUT` | `/api/auth/onboarding` | JWT | Define papel e cria perfil de farmacêutico |

---

## Regras de negócio

### Login (`POST /api/auth/google`)

1. Recebe `{ token }` — o `idToken` retornado pelo `@react-oauth/google` no frontend.
2. Verifica o token com `OAuth2Client.verifyIdToken()` contra `GOOGLE_CLIENT_ID`.
3. Busca o usuário pelo `email` do payload do Google.
4. Se não existir: cria o usuário com `role: 'PACIENTE'` (padrão), `googleId = payload.sub`.
5. Retorna `{ token, user, isNewUser }`.
   - `isNewUser: true` → frontend exibe o modal de onboarding.
   - `isNewUser: false` → frontend vai direto para o dashboard.

### JWT

- Payload: `{ id, email, role, isAdmin }`
- Expiração: **7 dias**
- `isAdmin` é calculado na geração do token lendo `ADMIN_EMAILS` do ambiente (não é persistido no banco).

### isAdmin

- Definido por variável de ambiente `ADMIN_EMAILS` (string com emails separados por vírgula).
- Lido **a cada requisição** — alterar `ADMIN_EMAILS` e reiniciar o servidor aplica imediatamente.
- Verificado tanto no token JWT (via `authMiddleware`) quanto no `adminMiddleware`.

### Onboarding (`PUT /api/auth/onboarding`)

- Campo `role`:
  - `'PACIENTE'`: não altera nada no banco (já é o default). Retorna token atualizado.
  - `'FARMACEUTICO'`: exige `crfNumber` e `crfUF`. Cria `PharmacistProfile` vinculado ao `userId`. Tags e bio são opcionais (defaultam para `[]` e `''`).
- Retorna `{ message, user, token }` com novo JWT (role atualizado no payload).

### Refresh de sessão (`GET /api/auth/me`)

- Usado pelo frontend após o admin aprovar o farmacêutico (`refreshUser()` no `AuthContext`).
- Inclui `pharmacistProfile` no retorno.
- Emite **novo JWT** com dados atualizados do banco.
- Frontend atualiza localStorage + estado React sem fazer logout.

---

## Entradas / Saídas

### `POST /api/auth/google`
```
Body:   { token: string }
200:    { token: string, user: User, isNewUser: boolean }
401:    { error: "Token do Google inválido." }
```

### `GET /api/auth/me`
```
Header: Authorization: Bearer <jwt>
200:    { ...User, pharmacistProfile, isAdmin, token }
404:    { error: "Usuário não encontrado." }
```

### `PUT /api/auth/onboarding`
```
Header: Authorization: Bearer <jwt>
Body:   { role, crfNumber?, crfUF?, bio?, tags? }
200:    { message, user, token }
400:    { error: "CRF e UF são obrigatórios." }  (se role=FARMACEUTICO sem CRF)
```

---

## Dependências

- `google-auth-library` — verificação do idToken
- `jsonwebtoken` — assinatura do JWT
- Env vars: `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `ADMIN_EMAILS`

---

## Limitações conhecidas

- Não há refresh token separado — o JWT expira em 7 dias e o usuário precisa fazer login novamente.
- `googleId` é armazenado mas nunca usado para lookup (só `email` é usado no `findUnique`).
- Não existe fluxo de troca de papel (PACIENTE → FARMACEUTICO após o onboarding inicial não é tratado via interface — precisaria de nova chamada ao onboarding).
- `isAdmin` no JWT pode ficar desatualizado se `ADMIN_EMAILS` mudar enquanto o token ainda é válido. O `adminMiddleware` relê o env a cada request, então a proteção de rota funciona — mas o campo `isAdmin` no payload do token pode ser stale.
