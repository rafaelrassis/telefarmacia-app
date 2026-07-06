import nodemailer from 'nodemailer';

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

export const notifyAdminNewPharmacist = async ({ nome, crfNumber, crfUF }) => {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL não configurado — notificação não enviada.');
    return;
  }
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP não configurado — notificação não enviada.');
    return;
  }
  const appUrl = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',')[0].trim();
  try {
    await transporter.sendMail({
      from: `"FarmaConsulta" <${process.env.SMTP_USER}>`,
      to,
      subject: `Novo farmacêutico aguardando aprovação: ${nome}`,
      html: `
        <h2>Novo farmacêutico aguardando aprovação</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>CRF:</strong> ${crfNumber}/${crfUF}</p>
        <p>Acesse o painel administrativo para revisar os documentos e ativar o cadastro.</p>
        <p><a href="${appUrl}">Acessar painel →</a></p>
      `,
    });
  } catch (err) {
    console.error('[email] Falha ao enviar notificação:', err.message);
  }
};
