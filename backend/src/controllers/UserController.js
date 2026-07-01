import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPerfilCompleto = async (req, res) => {
  const userId = req.user.id;
  const role   = req.user.role;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, photoUrl: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    let paciente     = null;
    let farmaceutico = null;

    paciente = await prisma.pacienteProfile.findUnique({ where: { userId } }).catch(() => null);
    if (paciente) {
      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT peso FROM "PacienteProfile" WHERE "userId" = $1`, userId
        );
        if (rows.length > 0) paciente.peso = rows[0].peso;
      } catch {}
    }

    if (role === 'FARMACEUTICO') {
      farmaceutico = await prisma.pharmacistProfile.findUnique({ where: { userId } });
      if (farmaceutico) {
        try {
          const rows = await prisma.$queryRawUnsafe(
            `SELECT tempo_experiencia FROM "PharmacistProfile" WHERE "userId" = $1`, userId
          );
          if (rows.length > 0) farmaceutico.tempoExperiencia = rows[0].tempo_experiencia;
        } catch {}
      }
    }

    return res.status(200).json({
      name:     user.name,
      email:    user.email,
      phone:    user.phone,
      photoUrl: user.photoUrl,
      role,
      genero:        paciente?.genero        ?? null,
      data_nascimento: paciente?.dataNascimento ?? null,
      cpf:           paciente?.cpf           ?? null,
      telefone:      paciente?.telefone      ?? null,
      cep:           paciente?.cep           ?? null,
      logradouro:    paciente?.logradouro    ?? null,
      numero:        paciente?.numero        ?? null,
      complemento:   paciente?.complemento   ?? null,
      bairro:        paciente?.bairro        ?? null,
      cidade:        paciente?.cidade        ?? null,
      estado:        paciente?.estado        ?? null,
      peso:          paciente?.peso          ?? null,
      crfNumber:        farmaceutico?.crfNumber        ?? null,
      crfUF:            farmaceutico?.crfUF            ?? null,
      bio:              farmaceutico?.bio              ?? null,
      tempoExperiencia: farmaceutico?.tempoExperiencia ?? null,
    });
  } catch (err) {
    console.error('getPerfilCompleto error:', err);
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};

export const updatePerfil = async (req, res) => {
  const userId = req.user.id;
  const role   = req.user.role;
  const {
    name, phone,
    genero, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado, peso,
    crfNumber, crfUF, bio, tempoExperiencia,
  } = req.body;
  const photoFile = req.file;

  try {
    // 1. User table
    const userData = {};
    if (name?.trim())       userData.name  = name.trim();
    if (phone !== undefined) userData.phone = phone?.replace?.(/\D/g, '') || null;
    if (photoFile)           userData.photoUrl = `/uploads/${photoFile.filename}`;
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userData });
    }

    // 2. PacienteProfile (any role can have one)
    {
      const perfil = await prisma.pacienteProfile.findUnique({ where: { userId } }).catch(() => null);
      if (perfil) {
        const pd = {};
        if (name?.trim())         pd.nomeCompleto = name.trim();
        if (genero?.trim())       pd.genero       = genero.trim();
        if (telefone !== undefined) pd.telefone   = telefone?.replace?.(/\D/g, '') || null;
        if (cep !== undefined)      pd.cep        = cep?.replace?.(/\D/g, '')      || null;
        if (logradouro !== undefined) pd.logradouro = logradouro?.trim() || null;
        if (numero !== undefined)     pd.numero     = numero?.trim()     || null;
        if (complemento !== undefined) pd.complemento = complemento?.trim() || null;
        if (bairro !== undefined)  pd.bairro  = bairro?.trim()  || null;
        if (cidade !== undefined)  pd.cidade  = cidade?.trim()  || null;
        if (estado !== undefined)  pd.estado  = estado?.trim()  || null;
        if (Object.keys(pd).length > 0) {
          await prisma.pacienteProfile.update({ where: { userId }, data: pd });
        }
        if (peso !== undefined) {
          const pesoNum = peso ? parseFloat(peso) : null;
          await prisma.$executeRawUnsafe(
            `UPDATE "PacienteProfile" SET peso = $1 WHERE "userId" = $2`,
            pesoNum, userId
          );
        }
      }
    }

    // 3. PharmacistProfile
    if (role === 'FARMACEUTICO') {
      const fd = {};
      if (crfNumber?.trim()) fd.crfNumber = crfNumber.trim();
      if (crfUF?.trim())     fd.crfUF     = crfUF.trim();
      if (bio !== undefined) fd.bio        = bio?.trim() || '';
      if (Object.keys(fd).length > 0) {
        await prisma.pharmacistProfile.update({ where: { userId }, data: fd }).catch(() => {});
      }
      if (tempoExperiencia !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE "PharmacistProfile" SET tempo_experiencia = $1 WHERE "userId" = $2`,
          tempoExperiencia?.trim() || null, userId
        ).catch(() => {});
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('updatePerfil error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};

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
