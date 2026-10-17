import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';

export default function Contact() {
  return (
    <div className="py-8 mx-auto max-w-2xl">
      <div className="glass-panel p-8 sm:p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Mail className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="font-heading text-3xl font-extrabold text-primary mb-2">
          Contact & Support
        </h1>
        <p className="text-sm text-secondary max-w-md mx-auto mb-8">
          Have feedback, found a bug, or want to suggest a new PDF tool? Reach out directly.
        </p>

        <div className="surface-opaque rounded-2xl p-6 text-left border border-border-subtle">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent mt-0.5">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-primary text-base">Direct Email Support</h3>
              <p className="text-xs text-secondary mt-1 leading-relaxed">
                We handle inquiries through our support inbox. Please do not attach confidential documents in initial messages.
              </p>
              <div className="mt-4">
                <a
                  href="mailto:support@pdftooling.com"
                  className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-contrast shadow-sm hover:bg-accent-hover transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>support@pdftooling.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
