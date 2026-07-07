import React from 'react';

const StatCard = ({ value, label, sub, color = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default StatCard;
