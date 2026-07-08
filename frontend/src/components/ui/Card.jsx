import React from 'react';

/**
 * Container base do sistema de design (Fase 1).
 */
const Card = ({ as: As = 'div', className = '', children, ...rest }) => (
  <As
    className={`bg-canvas border border-line rounded-2xl shadow-sm ${className}`}
    {...rest}
  >
    {children}
  </As>
);

export default Card;
