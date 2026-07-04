import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CRF_REGEX = /^\d{1,6}$/;

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// ── GET /api/auth/convite/:token ─────────────────────────────────────────────

export const validarConvite = async (req, res) => {
  const { token } = req.params;
  try {
    const convite = await prisma.conviteFarmaceutico.findUnique({ where: { token } });
    if (!convite || convite.usado || convite.expiresAt < new Date()) {
      return res.status(404).json({ error: 'Convite inválido ou expirado.' });
    }
    return res.status(200).json({ nome: convite.nome, email: convite.email });
  } catch (err) {
    console.error('validarConvite error:', err);
    return res.status(500).json({ error: 'Erro ao validar convite.' });
  }
};

// ── POST /api/auth/convite/:token/registrar ──────────────────────────────────

export const registrarViaConvite = async (req, res) => {
  const { token } = req.params;
  const { name, email, password, crfUF, crfNumber, chavePix } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !crfUF || !crfNumber) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }
  if (!UF_LIST.includes(crfUF.toUpperCase())) {
    return res.status(400).json({ error: 'UF do CRF inválida.' });
  }
  if (!CRF_REGEX.test(crfNumber.trim())) {
    return res.status(400).json({ error: 'Número do CRF inválido (somente dígitos, até 6 caracteres).' });
  }

  try {
    const convite = await prisma.conviteFarmaceutico.findUnique({ where: { token } });
    if (!convite || convite.usado || convite.expiresAt < new Date()) {
      return res.status(404).json({ error: 'Convite inválido ou expirado.' });
    }

    // Verifica e-mail único
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'E-mail já cadastrado. Faça login normalmente.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email:    email.trim().toLowerCase(),
          name:     name.trim(),
          password: hashedPassword,
          role:     'FARMACEUTICO',
        },
      });

      await tx.pharmacistProfile.create({
        data: {
          userId:     u.id,
          crfNumber:  crfNumber.trim(),
          crfUF:      crfUF.toUpperCase(),
          bio:        '',
          tags:       [],
          isApproved: false,
          chavePix:   chavePix?.trim() || null,
        },
      });

      await tx.conviteFarmaceutico.update({
        where: { token },
        data:  { usado: true },
      });

      return u;
    });

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('registrarViaConvite error:', err);
    return res.status(500).json({ error: 'Erro ao registrar farmacêutico.' });
  }
};
