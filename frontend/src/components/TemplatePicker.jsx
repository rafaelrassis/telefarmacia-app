import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const applyPlaceholders = (text, { pacienteNome, triagem, farmaceuticoNome }) => {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  let idade = '';
  const dataNasc = triagem?.paciente_data_nascimento;
  const idadeRaw = triagem?.paciente_idade;
  if (dataNasc) {
    const diff = Date.now() - new Date(dataNasc).getTime();
    idade = `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} anos`;
  } else if (idadeRaw != null) {
    idade = `${idadeRaw} anos`;
  }

  return text
    // sintaxe atual (chave dupla) — processada antes para não deixar sobra de chaves
    .replace(/\{\{\s*paciente_nome\s*\}\}/g,     pacienteNome     || '')
    .replace(/\{\{\s*data\s*\}\}/g,               hoje)
    .replace(/\{\{\s*farmaceutico_nome\s*\}\}/g, farmaceuticoNome || '')
    // sintaxe legada (chave simples)
    .replace(/\{paciente\}/g, pacienteNome || '')
    .replace(/\{data\}/g,     hoje)
    .replace(/\{idade\}/g,    idade);
};

const TemplatePicker = ({ pacienteNome, triagem, onInsert, onClose }) => {
  const { token, user } = useAuth();
  const farmaceuticoNome = user?.name || '';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_URL}/api/farmaceutico/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setTemplates(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [token]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtrados = templates.filter((t) =>
    t.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div
      ref={ref}
      className="absolute top-[110%] right-0 z-[100] w-80 bg-canvas border border-line rounded-xl shadow-lg overflow-hidden"
    >
      {/* Busca */}
      <div className="px-3 py-2.5 border-b border-line">
        <input
          autoFocus
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar template por título..."
          className="w-full box-border border border-line rounded-lg px-2.5 py-1.5 text-[13px] outline-none font-inherit bg-surface"
        />
      </div>

      {/* Lista */}
      <div className="max-h-60 overflow-y-auto">
        {loading ? (
          <p className="text-[13px] text-muted text-center py-4">
            Carregando...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-4 px-3">
            {templates.length === 0
              ? 'Nenhum template criado ainda. Crie na aba "Templates".'
              : 'Nenhum template encontrado.'}
          </p>
        ) : (
          filtrados.map((t) => (
            <button
              key={t.id}
              onClick={() => onInsert(applyPlaceholders(t.conteudo, { pacienteNome, triagem, farmaceuticoNome }))}
              className="block w-full text-left px-3.5 py-2.5 bg-transparent border-0 border-b border-line last:border-b-0 cursor-pointer font-inherit hover:bg-brand-wash transition-colors"
            >
              <p className="text-[13px] font-semibold text-ink m-0 leading-tight">
                {t.titulo}
              </p>
              <p className="text-[11px] text-muted mt-0.5 mb-0 leading-snug overflow-hidden text-ellipsis whitespace-nowrap">
                {t.conteudo}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Dica de placeholders */}
      <div className="px-3 py-2 border-t border-line bg-surface">
        <p className="text-[11px] text-muted m-0">
          Placeholders: <code className="font-mono">{'{{paciente_nome}}'}</code>,{' '}
          <code className="font-mono">{'{{data}}'}</code>,{' '}
          <code className="font-mono">{'{{farmaceutico_nome}}'}</code>
        </p>
      </div>
    </div>
  );
};

export default TemplatePicker;
