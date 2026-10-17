import React from 'react';

/**
 * GlassBadge - Small translucent status and category indicators using glass-pill styling.
 */
export default function GlassBadge({
  children,
  variant = 'neutral',
  size = 'md',
  icon: Icon,
  className = '',
  ...rest
}) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const variantStyles = {
    neutral: 'bg-surface-muted/80 text-secondary border-border-subtle',
    accent: 'bg-accent/15 text-accent border-accent/30 font-semibold',
    success: 'bg-status-success/15 text-status-success border-status-success/30 font-semibold',
    warning: 'bg-status-warning/15 text-status-warning border-status-warning/30 font-semibold',
    danger: 'bg-status-danger/15 text-status-danger border-status-danger/30 font-semibold',
  };

  return (
    <span
      className={`glass-pill inline-flex items-center font-heading font-medium border shadow-xs transition-colors ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="h-3 w-3 text-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
