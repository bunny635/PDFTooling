import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../app/router.jsx';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';

function renderRoute(initialEntry = '/') {
  const memoryRouter = createMemoryRouter(routes, {
    initialEntries: [initialEntry],
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  });
  return render(
    <ThemeProvider>
      <RouterProvider router={memoryRouter} future={{ v7_startTransition: true }} />
    </ThemeProvider>
  );
}

describe('Application Routing and Shell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders Home route with brand and hero', () => {
    renderRoute('/');
    expect(screen.getByRole('link', { name: /PDFTooling/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /PDFTooling Home/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Theme selector/i })).toBeInTheDocument();
  });

  it('renders All Tools route with all 6 tools listed', () => {
    renderRoute('/tools');
    expect(screen.getByRole('heading', { level: 1, name: /All PDF Tools/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Merge PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open JPG to PDF/i })).toBeInTheDocument();
  });

  it.each([
    ['/tools/merge-pdf', 'Merge PDF Workspace'],
    ['/tools/split-pdf', 'Split PDF Workspace'],
    ['/tools/rotate-pdf', 'Rotate PDF Workspace'],
    ['/tools/delete-pages', 'Delete Pages Workspace'],
    ['/tools/reorder-pages', 'Reorder Pages Workspace'],
    ['/tools/jpg-to-pdf', 'JPG to PDF Workspace'],
  ])('renders tool workspace for %s', (path, expectedHeading) => {
    renderRoute(path);
    expect(screen.getByRole('heading', { level: 1, name: expectedHeading })).toBeInTheDocument();
  });

  it('renders informational and policy pages', () => {
    renderRoute('/about');
    expect(screen.getByRole('heading', { level: 1, name: /About PDFTooling/i })).toBeInTheDocument();

    renderRoute('/contact');
    expect(screen.getByRole('heading', { level: 1, name: /Contact & Support/i })).toBeInTheDocument();

    renderRoute('/privacy');
    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();

    renderRoute('/terms');
    expect(screen.getByRole('heading', { level: 1, name: /Terms of Service/i })).toBeInTheDocument();
  });

  it('renders 404 Not Found for unknown routes', () => {
    renderRoute('/unknown-random-route');
    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('renders 404 Not Found for non-existent tool slugs (/tools/nonexistent)', () => {
    renderRoute('/tools/nonexistent');
    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /All Tools/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('persists theme switching across route changes', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    const darkButton = screen.getByRole('radio', { name: /Dark mode/i });
    await user.click(darkButton);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('pdftooling-theme')).toBe('dark');
  });
});
