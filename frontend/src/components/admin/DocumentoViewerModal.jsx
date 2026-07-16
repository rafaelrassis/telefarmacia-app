import React, { useState, useEffect } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const FETCH_TIMEOUT_MS = 8000;

const EXT_BY_TYPE = {
  'image/jpeg':     'jpg',
  'image/png':      'png',
  'application/pdf': 'pdf',
};

const DOC_TABS = [
  { key: 'identidade', label: 'RG/CNH', urlKey: 'urlDocIdentidade' },
  { key: 'crf',         label: 'CRF',    urlKey: 'urlDocCrf' },
];

// Fetch autenticado → blob URL, com timeout e cleanup (mesmo padrão do ReceitaViewer).
const useAuthedBlob = (urlPath, token, reloadKey) => {
  const [state, setState] = useState({ status: urlPath ? 'loading' : 'empty', blobUrl: null, blobType: null });

  useEffect(() => {
    if (!urlPath) { setState({ status: 'empty', blobUrl: null, blobType: null }); return; }

    let alive = true;
    let blobUrl = null;
    setState({ status: 'loading', blobUrl: null, blobType: null });

    const timeout = setTimeout(() => {
      if (alive) setState({ status: 'error', blobUrl: null, blobType: null });
    }, FETCH_TIMEOUT_MS);

    fetch(`${API_URL}${urlPath}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        if (!alive) return;
        clearTimeout(timeout);
        blobUrl = URL.createObjectURL(blob);
        setState({ status: 'ok', blobUrl, blobType: blob.type });
      })
      .catch(() => {
        if (!alive) return;
        clearTimeout(timeout);
        setState({ status: 'error', blobUrl: null, blobType: null });
      });

    return () => {
      alive = false;
      clearTimeout(timeout);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [urlPath, token, reloadKey]);

  return state;
};

const DocumentoViewerModal = ({ farmaceutico, onClose }) => {
  const { token } = useAuth();
  const prof = farmaceutico?.pharmacistProfile;

  const [activeTab, setActiveTab] = useState('identidade');
  const [reloadIdentidade, setReloadIdentidade] = useState(0);
  const [reloadCrf, setReloadCrf] = useState(0);

  const identidade = useAuthedBlob(prof?.urlDocIdentidade, token, reloadIdentidade);
  const crf         = useAuthedBlob(prof?.urlDocCrf, token, reloadCrf);

  const docs  = { identidade, crf };
  const retry = { identidade: () => setReloadIdentidade((n) => n + 1), crf: () => setReloadCrf((n) => n + 1) };

  const activeDoc  = docs[activeTab];
  const activeMeta = DOC_TABS.find((t) => t.key === activeTab);
  const activeExt  = EXT_BY_TYPE[activeDoc.blobType] || '';

  return (
    <Modal title="Documentos do farmacêutico" onClose={onClose} maxWidth="max-w-2xl">
      <div className="px-6 pt-4 pb-6">
        <p className="text-xs text-muted -mt-2 mb-4">{farmaceutico?.name} — {farmaceutico?.email}</p>

        <div className="flex gap-2 mb-4">
          {DOC_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === key ? 'bg-brand-deep text-white' : 'bg-surface text-muted hover:bg-line'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border border-line rounded-xl bg-surface min-h-[320px] flex items-center justify-center overflow-hidden">
          {activeDoc.status === 'loading' && (
            <div className="flex flex-col items-center gap-2 py-16">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted">Carregando documento...</p>
            </div>
          )}

          {activeDoc.status === 'empty' && (
            <p className="text-sm text-muted py-16">Documento não enviado.</p>
          )}

          {activeDoc.status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-16">
              <p className="text-sm text-error">Não foi possível carregar o documento.</p>
              <button
                onClick={() => retry[activeTab]()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-deep hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
              </button>
            </div>
          )}

          {activeDoc.status === 'ok' && activeDoc.blobType?.startsWith('image/') && (
            <img src={activeDoc.blobUrl} alt={activeMeta.label} className="max-h-[60vh] w-auto object-contain" />
          )}

          {activeDoc.status === 'ok' && activeDoc.blobType === 'application/pdf' && (
            <iframe src={activeDoc.blobUrl} title={activeMeta.label} className="w-full h-[60vh] border-none" />
          )}

          {activeDoc.status === 'ok' && !activeDoc.blobType?.startsWith('image/') && activeDoc.blobType !== 'application/pdf' && (
            <p className="text-sm text-muted py-16">Tipo de arquivo não suportado para pré-visualização.</p>
          )}
        </div>

        {activeDoc.status === 'ok' && (
          <a
            href={activeDoc.blobUrl}
            download={`${activeTab}-${farmaceutico?.id}${activeExt ? `.${activeExt}` : ''}`}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-brand-deep hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Baixar {activeMeta.label}
          </a>
        )}
      </div>
    </Modal>
  );
};

export default DocumentoViewerModal;
