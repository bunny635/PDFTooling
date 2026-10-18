import { describe, it, expect } from 'vitest';
import {
  TOOLS,
  TOOL_MAP,
  getToolBySlug,
  isValidToolSlug,
  getAllTools,
  getToolsByCategory,
} from '../config/toolRegistry.js';

describe('toolRegistry', () => {
  it('contains exactly the six core MVP tools', () => {
    expect(TOOLS).toHaveLength(6);
    const expectedSlugs = [
      'merge-pdf',
      'split-pdf',
      'rotate-pdf',
      'delete-pages',
      'reorder-pages',
      'jpg-to-pdf',
    ];
    const actualSlugs = TOOLS.map((t) => t.slug);
    expect(actualSlugs).toEqual(expectedSlugs);
  });

  it('ensures each tool has required schema fields and valid routes', () => {
    TOOLS.forEach((tool) => {
      expect(tool.id).toBeTruthy();
      expect(tool.slug).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.route).toBe(`/tools/${tool.slug}`);
      expect(tool.description).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(Array.isArray(tool.acceptedMimeTypes)).toBe(true);
      expect(typeof tool.multiple).toBe('boolean');
      expect(typeof tool.minFiles).toBe('number');
      expect(tool.minFiles).toBeGreaterThanOrEqual(1);
    });
  });

  it('correctly maps tools by slug in TOOL_MAP', () => {
    expect(TOOL_MAP['merge-pdf'].name).toBe('Merge PDF');
    expect(TOOL_MAP['jpg-to-pdf'].category).toBe('convert');
  });

  it('retrieves tools with getToolBySlug', () => {
    expect(getToolBySlug('split-pdf')?.name).toBe('Split PDF');
    expect(getToolBySlug('non-existent')).toBeUndefined();
    expect(getToolBySlug('')).toBeUndefined();
  });

  it('validates slugs with isValidToolSlug', () => {
    expect(isValidToolSlug('rotate-pdf')).toBe(true);
    expect(isValidToolSlug('unknown-tool')).toBe(false);
  });

  it('filters tools by category', () => {
    const organizeTools = getToolsByCategory('organize');
    expect(organizeTools.map((t) => t.slug)).toEqual([
      'merge-pdf',
      'rotate-pdf',
      'reorder-pages',
    ]);
  });
});
