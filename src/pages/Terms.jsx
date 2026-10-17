import React from 'react';
import { FileText, AlertTriangle, ShieldCheck, Scale, Info, Mail } from 'lucide-react';
import { GlassCard, GlassBadge } from '../components/glass/index.js';
import { siteConfig } from '../config/siteConfig.js';

export default function Terms() {
  const { supportEmail, lastUpdated } = siteConfig;

  return (
    <div className="py-6 sm:py-10 mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-3">
          <GlassBadge variant="accent" size="sm">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Usage Terms</span>
          </GlassBadge>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
          Terms of Service
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-muted">
          Last updated: {lastUpdated} • Pre-Launch Terms Template
        </p>
      </div>

      {/* Pre-Launch Legal Notice Callout */}
      <div className="rounded-2xl border border-status-warning/40 bg-status-warning/10 p-5 flex items-start gap-3.5 text-xs sm:text-sm text-secondary">
        <Info className="h-5 w-5 text-status-warning shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-heading font-semibold text-primary">Pre-Launch Legal Notice</p>
          <p className="leading-relaxed">
            These terms represent the operational guidelines for PDFTooling during active development. 
            Final corporate entity details, governing jurisdiction, and formal legal representation are pending pre-launch legal review. 
            Do not treat this template as formally executed legal counsel documentation.
          </p>
        </div>
      </div>

      {/* Terms Sections */}
      <div className="space-y-6">
        {/* Section 1: Description of Service */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <FileText className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>1. Description of Service</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            PDFTooling provides client-side document utilities designed to merge, split, rotate, delete pages, reorder pages, 
            and convert images to PDF directly inside the user's web browser without remote document transmission.
          </p>
        </section>

        {/* Section 2: Free Tool Availability */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>2. Free Access &amp; Tool Availability</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            The core PDF utilities are provided free of charge without mandatory account creation or subscription fees. 
            We reserve the right to modify, update, or discontinue any aspect of the service as necessary for security or architectural improvements.
          </p>
        </section>

        {/* Section 3: Document Ownership & User Responsibility */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <Scale className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>3. Document Ownership &amp; User Responsibility</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            You retain 100% of your ownership rights, title, and intellectual property in any documents or images you open using PDFTooling. 
            You are solely responsible for ensuring you have all legal rights, licenses, and permissions to access and modify the documents you process.
          </p>
        </section>

        {/* Section 4: Service Limitations & Local Execution */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <AlertTriangle className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>4. Hardware Limits &amp; Backup Responsibility</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            Because document processing runs locally within your browser sandbox, performance, processing speed, 
            and file size ceilings depend directly upon your computer's available memory (RAM), processor, and web browser implementation.
          </p>
          <p className="text-sm text-secondary leading-relaxed">
            <strong>Important Backup Rule:</strong> Always retain backup copies of all original files before performing any document modification. 
            PDFTooling is not responsible for data loss caused by browser crashes, device memory exhaustion, or interrupted processing sessions.
          </p>
        </section>

        {/* Section 5: Disclaimer of Warranties */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <AlertTriangle className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>5. Disclaimer of Warranties ("As-Is")</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed uppercase text-xs tracking-wider text-muted font-mono">
            Provided "As-Is" Without Express or Implied Warranties
          </p>
          <p className="text-sm text-secondary leading-relaxed">
            To the maximum extent permitted by applicable law, PDFTooling is provided on an "AS IS" and "AS AVAILABLE" basis, 
            without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to 
            warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </section>

        {/* Section 6: Inquiries and Updates */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <Mail className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>6. Inquiries &amp; Pre-Launch Contact</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            Questions regarding these terms may be directed through our current contact channel:
          </p>
          {supportEmail ? (
            <p className="text-sm text-secondary">
              Contact us at{' '}
              <a href={`mailto:${supportEmail}`} className="font-semibold text-accent hover:underline focus-ring rounded-xs">
                {supportEmail}
              </a>.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-secondary">
              A verified support address will be assigned before production launch. Refer to our{' '}
              <a href="/contact" className="font-semibold text-accent hover:underline focus-ring rounded-xs">
                Contact page
              </a>{' '}
              for current communication channel status.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
