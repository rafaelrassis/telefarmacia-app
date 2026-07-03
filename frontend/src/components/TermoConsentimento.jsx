import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ⚠️  RASCUNHO — texto aguardando validação jurídica (ver especificacoes/termo-telefarmacia-v1.0.md)
const VERSAO_TERMO = import.meta.env.VITE_TERMOS_TELEFARMACIA_VERSAO || '1.0';

const TEXTO_TERMO = `1. NATUREZA DO SERVIÇO

O FarmaConsulta oferece serviços de orientação farmacêutica remota (telefarmácia) realizados por farmacêuticos habilitados, em conformidade com a Resolução CFF nº 727/2022, que regulamenta o exercício das atribuições farmacêuticas por meio de tecnologias digitais.

O atendimento NÃO constitui consulta médica e NÃO substitui avaliação presencial em situações de urgência ou emergência. Em caso de risco imediato à vida, acione o SAMU (192) ou dirija-se ao pronto-socorro.

2. REGISTRO EM PRONTUÁRIO

As informações do atendimento — queixas, prescrições e orientações — serão registradas em prontuário eletrônico farmacêutico, conforme exigido pela Resolução CFF nº 727/2022.

3. COMPARTILHAMENTO DE CONTATO

Seu número de telefone/WhatsApp poderá ser compartilhado com o farmacêutico responsável pela consulta, e vice-versa, durante o período do atendimento. Esse compartilhamento é restrito à finalidade assistencial e não autoriza uso comercial ou não relacionado ao atendimento.

4. LIMITES DO ATENDIMENTO

A orientação farmacêutica remota é adequada para: dúvidas sobre medicamentos, prescrição de MIPs (isentos de prescrição médica), orientações de saúde e acompanhamento farmacoterapêutico.

Não é adequada para: diagnóstico de doenças ou substituição de tratamento médico em curso.

5. TRATAMENTO DE DADOS (LGPD)

Seus dados pessoais e de saúde são tratados com base no art. 11, II, f da Lei nº 13.709/2018 (LGPD) — prestação de serviços de saúde. Serão usados exclusivamente para realização do atendimento, prontuário e obrigações legais.

Você pode acessar, corrigir, exportar e solicitar exclusão de seus dados em "Meu Perfil › Meus dados". Registros clínicos são mantidos pelo prazo legal, desvinculados de dados de contato, mesmo após exclusão da conta.

6. DECLARAÇÃO

Ao aceitar, você confirma: (a) ter lido e compreendido este Termo; (b) ter 18 anos ou ser representado por responsável legal; (c) consentir com o tratamento de dados descrito; (d) autorizar o compartilhamento do seu contato para fins assistenciais; (e) estar ciente dos limites do atendimento remoto.

Este consentimento pode ser revogado a qualquer momento, sem prejuízo da licitude do tratamento já realizado.`;

const TermoConsentimento = ({ onAceito, onFechar }) => {
  const { token } = useAuth();
  const [aceito,   setAceito]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState('');

  const handleConfirmar = async () => {
    if (!aceito) { setErro('Você precisa ler e marcar o checkbox para continuar.'); return; }
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/consent/telefarmacia`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar consentimento.');
      onAceito?.();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          {/* Alerta de rascunho */}
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '6px 10px', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.4 }}>
              <strong>RASCUNHO — pendente validação jurídica.</strong> Este texto ainda não foi revisado por advogada e não deve ser considerado definitivo.
            </p>
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
            Termo de Consentimento para Teleconsulta Farmacêutica
          </h2>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>Versão {VERSAO_TERMO} — necessário uma vez por versão</p>
        </div>

        {/* Texto do termo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          <pre style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
            {TEXTO_TERMO}
          </pre>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => { setAceito(e.target.checked); setErro(''); }}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#7c3aed', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              Li e compreendi o Termo de Consentimento e aceito as condições descritas.
            </span>
          </label>

          {erro && (
            <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
              {erro}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {onFechar && (
              <button
                onClick={onFechar}
                disabled={loading}
                style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#6b7280', background: 'white', cursor: 'pointer' }}
              >
                Agora não
              </button>
            )}
            <button
              onClick={handleConfirmar}
              disabled={loading || !aceito}
              style={{
                flex: 2, padding: '10px 0', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, color: 'white',
                background: aceito ? '#7c3aed' : '#d1d5db',
                cursor: aceito && !loading ? 'pointer' : 'not-allowed',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Registrando...' : 'Aceitar e continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermoConsentimento;
