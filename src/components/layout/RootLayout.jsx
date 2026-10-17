import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { FileText, Sun, Moon, Monitor, Shield } from 'lucide-react';
import { useTheme } from '../../app/providers/ThemeProvider.jsx';

export default function RootLayout() {
  const { themePreference, effectiveTheme, setThemePreference } = useTheme();

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent/15 text-accent font-semibold'
        : 'text-secondary hover:text-primary hover:bg-surface-muted'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-primary">
      {/* Minimal Foundation Header */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 font-heading text-lg font-bold text-primary focus-ring rounded-lg"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-contrast shadow-sm">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <span>PDFTooling</span>
          </Link>

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

          {/* Persistent Theme Selector */}
          <div
            role="radiogroup"
            aria-label="Theme selector"
            className="glass-pill inline-flex items-center p-1 gap-0.5 border border-border-subtle"
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
                  className={`focus-ring inline-flex items-center justify-center rounded-full p-1.5 transition-all ${
                    isSelected
                      ? 'bg-accent text-accent-contrast shadow-sm'
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

      {/* Main Page Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {/* Minimal Foundation Footer */}
      <footer className="border-t border-border-subtle bg-surface/50 text-secondary py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-2 text-xs">
            <Shield className="h-4 w-4 text-status-success" aria-hidden="true" />
            <span>100% Client-Side Processing • No Server Uploads</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <Link to="/about" className="hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
