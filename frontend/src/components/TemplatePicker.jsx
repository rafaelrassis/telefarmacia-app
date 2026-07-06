import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const applyPlaceholders = (text, { pacienteNome, triagem }) => {
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
    .replace(/\{paciente\}/g, pacienteNome || '')
    .replace(/\{data\}/g,     hoje)
    .replace(/\{idade\}/g,    idade);
};

const TemplatePicker = ({ pacienteNome, triagem, onInsert, onClose }) => {
  const { token } = useAuth();
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
      style={{
        position:     'absolute',
        top:          '110%',
        right:        0,
        zIndex:       100,
        width:        '320px',
        background:   'white',
        border:       '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow:    '0 8px 24px rgba(0,0,0,0.12)',
        overflow:     'hidden',
      }}
    >
      {/* Busca */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
        <input
          autoFocus
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar template por título..."
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '7px 10px', fontSize: 13, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Lista */}
      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
            Carregando...
          </p>
        ) : filtrados.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 12px' }}>
            {templates.length === 0
              ? 'Nenhum template criado ainda. Crie na aba "Templates".'
              : 'Nenhum template encontrado.'}
          </p>
        ) : (
          filtrados.map((t) => (
            <button
              key={t.id}
              onClick={() => onInsert(applyPlaceholders(t.conteudo, { pacienteNome, triagem }))}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', background: 'transparent',
                border: 'none', borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
                {t.titulo}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.conteudo}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Dica de placeholders */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
          Placeholders: <code style={{ fontFamily: 'monospace' }}>{'{paciente}'}</code>,{' '}
          <code style={{ fontFamily: 'monospace' }}>{'{data}'}</code>,{' '}
          <code style={{ fontFamily: 'monospace' }}>{'{idade}'}</code>
        </p>
      </div>
    </div>
  );
};

export default TemplatePicker;
