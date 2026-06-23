export async function logAction(prisma, { consultaId, usuarioId, role, acao, detalhes = {} }) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO log_acoes (consulta_id, usuario_id, role, acao, detalhes)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      consultaId ?? null,
      usuarioId  ?? null,
      role       ?? null,
      acao,
      JSON.stringify(detalhes)
    );
  } catch (err) {
    console.error('[logAction] failed:', acao, err?.message);
  }
}
