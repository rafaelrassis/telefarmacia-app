# Spec — Alterar e Recuperar Senha

## O que faz

Três fluxos de gestão de senha, todos no mesmo modelo de dados (`PasswordReset`) e no mesmo controller (`PasswordController`):

1. **Alterar senha** — usuário logado com senha local, na seção "Segurança" de "Meu Perfil".
2. **Esqueci minha senha** — usuário deslogado solicita um link de redefinição por e-mail.
3. **Definir senha** — usuário que só autentica via Google OAuth define uma senha local (mesmo endpoint do fluxo 1, sem exigir senha atual).

Paciente e farmacêutico usam exatamente o mesmo código — o papel vem da sessão autenticada e não afeta a lógica de senha.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/conta/alterar-senha` | JWT | Altera senha (Fluxo 1) ou define a primeira senha local (Fluxo 3) |
| `POST` | `/api/auth/esqueci-senha` | Pública | Gera token de reset e envia e-mail (Fluxo 2) |
| `POST` | `/api/auth/redefinir-senha` | Pública | Consome o token e define nova senha (Fluxo 2) |

---

## Modelo de dados

```prisma
model PasswordReset {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- Só o hash SHA-256 do token é persistido (`crypto.createHash('sha256')`); o token em claro (`crypto.randomBytes(32).toString('hex')`) só existe em memória e no e-mail enviado.
- Expiração: 30 minutos (`RESET_TOKEN_TTL_MS` em `utils/passwordResetToken.js`).
- Uso único: `usedAt` marca o token como consumido; um token com `usedAt` preenchido é sempre inválido.
- Ao gerar um novo token para um usuário, qualquer token anterior ainda ativo (`usedAt: null`) é invalidado na mesma transação.

`User.password` é opcional (`null` para contas só-Google) e `User.passwordChangedAt` é gravado a cada troca/reset/definição de senha — ver "Invalidação de sessão" abaixo.

---

## Regras de negócio

### Alterar/definir senha (`POST /api/conta/alterar-senha`)

1. Exige sessão autenticada (`authMiddleware`).
2. Se `user.password` existe (já tem senha local): exige `senhaAtual` e valida com `bcrypt.compare`. Inválida → `400 { error: "Senha atual incorreta." }`. Se `user.password` é `null` (conta só-Google): `senhaAtual` não é exigida — este é o Fluxo 3.
3. Valida `novaSenha` (ver "Validação de senha").
4. `bcrypt.hash(novaSenha, 12)`, atualiza `password` e `passwordChangedAt`.
5. Grava evento em `log_acoes`: `PASSWORD_CHANGED` (já tinha senha) ou `PASSWORD_SET` (Fluxo 3), com `usuario_id`, `role`, `ip`.
6. Envia e-mail de notificação (assíncrono, não bloqueia a resposta — falha de SMTP nunca derruba o alterar-senha).
7. Responde `{ message, user, token }` com um **novo JWT** — a própria sessão que fez a troca continua válida (ver "Invalidação de sessão").

### Esqueci minha senha (`POST /api/auth/esqueci-senha`)

1. Rate limit: 3 requisições por e-mail e 3 por IP a cada hora (camadas independentes, `express-rate-limit`, ver `middlewares/passwordResetLimiter.js`). Acima do limite, o `handler` customizado responde exatamente a mesma mensagem genérica com `200` — nunca um `429`, para não revelar que o limite foi atingido.
2. Se o e-mail existe: invalida tokens ativos anteriores, cria um novo `PasswordReset` e envia e-mail com o link `/redefinir-senha?token=...`. Conta só-Google recebe uma nota explicando que pode continuar entrando com Google e, opcionalmente, definir uma senha local pelo mesmo link.
3. Sempre responde `200 { message: "Se este e-mail estiver cadastrado, enviamos um link de redefinição." }` — mesmo se o e-mail não existir, mesmo em erro interno.

### Redefinir senha (`POST /api/auth/redefinir-senha`)

1. `sha256(token)` → busca `PasswordReset` com `usedAt: null` e `expiresAt` futuro. Não encontrado/expirado/usado → `400 { error: "Token inválido ou expirado." }`.
2. Valida `novaSenha` (mesmas regras do fluxo 1, sem o campo `senhaAtual`).
3. Atualiza `password` + `passwordChangedAt`, marca o token como usado — tudo em uma transação.
4. Grava `PASSWORD_RESET` em `log_acoes`.
5. Envia e-mail de notificação e responde `200`.

### Validação de nova senha (`utils/passwordValidation.js`)

- Mínimo 8 caracteres — sem exigir símbolos/maiúsculas (comprimento pesa mais que complexidade artificial).
- Não pode ser igual à senha atual (fluxo 1) nem ao e-mail/usuário do e-mail.
- Rejeita uma lista de senhas triviais comuns (`12345678`, `senha123`, …) e sequências numéricas puras (`12345678`, `87654321`).

### Invalidação de sessão

Não há tabela de sessões — o JWT é stateless. A troca/reset de senha grava `User.passwordChangedAt = now()`; `authMiddleware` compara o `iat` de cada token (granularidade de segundo, igual ao JWT) contra esse timestamp e rejeita com `403` qualquer token emitido **antes** dele. O novo token retornado na própria resposta do endpoint de troca é assinado **depois**, então continua válido — só as outras sessões/dispositivos são derrubados.

---

## Entradas / Saídas

### `POST /api/conta/alterar-senha`
```
Header: Authorization: Bearer <jwt>
Body:   { senhaAtual?, novaSenha, confirmarSenha }
200:    { message, user, token }
400:    { error: "Senha atual incorreta." } | { error: "As senhas não coincidem." } | erro de validação de senha
```

### `POST /api/auth/esqueci-senha`
```
Body:   { email }
200:    { message: "Se este e-mail estiver cadastrado, enviamos um link de redefinição." }  (sempre)
```

### `POST /api/auth/redefinir-senha`
```
Body:   { token, novaSenha, confirmarSenha }
200:    { message: "Senha redefinida com sucesso. Faça login com sua nova senha." }
400:    { error: "Token inválido ou expirado." } | { error: "As senhas não coincidem." } | erro de validação de senha
```

---

## Frontend

| Componente | Uso |
|---|---|
| `components/AlterarSenhaForm.jsx` | Seção "Segurança" dentro de `PerfilModal.jsx` — Fluxo 1/3, mostra "Senha atual" só se `user.hasPassword` |
| `components/EsqueciSenhaForm.jsx` | Acionado pelo link "Esqueci minha senha" em `Login.jsx` |
| `pages/RedefinirSenhaPage.jsx` | Rota `/redefinir-senha?token=...` — trata token ausente/expirado/usado com link para solicitar um novo |

`AuthContext.updateSession(token, user)` foi adicionado para atualizar a sessão local após a troca de senha sem passar pela lógica de seleção de ambiente do `login()` — necessário porque o token antigo já está invalidado no momento em que a resposta chega.

`user.hasPassword` (calculado em `AuthController.sanitizeUser`, nunca o hash em si) é o que a UI usa para decidir entre "Alterar senha" e "Definir senha". Esse mesmo saneamento corrigiu um vazamento pré-existente: `register`/`login`/`google`/`me`/`onboarding` espalhavam o objeto `User` do Prisma inteiro (incluindo o hash bcrypt) nas respostas.

---

## Dependências

- `bcrypt` — hash de senha (cost 12) e comparação timing-safe
- `crypto` (Node) — token de reset (`randomBytes`) e hash do token (`createHash('sha256')`)
- `express-rate-limit` — limite de `/esqueci-senha`
- `nodemailer` — e-mails de redefinição e de notificação de troca (`services/emailService.js`; sem `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, os envios são um no-op logado como aviso)
- Reaproveita `utils/logAction.js` (tabela raw `log_acoes`) para a trilha de auditoria — não introduz uma tabela de auditoria própria

---

## Limitações conhecidas

- A invalidação de sessão tem granularidade de 1 segundo (o `iat` do JWT): um token emitido no mesmíssimo segundo da troca não é invalidado. Na prática, o único token nesse segundo é o novo token retornado pela própria resposta.
- `authMiddleware` agora faz uma consulta ao banco (`select passwordChangedAt`) em toda requisição autenticada — antes era 100% stateless. Custo aceito em troca de suportar "derrubar outras sessões" sem introduzir uma tabela de sessões/blacklist de tokens.
- Rate limit de `/esqueci-senha` é em memória (`express-rate-limit` sem store externo) — reinicia ao reiniciar o processo do backend; aceitável dado o volume esperado e a ausência de múltiplas réplicas no deploy atual (ver `render.yaml`).
