import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from '../pages/About.jsx';
import Contact from '../pages/Contact.jsx';
import Privacy from '../pages/Privacy.jsx';
import Terms from '../pages/Terms.jsx';
import { siteConfig } from '../config/siteConfig.js';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';

function renderWithProviders(ui) {
  return render(
    <ThemeProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Informational & Policy Pages (WEB-03)', () => {
  describe('About Page (/about)', () => {
    it('renders page heading, mission, and overview of all six tools', () => {
      renderWithProviders(<About />);

      expect(screen.getByRole('heading', { level: 1, name: /About PDFTooling/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Our Mission/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Planned Client-Side Architecture/i })).toBeInTheDocument();

      // Mentions tools
      expect(screen.getByText('Merge PDF')).toBeInTheDocument();
      expect(screen.getByText('Split PDF')).toBeInTheDocument();
      expect(screen.getByText('Rotate PDF')).toBeInTheDocument();
      expect(screen.getByText('Delete Pages')).toBeInTheDocument();
      expect(screen.getByText('Reorder Pages')).toBeInTheDocument();
      expect(screen.getByText('JPG to PDF')).toBeInTheDocument();

      // Link to directory
      expect(screen.getByRole('link', { name: /Explore All Tools/i })).toHaveAttribute('href', '/tools');
    });
  });

  describe('Contact Page (/contact)', () => {
    it('displays pre-launch channel notice when supportEmail is null without fake forms or clickable emails', () => {
      // Default state has supportEmail = null
      expect(siteConfig.supportEmail).toBeNull();
      renderWithProviders(<Contact />);

      expect(screen.getByRole('heading', { level: 1, name: /Contact & Support/i })).toBeInTheDocument();
      expect(screen.getByText(/Pre-Launch Channel Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Official email support channels are being finalized/i)).toBeInTheDocument();

      // Confirms NO fake/nonfunctional forms exist
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit|send message/i })).not.toBeInTheDocument();

      // Confirms NO active mailto link is exposed when supportEmail is null
      const mailtoLinks = screen.queryAllByRole('link').filter((link) =>
        link.getAttribute('href')?.startsWith('mailto:')
      );
      expect(mailtoLinks).toHaveLength(0);
    });

    it('renders a verified mailto: link when supportEmail is configured', async () => {
      // Temporarily set a mock support email
      siteConfig.supportEmail = 'verified-support@example.com';

      const { rerender } = renderWithProviders(<Contact />);

      expect(screen.getByText('verified-support@example.com')).toBeInTheDocument();
      const mailtoLink = screen.getByRole('link', { name: /Send email to verified-support@example.com/i });
      expect(mailtoLink).toHaveAttribute('href', 'mailto:verified-support@example.com');

      // Reset back to null
      siteConfig.supportEmail = null;
    });
  });

  describe('Privacy Page (/privacy)', () => {
    it('accurately discloses local document processing, localStorage, and external Google Fonts', () => {
      renderWithProviders(<Privacy />);

      expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();

      // Documents zero document uploads and local processing
      expect(screen.getByText(/Zero Server Uploads:/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero Document Retention:/i)).toBeInTheDocument();

      // Explicitly discloses localStorage key pdftooling-theme
      expect(screen.getByText(/pdftooling-theme/i)).toBeInTheDocument();

      // Explicitly discloses Google Fonts requests
      expect(screen.getByText(/Google Fonts:/i)).toBeInTheDocument();
      expect(screen.getByText(/fonts.googleapis.com/i)).toBeInTheDocument();
      expect(screen.getByText(/fonts.gstatic.com/i)).toBeInTheDocument();
    });

    it('conditionally displays privacy contact details based on siteConfig.supportEmail', () => {
      // With supportEmail = null
      siteConfig.supportEmail = null;
      const { unmount } = renderWithProviders(<Privacy />);
      expect(screen.getByText(/Review our/i)).toBeInTheDocument();
      unmount();

      // With supportEmail set
      siteConfig.supportEmail = 'privacy-test@example.com';
      renderWithProviders(<Privacy />);
      expect(screen.getByRole('link', { name: 'privacy-test@example.com' })).toHaveAttribute(
        'href',
        'mailto:privacy-test@example.com'
      );

      // Clean up
      siteConfig.supportEmail = null;
    });
  });

  describe('Terms Page (/terms)', () => {
    it('accurately displays pre-launch legal template notice and disclaimers without fake legal entities', () => {
      renderWithProviders(<Terms />);

      expect(screen.getByRole('heading', { level: 1, name: /Terms of Service/i })).toBeInTheDocument();

      // Pre-launch legal notice
      expect(screen.getByText(/Pre-Launch Legal Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Final corporate entity details, governing jurisdiction, and formal legal representation are pending/i)).toBeInTheDocument();

      // Core disclaimer sections
      expect(screen.getByRole('heading', { level: 2, name: /1. Description of Service/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /3. Document Ownership & User Responsibility/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /5. Disclaimer of Warranties/i })).toBeInTheDocument();
      expect(screen.getByText(/Provided "As-Is" Without Express or Implied Warranties/i)).toBeInTheDocument();
    });

    it('conditionally displays terms contact details based on siteConfig.supportEmail', () => {
      siteConfig.supportEmail = null;
      const { unmount } = renderWithProviders(<Terms />);
      expect(screen.getByText(/A verified support address will be assigned before production launch/i)).toBeInTheDocument();
      unmount();

      siteConfig.supportEmail = 'legal-test@example.com';
      renderWithProviders(<Terms />);
      expect(screen.getByRole('link', { name: 'legal-test@example.com' })).toHaveAttribute(
        'href',
        'mailto:legal-test@example.com'
      );

      siteConfig.supportEmail = null;
    });
  });
});
