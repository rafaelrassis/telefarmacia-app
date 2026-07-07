import { useState, useCallback, useEffect } from 'react';

// Config de preço/comissão + comissões individuais. Chamado uma vez no
// AdminPanel (não por aba) porque finLimiteOcorrencias também é consumido
// pela aba Farmacêuticos (badge de alerta de ocorrências), independente de a
// aba Financeiro já ter sido visitada ou não — precisa estar pronto desde o
// carregamento inicial do painel, igual ao comportamento original.
export function useFinanceiroAdmin(api, showToast) {
  const [finConfig, setFinConfig]           = useState(null);
  const [finLoading, setFinLoading]         = useState(false);
  const [finPreco, setFinPreco]             = useState('');
  const [finComissao, setFinComissao]       = useState('');
  const [finMaxUrg, setFinMaxUrg]           = useState('1');
  const [finTolerancia, setFinTolerancia]   = useState('30');
  const [finLimiteOcorrencias, setFinLimiteOcorrencias] = useState('5');
  const [finSaving, setFinSaving]           = useState(false);
  const [editingComissao, setEditingComissao] = useState({});
  const [savingComissao, setSavingComissao] = useState({});

  const loadFinanceiro = useCallback(async () => {
    setFinLoading(true);
    try {
      const res = await api('/api/admin/config/financeiro');
      if (res.ok) {
        const d = await res.json();
        setFinConfig(d);
        setFinPreco(String(d.preco));
        setFinComissao(String(d.comissaoPadrao));
        setFinMaxUrg(String(d.maxUrgenciasSimult ?? 1));
        setFinTolerancia(String(d.toleranciaExpiracaoAgendadaMin ?? 30));
        setFinLimiteOcorrencias(String(d.limiteOcorrencias30d ?? 5));
      }
    } finally { setFinLoading(false); }
  }, [api]);

  useEffect(() => { loadFinanceiro(); }, [loadFinanceiro]);

  const handleSalvarConfig = async () => {
    const preco       = parseFloat(finPreco);
    const percentual  = parseFloat(finComissao);
    const maxUrg      = parseInt(finMaxUrg, 10);
    const tolerancia  = parseInt(finTolerancia, 10);
    const limiteOcorrencias = parseInt(finLimiteOcorrencias, 10);
    if (isNaN(preco) || preco <= 0)                              { showToast('error', 'Preço inválido.'); return; }
    if (isNaN(percentual) || percentual < 0 || percentual > 100) { showToast('error', 'Comissão inválida (0–100).'); return; }
    if (isNaN(maxUrg) || maxUrg < 1 || maxUrg > 20)             { showToast('error', 'Limite de urgências inválido (1–20).'); return; }
    if (isNaN(tolerancia) || tolerancia < 5 || tolerancia > 240) { showToast('error', 'Tolerância de expiração inválida (5–240 min).'); return; }
    if (isNaN(limiteOcorrencias) || limiteOcorrencias < 1 || limiteOcorrencias > 50) { showToast('error', 'Limite de ocorrências inválido (1–50).'); return; }
    setFinSaving(true);
    try {
      const res = await api('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          preco_consulta: preco, comissao_padrao: percentual, max_urgencias_simultaneas: maxUrg,
          tolerancia_expiracao_agendada_min: tolerancia, limite_ocorrencias_30d: limiteOcorrencias,
        }),
      });
      if (res.ok) {
        showToast('success', '✅ Configurações salvas!');
        setFinConfig((prev) => prev ? { ...prev, preco, comissaoPadrao: percentual, maxUrgenciasSimult: maxUrg, toleranciaExpiracaoAgendadaMin: tolerancia, limiteOcorrencias30d: limiteOcorrencias } : prev);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast('error', d.error || 'Erro ao salvar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setFinSaving(false); }
  };

  const handleSalvarComissao = async (farmId, farmNome, percentualStr) => {
    const pct = parseFloat(percentualStr);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showToast('error', 'Percentual inválido (0–100).');
      return;
    }
    setSavingComissao((prev) => ({ ...prev, [farmId]: true }));
    try {
      const res = await api(`/api/admin/comissoes/${farmId}`, {
        method: 'PUT', body: JSON.stringify({ percentual: pct }),
      });
      if (res.ok) {
        showToast('success', `Comissão de ${farmNome} atualizada para ${pct}%.`);
        setFinConfig((prev) => ({
          ...prev,
          farmaceuticos: prev.farmaceuticos.map((x) => x.id === farmId ? { ...x, comissao: pct } : x),
        }));
        setEditingComissao((prev) => ({ ...prev, [farmId]: String(pct) }));
      } else {
        showToast('error', 'Erro ao salvar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setSavingComissao((prev) => ({ ...prev, [farmId]: false })); }
  };

  const handleRemoverComissao = async (farmId, farmNome, comissaoPadrao) => {
    setSavingComissao((prev) => ({ ...prev, [farmId]: true }));
    try {
      const res = await api(`/api/admin/comissoes/${farmId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', `${farmNome} voltará a usar a comissão padrão (${comissaoPadrao}%).`);
        setFinConfig((prev) => ({
          ...prev,
          farmaceuticos: prev.farmaceuticos.map((x) => x.id === farmId ? { ...x, comissao: null } : x),
        }));
        setEditingComissao((prev) => ({ ...prev, [farmId]: '' }));
      } else {
        showToast('error', 'Erro ao remover comissão.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setSavingComissao((prev) => ({ ...prev, [farmId]: false })); }
  };

  return {
    finConfig, finLoading,
    finPreco, setFinPreco, finComissao, setFinComissao,
    finMaxUrg, setFinMaxUrg, finTolerancia, setFinTolerancia,
    finLimiteOcorrencias, setFinLimiteOcorrencias, finSaving,
    editingComissao, setEditingComissao, savingComissao,
    loadFinanceiro, handleSalvarConfig, handleSalvarComissao, handleRemoverComissao,
  };
}
