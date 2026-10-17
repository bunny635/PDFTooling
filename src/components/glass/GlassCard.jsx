import React from 'react';

/**
 * GlassCard - G1 subtle translucent container with accessible borders and lighting.
 * 
 * Can be made interactive with hover micro-elevation.
 */
export default function GlassCard({
  as: Component = 'div',
  children,
  interactive = false,
  padding = 'md',
  className = '',
  ...rest
}) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4 sm:p-5',
    md: 'p-6 sm:p-8',
    lg: 'p-8 sm:p-10',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg focus-within:ring-2 focus-within:ring-accent active:translate-y-0'
    : '';

  return (
    <Component
      className={`glass-panel ${paddingStyles[padding] || paddingStyles.md} ${interactiveStyles} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
