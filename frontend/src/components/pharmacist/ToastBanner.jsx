import React from 'react';

// Toast inline dentro do painel (não o Toast fixo de ui/Toast.jsx, que é um
// overlay singleton — aqui pode haver mais de um painel exibindo toast ao
// mesmo tempo, então mantemos o posicionamento em fluxo, só com os tokens).
const VARIANTS = {
  success: 'bg-success-wash text-success border-success/30',
  error:   'bg-error-wash text-error border-error/30',
  warn:    'bg-alert-wash text-alert border-alert/30',
};

const ToastBanner = ({ toast }) => {
  if (!toast) return null;
  return (
    <div role="status" className={`px-4 py-3 rounded-xl text-sm font-medium border ${VARIANTS[toast.type] ?? VARIANTS.error}`}>
      {toast.text}
    </div>
  );
};

export default ToastBanner;
