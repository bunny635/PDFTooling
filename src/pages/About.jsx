import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Cpu, Layers, ArrowRight, Eye, Zap, Heart } from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '../components/glass/index.js';
import { getAllTools } from '../config/toolRegistry.js';

export default function About() {
  const tools = getAllTools();

  return (
    <div className="py-6 sm:py-10 mx-auto max-w-3xl space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-3">
          <GlassBadge variant="accent" size="sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Platform Overview</span>
          </GlassBadge>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
          About PDFTooling
        </h1>

        <p className="mt-3 text-base sm:text-lg text-secondary leading-relaxed">
          PDFTooling is a free, privacy-focused web application designed to bring essential PDF utilities 
          directly into your browser session without remote document transmission.
        </p>
      </div>

      {/* Mission & Purpose */}
      <GlassCard className="p-6 sm:p-8 space-y-4">
        <h2 className="font-heading text-xl font-bold text-primary flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" aria-hidden="true" />
          <span>Our Mission: Document Privacy First</span>
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          Most online PDF converters operate by uploading your sensitive documents—containing personal, legal, financial, 
          or medical records—to remote cloud servers. Often, these servers store copies or analyze files without transparent controls.
        </p>
        <p className="text-sm text-secondary leading-relaxed">
          We believe basic document tasks should never require surrendering your privacy, creating accounts, or risking data exposure. 
          PDFTooling is architected from the ground up for client-side processing, ensuring files are handled directly within your device's local memory.
        </p>
      </GlassCard>

      {/* The 6 Core MVP Tools */}
      <section aria-labelledby="tools-overview-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="tools-overview-heading" className="font-heading text-xl font-bold text-primary">
            Six Core PDF Utilities
          </h2>
          <Link
            to="/tools"
            className="text-xs font-semibold text-accent hover:underline focus-ring rounded-md py-1"
          >
            <span>Browse directory</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.route}
              className="group block focus-ring rounded-xl outline-none"
            >
              <div className="surface-opaque p-4 rounded-xl border border-border-subtle h-full flex flex-col justify-between hover:border-accent/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-heading font-semibold text-sm text-primary group-hover:text-accent transition-colors">
                      {tool.name}
                    </span>
                    <GlassBadge variant="neutral" size="sm" className="capitalize text-[10px]">
                      {tool.category}
                    </GlassBadge>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-accent flex items-center gap-1">
                  <span>Open tool workspace</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Planned Client-Side Architecture */}
      <GlassCard className="p-6 sm:p-8 space-y-4">
        <h2 className="font-heading text-xl font-bold text-primary flex items-center gap-2">
          <Cpu className="h-5 w-5 text-accent" aria-hidden="true" />
          <span>Planned Client-Side Architecture</span>
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          PDFTooling's technical design centers on running document operations entirely in browser memory. 
          When you select files, they are read via the browser's standard file APIs and processed locally.
        </p>
        <p className="text-sm text-secondary leading-relaxed">
          <strong>Development Note:</strong> We are actively building out the dedicated client-side workspaces for each tool. 
          The architecture is designed to maintain zero server-side file retention as each tool workspace enters public availability.
        </p>
      </GlassCard>

      {/* Core Principles Grid */}
      <section aria-labelledby="principles-heading" className="space-y-4">
        <h2 id="principles-heading" className="font-heading text-xl font-bold text-primary">
          Guiding Principles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="p-2 rounded-xl bg-accent/10 text-accent w-fit mb-3">
              <Eye className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading font-semibold text-primary text-sm">Transparency</h3>
            <p className="text-xs text-secondary mt-1.5 leading-relaxed">
              Open technical design, clear network policies, and zero hidden tracking mechanisms.
            </p>
          </div>

          <div className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="p-2 rounded-xl bg-accent/10 text-accent w-fit mb-3">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading font-semibold text-primary text-sm">Accessibility</h3>
            <p className="text-xs text-secondary mt-1.5 leading-relaxed">
              Full keyboard operability, responsive touch targets, Light/Dark themes, and reduced-motion support.
            </p>
          </div>

          <div className="surface-opaque p-5 rounded-2xl border border-border-subtle">
            <div className="p-2 rounded-xl bg-accent/10 text-accent w-fit mb-3">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading font-semibold text-primary text-sm">Free Forever</h3>
            <p className="text-xs text-secondary mt-1.5 leading-relaxed">
              Essential document utilities should remain freely accessible without subscriptions or watermarks.
            </p>
          </div>
        </div>
      </section>

      {/* Directory CTA */}
      <div className="text-center pt-4">
        <Link
          to="/tools"
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-heading text-sm font-semibold text-accent-contrast shadow-sm hover:bg-accent-hover transition-colors"
        >
          <span>Explore All Tools</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
