import { useState, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useWallet(token) {
  const [walletBalance, setWalletBalance] = useState(null);

  const fetchWalletBalance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/carteira/saldo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.saldo_disponivel ?? 0);
      }
    } catch {}
  }, [token]);

  useEffect(() => { fetchWalletBalance(); }, [fetchWalletBalance]);

  return { walletBalance, setWalletBalance, fetchWalletBalance };
}
