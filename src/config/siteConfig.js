/**
 * Site Configuration for PDFTooling
 * Single source of truth for platform metadata and contact channels.
 */

export const siteConfig = {
  name: 'PDFTooling',
  description: 'Private, browser-first PDF utilities suite.',
  // PRE-LAUNCH REQUIREMENT: supportEmail remains null until a verified support address is provisioned.
  // Contact, Privacy, and Terms pages conditionally render mailto links only when supportEmail is truthy.
  supportEmail: null,
  version: '0.1.0',
  lastUpdated: 'October 2026',
};
