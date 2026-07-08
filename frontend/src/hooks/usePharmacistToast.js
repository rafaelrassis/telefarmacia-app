import { useState, useCallback } from 'react';

// Toast local (tupla), distinto do hooks/useToast.js (usado pelo AdminPanel,
// que retorna { toast, showToast }) — mantém a mesma API do hook original
// deste dashboard para não alterar nenhum call-site.
export const usePharmacistToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return [toast, show];
};
