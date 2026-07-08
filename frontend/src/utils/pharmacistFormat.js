export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

export const timeUntil = (iso) => {
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'passou';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `em ${Math.floor(h / 24)}d`;
  if (h > 0)   return `em ${h}h${m > 0 ? `${m}min` : ''}`;
  return `em ${m}min`;
};

export const timeSince = (iso) => {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora mesmo';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h${m % 60 > 0 ? `${m % 60}min` : ''}`;
};

export const fmtEntrou = (iso) => {
  const d    = new Date(iso);
  const hoje = new Date();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return `hoje às ${hora}`;
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return `ontem às ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
};

export const fmtBloqueio = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const brDateKey = (d) => {
  const brt = new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return `${brt.getFullYear()}-${brt.getMonth()}-${brt.getDate()}`;
};

export const fmtEmMinOuHora = (dataIso) => {
  const alvo = new Date(dataIso);
  const diffMin = Math.round((alvo.getTime() - Date.now()) / 60000);
  const hora = alvo.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  if (diffMin <= 0) return `${hora} (agora)`;
  if (diffMin < 60) return `${hora} (em ${diffMin} min)`;
  return hora;
};

export const PLACEHOLDER_HINT = '{{paciente_nome}}, {{data}}, {{farmaceutico_nome}}';

// Deriva um status único e explícito do farmacêutico a partir dos booleans
// crus do perfil (isApproved/isSuspended/urlDocCrf) — evita que cada tela
// (dashboard do farmacêutico, listagem do admin) reimplemente essa lógica
// separadamente e possa divergir.
export const getPharmacistStatus = (profile) => {
  const docEnviado = Boolean(profile?.urlDocCrf);
  if (profile?.isSuspended) return { key: 'suspenso', label: 'Suspenso', docEnviado };
  if (profile?.isApproved)  return { key: 'ativo',    label: 'Ativo',    docEnviado };
  return { key: 'pendente', label: 'Pendente', docEnviado };
};

export function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}
