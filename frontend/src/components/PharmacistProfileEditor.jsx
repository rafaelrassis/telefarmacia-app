import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ALL_TAGS = [
  'Dosagem Infantil',
  'Sintomas Leves',
  'Interação Medicamentosa',
  'Acompanhamento Crônico',
  'Dermatologia',
  'Nutrição e Suplementos',
];

const PharmacistProfileEditor = () => {
  const { user, token, login } = useAuth();
  const profile = user?.pharmacistProfile;

  const [bio,      setBio]      = useState(profile?.bio      || '');
  const [tags,     setTags]     = useState(profile?.tags     || []);
  const [chavePix, setChavePix] = useState(profile?.chavePix || '');
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState(null);

  const toggleTag = (tag) =>
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/pharmacists/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bio, tags, chavePix: chavePix.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        login(token, { ...user, pharmacistProfile: data.profile });
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      {/* Dados do CRF */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Dados do CRF</p>
        <p className="text-sm text-gray-700">CRF: <strong>{profile?.crfNumber}/{profile?.crfUF}</strong></p>
        <p className="text-xs text-gray-400 mt-1">Para alterar o CRF, entre em contato com o suporte.</p>
      </div>

      {/* Chave PIX */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chave PIX para repasses</label>
        <input
          type="text"
          value={chavePix}
          onChange={(e) => setChavePix(e.target.value)}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Usada pelo administrador para processar pagamentos de comissões.
        </p>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Apresentação</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Descreva sua especialização e como pode ajudar os pacientes..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Áreas de atendimento</label>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                tags.includes(tag)
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className={`text-sm px-4 py-2.5 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-violet-700 hover:bg-violet-800 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
      >
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </div>
  );
};

export default PharmacistProfileEditor;
