import React from 'react';

const getPageNums = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page]);
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) pages.add(i);
  return [...pages].sort((a, b) => a - b);
};

const Paginacao = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-1 pt-1">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-2.5 py-1 text-xs font-medium border border-line rounded-lg bg-canvas text-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >←</button>
      {getPageNums(page, totalPages).map((n, i, arr) => (
        <React.Fragment key={n}>
          {i > 0 && arr[i - 1] !== n - 1 && (
            <span className="text-muted text-xs px-0.5">…</span>
          )}
          <button
            onClick={() => onPageChange(n)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
              n === page
                ? 'border-none bg-brand text-brand-contrast'
                : 'border border-line bg-canvas text-ink'
            }`}
          >{n}</button>
        </React.Fragment>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-2.5 py-1 text-xs font-medium border border-line rounded-lg bg-canvas text-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >→</button>
    </div>
  );
};

export default Paginacao;
