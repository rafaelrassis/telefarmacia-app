import React from 'react';

const VARIANTS = {
  success: 'bg-success-wash text-success',
  error:   'bg-error-wash text-error',
  alert:   'bg-alert-wash text-alert',
};

/**
 * Toast fixo no canto da tela, sistema de design (Fase 1). Componente
 * apenas visual — cada área mantém seu próprio hook de exibir/esconder
 * (useToast, usePharmacistToast, etc.) até adotar este visual na Fase 2+.
 */
const Toast = ({ variant = 'success', children }) => (
  <div
    role="status"
    className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-md text-sm font-medium ${VARIANTS[variant]}`}
  >
    {children}
  </div>
);

export default Toast;
