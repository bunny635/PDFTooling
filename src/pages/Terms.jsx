import React from 'react';
import { FileText, AlertCircle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="py-8 mx-auto max-w-3xl">
      <div className="glass-panel p-8 sm:p-10">
        <h1 className="font-heading text-3xl font-extrabold text-primary mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-muted mb-6">Last updated: October 2026</p>

        <div className="space-y-6 text-sm text-secondary leading-relaxed">
          <section className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base mb-2">
              <FileText className="h-5 w-5 text-accent" />
              <span>1. Permitted Use</span>
            </div>
            <p>
              PDFTooling provides free, client-side document processing utilities for personal, educational, and commercial purposes. You agree not to attempt reverse-engineering, introducing malicious payloads, or disrupting static delivery systems.
            </p>
          </section>

          <section className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base mb-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              <span>2. Disclaimer of Warranty</span>
            </div>
            <p>
              The platform is provided "as is" without warranty of any kind. Because processing occurs locally inside your browser, output performance and file-size ceilings depend on your device hardware, memory, and browser capabilities. Always retain backup copies of original documents.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
