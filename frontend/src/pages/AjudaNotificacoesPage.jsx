import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Lock } from 'lucide-react';

const PASSOS = [
  {
    titulo: 'No Chrome (Android)',
    itens: [
      'Toque no ícone de cadeado/informações ao lado do endereço do site',
      'Toque em "Permissões" ou "Notificações"',
      'Selecione "Permitir"',
      'Recarregue a página',
    ],
  },
  {
    titulo: 'No Safari (iPhone)',
    itens: [
      'Ajustes do iPhone → Safari → Configurações de Sites → Notificações',
      'Encontre o site do FarmaConsulta e permita',
    ],
  },
  {
    titulo: 'No computador (Chrome/Edge)',
    itens: [
      'Clique no cadeado ao lado da URL',
      'Notificações → Permitir',
      'Recarregue a página',
    ],
  },
];

const AjudaNotificacoesPage = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-brand-wash via-canvas to-brand-wash px-4 py-12">
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-brand-wash border border-brand/20 flex items-center justify-center mx-auto mb-3">
          <Bell className="w-6 h-6 text-brand-deep" />
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          Como ativar as notificações do FarmaConsulta
        </h1>
      </div>

      <div className="bg-surface rounded-2xl shadow-xl shadow-brand-wash border border-brand/20 p-8">
        <p className="flex gap-2 text-sm text-ink leading-relaxed mb-6">
          <Lock className="w-4 h-4 text-muted shrink-0 mt-0.5" />
          <span>
            Você bloqueou as notificações do app no navegador. Para receber avisos de atendimento
            em tempo real, é preciso desbloquear manualmente — não tem como o app fazer isso
            sozinho, é uma proteção do próprio navegador.
          </span>
        </p>

        <div className="space-y-5">
          {PASSOS.map((passo) => (
            <div key={passo.titulo}>
              <p className="text-sm font-bold text-ink mb-1.5">{passo.titulo}</p>
              <ol className="list-decimal list-inside space-y-0.5 text-sm text-muted">
                {passo.itens.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <p className="mt-6 pt-6 border-t border-line text-sm text-ink">
          Depois de desbloquear, volte ao app e ative o toggle de notificações push no sininho.
        </p>
      </div>

      <div className="text-center mt-4">
        <Link to="/" className="text-sm text-muted hover:text-brand-deep transition">
          ← Voltar para a página inicial
        </Link>
      </div>
    </div>
  </div>
);

export default AjudaNotificacoesPage;
