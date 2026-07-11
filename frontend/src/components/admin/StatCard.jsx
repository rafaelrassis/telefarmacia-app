import React from 'react';

const StatCard = ({ value, label, sub, color = 'text-ink' }) => (
  <div className="bg-canvas border border-line rounded-xl p-5">
    <p className={`text-3xl font-heading font-bold ${color}`}>{value ?? '—'}</p>
    <p className="text-sm font-medium text-ink mt-1">{label}</p>
    {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
  </div>
);

export default StatCard;
