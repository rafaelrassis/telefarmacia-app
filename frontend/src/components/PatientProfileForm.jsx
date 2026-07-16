import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GENEROS = ['Masculino', 'Feminino', 'Não-binário', 'Prefiro não informar'];

const maskCPF = (v) =>
  v.replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const maskPhone = (v) =>
  v.replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

const maskCEP = (v) =>
  v.replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');

const PatientProfileForm = ({ onClose, compact = false }) => {
  const { token, refreshUser } = useAuth();

  const [form, setForm] = useState({
    nome_completo: '', data_nascimento: '', genero: '',
    cpf: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '',
    aceite_termos: false,
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const lookupCEP = async (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro:     data.bairro     || prev.bairro,
          cidade:     data.localidade || prev.cidade,
          estado:     data.uf         || prev.estado,
        }));
      }
    } catch {
      // silently ignore ViaCEP failures
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.aceite_termos) {
      setError('Você deve aceitar os termos de uso para continuar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pacientes/perfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar perfil.');
        return;
      }
      setSuccess(true);
      await refreshUser();
      setTimeout(() => onClose?.(), 1200);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-bold text-ink">Perfil salvo com sucesso!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!compact && (
        <div className="mb-1">
          <h2 className="font-heading text-lg font-bold text-ink">Complete seu cadastro</h2>
          <p className="text-sm text-muted mt-0.5">
            Seus dados pessoais e de contato. CPF e data de nascimento não poderão ser alterados depois.
          </p>
        </div>
      )}

      {/* Dados pessoais */}
      <section>
        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Dados pessoais</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Nome completo *</label>
            <input
              type="text"
              value={form.nome_completo}
              onChange={(e) => set('nome_completo', e.target.value)}
              placeholder="Como consta no documento"
              required
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Data de nascimento *</label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={(e) => set('data_nascimento', e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Gênero *</label>
              <select
                value={form.genero}
                onChange={(e) => set('genero', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none bg-canvas"
              >
                <option value="">Selecione</option>
                {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">CPF *</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => set('cpf', maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                required
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Telefone/WhatsApp <span className="font-normal text-muted">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => set('telefone', maskPhone(e.target.value))}
                placeholder="(11) 99999-8888"
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section>
        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">
          Endereço <span className="font-normal normal-case text-muted">(opcional)</span>
        </p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-36">
              <label className="block text-xs font-semibold text-muted mb-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => {
                    const v = maskCEP(e.target.value);
                    set('cep', v);
                    if (v.replace(/\D/g, '').length === 8) lookupCEP(v);
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                  className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
                />
                {cepLoading && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">...</span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted mb-1">Logradouro</label>
              <input
                type="text"
                value={form.logradouro}
                onChange={(e) => set('logradouro', e.target.value)}
                placeholder="Rua, Av., etc."
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Número</label>
              <input
                type="text"
                value={form.numero}
                onChange={(e) => set('numero', e.target.value)}
                placeholder="123"
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">Complemento</label>
              <input
                type="text"
                value={form.complemento}
                onChange={(e) => set('complemento', e.target.value)}
                placeholder="Apto, bloco..."
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-muted mb-1">Bairro</label>
              <input
                type="text"
                value={form.bairro}
                onChange={(e) => set('bairro', e.target.value)}
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-muted mb-1">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => set('cidade', e.target.value)}
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">UF</label>
              <input
                type="text"
                value={form.estado}
                onChange={(e) => set('estado', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Termos LGPD */}
      <label className="flex items-start gap-3 p-3 border border-line rounded-lg cursor-pointer hover:bg-surface transition">
        <input
          type="checkbox"
          checked={form.aceite_termos}
          onChange={(e) => set('aceite_termos', e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-brand shrink-0"
        />
        <span className="text-xs text-muted leading-relaxed">
          Li e aceito os{' '}
          <span className="text-brand-deep font-semibold">Termos de Uso e Política de Privacidade</span>.
          Autorizo o uso dos meus dados pessoais conforme a{' '}
          <span className="font-semibold">LGPD (Lei 13.709/2018)</span> para fins de atendimento farmacêutico.
        </span>
      </label>

      {error && (
        <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold text-muted hover:bg-surface transition"
          >
            Agora não
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-brand hover:bg-brand-deep disabled:opacity-50 text-brand-contrast font-bold py-2.5 rounded-xl transition text-sm"
        >
          {loading ? 'Salvando...' : 'Salvar cadastro'}
        </button>
      </div>
    </form>
  );
};

export default PatientProfileForm;
