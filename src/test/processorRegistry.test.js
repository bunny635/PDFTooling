import { describe, it, expect } from 'vitest';
import {
  PROCESSOR_REGISTRY,
  getToolProcessor,
  isProcessorAvailable,
} from '../services/processorRegistry.js';

describe('processorRegistry', () => {
  it('freezes the production registry to guarantee immutability (Refinement 2)', () => {
    expect(Object.isFrozen(PROCESSOR_REGISTRY)).toBe(true);
    const slugs = ['merge-pdf', 'split-pdf', 'rotate-pdf', 'delete-pages', 'reorder-pages', 'jpg-to-pdf'];
    slugs.forEach((slug) => {
      expect(Object.isFrozen(PROCESSOR_REGISTRY[slug])).toBe(true);
    });
  });

  it('marks all six MVP tools as unavailable in production', () => {
    const slugs = ['merge-pdf', 'split-pdf', 'rotate-pdf', 'delete-pages', 'reorder-pages', 'jpg-to-pdf'];

    slugs.forEach((slug) => {
      const proc = getToolProcessor(slug);
      expect(proc).toBeDefined();
      expect(proc.id).toBe(slug);
      expect(proc.isAvailable).toBe(false);
      expect(proc.status).toBe('unavailable');
      expect(proc.execute).toBeNull();
      expect(isProcessorAvailable(slug)).toBe(false);
    });
  });

  it('returns undefined for unknown tool IDs', () => {
    expect(getToolProcessor('unknown-tool')).toBeUndefined();
    expect(getToolProcessor('')).toBeUndefined();
    expect(getToolProcessor(null)).toBeUndefined();
    expect(isProcessorAvailable('unknown-tool')).toBe(false);
  });

  it('supports dependency-injected test adapters without mutating the production registry', () => {
    const mockExecute = async () => ({ blob: new Blob(['mock']), suggestedFilename: 'mock.pdf' });
    const customAdapters = {
      'merge-pdf': {
        id: 'merge-pdf',
        isAvailable: true,
        execute: mockExecute,
      },
    };

    // With injected adapter
    const injected = getToolProcessor('merge-pdf', customAdapters);
    expect(injected.isAvailable).toBe(true);
    expect(injected.execute).toBe(mockExecute);
    expect(isProcessorAvailable('merge-pdf', customAdapters)).toBe(true);

    // Production registry remains unaltered
    const prod = getToolProcessor('merge-pdf');
    expect(prod.isAvailable).toBe(false);
    expect(prod.execute).toBeNull();
    expect(isProcessorAvailable('merge-pdf')).toBe(false);
  });
});
