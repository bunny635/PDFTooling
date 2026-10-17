import React from 'react';
import { ShieldCheck, HardDrive, Cookie } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="py-8 mx-auto max-w-3xl">
      <div className="glass-panel p-8 sm:p-10">
        <h1 className="font-heading text-3xl font-extrabold text-primary mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-muted mb-6">Last updated: October 2026</p>

        <div className="space-y-6 text-sm text-secondary leading-relaxed">
          <section className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base mb-2">
              <HardDrive className="h-5 w-5 text-accent" />
              <span>1. Zero Document Uploads</span>
            </div>
            <p>
              When you select, merge, split, rotate, delete, reorder, or convert PDFs on PDFTooling, the processing occurs
              entirely within your browser's local memory. Your documents and images are never transmitted to our servers or any third-party APIs.
            </p>
          </section>

          <section className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base mb-2">
              <Cookie className="h-5 w-5 text-accent" />
              <span>2. Local Storage Usage</span>
            </div>
            <p>
              We use your browser's <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-primary">localStorage</code> solely to remember your appearance preference (Light, Dark, or System mode under the key <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-primary">pdftooling-theme</code>). We do not store tracking cookies, personal profiles, or document contents.
            </p>
          </section>

          <section className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base mb-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <span>3. Static Delivery</span>
            </div>
            <p>
              Static web assets (HTML, CSS, JS) are served via Cloudflare Pages. Cloudflare maintains standard anonymized access logs for DDoS mitigation and reliability, as detailed in our technical architecture.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
