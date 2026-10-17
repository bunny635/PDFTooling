import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * GlassInput - Accessible form text input using semi-translucent glass styling.
 * Supports labels, helper text, and error validation states with complete ARIA linking.
 */
export default function GlassInput({
  label,
  id: customId,
  helperText,
  error,
  disabled = false,
  className = '',
  type = 'text',
  ...rest
}) {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const hasError = Boolean(error);
  const describedBy = hasError ? errorId : helperText ? helperId : undefined;

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block font-heading text-xs font-semibold text-primary"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-xl border bg-surface/70 px-3.5 py-2.5 font-sans text-sm text-primary placeholder:text-muted backdrop-blur-sm transition-all duration-200 focus-ring ${
            hasError
              ? 'border-status-danger text-status-danger focus:border-status-danger'
              : 'border-border-subtle focus:border-accent'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-muted/50' : ''} ${className}`}
          {...rest}
        />

        {hasError && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-status-danger">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>

      {hasError ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-status-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
