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

  it('marks merge-pdf as available and the remaining five MVP tools as unavailable in production', () => {
    // 1. Merge PDF is active and functional
    const mergeProc = getToolProcessor('merge-pdf');
    expect(mergeProc).toBeDefined();
    expect(mergeProc.id).toBe('merge-pdf');
    expect(mergeProc.isAvailable).toBe(true);
    expect(mergeProc.status).toBe('available');
    expect(typeof mergeProc.execute).toBe('function');
    expect(isProcessorAvailable('merge-pdf')).toBe(true);

    // 2. The remaining five tools remain unavailable placeholders
    const unavailableSlugs = ['split-pdf', 'rotate-pdf', 'delete-pages', 'reorder-pages', 'jpg-to-pdf'];
    unavailableSlugs.forEach((slug) => {
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
      'split-pdf': {
        id: 'split-pdf',
        isAvailable: true,
        execute: mockExecute,
      },
    };

    // With injected adapter
    const injected = getToolProcessor('split-pdf', customAdapters);
    expect(injected.isAvailable).toBe(true);
    expect(injected.execute).toBe(mockExecute);
    expect(isProcessorAvailable('split-pdf', customAdapters)).toBe(true);

    // Production registry remains unaltered (split-pdf is still unavailable in prod)
    const prod = getToolProcessor('split-pdf');
    expect(prod.isAvailable).toBe(false);
    expect(prod.execute).toBeNull();
    expect(isProcessorAvailable('split-pdf')).toBe(false);
  });

  it('lazily loads and executes mergePdf upon execute invocation', async () => {
    const mergeProc = getToolProcessor('merge-pdf');
    expect(typeof mergeProc.execute).toBe('function');

    // Calling execute dynamically imports mergePdf and enforces its contract
    await expect(mergeProc.execute({ files: [] })).rejects.toThrow(
      /at least two pdf files are required to merge/i
    );
  });
});
