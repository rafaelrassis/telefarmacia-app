import React from 'react';

const RadioGroup = ({ name, options, value, onChange, error }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {options.map(([val, label]) => (
      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
        <input
          type="radio" name={name} value={val} checked={value === val}
          onChange={() => onChange(val)}
          style={{ accentColor: error && !value ? '#ef4444' : '#2563eb', width: 16, height: 16, cursor: 'pointer' }}
        />
        {label}
      </label>
    ))}
  </div>
);

export default RadioGroup;
