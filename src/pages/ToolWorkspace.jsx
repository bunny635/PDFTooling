import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layers, Shield, FileCheck, ArrowLeft } from 'lucide-react';
import { getToolBySlug } from '../config/toolRegistry.js';

export default function ToolWorkspace({ slugOverride }) {
  const { slug } = useParams();
  const activeSlug = slugOverride || slug;
  const tool = getToolBySlug(activeSlug);

  if (!tool) {
    return (
      <div className="py-12 text-center">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Tool Not Found
        </h1>
        <p className="mt-2 text-sm text-secondary">
          The requested tool "{activeSlug}" is not recognized.
        </p>
        <Link
          to="/tools"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Tools</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/tools"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors focus-ring rounded"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Tools</span>
        </Link>
        <span className="glass-pill px-3 py-1 text-xs font-medium text-accent">
          {tool.category.toUpperCase()}
        </span>
      </div>

      <div className="glass-panel p-8 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Layers className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
          {tool.name} Workspace
        </h1>
        <p className="mt-2 text-sm text-secondary max-w-lg mx-auto">
          {tool.description}
        </p>

        {/* Workspace Shell Placeholder */}
        <div className="surface-opaque mt-8 mx-auto max-w-md rounded-2xl border-2 border-dashed border-border-subtle p-8 text-center">
          <FileCheck className="mx-auto h-8 w-8 text-muted mb-3" />
          <p className="font-heading text-sm font-semibold text-primary">
            Workspace Engine Placeholder
          </p>
          <p className="mt-1 text-xs text-secondary">
            File dropzone, PDF.js preview, and pdf-lib processing are scheduled for Sprint 3 & 4.
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-status-success">
            <Shield className="h-3.5 w-3.5" />
            <span>Local Browser Sandbox Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
