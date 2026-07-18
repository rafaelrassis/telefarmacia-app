// Envio via API HTTP do Brevo (não SMTP) — a Render bloqueia conexões SMTP de
// saída (porta 587/465/25), então o relay SMTP trava com "Connection timeout"
// em produção. A API roda sobre HTTPS (porta 443), que não é bloqueada.
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const getAppUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5174').split(',')[0].trim();

// O remetente técnico (BREVO_API_KEY) é só a credencial de autenticação da API;
// o "from" que aparece pro destinatário precisa ser um e-mail/domínio verificado
// no Brevo — configurado separadamente em SMTP_FROM_EMAIL.
const getSender = () => ({
  name: 'FarmaConsulta',
  email: process.env.SMTP_FROM_EMAIL,
});

const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY não configurado — e-mail não enviado.');
    return;
  }
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: getSender(),
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API respondeu ${res.status}: ${body}`);
  }
};

// E-mail de redefinição de senha (Fluxo 2/3) — enviado tanto para usuários
// com senha local quanto para usuários só-Google (o link permite os dois
// casos: redefinir senha existente ou definir a primeira senha local).
export const sendPasswordResetEmail = async ({ to, token, hasPassword }) => {
  const resetUrl = `${getAppUrl()}/redefinir-senha?token=${token}`;
  const googleNotice = hasPassword ? '' : `
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Sua conta usa login com Google. Você pode continuar entrando com o Google normalmente,
      ou definir uma senha local pelo link abaixo para também poder entrar com e-mail e senha.
    </p>
  `;
  try {
    await sendEmail({
      to,
      subject: 'Redefinição de senha — FarmaConsulta',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0E4F45;">Redefinição de senha</h2>
          ${googleNotice}
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            Clique no botão abaixo para ${hasPassword ? 'definir uma nova senha' : 'definir sua senha'}.
            O link expira em <strong>30 minutos</strong>.
          </p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="background:#0E4F45;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">
              Redefinir senha
            </a>
          </p>
          <p style="color:#6b7280;font-size:12px;">
            Se você não solicitou essa redefinição, ignore este e-mail — nenhuma alteração será feita.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Falha ao enviar e-mail de redefinição:', err.message);
  }
};

// Notificação enviada após qualquer alteração de senha bem-sucedida
// (Fluxo 1, 2 ou 3) — permite ao usuário identificar uma troca não autorizada.
export const sendPasswordChangedEmail = async ({ to }) => {
  const appUrl = getAppUrl();
  try {
    await sendEmail({
      to,
      subject: 'Sua senha foi alterada — FarmaConsulta',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0E4F45;">Sua senha foi alterada</h2>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            A senha da sua conta FarmaConsulta foi alterada agora há pouco.
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            <strong>Se não foi você, redefina sua senha imediatamente</strong> pelo link "Esqueci minha senha" na tela de login.
          </p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${appUrl}" style="background:#0E4F45;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">
              Acessar FarmaConsulta →
            </a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Falha ao enviar notificação de troca de senha:', err.message);
  }
};

// E-mail de confirmação de cadastro (credenciais) — o link expira em 24h,
// ancorado em User.createdAt (ver utils/emailVerificationToken.js). Passado
// esse prazo, o job horário de limpeza exclui a conta não confirmada.
export const sendVerificationEmail = async ({ to, token }) => {
  const confirmUrl = `${getAppUrl()}/confirmar-email?token=${token}`;
  try {
    await sendEmail({
      to,
      subject: 'Confirme seu email — FarmaConsulta',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0E4F45;">Confirme seu e-mail</h2>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            Falta pouco para ativar sua conta na FarmaConsulta. Clique no botão abaixo para confirmar seu e-mail.
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            O link expira em <strong>24 horas</strong>. Cadastros não confirmados nesse prazo são excluídos automaticamente.
          </p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${confirmUrl}" style="background:#0E4F45;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">
              Confirmar e-mail
            </a>
          </p>
          <p style="color:#6b7280;font-size:12px;">
            Se o botão não funcionar, copie e cole este link no navegador:<br>
            <a href="${confirmUrl}" style="color:#0E4F45;">${confirmUrl}</a>
          </p>
          <p style="color:#6b7280;font-size:12px;">
            Se você não se cadastrou na FarmaConsulta, ignore este e-mail.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Falha ao enviar e-mail de confirmação:', err.message);
  }
};

export const notifyAdminNewPharmacist = async ({ nome, crfNumber, crfUF, email, phone, bio, tags }) => {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL não configurado — notificação não enviada.');
    return;
  }
  const appUrl = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',')[0].trim();
  try {
    await sendEmail({
      to,
      subject: `Novo farmacêutico aguardando aprovação: ${nome}`,
      html: `
        <h2>Novo farmacêutico aguardando aprovação</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>CRF:</strong> ${crfNumber}/${crfUF}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${phone || 'não informado'}</p>
        <p><strong>Áreas de atuação:</strong> ${tags?.length ? tags.join(', ') : 'não informadas'}</p>
        <p><strong>Bio:</strong> ${bio || 'não informada'}</p>
        <p>Acesse o painel administrativo para revisar os documentos e ativar o cadastro.</p>
        <p><a href="${appUrl}">Acessar painel →</a></p>
      `,
    });
  } catch (err) {
    console.error('[email] Falha ao enviar notificação:', err.message);
  }
};
