import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home, Layers } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <div className="glass-panel mx-auto max-w-md p-8 sm:p-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-status-danger/10 text-status-danger">
          <HelpCircle className="h-8 w-8" aria-hidden="true" />
        </div>

        <h1 className="font-heading text-4xl font-extrabold text-primary">404</h1>
        <h2 className="mt-2 font-heading text-xl font-bold text-primary">
          Page Not Found
        </h2>
        <p className="mt-2 text-xs text-secondary leading-relaxed">
          The page or tool route you requested does not exist or has moved.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 font-heading text-xs font-semibold text-accent-contrast shadow-sm hover:bg-accent-hover transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Go Home</span>
          </Link>
          <Link
            to="/tools"
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-4 py-2 font-heading text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-muted transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Tools</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
