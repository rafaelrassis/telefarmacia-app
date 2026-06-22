import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createUser = async (req, res) => {
  try {
    const { email, name, role, googleId, crfNumber, crfUF, bio, tags } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    if (role === 'FARMACEUTICO' && (!crfNumber || !crfUF)) {
      return res.status(400).json({ error: 'CRF e UF são obrigatórios para farmacêuticos.' });
    }

    const user = await prisma.user.create({
      data: {
        email, name, role, googleId,
        ...(role === 'FARMACEUTICO' && {
          pharmacistProfile: { create: { crfNumber, crfUF, bio, tags: tags || [] } }
        }),
      },
      include: { pharmacistProfile: true },
    });

    return res.status(201).json({ message: 'Usuário criado com sucesso!', user });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
};
