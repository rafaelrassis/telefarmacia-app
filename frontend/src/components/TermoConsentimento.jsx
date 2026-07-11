import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from './ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// RASCUNHO — texto aguardando validação jurídica (ver especificacoes/termo-telefarmacia-v1.0.md)
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
    <Modal
      onClose={onFechar}
      closeOnBackdrop={Boolean(onFechar)}
      maxWidth="max-w-lg"
      footer={(
        <>
          <label className="flex items-start gap-2.5 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => { setAceito(e.target.checked); setErro(''); }}
              className="mt-0.5 w-4 h-4 accent-brand shrink-0"
            />
            <span className="text-[13px] text-ink leading-relaxed">
              Li e compreendi o Termo de Consentimento e aceito as condições descritas.
            </span>
          </label>

          {erro && (
            <p className="text-xs text-error bg-error-wash rounded-md px-2.5 py-1.5 mb-2.5">
              {erro}
            </p>
          )}

          <div className="flex gap-2">
            {onFechar && (
              <button
                onClick={onFechar}
                disabled={loading}
                className="flex-1 py-2.5 border border-line rounded-xl text-[13px] font-semibold text-muted bg-canvas disabled:opacity-60"
              >
                Agora não
              </button>
            )}
            <button
              onClick={handleConfirmar}
              disabled={loading || !aceito}
              className={`flex-[2] py-2.5 rounded-xl text-[13px] font-bold text-white ${aceito ? 'bg-brand' : 'bg-line'} ${
                aceito && !loading ? '' : 'cursor-not-allowed'
              } disabled:opacity-70`}
            >
              {loading ? 'Registrando...' : 'Aceitar e continuar'}
            </button>
          </div>
        </>
      )}
    >
      <div className="px-6 pt-4 pb-1">
        <div className="flex items-start gap-1.5 bg-alert-wash border border-alert/30 rounded-lg px-2.5 py-1.5 mb-2.5">
          <TriangleAlert className="w-3.5 h-3.5 text-alert shrink-0 mt-0.5" />
          <p className="text-[11px] text-alert leading-snug m-0">
            <strong>RASCUNHO — pendente validação jurídica.</strong> Este texto ainda não foi revisado por advogada e não deve ser considerado definitivo.
          </p>
        </div>
        <h2 className="text-[15px] font-heading font-bold text-ink m-0">
          Termo de Consentimento para Teleconsulta Farmacêutica
        </h2>
        <p className="text-[11px] text-muted mt-0.5">Versão {VERSAO_TERMO} — necessário uma vez por versão</p>
      </div>

      <div className="px-6 pb-4">
        <pre className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-body m-0">
          {TEXTO_TERMO}
        </pre>
      </div>
    </Modal>
  );
};

export default TermoConsentimento;
