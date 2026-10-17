import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../app/providers/ThemeProvider.jsx';

// Helper test consumer component
function TestConsumer() {
  const { themePreference, effectiveTheme, setThemePreference } = useTheme();
  return (
    <div>
      <span data-testid="pref">{themePreference}</span>
      <span data-testid="effective">{effectiveTheme}</span>
      <button onClick={() => setThemePreference('light')}>Set Light</button>
      <button onClick={() => setThemePreference('dark')}>Set Dark</button>
      <button onClick={() => setThemePreference('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  let mediaQueryListeners = [];
  let isSystemDark = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    mediaQueryListeners = [];
    isSystemDark = false;

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('dark') ? isSystemDark : !isSystemDark,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
          mediaQueryListeners.push(handler);
        }
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
          mediaQueryListeners = mediaQueryListeners.filter((h) => h !== handler);
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to system preference when no valid stored preference exists', () => {
    isSystemDark = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref')).toHaveTextContent('system');
    expect(screen.getByTestId('effective')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('restores saved light preference from localStorage', () => {
    localStorage.setItem('pdftooling-theme', 'light');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref')).toHaveTextContent('light');
    expect(screen.getByTestId('effective')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('restores saved dark preference from localStorage', () => {
    localStorage.setItem('pdftooling-theme', 'dark');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(screen.getByTestId('effective')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('switches between all three modes and persists in localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    // Switch to dark
    await user.click(screen.getByRole('button', { name: 'Set Dark' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(screen.getByTestId('effective')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('pdftooling-theme')).toBe('dark');

    // Switch to light
    await user.click(screen.getByRole('button', { name: 'Set Light' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('light');
    expect(screen.getByTestId('effective')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('pdftooling-theme')).toBe('light');

    // Switch back to system
    await user.click(screen.getByRole('button', { name: 'Set System' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('system');
    expect(localStorage.getItem('pdftooling-theme')).toBe('system');
  });

  it('responds to OS system theme changes when System mode is active', () => {
    isSystemDark = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('effective')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Simulate OS switching to dark mode
    act(() => {
      mediaQueryListeners.forEach((handler) => handler({ matches: true }));
    });

    expect(screen.getByTestId('effective')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Simulate OS switching back to light mode
    act(() => {
      mediaQueryListeners.forEach((handler) => handler({ matches: false }));
    });

    expect(screen.getByTestId('effective')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('does not override manual light/dark mode on OS system theme changes', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    // Manually choose light mode
    await user.click(screen.getByRole('button', { name: 'Set Light' }));
    expect(screen.getByTestId('effective')).toHaveTextContent('light');

    // Simulate OS switching to dark mode
    act(() => {
      mediaQueryListeners.forEach((handler) => handler({ matches: true }));
    });

    // Should remain light because manual preference overrides OS
    expect(screen.getByTestId('pref')).toHaveTextContent('light');
    expect(screen.getByTestId('effective')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('handles invalid stored preferences by falling back to system mode', () => {
    localStorage.setItem('pdftooling-theme', 'invalid-theme-xyz');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref')).toHaveTextContent('system');
  });

  it('handles localStorage failures gracefully without crashing', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled / quota exceeded');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage write forbidden');
    });

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    // Should default to system without crashing
    expect(screen.getByTestId('pref')).toHaveTextContent('system');

    // Changing theme should still update in-memory state without crashing
    await user.click(screen.getByRole('button', { name: 'Set Dark' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('throws an error when useTheme is called outside ThemeProvider', () => {
    // Suppress console error for expected throw test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});
