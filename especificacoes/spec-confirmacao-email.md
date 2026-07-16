# Spec — Confirmação de E-mail no Cadastro

## O que faz

Exige confirmação de e-mail para novos cadastros feitos com e-mail/senha. Cadastros não confirmados em 24 horas são excluídos automaticamente por um job horário. Contas via Google OAuth já têm o e-mail verificado pelo provedor e nunca passam por este fluxo.

Paciente e farmacêutico usam exatamente o mesmo mecanismo — inclusive o farmacêutico cadastrado por convite (`ConviteFarmaceutico`/`OnboardingController.registrarViaConvite`): o convite prova que um admin confiava naquele e-mail, mas não prova que o farmacêutico tem acesso à caixa de entrada, então a confirmação continua obrigatória.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/confirmar-email` | Pública | Consome o token e marca o e-mail como confirmado (Fluxo 2) |
| `POST` | `/api/auth/reenviar-confirmacao` | Pública | Gera um novo token e reenvia o e-mail (Fluxo 3) |

`POST /api/auth/register`, `POST /api/auth/google` e `POST /api/auth/convite/:token/registrar` (já existentes) foram alterados — ver "Regras de negócio".

---

## Modelo de dados

```prisma
model User {
  // campos existentes...
  emailVerified DateTime?
  verificationTokens VerificationToken[]
}

model VerificationToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

- Só o hash SHA-256 do token é persistido (`crypto.createHash('sha256')`); o token em claro (`crypto.randomBytes(32).toString('hex')`) só existe em memória e no e-mail enviado — ver `utils/emailVerificationToken.js`.
- Migration `20260716121847_confirmacao_email` inclui backfill: `UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL` — usuários já existentes na base não são punidos pela nova exigência.
- Não existe (nem existia) um campo `provider` explícito no schema — "conta de credenciais" é inferida por `password IS NOT NULL`, e "conta Google" por `googleId IS NOT NULL`, seguindo a mesma convenção já usada por `sanitizeUser().hasPassword` em `AuthController.js`.

---

## Regras de negócio

### Cadastro por credenciais (`POST /api/auth/register`)

1. Comportamento existente inalterado (cria `User` com `role: 'PACIENTE'`), **exceto**: o usuário nasce com `emailVerified: null`.
2. Gera um `VerificationToken` com `expiresAt = User.createdAt + 24h` e dispara `sendVerificationEmail` (fire-and-forget, nunca derruba o cadastro) — ver `AuthController.sendConfirmationEmail`, reaproveitada por `registrarViaConvite`.
3. **Decisão de produto**: a resposta continua trazendo um JWT utilizável (como antes), e esse token continua funcionando em todas as rotas autenticadas — `authMiddleware` não verifica `emailVerified`. Só o endpoint `POST /api/auth/login` (reautenticação) é bloqueado enquanto o e-mail não é confirmado (ver Fluxo 3). Isso permite que o assistente de cadastro de farmacêutico (`PharmacistSignupWizard`, várias etapas autenticadas com o token do registro) continue funcionando sem interrupção, e mantém compatibilidade com toda a suíte de testes existente, que usa o token do registro como fixture para o restante da aplicação.
4. O frontend, ao ver `user.emailVerified` nulo logo após um cadastro por credenciais, **não** chama `AuthContext.login()` — em vez disso mostra a tela "Enviamos um link de confirmação..." (`ConfirmacaoPendenteAviso.jsx`). Ou seja: a conta já é utilizável via API, mas a UI não leva o usuário para dentro do produto até a confirmação (ou até um login explícito bem-sucedido, que por sua vez exige confirmação).

### Login Google (`POST /api/auth/google`)

- Conta nova: criada com `emailVerified = now()` — Google já verificou a posse do e-mail.
- Conta existente sem `emailVerified` (ex.: alguém que se cadastrou por credenciais, nunca confirmou, e depois entra com Google usando o mesmo e-mail): o login marca `emailVerified = now()` nessa mesma chamada.
- **Caso de borda 2 da spec original resolvido**: como `googleLogin` já faz o lookup só por e-mail (não por `googleId` — comportamento pré-existente, ver "Limitações conhecidas" de `spec-auth.md`), um cadastro pendente por credenciais e um login Google com o mesmo e-mail **sempre vinculam à mesma conta**. Não há criação de conta duplicada nem recusa — a política adotada é vincular, e o Google confirmando o e-mail é tratado como prova suficiente de posse, mesmo que a senha local nunca tenha sido confirmada por link.

### Confirmar e-mail (`POST /api/auth/confirmar-email`)

