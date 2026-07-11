import React, { useState } from 'react';
import LogsPanel from './LogsPanel';
import AuditPanel from './AuditPanel';

// ── Aba "Logs" com sub-abas: Consultas / Ações admin ─────────────────────────

const LogsTabContainer = ({ api, pharmacists, patients }) => {
  const [subTab, setSubTab] = useState('consultas');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-line">
        {[{ id: 'consultas', label: 'Consultas' }, { id: 'admin', label: 'Ações admin' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              subTab === t.id ? 'border-brand text-brand-deep' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'consultas' && <LogsPanel api={api} pharmacists={pharmacists} patients={patients} />}
      {subTab === 'admin' && <AuditPanel api={api} />}
    </div>
  );
};

export default LogsTabContainer;
