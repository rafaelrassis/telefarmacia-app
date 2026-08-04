import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Lock } from 'lucide-react';

const PASSOS = [
  {
    titulo: 'No Chrome (Android)',
    itens: [
      'Toque no ícone de cadeado/informações à esquerda do endereço do site (não é o menu ⋮)',
      'Toque em "Permissões"',
      'Encontre "Notificações" e selecione "Permitir"',
    ],
  },
  {
    titulo: 'No Safari (iPhone/iPad)',
    nota: 'No iOS, notificações push só funcionam com o app instalado na Tela de Início — não funcionam pela aba do Safari (requer iOS 16.4 ou mais recente).',
    itens: [
      'Toque em Compartilhar (ícone de quadrado com seta) e depois em "Adicionar à Tela de Início"',
      'Abra o FarmaConsulta pelo ícone criado na Tela de Início (não pelo Safari)',
      'Permita as notificações quando o app solicitar',
      'Já negou antes? Vá em Ajustes → Notificações → FarmaConsulta e ative "Permitir Notificações"',
    ],
  },
  {
    titulo: 'No computador (Chrome/Edge)',
    itens: [
      'Clique no ícone de cadeado/informações ao lado da URL',
      'Clique em "Permissões do site"',
      'Encontre "Notificações" e mude para "Permitir"',
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
              {passo.nota && (
                <p className="text-xs text-muted italic mb-1.5">{passo.nota}</p>
              )}
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
