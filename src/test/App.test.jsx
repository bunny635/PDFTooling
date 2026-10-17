import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App.jsx';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';

describe('App smoke test', () => {
  it('renders the application heading, client-side badge, and theme controls', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /PDFTooling/i })).toBeInTheDocument();
    expect(screen.getByText(/Client-Side Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Adaptive Liquid Glass/i)).toBeInTheDocument();
    expect(screen.getByText(/Document Preview Surface/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Foundation/i })).toBeInTheDocument();

    // Verify theme selector buttons
    const lightRadio = screen.getByRole('radio', { name: /Light mode/i });
    const darkRadio = screen.getByRole('radio', { name: /Dark mode/i });
    const systemRadio = screen.getByRole('radio', { name: /System mode/i });

    expect(lightRadio).toBeInTheDocument();
    expect(darkRadio).toBeInTheDocument();
    expect(systemRadio).toBeInTheDocument();

    // System mode is active by default
    expect(systemRadio).toHaveAttribute('aria-checked', 'true');

    // Click dark mode
    await user.click(darkRadio);
    expect(darkRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Click light mode
    await user.click(lightRadio);
    expect(lightRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
