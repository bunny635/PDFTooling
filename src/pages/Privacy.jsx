import React from 'react';
import { ShieldCheck, HardDrive, Cookie, Globe, AlertCircle, Mail, Lock } from 'lucide-react';
import { GlassCard, GlassBadge } from '../components/glass/index.js';
import { siteConfig } from '../config/siteConfig.js';

export default function Privacy() {
  const { supportEmail, lastUpdated } = siteConfig;

  return (
    <div className="py-6 sm:py-10 mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-3">
          <GlassBadge variant="accent" size="sm">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Data Transparency</span>
          </GlassBadge>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
          Privacy Policy
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-muted">
          Last updated: {lastUpdated} • Pre-Launch Architecture Specification
        </p>
      </div>

      {/* Overview Card */}
      <GlassCard className="p-6 sm:p-8 space-y-4">
        <h2 className="font-heading text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-status-success" aria-hidden="true" />
          <span>Core Privacy Commitment</span>
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          PDFTooling is built upon the foundational principle that your private documents belong exclusively to you. 
          This policy clearly explains how data is handled, what is stored locally in your browser, and what external network requests are made.
        </p>
      </GlassCard>

      {/* Policy Sections */}
      <div className="space-y-6">
        {/* Section 1: Document Processing Architecture */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <HardDrive className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>1. Document Handling and Local Processing Architecture</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            The intended architecture of PDFTooling executes PDF and image operations entirely within your browser's local sandbox memory.
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-secondary space-y-1.5 pl-1">
            <li><strong>Zero Server Uploads:</strong> When you open a PDF or image in a tool workspace, your files are not transmitted to any remote server or third-party cloud API.</li>
            <li><strong>Zero Document Retention:</strong> Because files are handled strictly in volatile browser memory, no copies of your document content or thumbnails exist on any web server.</li>
            <li><strong>User Session Bound:</strong> Closing your browser tab or refreshing the page immediately clears any transient document state from device memory.</li>
          </ul>
        </section>

        {/* Section 2: Browser LocalStorage */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <Cookie className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>2. Local Storage and Cookies</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            PDFTooling does not use tracking cookies, analytics identifiers, advertising trackers, or fingerprinting scripts.
          </p>
          <p className="text-sm text-secondary leading-relaxed">
            We use your browser's standard <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-mono text-primary">localStorage</code> solely for one functional preference:
          </p>
          <div className="rounded-xl bg-surface-muted/60 p-3.5 text-xs text-secondary space-y-1 font-mono">
            <p><strong className="text-primary">Key:</strong> pdftooling-theme</p>
            <p><strong className="text-primary">Values:</strong> 'light', 'dark', or 'system'</p>
            <p><strong className="text-primary">Purpose:</strong> Preserves your visual theme selection across page reloads.</p>
          </div>
        </section>

        {/* Section 3: External Network Requests (Google Fonts) */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <Globe className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>3. External Network Requests and Font Delivery</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            While PDF document data is never transmitted across the network, loading the website involves standard static asset requests:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-secondary space-y-1.5 pl-1">
            <li>
              <strong>Google Fonts:</strong> Typography stylesheets and font files for <em>Plus Jakarta Sans</em> and <em>Inter</em> are fetched from Google Fonts (<code className="rounded bg-surface-muted px-1 py-0.5 text-xs text-primary">fonts.googleapis.com</code> and <code className="rounded bg-surface-muted px-1 py-0.5 text-xs text-primary">fonts.gstatic.com</code>). These requests transmit standard HTTP request metadata (your IP address and User-Agent header) to Google's content delivery network.
            </li>
            <li>
              <strong>Static Asset Delivery:</strong> Application bundles (HTML, CSS, JavaScript) are served via static web hosting networks, which maintain standard operational access logs for DDoS mitigation and infrastructure availability.
            </li>
          </ul>
        </section>

        {/* Section 4: Current Implementation Limitations */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <AlertCircle className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>4. Current Implementation Status and Verification</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            PDFTooling is in active architectural development. As individual tool workspaces are deployed, users can independently verify 
            network isolation by inspecting the browser's Developer Tools Network tab during file selection to confirm zero external document requests.
          </p>
        </section>

        {/* Section 5: Contact and Inquiries */}
        <section className="surface-opaque p-6 rounded-2xl border border-border-subtle space-y-3">
          <div className="flex items-center gap-2.5 font-heading font-semibold text-primary text-base">
            <Mail className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
            <h2>5. Privacy Contact &amp; Questions</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            If you have questions about our privacy practices, technical data isolation, or data disclosures:
          </p>
          {supportEmail ? (
            <p className="text-sm text-secondary">
              Contact our privacy desk at{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="font-semibold text-accent hover:underline focus-ring rounded-xs"
              >
                {supportEmail}
              </a>.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-secondary">
              Official privacy inquiry channels will be published with our production release. Review our{' '}
              <a href="/contact" className="font-semibold text-accent hover:underline focus-ring rounded-xs">
                Contact page
              </a>{' '}
              for current pre-launch communication channel status.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
