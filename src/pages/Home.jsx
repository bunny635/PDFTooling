import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Zap,
  UserX,
  CheckCircle2,
  Cpu,
  Layers,
  Scissors,
  RotateCw,
  Trash2,
  ArrowUpDown,
  Image,
  MousePointerClick,
  FileUp,
  Download,
} from 'lucide-react';
import { getAllTools } from '../config/toolRegistry.js';
import { GlassCard, GlassButton, GlassBadge } from '../components/glass/index.js';

// Map iconName strings from toolRegistry.js to Lucide React components
const TOOL_ICONS = {
  Layers,
  Scissors,
  RotateCw,
  Trash2,
  ArrowUpDown,
  Image,
};

export default function Home() {
  const tools = getAllTools();

  return (
    <div className="py-6 sm:py-10 space-y-16 sm:space-y-24">
      {/* 1. Hero Section */}
      <section aria-labelledby="hero-heading" className="text-center relative">
        <div className="mx-auto max-w-4xl px-2">
          {/* Privacy & Architecture Badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <GlassBadge variant="accent" size="md" className="py-1 px-3.5 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Privacy-Focused Architecture</span>
            </GlassBadge>
          </div>

          {/* Primary Semantic Heading */}
          <h1
            id="hero-heading"
            className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary leading-[1.15]"
          >
            <span className="sr-only">PDFTooling Home - </span>
            <span>Private &amp; Fast </span>
            <span className="text-gradient-accent">Client-Side PDF Tools</span>
          </h1>

          {/* Value Proposition Subtitle */}
          <p className="mt-5 text-base sm:text-lg lg:text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
            A suite of focused PDF utilities architected for in-browser processing. 
            Built to handle documents locally without sending your files to remote storage.
          </p>

          {/* Dual CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href="#tools"
              className="focus-ring inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 select-none min-h-[48px] px-6 py-2.5 text-base rounded-2xl gap-2 bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover active:scale-[0.98] border border-white/20"
            >
              <span>Explore PDF Tools</span>
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>

            <Link
              to="/tools"
              className="focus-ring inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 select-none min-h-[48px] px-6 py-2.5 text-base rounded-2xl gap-2 glass-floating text-primary hover:bg-surface-muted hover:border-accent/40 active:scale-[0.98]"
            >
              <span>Browse All Tools</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Trust Highlights Pill Bar */}
          <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden="true" />
              <span>No Account Required</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden="true" />
              <span>No Remote Storage</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden="true" />
              <span>Free Core Utilities</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden="true" />
              <span>Client-Side Processing Design</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Six PDF Tool Cards Section */}
      <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="text-xs font-bold tracking-wider uppercase text-accent font-heading">
                Core Utilities
              </span>
            </div>
            <h2 id="tools-heading" className="font-heading text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              Six Core PDF Operations
            </h2>
            <p className="mt-1 text-sm text-secondary max-w-xl">
              Select any utility to enter its dedicated browser workspace. Designed for private local document workflows.
            </p>
          </div>

          <Link
            to="/tools"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline focus-ring rounded-md py-1"
          >
            <span>View directory</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* 6-Card Responsive Grid (1 col mobile, 2 col tablet, 3 col desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {tools.map((tool) => {
            const IconComponent = TOOL_ICONS[tool.iconName] || Layers;

            return (
              <Link
                key={tool.id}
                to={tool.route}
                className="group block focus-ring rounded-card outline-none"
                aria-label={`Open ${tool.name}: ${tool.description}`}
              >
                <GlassCard
                  interactive
                  className="h-full flex flex-col justify-between p-6 sm:p-7 transition-all duration-200 group-hover:border-accent/50"
                >
                  <div>
                    {/* Header: Icon & Category Badge */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-contrast shadow-xs">
                        <IconComponent className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <GlassBadge variant="neutral" size="sm" className="capitalize text-[10px]">
                        {tool.category}
                      </GlassBadge>
                    </div>

                    {/* Tool Name */}
                    <h3 className="font-heading text-lg font-bold text-primary group-hover:text-accent transition-colors duration-200">
                      {tool.name}
                    </h3>

                    {/* Tool Description */}
                    <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed line-clamp-2">
                      {tool.description}
                    </p>
                  </div>

                  {/* Card Action Link */}
                  <div className="mt-6 pt-4 border-t border-border-subtle/50 flex items-center justify-between text-xs font-semibold text-accent">
                    <span>Open Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section aria-labelledby="how-it-works-heading">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-heading">
            Simple Local Workflow
          </span>
          <h2 id="how-it-works-heading" className="mt-1 font-heading text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            How PDFTooling Works
          </h2>
          <p className="mt-2 text-sm text-secondary">
            A streamlined workflow designed for local execution within your browser session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <GlassCard className="p-6 text-center sm:text-left">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-heading font-bold text-sm mb-4">
              1
            </div>
            <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2 justify-center sm:justify-start">
              <MousePointerClick className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Choose a Tool</span>
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
              Select from Merge, Split, Rotate, Delete Pages, Reorder Pages, or JPG to PDF based on your specific task.
            </p>
          </GlassCard>

          {/* Step 2 */}
          <GlassCard className="p-6 text-center sm:text-left">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-heading font-bold text-sm mb-4">
              2
            </div>
            <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2 justify-center sm:justify-start">
              <FileUp className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Select Your Files</span>
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
              Pick your PDF or image files from your computer. Files are read solely into local browser memory.
            </p>
          </GlassCard>

          {/* Step 3 */}
          <GlassCard className="p-6 text-center sm:text-left">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-heading font-bold text-sm mb-4">
              3
            </div>
            <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2 justify-center sm:justify-start">
              <Download className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Process and Download</span>
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
              Configure parameters, run the local operation, and save your generated PDF directly to your device.
            </p>
          </GlassCard>
        </div>

        {/* Browser Architecture Technical Assurance */}
        <div className="mt-6 glass-panel p-4 flex items-center justify-center gap-2.5 text-xs text-secondary text-center">
          <Cpu className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          <span>
            <strong>Client-Side Architecture:</strong> PDFTooling is architected for local browser processing using modern web standards. Core operations are designed to execute directly on your device without server-side file retention.
          </span>
        </div>
      </section>

      {/* 4. Privacy & Benefits Section */}
      <section aria-labelledby="benefits-heading">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-heading">
            Privacy First
          </span>
          <h2 id="benefits-heading" className="mt-1 font-heading text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            Why Use Client-Side PDF Tools?
          </h2>
          <p className="mt-2 text-sm text-secondary">
            Traditional online PDF services often upload documents to remote servers. PDFTooling focuses on private local browser processing instead.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Benefit 1 */}
          <GlassCard className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-success/10 text-status-success mb-3">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-sm font-bold text-primary">No Remote Storage</h3>
            <p className="mt-1.5 text-xs text-secondary leading-relaxed">
              Documents are handled in your local browser session and are not stored in third-party cloud databases.
            </p>
          </GlassCard>

          {/* Benefit 2 */}
          <GlassCard className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
              <UserX className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-sm font-bold text-primary">No Account Required</h3>
            <p className="mt-1.5 text-xs text-secondary leading-relaxed">
              Start working immediately without sign-ups, passwords, tracking cookies, or newsletter popups.
            </p>
          </GlassCard>

          {/* Benefit 3 */}
          <GlassCard className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-sm font-bold text-primary">Free Core Tools</h3>
            <p className="mt-1.5 text-xs text-secondary leading-relaxed">
              Essential PDF manipulation is accessible for everyone without payment walls, daily limits, or watermarks.
            </p>
          </GlassCard>

          {/* Benefit 4 */}
          <GlassCard className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning mb-3">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-sm font-bold text-primary">Fast &amp; Accessible</h3>
            <p className="mt-1.5 text-xs text-secondary leading-relaxed">
              Zero network upload delays. Simple, keyboard-operable, accessible interfaces built for efficiency.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 5. Final Call to Action */}
      <section aria-labelledby="cta-heading" className="pt-4">
        <GlassCard className="p-8 sm:p-12 text-center max-w-3xl mx-auto border-accent/30 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 id="cta-heading" className="font-heading text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              Ready to work with your documents?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-secondary max-w-lg mx-auto leading-relaxed">
              Explore the six available client-side workspaces and manage your PDF files privately in your browser.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#tools"
                className="focus-ring inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 select-none min-h-[44px] px-5 py-2 text-sm rounded-xl gap-2 bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover active:scale-[0.98] border border-white/20"
              >
                <span>Explore Tool Workspaces</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>

              <Link
                to="/tools"
                className="focus-ring inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 select-none min-h-[44px] px-5 py-2 text-sm rounded-xl gap-2 glass-floating text-primary hover:bg-surface-muted hover:border-accent/40 active:scale-[0.98]"
              >
                <span>View Tool Directory</span>
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
