import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { FileText, Sun, Moon, Monitor, Shield, Sparkles } from 'lucide-react';
import { useTheme } from '../../app/providers/ThemeProvider.jsx';
import { GlassBadge } from '../glass/index.js';

export default function RootLayout() {
  const { themePreference, effectiveTheme, setThemePreference } = useTheme();

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const navLinkClass = ({ isActive }) =>
    `px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 focus-ring ${
      isActive
        ? 'bg-accent/15 text-accent font-semibold shadow-xs'
        : 'text-secondary hover:text-primary hover:bg-surface-muted/70'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-ambient-mesh text-primary selection:bg-accent/20 selection:text-primary">
      {/* Refined Floating Liquid Glass Header */}
      <header className="sticky top-0 z-40 border-b border-border-subtle/80 bg-surface/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand Lockup */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 font-heading text-lg font-bold text-primary focus-ring rounded-xl group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-contrast shadow-sm transition-transform duration-200 group-hover:scale-105">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="tracking-tight">PDFTooling</span>
            </Link>

            <GlassBadge variant="accent" size="sm" className="hidden sm:inline-flex text-[10px] font-semibold">
              Client-Side
            </GlassBadge>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/tools" className={navLinkClass}>
              All Tools
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
          </nav>

          {/* Persistent Accessible Theme Selector */}
          <div
            role="radiogroup"
            aria-label="Theme selector"
            className="glass-pill inline-flex items-center p-1 gap-0.5 border border-border-subtle shadow-xs"
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
                  className={`focus-ring inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200 ${
                    isSelected
                      ? 'bg-accent text-accent-contrast shadow-sm scale-100'
                      : 'text-secondary hover:text-primary hover:bg-surface-muted/60'
                  }`}
                  title={`${label} mode (${isSelected ? 'active' : 'select'})`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Page Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {/* Refined SaaS Glass Footer */}
      <footer className="border-t border-border-subtle/80 bg-surface/60 backdrop-blur-sm text-secondary py-8 transition-colors">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          {/* Privacy Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 font-medium text-primary">
              <Shield className="h-4 w-4 text-status-success" aria-hidden="true" />
              <span>100% Client-Side Processing • No Server Uploads</span>
            </div>
            <span className="hidden sm:inline text-muted">|</span>
            <span className="text-muted text-[11px]">Zero server logs. Zero storage fees.</span>
          </div>

          {/* Legal / Policy Navigation */}
          <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium">
            <Link to="/about" className="hover:text-primary transition-colors focus-ring rounded-sm">
              About
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors focus-ring rounded-sm">
              Contact
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-colors focus-ring rounded-sm">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors focus-ring rounded-sm">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
