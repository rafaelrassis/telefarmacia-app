import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { validateCrf } from '../utils/crfValidation.js';
import { generateVerificationToken, verificationExpiresAt } from '../utils/emailVerificationToken.js';
import { sendVerificationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const isAdminEmail = (email) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return adminEmails.includes(email);
};

export const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, isAdmin: isAdminEmail(user.email) },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// Nunca expor o hash da senha ao cliente — troca pelo booleano que a UI
// precisa para decidir entre "Alterar senha" e "Definir senha" (Fluxo 3).
export const sanitizeUser = (user) => {
  const { password, ...safe } = user;
  return { ...safe, hasPassword: Boolean(password) };
};

// Gera e envia o token de confirmação de e-mail para uma conta recém-criada
// via credenciais (também usado pelo cadastro por convite de farmacêutico —
// o convite não substitui a confirmação, ver especificacoes/spec-confirmacao-email.md).
// Falha de envio nunca derruba o cadastro (fire-and-forget).
export const sendConfirmationEmail = async (user) => {
  const { token, tokenHash } = generateVerificationToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: verificationExpiresAt(user.createdAt),
    },
  });
  sendVerificationEmail({ to: user.email, token }).catch(() => {});
};

// ── Google OAuth ────────────────────────────────────────────────────────────

export const googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    let isNewUser = false;

    if (!user && isAdminEmail(payload.email)) {
      return res.status(403).json({ error: 'Este e-mail é reservado. Peça a um administrador para criar o acesso.' });
    }

    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          googleId: payload.sub,
          role: 'PACIENTE',
          // Google já verificou a posse do e-mail — não exige o fluxo de
          // confirmação por link usado pelo cadastro via credenciais.
          emailVerified: new Date(),
        },
      });
    } else if (!user.emailVerified) {
      // Conta criada antes por credenciais e ainda não confirmada: o login
      // com Google prova a posse do mesmo e-mail, então vale como confirmação.
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    return res.status(200).json({
      token: signToken(user),
      user: { ...sanitizeUser(user), isAdmin: isAdminEmail(user.email) },
      isNewUser,
    });
  } catch (error) {
    console.error('Erro na autenticação Google:', error);
    return res.status(401).json({ error: 'Token do Google inválido.' });
  }
};

// ── Autenticação manual (e-mail + senha) ────────────────────────────────────

export const register = async (req, res) => {
  try {
    const { email, password, nome } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    if (isAdminEmail(email)) {
      return res.status(403).json({ error: 'Este e-mail é reservado. Peça a um administrador para criar o acesso.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const name = nome?.trim() || email.split('@')[0];

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword, role: 'PACIENTE' },
    });

    await sendConfirmationEmail(user);

    return res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso. Enviamos um link de confirmação para seu e-mail — você tem 24 horas para confirmar, ou o cadastro será excluído.',
      token: signToken(user),
      user: { ...sanitizeUser(user), isAdmin: false },
      isNewUser: true,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { pharmacistProfile: true, pacienteProfile: true },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Confirme seu email antes de entrar.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return res.status(200).json({
      token: signToken(user),
      user: { ...sanitizeUser(user), isAdmin: isAdminEmail(user.email) },
      isNewUser: false,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro ao realizar login.' });
  }
};

// ── Sessão ──────────────────────────────────────────────────────────────────

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { pharmacistProfile: true, pacienteProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.status(200).json({
      ...sanitizeUser(user),
      isAdmin: isAdminEmail(user.email),
      token: signToken(user),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};

export const completeOnboarding = async (req, res) => {
  const { role, crfNumber, crfUF, bio, tags, phone } = req.body;
  const userId = req.user.id;

  try {
    if (role === 'FARMACEUTICO') {
      const crfError = validateCrf(crfNumber, crfUF);
      if (crfError) {
        return res.status(400).json({ error: crfError });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'FARMACEUTICO',
          ...(phone?.trim() ? { phone: phone.trim() } : {}),
          pharmacistProfile: {
            create: {
              crfNumber: crfNumber.trim(),
              crfUF: crfUF.toUpperCase(),
              bio: bio || '',
              tags: Array.isArray(tags) ? tags : [],
            },
          },
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { pharmacistProfile: true, pacienteProfile: true },
    });

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      user: { ...sanitizeUser(updatedUser), isAdmin: isAdminEmail(updatedUser.email) },
      token: signToken(updatedUser),
    });
  } catch (error) {
    console.error('Erro no onboarding:', error);
    return res.status(500).json({ error: 'Erro ao salvar perfil de onboarding.' });
  }
};
