import React from 'react';
import { useConvitesAdmin } from '../../hooks/useConvitesAdmin';

const ConvitesTab = ({ api, showToast }) => {
  const {
    convites, convitesLoading, conviteForm, setConviteForm,
    conviteNome, setConviteNome, conviteEmail, setConviteEmail,
    conviteErr, savingConvite, conviteLink, setConviteLink,
    handleCriarConvite, handleRevogarConvite,
  } = useConvitesAdmin(api, showToast);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Convidar farmacêutico</h3>
            <p className="text-xs text-gray-400 mt-0.5">O link de convite é válido por 7 dias.</p>
          </div>
          {!conviteForm && (
            <button
              onClick={() => { setConviteForm({}); setConviteNome(''); setConviteEmail(''); setConviteLink(null); }}
              className="bg-brand hover:bg-brand-deep text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              + Novo convite
            </button>
          )}
        </div>

        {conviteForm !== null && (
          <form onSubmit={handleCriarConvite} className="border border-brand/20 rounded-xl p-4 bg-brand-wash space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-brand-deep mb-1">Nome completo</label>
                <input type="text" value={conviteNome} onChange={(e) => setConviteNome(e.target.value)}
                  placeholder="Dra. Fulana da Silva"
                  className="w-full border border-brand/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-deep mb-1">E-mail</label>
                <input type="email" value={conviteEmail} onChange={(e) => setConviteEmail(e.target.value)}
                  placeholder="farmaceutico@exemplo.com"
                  className="w-full border border-brand/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
            </div>
            {conviteErr && <p className="text-xs text-red-600">{conviteErr}</p>}
            {conviteLink && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-1">✓ Convite criado! Copie o link:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white border border-green-200 rounded px-2 py-1 flex-1 truncate">
                    {window.location.origin}{conviteLink}
                  </code>
                  <button type="button"
                    onClick={() => navigator.clipboard.writeText(window.location.origin + conviteLink)}
                    className="text-xs text-green-700 border border-green-300 rounded-lg px-2 py-1 hover:bg-green-100 transition shrink-0"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setConviteForm(null); setConviteLink(null); }}
                className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition">
                Fechar
              </button>
              <button type="submit" disabled={savingConvite}
                className="text-sm font-bold bg-brand hover:bg-brand-deep text-white px-5 py-2 rounded-xl transition disabled:opacity-50">
                {savingConvite ? 'Enviando...' : 'Gerar convite'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lista de convites */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">Convites enviados</h3>
        </div>
        {convitesLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
        ) : convites.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 italic">Nenhum convite enviado.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {convites.map((c) => {
              const expired = new Date(c.expiresAt) < new Date();
              const status  = c.usado ? 'usado' : expired ? 'expirado' : 'pendente';
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Expira em {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'usado'     ? 'bg-green-100 text-green-700'
                      : status === 'expirado' ? 'bg-gray-100 text-gray-500'
                      :                        'bg-amber-100 text-amber-700'
                    }`}>
                      {status === 'usado' ? '✓ Usado' : status === 'expirado' ? 'Expirado' : '⏳ Pendente'}
                    </span>
                    {status === 'pendente' && (
                      <>
                        <button
                          onClick={() => navigator.clipboard.writeText(window.location.origin + '/convite/' + c.token)}
                          className="text-xs text-brand-deep border border-brand/30 rounded-lg px-2 py-1 hover:bg-brand-wash transition"
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => handleRevogarConvite(c.id)}
                          className="text-xs text-red-500 border border-red-100 rounded-lg px-2 py-1 hover:bg-red-50 transition"
                        >
                          Revogar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvitesTab;
