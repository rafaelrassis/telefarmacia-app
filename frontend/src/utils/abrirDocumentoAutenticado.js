// Abre um PDF protegido (receita/encaminhamento) em nova aba, anexando o
// token de autenticação — necessário porque o endpoint não é mais servido
// como arquivo estático público.
export async function abrirDocumentoAutenticado(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Não foi possível abrir o documento.');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}
