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
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div
          className="relative bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-lg"
          style={{
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px 16px 0 0',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 20px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              📄 Meus documentos
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
          </div>

          {/* Filters */}
          <div style={{ padding: '14px 20px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hasMultiplePessoas && (
              <select
                value={pessoaFiltro}
                onChange={(e) => setPessoaFiltro(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151',
                  background: 'white', cursor: 'pointer',
                }}
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
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px 28px' }}>
            {loading && (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
                Carregando...
              </p>
            )}

            {!loading && error && (
              <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
                {error}
              </p>
            )}

            {!loading && !error && filtered.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
                {docs.length === 0
                  ? 'Nenhum documento disponível.'
                  : 'Nenhum documento encontrado para essa busca.'}
              </p>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((doc) => {
                  const hasOrientacoes = Boolean(doc.observacoes?.trim());
                  const dateStr = fmtData(doc.dataHora);
                  const tipoLabel = doc.tipo === 'urgente' ? 'Urgente' : 'Agendada';
                  const tipoBg    = doc.tipo === 'urgente' ? '#fef2f2' : '#eff6ff';
                  const tipoColor = doc.tipo === 'urgente' ? '#dc2626' : '#2563eb';

                  return (
                    <button
                      key={`${doc.tipo}-${doc.id}`}
                      onClick={() => setViewer(doc)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10,
                        padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      {/* Row 1: date + tipo badge + arrow */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>
                          {dateStr}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                          background: tipoBg, color: tipoColor, flexShrink: 0,
                        }}>
                          {tipoLabel}
                        </span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 14, color: '#9ca3af' }}>›</span>
                      </div>

                      {/* Row 2: pharmacist */}
                      {doc.farmaceuticoNome && (
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                          {doc.farmaceuticoNome}
                        </p>
                      )}

                      {/* Row 3: person (only when filter is "todos" with multiple pessoas) */}
                      {hasMultiplePessoas && pessoaFiltro === 'todos' && doc.pessoaNome && (
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                          Para: {doc.pessoaNome}
                        </p>
                      )}

                      {/* Row 4: motivo */}
                      {doc.motivo && (
                        <p style={{
                          margin: 0, fontSize: 12, color: '#9ca3af',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {doc.motivo}
                        </p>
                      )}

                      {/* Row 5: doc type badges */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {doc.hasReceita && (
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 99,
                            background: '#fdf4ff', color: '#7c3aed', fontWeight: 600,
                          }}>
                            💊 Receita
                          </span>
                        )}
                        {hasOrientacoes && (
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 99,
                            background: '#f0fdf4', color: '#16a34a', fontWeight: 600,
                          }}>
                            📝 Orientações
                          </span>
                        )}
                        {!doc.hasReceita && !hasOrientacoes && (
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 99,
                            background: '#f9fafb', color: '#9ca3af', fontWeight: 500,
                          }}>
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
            receita:        viewer.receita,
            observacoes:    viewer.observacoes,
            receitaPdfUrl:  viewer.receitaPdfUrl,
            farmaceuticoNome: viewer.farmaceuticoNome,
            dataHora:       viewer.dataHora,
          }}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
};

export default MeusDocumentos;
