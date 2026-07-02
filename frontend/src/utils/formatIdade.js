/**
 * Retorna idade formatada a partir da data de nascimento.
 * Menores de 12 meses: "X meses" (ou "1 mês").
 * 1 ano ou mais: "X anos" (ou "1 ano").
 */
export function formatIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  const totalMeses =
    (hoje.getFullYear() - nasc.getFullYear()) * 12 +
    (hoje.getMonth() - nasc.getMonth()) -
    (hoje.getDate() < nasc.getDate() ? 1 : 0);
  if (totalMeses < 1) return 'menos de 1 mês';
  if (totalMeses < 12) return totalMeses === 1 ? '1 mês' : `${totalMeses} meses`;
  const anos = Math.floor(totalMeses / 12);
  return anos === 1 ? '1 ano' : `${anos} anos`;
}
