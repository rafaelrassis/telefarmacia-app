import React, { useState, useEffect, useCallback } from 'react';
import { Save } from 'lucide-react';

// Configuração do plano de assinatura mensal (preço + consultas incluídas) e
// do trial promocional para novos assinantes — seção da aba Financeiro.
const PlanoAssinaturaSection = ({ api, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savingTrial, setSavingTrial] = useState(false);

  const [planoNome, setPlanoNome]       = useState('Plano Mensal');
  const [planoPreco, setPlanoPreco]     = useState('');
  const [planoConsultas, setPlanoConsultas] = useState('');

  const [trialAtivo, setTrialAtivo]         = useState(false);
  const [trialTipo, setTrialTipo]           = useState('dias_gratis');
  const [trialDias, setTrialDias]           = useState('7');
  const [trialPercentual, setTrialPercentual] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [rPlano, rTrial] = await Promise.all([
        api('/api/admin/plano'),
        api('/api/admin/trial'),
      ]);
      if (rPlano.ok) {
        const d = await rPlano.json();
        setPlanoNome(d.nome ?? 'Plano Mensal');
        setPlanoPreco(d.preco ? String(d.preco) : '');
        setPlanoConsultas(d.consultasIncluidas ? String(d.consultasIncluidas) : '');
      }
      if (rTrial.ok) {
        const d = await rTrial.json();
        setTrialAtivo(!!d.ativo);
        setTrialTipo(d.tipo || 'dias_gratis');
        setTrialDias(String(d.dias ?? 7));
        setTrialPercentual(d.percentual != null ? String(d.percentual) : '');
      }
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarPlano = async () => {
    const preco = parseFloat(planoPreco);
    const consultas = parseInt(planoConsultas, 10);
    if (isNaN(preco) || preco <= 0) { showToast('error', 'Preço do plano inválido.'); return; }
    if (isNaN(consultas) || consultas < 1 || consultas > 100) { showToast('error', 'Consultas incluídas inválido (1–100).'); return; }
    setSaving(true);
    try {
      const res = await api('/api/admin/plano', {
        method: 'PUT',
        body: JSON.stringify({ nome: planoNome, preco, consultasIncluidas: consultas }),
      });
      if (res.ok) showToast('success', '✅ Plano de assinatura salvo!');
      else { const d = await res.json().catch(() => ({})); showToast('error', d.error || 'Erro ao salvar plano.'); }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setSaving(false); }
  };

  const salvarTrial = async () => {
    const dias = parseInt(trialDias, 10);
    if (isNaN(dias) || dias < 1 || dias > 90) { showToast('error', 'Dias de trial inválido (1–90).'); return; }
    if (trialTipo === 'desconto_percentual') {
      const pct = parseFloat(trialPercentual);
      if (isNaN(pct) || pct <= 0 || pct > 100) { showToast('error', 'Percentual de desconto inválido (0–100).'); return; }
    }
    setSavingTrial(true);
    try {
      const res = await api('/api/admin/trial', {
        method: 'PUT',
        body: JSON.stringify({
          ativo: trialAtivo, tipo: trialTipo, dias,
          percentual: trialTipo === 'desconto_percentual' ? parseFloat(trialPercentual) : null,
        }),
      });
      if (res.ok) showToast('success', '✅ Configuração de trial salva!');
      else { const d = await res.json().catch(() => ({})); showToast('error', d.error || 'Erro ao salvar trial.'); }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setSavingTrial(false); }
  };

  if (loading) {
    return (
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <>
      {/* ── Plano de assinatura mensal ── */}
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="font-semibold text-ink text-sm">Assinatura Mensal</p>
          <p className="text-xs text-muted mt-0.5">Plano de consultas incluídas por mês, pago via Mercado Pago.</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label htmlFor="plano-nome" className="block text-xs font-semibold text-muted mb-1.5">Nome do plano</label>
            <input
              id="plano-nome" type="text" value={planoNome} onChange={(e) => setPlanoNome(e.target.value)}
              className="w-full max-w-xs border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-brand box-border bg-canvas"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="plano-preco" className="block text-xs font-semibold text-muted mb-1.5">Preço mensal (R$)</label>
              <input
                id="plano-preco" type="number" min="0" step="0.01" value={planoPreco}
                onChange={(e) => setPlanoPreco(e.target.value)}
                className="w-full max-w-[160px] border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-brand box-border bg-canvas"
                placeholder="Ex: 149.90"
              />
            </div>
            <div>
              <label htmlFor="plano-consultas" className="block text-xs font-semibold text-muted mb-1.5">Consultas incluídas / mês</label>
              <input
                id="plano-consultas" type="number" min="1" max="100" step="1" value={planoConsultas}
                onChange={(e) => setPlanoConsultas(e.target.value)}
                className="w-full max-w-[140px] border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-brand box-border bg-canvas"
                placeholder="Ex: 4"
              />
            </div>
          </div>
          <button
            disabled={saving}
            onClick={salvarPlano}
            className={`inline-flex items-center gap-2 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition ${
              saving ? 'bg-muted cursor-not-allowed' : 'bg-brand hover:bg-brand-deep cursor-pointer'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando…' : 'Salvar plano'}
          </button>
        </div>
      </div>

      {/* ── Trial promocional ── */}
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="font-semibold text-ink text-sm">Trial Promocional</p>
          <p className="text-xs text-muted mt-0.5">Oferecido a pacientes que nunca assinaram antes.</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox" checked={trialAtivo} onChange={(e) => setTrialAtivo(e.target.checked)}
              className="w-4 h-4 accent-brand"
            />
            <span className="text-sm font-medium text-ink">Trial ativo para novos assinantes</span>
          </label>

          <div>
            <span className="block text-xs font-semibold text-muted mb-1.5">Tipo de trial</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="trial-tipo" checked={trialTipo === 'dias_gratis'} onChange={() => setTrialTipo('dias_gratis')} className="accent-brand" />
                <span className="text-sm text-ink">Dias grátis antes de cobrar</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="trial-tipo" checked={trialTipo === 'desconto_percentual'} onChange={() => setTrialTipo('desconto_percentual')} className="accent-brand" />
                <span className="text-sm text-ink">Desconto % por X dias</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="trial-dias" className="block text-xs font-semibold text-muted mb-1.5">
                {trialTipo === 'dias_gratis' ? 'Dias grátis' : 'Dias com desconto'}
              </label>
              <input
                id="trial-dias" type="number" min="1" max="90" step="1" value={trialDias}
                onChange={(e) => setTrialDias(e.target.value)}
                className="w-full max-w-[120px] border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-brand box-border bg-canvas"
              />
            </div>
            {trialTipo === 'desconto_percentual' && (
              <div>
                <label htmlFor="trial-percentual" className="block text-xs font-semibold text-muted mb-1.5">Percentual de desconto (%)</label>
                <input
                  id="trial-percentual" type="number" min="0" max="100" step="1" value={trialPercentual}
                  onChange={(e) => setTrialPercentual(e.target.value)}
                  className="w-full max-w-[120px] border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-brand box-border bg-canvas"
                  placeholder="Ex: 20"
                />
              </div>
            )}
          </div>

          {trialTipo === 'desconto_percentual' && (
            <p className="text-[11px] text-muted">
              O Mercado Pago cobra o valor cheio da assinatura desde o início — a diferença do desconto é
              creditada como bônus na carteira do paciente durante o período do trial.
            </p>
          )}

          <button
            disabled={savingTrial}
            onClick={salvarTrial}
            className={`inline-flex items-center gap-2 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition ${
              savingTrial ? 'bg-muted cursor-not-allowed' : 'bg-brand hover:bg-brand-deep cursor-pointer'
            }`}
          >
            <Save className="w-4 h-4" />
            {savingTrial ? 'Salvando…' : 'Salvar trial'}
          </button>
        </div>
      </div>
    </>
  );
};

export default PlanoAssinaturaSection;
