export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const DEFAULT_HORARIOS = DIAS_SEMANA.map((_, i) => ({
  diaSemana: i,
  horaInicio: '08:00',
  horaFim: '18:00',
  ativo: i >= 1 && i <= 5,
}));

export const fmt   = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
export const fmtDt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Configs de ação para a aba Logs ──────────────────────────────────────────

export const ACAO_CFG = {
  aceito:    { label: 'Aceito',    style: { background: '#eff6ff', color: '#1d4ed8' } },
  iniciado:  { label: 'Iniciado',  style: { background: '#fff7ed', color: '#c2410c' } },
  concluido: { label: 'Concluído', style: { background: '#f0fdf4', color: '#15803d' } },
  cancelado: { label: 'Cancelado', style: { background: '#fef2f2', color: '#dc2626' } },
  devolvido: { label: 'Devolvido', style: { background: '#fffbeb', color: '#b45309' } },
  reembolso: { label: 'Reembolso', style: { background: '#fdf2f8', color: '#be185d' } },
};

export const fmtConsultaDt = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} às ${hh}:${min}`;
};

export const fmtDetalhes = (acao, det, consultaDataHora) => {
  const dtStr = consultaDataHora ? ` · ${fmtConsultaDt(consultaDataHora)}` : '';
  if (!det || Object.keys(det).length === 0) return dtStr.trim() || '—';
  if (acao === 'aceito')    return `Tipo: ${det.tipo ?? '—'}${dtStr}`;
  if (acao === 'iniciado')  return `${det.tipo ? `Tipo: ${det.tipo}` : '—'}${dtStr}`;
  if (acao === 'concluido') return `${det.duracao_min != null ? `Duração: ${det.duracao_min}min` : 'Duração: —'}${dtStr}`;
  if (acao === 'cancelado') return `Por: ${det.cancelado_por ?? '?'}${det.motivo ? `, motivo: ${det.motivo}` : ''}${dtStr}`;
  if (acao === 'devolvido') return `${det.motivo ? `Motivo: ${det.motivo}` : '—'}${dtStr}`;
  if (acao === 'reembolso') return `${det.valor != null ? `R$ ${Number(det.valor).toFixed(2).replace('.', ',')}` : '—'}${dtStr}`;
  return JSON.stringify(det).substring(0, 80);
};

export const SEL_STYLE = {
  fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '6px 10px', outline: 'none', background: '#fff',
};
