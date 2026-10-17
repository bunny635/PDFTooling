import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

/**
 * GlassModal - Accessible floating glass dialog.
 * 
 * Includes:
 * - Focus trap (Tab / Shift+Tab)
 * - Escape key to dismiss
 * - Focus restoration to triggering element
 * - Scroll locking on body
 * - ARIA labelledby and describedby bindings
 */
export default function GlassModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className = '',
}) {
  const dialogRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for restoration
    previouslyFocusedElementRef.current = document.activeElement;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the dialog container or first focusable child
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 10);

    // Escape listener and focus trap
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (
        previouslyFocusedElementRef.current &&
        typeof previouslyFocusedElementRef.current.focus === 'function'
      ) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`glass-panel relative z-10 w-full overflow-hidden border border-border-subtle bg-surface/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8 ${
          maxWidthStyles[maxWidth] || maxWidthStyles.md
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 id={titleId} className="font-heading text-lg sm:text-xl font-bold text-primary">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1 text-xs sm:text-sm text-secondary">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="focus-ring -mr-2 -mt-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
