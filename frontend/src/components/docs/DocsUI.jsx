import React from 'react';

export const Secao = ({ id, titulo, children }) => (
  <section id={id} className="scroll-mt-24 mb-12">
    <h2 className="font-heading text-xl font-bold text-ink mb-4 pb-2 border-b border-line">{titulo}</h2>
    <div className="space-y-4 text-[15px] text-ink leading-relaxed">{children}</div>
  </section>
);

export const Tabela = ({ cabecalho, linhas }) => (
  <div className="overflow-x-auto rounded-xl border border-line">
    <table className="w-full text-sm">
      <thead className="bg-surface">
        <tr>
          {cabecalho.map((c) => (
            <th key={c} className="text-left font-semibold text-ink px-3 py-2 border-b border-line whitespace-nowrap">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l, i) => (
          <tr key={i} className="border-b border-line last:border-0 align-top">
            {l.map((c, j) => (
              <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-ink whitespace-nowrap' : 'text-muted'}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Code = ({ children }) => (
  <code className="text-[13px] bg-brand-wash text-brand-deep px-1.5 py-0.5 rounded">{children}</code>
);
