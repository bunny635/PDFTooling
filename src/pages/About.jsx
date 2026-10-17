import React from 'react';
import { Shield, Sparkles, Cpu } from 'lucide-react';

export default function About() {
  return (
    <div className="py-8 mx-auto max-w-3xl">
      <div className="glass-panel p-8 sm:p-10">
        <h1 className="font-heading text-3xl font-extrabold text-primary mb-4">
          About PDFTooling
        </h1>
        <p className="text-secondary leading-relaxed mb-6">
          PDFTooling is a free, privacy-first PDF utility suite engineered to run 100% inside your web browser. 
          We believe basic document tasks—like merging homework assignments or splitting reports—should never require 
          account registration, hidden paywalls, or uploading sensitive files to remote servers.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-8 pt-6 border-t border-border-subtle">
          <div className="text-center sm:text-left">
            <div className="inline-flex p-2 rounded-xl bg-accent/10 text-accent mb-2">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-heading font-semibold text-primary text-sm">Privacy by Design</h3>
            <p className="text-xs text-secondary mt-1">Files never leave your device.</p>
          </div>

          <div className="text-center sm:text-left">
            <div className="inline-flex p-2 rounded-xl bg-accent/10 text-accent mb-2">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="font-heading font-semibold text-primary text-sm">Client-Side Engine</h3>
            <p className="text-xs text-secondary mt-1">Powered by open-source libraries.</p>
          </div>

          <div className="text-center sm:text-left">
            <div className="inline-flex p-2 rounded-xl bg-accent/10 text-accent mb-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-heading font-semibold text-primary text-sm">Zero Cost Forever</h3>
            <p className="text-xs text-secondary mt-1">No subscriptions or accounts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
