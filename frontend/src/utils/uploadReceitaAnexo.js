const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const ANEXO_RECEITA_MAX_BYTES = 5 * 1024 * 1024;
export const ANEXO_RECEITA_TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'application/pdf'];

// Upload do anexo da receita (interpretação de receita) — chamado depois que
// a consulta já existe (agendamento/urgência), já que não há id de consulta
// antes disso. Falha aqui não deve impedir o fluxo de agendamento em si; quem
// chama decide se trata o erro como bloqueante ou apenas avisa o paciente.
export async function uploadReceitaAnexo(token, consultaId, tipo, file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('anexo', file);
  const res = await fetch(`${API_URL}/api/consulta/${consultaId}/anexo-receita?tipo=${tipo}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Falha ao enviar anexo da receita.');
  return res.json();
}
