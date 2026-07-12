import React from 'react';

const RadioGroup = ({ name, options, value, onChange, error }) => (
  <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={name}>
    {options.map(([val, label]) => {
      const selected = value === val;
      return (
        <button
          key={val}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(val)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
            selected
              ? 'border-brand bg-brand-wash text-brand-deep'
              : error && !value
                ? 'border-error/40 bg-canvas text-muted'
                : 'border-line bg-canvas text-muted hover:border-brand/40'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default RadioGroup;
