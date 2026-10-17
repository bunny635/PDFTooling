import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import { getAllTools } from '../config/toolRegistry.js';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Home />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Home Page Component (WEB-01)', () => {
  it('renders hero section with branding, heading, and privacy badge', () => {
    renderHome();

    // Eyebrow badge
    expect(screen.getByText(/100% In-Browser Privacy/i)).toBeInTheDocument();

    // Primary H1 heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Private & Fast Client-Side PDF Tools/i);

    // Value proposition subtitle
    expect(
      screen.getByText(/Files stay exclusively on your device—zero server uploads, zero storage fees/i)
    ).toBeInTheDocument();
  });

  it('renders primary and secondary CTAs in hero with correct targets', () => {
    renderHome();

    const exploreCta = screen.getByRole('link', { name: /Explore PDF Tools/i });
    expect(exploreCta).toHaveAttribute('href', '#tools');

    const browseCta = screen.getByRole('link', { name: /Browse All Tools/i });
    expect(browseCta).toHaveAttribute('href', '/tools');
  });

  it('renders all six tools sourced directly from toolRegistry without hardcoding', () => {
    renderHome();
    const registryTools = getAllTools();
    expect(registryTools).toHaveLength(6);

    registryTools.forEach((tool) => {
      // Tool name heading
      const toolHeading = screen.getByRole('heading', { level: 3, name: tool.name });
      expect(toolHeading).toBeInTheDocument();

      // Tool description
      expect(screen.getByText(tool.description)).toBeInTheDocument();

      // Tool navigation card link
      const toolLink = screen.getByRole('link', {
        name: new RegExp(`Open ${tool.name}`, 'i'),
      });
      expect(toolLink).toHaveAttribute('href', tool.route);
    });
  });

  it('renders How It Works section with 3 local workflow steps', () => {
    renderHome();

    expect(screen.getByRole('heading', { level: 2, name: /How PDFTooling Works/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Choose a Tool/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Select Your Files/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Process and Download/i })).toBeInTheDocument();

    // Client-side architecture assurance
    expect(screen.getByText(/Client-Side Architecture:/i)).toBeInTheDocument();
  });

  it('renders Privacy and Benefits section with 4 core guarantees', () => {
    renderHome();

    expect(
      screen.getByRole('heading', { level: 2, name: /Why Use Client-Side PDF Tools\?/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /No Server Uploads/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /No Account Required/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Free Core Tools/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Fast & Accessible/i })).toBeInTheDocument();
  });

  it('renders final call to action encouraging workspace exploration', () => {
    renderHome();

    expect(
      screen.getByRole('heading', { level: 2, name: /Ready to work with your documents\?/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Tool Directory/i })).toHaveAttribute(
      'href',
      '/tools'
    );
  });
});
