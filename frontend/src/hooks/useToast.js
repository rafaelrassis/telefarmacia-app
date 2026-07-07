import { useState } from 'react';

// Toast simples com auto-dismiss em 4s — padrão repetido em vários dashboards.
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  return { toast, showToast };
}
