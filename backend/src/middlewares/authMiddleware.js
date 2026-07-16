import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }

  // Troca/reset de senha grava passwordChangedAt e derruba qualquer JWT
  // emitido antes desse instante (granularidade de segundo, igual ao `iat`
  // do JWT) — não há tabela de sessões, então a invalidação é feita por
  // comparação de timestamp em vez de revogação individual de token.
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { passwordChangedAt: true },
  });
  if (user?.passwordChangedAt) {
    const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (decoded.iat < changedAtSec) {
      return res.status(403).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
  }

  req.user = decoded; // Injeta os dados do usuário (id, email, role) na requisição
  next();
};
