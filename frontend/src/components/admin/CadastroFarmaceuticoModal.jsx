import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { fmt } from '../../utils/adminFormat';
import { getPharmacistStatus, STATUS_BADGE_CLS, STATUS_BADGE_LABEL } from '../../utils/pharmacistFormat';

// ── Modal: cadastro completo de um farmacêutico (dados já carregados) ────────

const Campo = ({ rotulo, children }) => (
  <div>
    <p className="text-xs font-semibold text-muted uppercase tracking-wide">{rotulo}</p>
    <div className="text-sm text-ink mt-0.5">{children}</div>
  </div>
);

const CadastroFarmaceuticoModal = ({ farmaceutico, onClose, onVerDocumentos, onAtivar }) => {
  const prof         = farmaceutico.pharmacistProfile;
  const status       = getPharmacistStatus(prof);
  const docsEnviados = Boolean(prof?.urlDocIdentidade && prof?.urlDocCrf);
  const tags         = prof?.tags ?? [];

  return (
    <Modal
      title={`Cadastro — ${farmaceutico.name}`}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {docsEnviados ? (
            <button
              onClick={onVerDocumentos}
              className="inline-flex items-center gap-1 text-xs text-brand-deep hover:underline"
            >
              <FileText className="w-3.5 h-3.5" /> Ver documentos
            </button>
          ) : (
            <span className="text-xs text-muted">Documentos não enviados</span>
          )}
          {status.key === 'pendente' && (
            <button
              onClick={onAtivar}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-success hover:bg-success/90 text-white px-3 py-1.5 rounded-lg transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ativar
            </button>
          )}
        </div>
      }
    >
      <div className="px-6 pt-4 pb-6">
        <div className="flex items-center gap-2 flex-wrap -mt-1 mb-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLS[status.key]}`}>
            {STATUS_BADGE_LABEL[status.key]}
          </span>
          <span className="text-xs text-muted">
            {prof?.dataEnvioDoc ? `Docs enviados em ${fmt(prof.dataEnvioDoc)}` : 'Documentos não enviados'}
          </span>
        </div>
        <div className="space-y-4">
          <Campo rotulo="E-mail">{farmaceutico.email}</Campo>
          <Campo rotulo="Telefone / WhatsApp">{farmaceutico.phone || '—'}</Campo>
          <Campo rotulo="CRF">{prof ? `${prof.crfNumber}/${prof.crfUF}` : '—'}</Campo>
          <Campo rotulo="Bio profissional">
            {prof?.bio ? <p className="whitespace-pre-wrap">{prof.bio}</p> : '—'}
          </Campo>
          <Campo rotulo="Áreas de atuação">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep">
                    {tag}
                  </span>
                ))}
              </div>
            ) : '—'}
          </Campo>
          <Campo rotulo="Chave PIX">{prof?.chavePix || '—'}</Campo>
          <Campo rotulo="Documentos">
            {docsEnviados
              ? `RG/CNH ✓ · CRF ✓ · enviados em ${fmt(prof.dataEnvioDoc)}`
              : 'Não enviados'}
          </Campo>
        </div>
      </div>
    </Modal>
  );
};

export default CadastroFarmaceuticoModal;
