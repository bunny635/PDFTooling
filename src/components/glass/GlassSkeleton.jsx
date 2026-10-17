import React from 'react';

/**
 * GlassSkeleton - Translucent loading skeleton placeholder with reduced-motion support.
 */
export default function GlassSkeleton({
  className = '',
  rounded = 'md',
  width,
  height,
  style = {},
  ...rest
}) {
  const roundedStyles = {
    sm: 'rounded-sm',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    card: 'rounded-card',
    pill: 'rounded-pill',
    full: 'rounded-full',
  };

  const customStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      style={customStyle}
      className={`relative overflow-hidden bg-surface-muted/70 backdrop-blur-xs animate-pulse border border-border-subtle/40 ${
        roundedStyles[rounded] || roundedStyles.md
      } ${className}`}
      {...rest}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
