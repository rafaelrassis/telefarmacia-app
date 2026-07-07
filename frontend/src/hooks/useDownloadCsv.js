// Download de CSV autenticado — reaproveitado por Financeiro e Repasses.
export function useDownloadCsv(api, showToast) {
  return async (path, filename) => {
    try {
      const res = await api(path);
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        showToast('error', 'Erro ao exportar CSV.');
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    }
  };
}
