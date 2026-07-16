import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ReceitaViewer from './ReceitaViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fmtData = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MeusDocumentos = ({ onClose }) => {
  const { token } = useAuth();

  const [docs,        setDocs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [pessoaFiltro, setPessoaFiltro] = useState('todos'); // 'todos' | 'titular' | depId
  const [dependentes, setDependentes] = useState([]);
  const [viewer,      setViewer]      = useState(null); // doc object

  // Fetch dependents for the person filter
  useEffect(() => {
    fetch(`${API_URL}/api/pacientes/perfil`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.dependentes) setDependentes(d.dependentes); })
      .catch(() => {});
  }, [token]);

  const fetchDocs = useCallback(async (filtro) => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/api/paciente/documentos`;
      if (filtro === 'titular')         url += '?titular=1';
      else if (filtro && filtro !== 'todos') url += `?dependentId=${encodeURIComponent(filtro)}`;

      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Erro ao carregar documentos.');
      const d = await r.json();
      setDocs(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message || 'Falha de conexão.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDocs(pessoaFiltro); }, [pessoaFiltro, fetchDocs]);

  const filtered = docs.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (d.pessoaNome?.toLowerCase().includes(q)) ||
      (d.farmaceuticoNome?.toLowerCase().includes(q)) ||
      (d.motivo?.toLowerCase().includes(q)) ||
      (d.observacoes?.toLowerCase().includes(q))
    );
  });

  const hasMultiplePessoas = dependentes.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative bg-canvas border border-line w-full rounded-t-2xl shadow-md sm:max-w-lg flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 pt-[18px] flex justify-between items-center shrink-0">
            <h2 className="text-base font-bold text-ink m-0">
              📄 Meus documentos
            </h2>
            <button
              onClick={onClose}
              className="bg-transparent border-none text-[22px] cursor-pointer text-muted hover:text-ink leading-none p-1"
            >
              ×
            </button>
          </div>

          {/* Filters */}
          <div className="px-5 pt-3.5 shrink-0 flex flex-col gap-2">
            {hasMultiplePessoas && (
              <select
                value={pessoaFiltro}
                onChange={(e) => setPessoaFiltro(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-line text-[13px] text-ink bg-canvas cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="titular">Titular</option>
                {dependentes.map((dep) => (
                  <option key={dep.id} value={dep.id}>{dep.nome}</option>
                ))}
              </select>
            )}

            <input
              type="search"
              placeholder="Buscar por farmacêutico, motivo, orientação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full box-border px-2.5 py-2 rounded-lg border border-line text-[13px] text-ink bg-canvas"
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 px-5 pt-3 pb-7">
            {loading && (
              <p className="text-muted text-sm text-center mt-8">
                Carregando...
              </p>
            )}

            {!loading && error && (
              <p className="text-error text-[13px] text-center mt-8">
                {error}
              </p>
            )}

            {!loading && !error && filtered.length === 0 && (
              <p className="text-muted text-sm text-center mt-8">
                {docs.length === 0
                  ? 'Nenhum documento disponível.'
                  : 'Nenhum documento encontrado para essa busca.'}
              </p>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="flex flex-col gap-2">
                {filtered.map((doc) => {
                  const hasOrientacoes = Boolean(doc.observacoes?.trim());
                  const dateStr = fmtData(doc.dataHora);
                  const tipoLabel = doc.tipo === 'urgente' ? 'Urgente' : 'Agendada';
                  const tipoCls   = doc.tipo === 'urgente' ? 'bg-error-wash text-error' : 'bg-brand-wash text-brand-deep';

                  return (
                    <button
                      key={`${doc.tipo}-${doc.id}`}
                      onClick={() => setViewer(doc)}
                      className="flex flex-col gap-1.5 bg-canvas border border-line hover:border-brand/60 rounded-[10px] px-3.5 py-3 cursor-pointer text-left transition-colors"
                    >
                      {/* Row 1: date + tipo badge + arrow */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted shrink-0">
                          {dateStr}
                        </span>
                        <span className={`text-[10px] font-bold px-[7px] py-0.5 rounded-full shrink-0 ${tipoCls}`}>
                          {tipoLabel}
                        </span>
                        <span className="flex-1" />
                        <span className="text-sm text-muted">›</span>
                      </div>

                      {/* Row 2: pharmacist */}
                      {doc.farmaceuticoNome && (
                        <p className="m-0 text-[13px] font-semibold text-ink">
                          {doc.farmaceuticoNome}
                        </p>
                      )}

                      {/* Row 3: person (only when filter is "todos" with multiple pessoas) */}
                      {hasMultiplePessoas && pessoaFiltro === 'todos' && doc.pessoaNome && (
                        <p className="m-0 text-xs text-muted">
                          Para: {doc.pessoaNome}
                        </p>
                      )}

                      {/* Row 4: motivo */}
                      {doc.motivo && (
                        <p className="m-0 text-xs text-muted whitespace-nowrap overflow-hidden text-ellipsis">
                          {doc.motivo}
                        </p>
                      )}

                      {/* Row 5: doc type badges */}
                      <div className="flex gap-1.5 flex-wrap">
                        {doc.hasReceita && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-pink-50 text-pink-700">
                            💊 Receita
                          </span>
                        )}
                        {doc.encaminhamentoPdfUrl && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700">
                            📋 Encaminhamento
                          </span>
                        )}
                        {hasOrientacoes && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-success-wash text-success">
                            📝 Orientações
                          </span>
                        )}
                        {!doc.hasReceita && !doc.encaminhamentoPdfUrl && !hasOrientacoes && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-surface text-muted">
                            Sem documentos
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ReceitaViewer overlay */}
      {viewer && (
        <ReceitaViewer
          consultaId={viewer.id}
          tipo={viewer.tipo}
          data={{
            receita:               viewer.receita,
            observacoes:           viewer.observacoes,
            receitaPdfUrl:         viewer.receitaPdfUrl,
            encaminhamentoPdfUrl:  viewer.encaminhamentoPdfUrl,
            farmaceuticoNome:      viewer.farmaceuticoNome,
            dataHora:              viewer.dataHora,
          }}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
};

export default MeusDocumentos;
