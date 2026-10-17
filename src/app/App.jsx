import React from 'react';
import { FileText, Shield, Sparkles, Eye, ArrowRight, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './providers/ThemeProvider.jsx';

export default function App() {
  const { themePreference, effectiveTheme, setThemePreference } = useTheme();

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="glass-panel max-w-lg p-8 sm:p-10">
        {/* Icon Badge */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform duration-200 hover:scale-105">
          <FileText className="h-8 w-8" aria-hidden="true" />
        </div>

        {/* Headings with Plus Jakarta Sans */}
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          PDFTooling
        </h1>
        <p className="mt-3 font-sans text-base text-secondary">
          All-in-One Online PDF Toolkit. Private, fast, and 100% browser-based.
        </p>

        {/* Accessible Theme Selector Segmented Control */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Appearance
          </span>
          <div
            role="radiogroup"
            aria-label="Appearance theme preference"
            className="glass-pill inline-flex p-1 gap-1 border border-border-subtle"
          >
            {themes.map(({ id, label, icon: Icon }) => {
              const isSelected = themePreference === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${label} mode`}
                  onClick={() => setThemePreference(id)}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-accent text-accent-contrast shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface-muted/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-muted">
            Active: <strong className="font-semibold text-primary capitalize">{effectiveTheme}</strong> ({themePreference === 'system' ? 'System Sync' : 'Manual'})
          </span>
        </div>

        {/* Feature Badges with Glass Pill */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
          <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-secondary">
            <Shield className="h-3.5 w-3.5 text-status-success" aria-hidden="true" />
            Client-Side Only
          </span>
          <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Adaptive Liquid Glass
          </span>
        </div>

        {/* Demonstrated Solid Opaque Document Reading Surface */}
        <div className="surface-opaque mt-6 rounded-xl p-4 text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2 text-xs font-semibold text-secondary">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-accent" />
              Document Preview Surface
            </span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent font-bold uppercase tracking-wider">
              100% Opaque
            </span>
          </div>
          <p className="font-sans text-xs text-primary leading-relaxed">
            High-contrast solid canvas adhering strictly to WCAG 2.2 AA contrast standards for reading PDFs and thumbnails.
          </p>
        </div>

        {/* Interactive Element with Focus Ring */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-heading text-sm font-semibold text-accent-contrast shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            <span>Explore Foundation</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
