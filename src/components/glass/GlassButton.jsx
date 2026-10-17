import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * GlassButton - Accessible, versatile button using Adaptive Liquid Glass styling.
 * 
 * Variants:
 * - primary: high-contrast accent fill with subtle glass border
 * - secondary: translucent glass surface with border
 * - ghost: subtle transparent hover
 * - danger: high-contrast danger state
 */
export default function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  type = 'button',
  onClick,
  ...rest
}) {
  const isDisabled = disabled || isLoading;

  const baseStyles =
    'relative inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 select-none focus-ring active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'min-h-[44px] px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'min-h-[48px] px-6 py-2.5 text-base rounded-2xl gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover border border-white/20',
    secondary:
      'glass-floating text-primary hover:bg-surface-muted hover:border-accent/40',
    ghost:
      'bg-transparent text-secondary hover:text-primary hover:bg-surface-muted/60',
    danger:
      'bg-status-danger text-white shadow-sm hover:opacity-90 border border-white/10',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4 text-current" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
