import React from 'react';
import { Plus, Copy, CircleCheck, Clock, Ban } from 'lucide-react';
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
      <div className="bg-canvas border border-line rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-ink text-sm">Convidar farmacêutico</h3>
            <p className="text-xs text-muted mt-0.5">O link de convite é válido por 7 dias.</p>
          </div>
          {!conviteForm && (
            <button
              onClick={() => { setConviteForm({}); setConviteNome(''); setConviteEmail(''); setConviteLink(null); }}
              className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo convite
            </button>
          )}
        </div>

        {conviteForm !== null && (
          <form onSubmit={handleCriarConvite} className="border border-brand/20 rounded-xl p-4 bg-brand-wash space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="convite-nome" className="block text-xs font-semibold text-brand-deep mb-1">Nome completo</label>
                <input id="convite-nome" type="text" value={conviteNome} onChange={(e) => setConviteNome(e.target.value)}
                  placeholder="Dra. Fulana da Silva"
                  className="w-full border border-brand/30 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand bg-canvas" />
              </div>
              <div>
                <label htmlFor="convite-email" className="block text-xs font-semibold text-brand-deep mb-1">E-mail</label>
                <input id="convite-email" type="email" value={conviteEmail} onChange={(e) => setConviteEmail(e.target.value)}
                  placeholder="farmaceutico@exemplo.com"
                  className="w-full border border-brand/30 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand bg-canvas" />
              </div>
            </div>
            {conviteErr && <p role="alert" className="text-xs text-error">{conviteErr}</p>}
            {conviteLink && (
              <div className="bg-success-wash border border-success/30 rounded-xl p-3">
                <p className="text-xs font-semibold text-success mb-1 inline-flex items-center gap-1">
                  <CircleCheck className="w-3.5 h-3.5" />
                  Convite criado! Copie o link:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-canvas border border-success/30 rounded px-2 py-1 flex-1 truncate text-ink">
                    {window.location.origin}{conviteLink}
                  </code>
                  <button type="button"
                    onClick={() => navigator.clipboard.writeText(window.location.origin + conviteLink)}
                    className="inline-flex items-center gap-1 text-xs text-success border border-success/40 rounded-lg px-2 py-1 hover:bg-success-wash transition shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setConviteForm(null); setConviteLink(null); }}
                className="text-sm text-muted border border-line rounded-xl px-4 py-2 hover:bg-surface transition">
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
      <div className="bg-canvas border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="font-bold text-ink text-sm">Convites enviados</h3>
        </div>
        {convitesLoading ? (
          <p className="text-sm text-muted text-center py-8">Carregando...</p>
        ) : convites.length === 0 ? (
          <p className="text-sm text-muted text-center py-8 italic">Nenhum convite enviado.</p>
        ) : (
          <div className="divide-y divide-line">
            {convites.map((c) => {
              const expired = new Date(c.expiresAt) < new Date();
              const status  = c.usado ? 'usado' : expired ? 'expirado' : 'pendente';
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{c.nome}</p>
                    <p className="text-xs text-muted">{c.email}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Expira em {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      status === 'usado'     ? 'bg-success-wash text-success'
                      : status === 'expirado' ? 'bg-surface text-muted'
                      :                        'bg-alert-wash text-alert'
                    }`}>
                      {status === 'usado' ? <CircleCheck className="w-3 h-3" /> : status === 'expirado' ? <Ban className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {status === 'usado' ? 'Usado' : status === 'expirado' ? 'Expirado' : 'Pendente'}
                    </span>
                    {status === 'pendente' && (
                      <>
                        <button
                          onClick={() => navigator.clipboard.writeText(window.location.origin + '/convite/' + c.token)}
                          className="inline-flex items-center gap-1 text-xs text-brand-deep border border-brand/30 rounded-lg px-2 py-1 hover:bg-brand-wash transition"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar link
                        </button>
                        <button
                          onClick={() => handleRevogarConvite(c.id)}
                          className="text-xs text-error border border-error/30 rounded-lg px-2 py-1 hover:bg-error-wash transition"
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
