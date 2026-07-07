import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Fetch autenticado — injeta o Bearer token e Content-Type JSON por padrão.
// Reaproveitado por todas as abas que fazem chamadas à API admin.
export function useAuthedFetch(token) {
  return useCallback(
    (path, opts = {}) =>
      fetch(`${API_URL}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
      }),
    [token]
  );
}