1. `sha256(token)` → busca `VerificationToken`. Não encontrado → `400 { error: "Link inválido ou expirado." }`.
2. **Idempotência (prioridade sobre expiração)**: se `User.emailVerified` já estiver preenchido, responde `200` imediatamente — mesmo que o token localizado já tenha passado do `expiresAt`. Isso cobre o caso de um usuário clicando duas vezes no mesmo link (webmail pré-carregando o link, ou o próprio usuário clicando de novo depois de já ter confirmado).
3. Só depois verifica expiração: `expiresAt < now()` em conta ainda não confirmada → `400 { error: "Link inválido ou expirado." }`.
4. Token válido e conta ainda não confirmada → `emailVerified = now()`.
5. **Desvio deliberado da redação original da spec**: o token usado **não é apagado** na confirmação (a spec original pedia "deleta todos os tokens do usuário"). Combinado com o passo 2, apagar o token tornaria o segundo clique no mesmo link indistinguível de um token inexistente — voltaria a cair no erro 400, quebrando exatamente o caso de borda "token usado duas vezes → idempotência" que a própria spec pede. Tokens de contas já confirmadas ficam inertes no banco (nunca mais alteram nada, pois o passo 2 sempre responde antes de qualquer escrita) e são removidos em cascata só se a conta for excluída — o que nunca acontece para uma conta confirmada. Tokens de um reenvio (`reenviar-confirmacao`) continuam sendo explicitamente invalidados (apagados) antes de criar o novo, então o volume por usuário fica pequeno.

### Reenviar confirmação (`POST /api/auth/reenviar-confirmacao`)

1. Resposta sempre genérica (`200`, mesma mensagem), exista ou não a conta, esteja ela confirmada ou não — mesmo padrão anti-enumeração de `esqueci-senha`.
2. Só tem efeito para conta de credenciais (`password` preenchido) ainda não confirmada. Apaga os tokens anteriores do usuário e cria um novo.
3. **`expiresAt` do novo token = `User.createdAt + 24h`, nunca `now() + 24h`** — o reenvio não estende o prazo de exclusão automática. Um usuário que reenvia 20h depois do cadastro recebe um link com só 4h de validade.
4. Rate limit: 1 por minuto e 5 por hora, por e-mail (duas camadas de `express-rate-limit` em série, mesmo padrão de `esqueciSenhaPorEmailLimiter`/`esqueciSenhaPorIpLimiter`) — ver `middlewares/emailConfirmationLimiter.js`. Acima do limite, resposta genérica idêntica, sem gerar token nem enviar e-mail.

### Bloqueio de login não confirmado (`POST /api/auth/login`)

1. Após validar e-mail/senha (nessa ordem — senha errada continua `401` independentemente do estado de confirmação, para não vazar esse estado a quem não provou conhecer a senha), se `User.emailVerified` for nulo: `403 { error: "Confirme seu email antes de entrar.", code: "EMAIL_NOT_VERIFIED" }`.
2. O frontend usa o campo `code` para trocar a mensagem de erro genérica pela tela de aviso/reenvio (`ConfirmacaoPendenteAviso.jsx`), em vez de um texto de erro solto.
3. Login Google nunca passa por aqui — contas Google não têm `password`, então caem no branch `!user.password` de `login()` antes mesmo de checar `emailVerified` (comportamento pré-existente, inalterado).

### Exclusão automática (job horário `jobExcluirCadastrosNaoConfirmados`, `cronJobs.js`)

```js
const limite = new Date(Date.now() - VERIFICATION_TOKEN_TTL_MS); // 24h

const candidatos = await prisma.user.findMany({
  where: {
    emailVerified: null,
    password: { not: null },
    googleId: null,
    createdAt: { lt: limite },
  },
});
```

