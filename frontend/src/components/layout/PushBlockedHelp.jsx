import React from 'react';
import { Link } from 'react-router-dom';

// Push bloqueado é permissão do navegador — não dá pra reverter via JS,
// só orientar o usuário a desbloquear manualmente nas configurações do site.
function detectarGuia() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const isIOS     = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari  = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  const isChrome  = /Chrome|CriOS/.test(ua) && !/Edg|OPR/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isEdge    = /Edg/.test(ua);

  if (isIOS && isSafari) {
    return {
      nome: 'Safari (iPhone/iPad)',
      passos: [
        'No iOS, notificações só funcionam com o app instalado na Tela de Início — não pela aba do Safari.',
        'Toque em Compartilhar (ícone de quadrado com seta) e depois em "Adicionar à Tela de Início".',
        'Abra o app pelo ícone na Tela de Início e permita as notificações quando solicitado.',
        'Já negou antes? Vá em Ajustes → Notificações → FarmaConsulta e ative "Permitir Notificações".',
      ],
    };
  }

  if (isAndroid && isChrome) {
    return {
      nome: 'Chrome (Android)',
      passos: [
        'Toque no ícone de cadeado/informações à esquerda do endereço do site (não é o menu ⋮).',
        'Toque em "Permissões".',
        'Encontre "Notificações" e selecione "Permitir".',
      ],
    };
  }

  if (isFirefox) {
    return {
      nome: 'Firefox',
      passos: [
        'Clique no ícone de cadeado ao lado do endereço do site.',
        'Clique na seta ao lado de "Enviar notificações".',
        'Selecione "Permitir".',
        'Recarregue a página.',
      ],
    };
  }

  if (isEdge) {
    return {
      nome: 'Edge',
      passos: [
        'Clique no ícone de cadeado ao lado do endereço do site.',
        'Clique em "Permissões do site".',
        'Encontre "Notificações" e selecione "Permitir".',
        'Recarregue a página.',
      ],
    };
  }

  if (isChrome) {
    return {
      nome: 'Chrome (computador)',
      passos: [
        'Clique no ícone de cadeado ao lado do endereço do site.',
        'Clique em "Permissões do site".',
        'Mude "Notificações" de "Bloqueado" para "Permitir".',
        'Recarregue a página.',
      ],
    };
  }

  if (isIOS) {
    return {
      nome: null,
      passos: [
        'No iOS, notificações só funcionam com o app instalado na Tela de Início — não pelo navegador.',
        'No navegador, toque em Compartilhar e depois em "Adicionar à Tela de Início".',
        'Abra o app pelo ícone na Tela de Início e permita as notificações quando solicitado.',
        'Já negou antes? Vá em Ajustes → Notificações → FarmaConsulta e ative "Permitir Notificações".',
      ],
    };
  }

  return {
    nome: null,
    passos: [
      'Toque no cadeado (ou ícone de ajustes) ao lado do endereço do site.',
      'Procure por "Notificações" nas permissões do site.',
      'Mude a opção para "Permitir".',
      'Recarregue a página.',
    ],
  };
}

const PushBlockedHelp = ({ onRetry, retrying }) => {
  const guia = detectarGuia();

  return (
    <div className="mt-1.5 rounded-lg border border-line bg-surface p-2.5 space-y-1.5">
      <p className="text-[11px] text-error font-medium">Bloqueado nas configurações do navegador</p>
      <p className="text-[11px] text-ink font-semibold">
        {guia.nome ? `Como desbloquear no ${guia.nome}:` : 'Como desbloquear:'}
      </p>
      <ol className="text-[11px] text-muted list-decimal list-inside space-y-0.5">
        {guia.passos.map((passo, i) => (
          <li key={i}>{passo}</li>
        ))}
      </ol>
      <div className="flex items-center gap-3 pt-0.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="text-[11px] font-semibold text-brand-deep hover:text-brand disabled:opacity-50 transition"
          >
            {retrying ? 'Verificando…' : 'Já desbloqueei, tentar de novo'}
          </button>
        )}
        <Link
          to="/ajuda/notificacoes"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-muted hover:text-brand-deep transition"
        >
          Ver instruções completas
        </Link>
      </div>
    </div>
  );
};

export default PushBlockedHelp;
