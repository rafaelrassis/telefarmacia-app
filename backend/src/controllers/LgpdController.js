import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { logAction } from '../utils/logAction.js';

const prisma = new PrismaClient();

// GET /api/lgpd/exportar
export const exportarDados = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, perfil, dependentes, agendadas, urgentes, carteira] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      }),
      prisma.pacienteProfile.findUnique({
        where: { userId },
        select: {
          nomeCompleto: true, dataNascimento: true, genero: true, cpf: true,
          telefone: true, cep: true, logradouro: true, numero: true,
          complemento: true, bairro: true, cidade: true, estado: true,
          aceiteTermos: true, dataAceite: true, versaoTermos: true,
          onboardingConcluido: true,
        },
      }),
      prisma.dependentProfile.findMany({
        where: { ownerId: userId },
        select: { nome: true, dataNascimento: true, sexo: true, parentesco: true, criadoEm: true },
      }),
      prisma.filaAgendada.findMany({
        where: { pacienteId: userId },
        select: {
          id: true, dataHora: true, status: true, creditoDebitado: true, criadoEm: true,
          farmaceutico: { select: { name: true } },
          dependent:    { select: { nome: true } },
        },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.filaUrgente.findMany({
        where: { pacienteId: userId },
        select: {
          id: true, status: true, creditoDebitado: true, criadoEm: true, aceitoEm: true,
          farmaceutico: { select: { name: true } },
          dependent:    { select: { nome: true } },
        },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.carteira.findUnique({
        where: { pacienteId: userId },
        select: {
          saldo: true,
          transacoes: {
            select: { tipo: true, valor: true, saldoApos: true, descricao: true, criadoEm: true },
            orderBy: { criadoEm: 'desc' },
          },
        },
      }),
    ]);

    const payload = {
      exportadoEm:   new Date().toISOString(),
      aviso:         'Exportação de dados pessoais conforme Art. 18, IV da LGPD (Lei nº 13.709/2018)',
      usuario:       user,
      perfil:        perfil ?? null,
      dependentes,
      consultas: {
        agendadas: agendadas.map((c) => ({
          ...c,
          farmaceutico: c.farmaceutico?.name ?? null,
          dependente:   c.dependent?.name    ?? null,
        })),
        urgentes: urgentes.map((c) => ({
          ...c,
          farmaceutico: c.farmaceutico?.name ?? null,
          dependente:   c.dependent?.name    ?? null,
        })),
      },
      carteira: {
        saldo:    carteira?.saldo ?? 0,
        extrato:  carteira?.transacoes ?? [],
      },
    };

    await logAction(prisma, {
      usuarioId: userId,
      role:      req.user.role,
      acao:      'lgpd_export',
      detalhes:  { timestamp: new Date().toISOString() },
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="meus-dados-farmaconsulta-${new Date().toISOString().split('T')[0]}.json"`);
    return res.json(payload);
  } catch (err) {
    console.error('exportarDados:', err);
    return res.status(500).json({ error: 'Erro ao exportar dados.' });
  }
};

// POST /api/lgpd/excluir-conta
// Body: { email }
export const excluirConta = async (req, res) => {
  try {
    const userId       = req.user.id;
    const emailFornecido = req.body?.email?.trim().toLowerCase();

    if (!emailFornecido) {
      return res.status(400).json({ error: 'Informe o e-mail para confirmar.' });
    }
    if (emailFornecido !== req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'E-mail não confere com o cadastrado.' });
    }

    // Bloquear se houver consulta futura paga pendente
    const agora = new Date();
    const consultaFutura = await prisma.filaAgendada.findFirst({
      where: {
        pacienteId: userId,
        status:     { in: ['aguardando', 'aceito'] },
        dataHora:   { gt: agora },
      },
    });
    if (consultaFutura) {
      return res.status(422).json({
        error: 'Você possui uma consulta futura agendada. Cancele-a antes de excluir a conta.',
        consultaId: consultaFutura.id,
      });
    }

    // Anonimizar — mantém registros clínicos desvinculados de identificação
    const hash = createHash('sha256').update(userId).digest('hex').slice(0, 12);
    const emailAnon = `deleted_${hash}@removed.invalid`;
    const nomeAnon  = 'Usuário Removido';

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          name:     nomeAnon,
          email:    emailAnon,
          phone:    null,
          password: null,
          googleId: null,
          photoUrl: null,
        },
      }),
      prisma.pacienteProfile.updateMany({
        where: { userId },
        data: {
          nomeCompleto: nomeAnon,
          cpf:          `REMOVIDO_${hash}`,
          telefone:     null,
          cep:          null,
          logradouro:   null,
          numero:       null,
          complemento:  null,
          bairro:       null,
          cidade:       null,
          estado:       null,
        },
      }),
    ]);

    await logAction(prisma, {
      usuarioId: userId,
      role:      req.user.role,
      acao:      'lgpd_delete_account',
      detalhes:  { emailHash: hash, timestamp: new Date().toISOString() },
    });

    return res.json({ success: true, mensagem: 'Conta anonimizada. Registros clínicos mantidos conforme prazo legal.' });
  } catch (err) {
    console.error('excluirConta:', err);
    return res.status(500).json({ error: 'Erro ao processar exclusão da conta.' });
  }
};
