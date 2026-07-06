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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, paddingTop: 4 }}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{
          padding: '5px 10px', fontSize: 12, fontWeight: 500,
          border: '1px solid #e5e7eb', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer',
          background: '#fff', color: '#6b7280', opacity: page === 1 ? 0.4 : 1,
        }}
      >←</button>
      {getPageNums(page, totalPages).map((n, i, arr) => (
        <React.Fragment key={n}>
          {i > 0 && arr[i - 1] !== n - 1 && (
            <span style={{ color: '#d1d5db', fontSize: 12, padding: '0 2px' }}>…</span>
          )}
          <button
            onClick={() => onPageChange(n)}
            style={{
              padding: '5px 10px', fontSize: 12, fontWeight: 600,
              border: n === page ? 'none' : '1px solid #e5e7eb',
              borderRadius: 8, cursor: 'pointer',
              background: n === page ? '#7c3aed' : '#fff',
              color: n === page ? '#fff' : '#374151',
            }}
          >{n}</button>
        </React.Fragment>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{
          padding: '5px 10px', fontSize: 12, fontWeight: 500,
          border: '1px solid #e5e7eb', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer',
          background: '#fff', color: '#6b7280', opacity: page === totalPages ? 0.4 : 1,
        }}
      >→</button>
    </div>
  );
};

export default Paginacao;
