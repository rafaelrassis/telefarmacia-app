export async function logAdminAction(prisma, { adminId, acao, alvoTipo = null, alvoId = null, detalhes = {} }) {
  try {
    await prisma.adminAuditLog.create({
      data: { adminId, acao, alvoTipo, alvoId, detalhes },
    });
  } catch (err) {
    console.error('[logAdminAction] failed:', acao, err?.message);
  }
}
