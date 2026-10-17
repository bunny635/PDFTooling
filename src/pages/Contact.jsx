import React from 'react';
import { Mail, Clock, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { GlassCard, GlassBadge } from '../components/glass/index.js';
import { siteConfig } from '../config/siteConfig.js';

export default function Contact() {
  const { supportEmail, lastUpdated } = siteConfig;

  return (
    <div className="py-6 sm:py-10 mx-auto max-w-2xl space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-xs">
          <Mail className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
          Contact &amp; Support
        </h1>

        <p className="mt-3 text-sm sm:text-base text-secondary max-w-md mx-auto leading-relaxed">
          Questions, bug reports, or feature suggestions for PDFTooling? Find our current contact channels below.
        </p>
      </div>

      {/* Support Availability Section */}
      <GlassCard className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle/60 pb-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-primary">
              Support Channel
            </h2>
          </div>

          <GlassBadge variant={supportEmail ? 'success' : 'neutral'} size="sm">
            {supportEmail ? 'Active' : 'Pre-Launch'}
          </GlassBadge>
        </div>

        {supportEmail ? (
          /* Active Contact Channel when supportEmail is configured */
          <div className="surface-opaque p-5 rounded-2xl border border-border-subtle space-y-4">
            <p className="text-sm text-secondary leading-relaxed">
              We handle user inquiries and technical feedback via our dedicated support inbox. 
              Please avoid including confidential or proprietary document attachments in initial correspondence.
            </p>

            <div>
              <a
                href={`mailto:${supportEmail}`}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-heading text-xs sm:text-sm font-semibold text-accent-contrast shadow-sm hover:bg-accent-hover transition-colors"
                aria-label={`Send email to ${supportEmail}`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>{supportEmail}</span>
              </a>
            </div>
          </div>
        ) : (
          /* Pre-Launch Notice when supportEmail is null */
          <div className="surface-opaque p-5 rounded-2xl border border-border-subtle space-y-3">
            <div className="flex items-center gap-2 text-status-warning font-heading font-semibold text-sm">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pre-Launch Channel Notice</span>
            </div>

            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              Official email support channels are being finalized prior to public launch. 
              Once domain email routing and security verifications are complete, direct email contact details will be published here.
            </p>

            <div className="rounded-xl bg-surface-muted/60 p-3 text-xs text-muted">
              <span>Status: Direct email contact is currently awaiting pre-launch domain routing configuration. No mock or non-functional web forms are used on this site.</span>
            </div>
          </div>
        )}

        {/* Security & Document Advisory */}
        <div className="rounded-xl border border-border-subtle/80 bg-surface/50 p-4 flex items-start gap-3 text-xs text-secondary">
          <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong>Document Privacy Note:</strong> PDFTooling is architected so that document operations execute locally in your browser. 
            Never send sensitive or personal documents as email attachments when requesting technical assistance.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
