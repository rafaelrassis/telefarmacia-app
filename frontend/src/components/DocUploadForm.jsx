import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const FileInput = ({ label, name, accept, file, onChange }) => {
  const ref = useRef();
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1.5">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
          file
            ? 'border-brand bg-brand-wash'
            : 'border-line hover:border-brand/60 bg-surface'
        }`}
      >
        {file
          ? <FileText className="w-5 h-5 text-brand-deep shrink-0" strokeWidth={2} />
          : <Upload className="w-5 h-5 text-muted shrink-0" strokeWidth={2} />}
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${file ? 'text-brand-deep' : 'text-muted'}`}>
            {file ? file.name : 'Clique para selecionar'}
          </p>
          <p className="text-xs text-muted">JPG, PNG ou PDF · máx. 5MB</p>
        </div>
        {file && (
          <span className="ml-auto flex items-center gap-1 text-xs text-brand-deep font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Selecionado
          </span>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
    </div>
  );
};

const DocUploadForm = ({ onSuccess }) => {
  const { token } = useAuth();
  const [rgFile, setRgFile]   = useState(null);
  const [crfFile, setCrfFile] = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!rgFile)  { setError('O documento de identidade (RG/CNH) é obrigatório.'); return; }
    if (!crfFile) { setError('A foto da carteira do CRF é obrigatória.'); return; }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('foto_rg_cnh', rgFile);
      form.append('foto_crf',    crfFile);

      const res = await fetch(`${API_URL}/api/farmaceuticos/cadastro`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao enviar documentos.');
        return;
      }
      onSuccess?.();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-heading font-bold text-ink text-sm mb-1">Enviar documentos para ativação</h3>
        <p className="text-xs text-muted">
          Após o envio, um administrador irá analisar os documentos e ativar seu cadastro.
        </p>
      </div>

      <FileInput
        label="RG ou CNH (frente)"
        name="foto_rg_cnh"
        accept="image/jpeg,image/png,application/pdf"
        file={rgFile}
        onChange={setRgFile}
      />

      <FileInput
        label="Carteira do CRF"
        name="foto_crf"
        accept="image/jpeg,image/png,application/pdf"
        file={crfFile}
        onChange={setCrfFile}
      />

      {error && (
        <p role="alert" className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !rgFile || !crfFile}
        className="w-full bg-brand hover:bg-brand-deep disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition text-sm"
      >
        {loading ? 'Enviando...' : 'Enviar documentos'}
      </button>
    </form>
  );
};

export default DocUploadForm;