- Proteção crítica: para cada candidato, verifica se existe qualquer `Pagamento`, `FilaAgendada` ou `FilaUrgente` associado — como paciente **ou** como farmacêutico (`filaAgendadaComoPaciente`/`filaUrgenteComoPaciente`/`filaAgendadaComoFarmaceutico`/`filaUrgenteComoFarmaceutico`, nomes reais das relações no schema deste projeto — não existe um relacionamento genérico "consultas"). Encontrando qualquer um, a exclusão é pulada e um `logger.warn('cadastro-nao-confirmado-com-movimento', { userId })` é emitido para revisão manual.
- Cada exclusão efetiva é registrada com `logger.info('cadastro-nao-confirmado-excluido', { userId })` — log estruturado (JSON por linha, `utils/logger.js`) para trilha LGPD.
- `onDelete: Cascade` já cobre todas as relações filhas relevantes nesse estágio inicial de conta (perfis, tokens, notificações, consentimentos, push subscriptions etc.) — ver `schema.prisma`. `Repasse.pharmacist` é `onDelete: Restrict`, funcionando como uma segunda barreira de segurança independente da checagem acima (nunca deveria ser atingida na prática, já que farmacêutico sem `isApproved` não recebe repasse).
- Agendado a cada hora (`cron.schedule('0 * * * *', ...)`), junto dos demais jobs em `initCronJobs()`. Idempotente por natureza (um usuário já excluído simplesmente não aparece mais na query) e tolera execução concorrente pelos mesmos motivos que os demais jobs deste arquivo (sem lock distribuído — aceitável dado o volume esperado e a ausência de múltiplas réplicas no deploy atual, mesma ressalva de `spec-alterar-recuperar-senha.md`).

---

## E-mail

- Assunto: "Confirme seu email — FarmaConsulta".
- Mesmo template/estilo dos demais e-mails transacionais (`services/emailService.js`): HTML inline, cor de marca `#0E4F45`, remetente `"FarmaConsulta" <SMTP_USER>`, link também em texto puro como fallback.
- Sem `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, o envio é um no-op logado como aviso (mesmo contrato de `sendPasswordResetEmail`) — não derruba o cadastro nem o reenvio.

---

## Frontend

| Componente | Uso |
|---|---|
| `components/ConfirmacaoPendenteAviso.jsx` | Tela "confira seu e-mail" com botão de reenvio (cooldown de 60s) — mostrada tanto logo após um cadastro por credenciais quanto após um login recusado com `code: 'EMAIL_NOT_VERIFIED'` |
| `pages/ConfirmarEmailPage.jsx` | Rota `/confirmar-email?token=...` — chama o endpoint ao montar, trata sucesso/erro/idempotência |

`components/Login.jsx` (`EmailForm`): ao registrar, se `data.user.emailVerified` vier nulo, não chama `onSuccess` (que dispara `AuthContext.login()`) — mostra `ConfirmacaoPendenteAviso` no lugar. Ao logar e receber `code: 'EMAIL_NOT_VERIFIED'`, mesma tela. O link "Esqueci minha senha" (fora do `EmailForm`, no componente `Login` pai) é escondido enquanto essa tela estiver visível (`onPendingChange` prop) — evita mostrar uma ação irrelevante junto do aviso de confirmação pendente.

`components/pharmacist/PharmacistSignupWizard.jsx`: o cadastro por credenciais dentro do assistente (`handleEmailSubmit` → `/api/auth/register`) segue o mesmo fluxo de confirmação, mas a experiência do assistente **não foi interrompida** — o usuário continua as etapas seguintes (dados profissionais, documentos) normalmente com o token do registro, e só recebe um aviso textual adicional na tela final "Cadastro enviado — Em análise" lembrando de confirmar o e-mail em 24h. Decisão de escopo: redesenhar o assistente para pausar no meio até a confirmação do e-mail alteraria uma UX multi-etapas já estabelecida e não foi pedido explicitamente pela spec original.

---

## Dependências

- `crypto` (Node) — token de confirmação (`randomBytes`) e hash do token (`createHash('sha256')`), mesmo padrão de `utils/passwordResetToken.js`.
- `express-rate-limit` — limites de `/reenviar-confirmacao`.
- `nodemailer` — e-mail de confirmação (`services/emailService.js`).
- `node-cron` — job horário de exclusão (`cronJobs.js`).
- Reaproveita `utils/logger.js` (logger estruturado JSON) para a trilha de auditoria da exclusão automática — trilha diferente de `utils/logAction.js`/`log_acoes` (usada para ações de consulta), porque aqui não há `consultaId`/`role` fazendo sentido no mesmo formato.

---

## Limitações conhecidas

- Rate limit de `/reenviar-confirmacao` é em memória (`express-rate-limit` sem store externo) — mesma ressalva de `esqueci-senha` em `spec-alterar-recuperar-senha.md`.
- O job de exclusão roda no máximo de hora em hora — uma conta que atinge as 24h às 14h05 só é removida na execução das 15h00 (janela de até ~1h de atraso). Aceitável dado que o prazo em si já é de 24h.
- Tokens de confirmação de contas já confirmadas não são fisicamente apagados (ver "Desvio deliberado" acima) — ficam como registros inertes até a conta ser excluída (o que só acontece se ela nunca for confirmada). Overhead de armazenamento desprezível no volume esperado desta aplicação.
