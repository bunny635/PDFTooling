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

  it('marks merge-pdf and split-pdf as available and the remaining four MVP tools as unavailable in production', () => {
    // 1. Merge PDF is active and functional
    const mergeProc = getToolProcessor('merge-pdf');
    expect(mergeProc).toBeDefined();
    expect(mergeProc.id).toBe('merge-pdf');
    expect(mergeProc.isAvailable).toBe(true);
    expect(mergeProc.status).toBe('available');
    expect(typeof mergeProc.execute).toBe('function');
    expect(isProcessorAvailable('merge-pdf')).toBe(true);

    // 2. Split PDF is active and functional
    const splitProc = getToolProcessor('split-pdf');
    expect(splitProc).toBeDefined();
    expect(splitProc.id).toBe('split-pdf');
    expect(splitProc.isAvailable).toBe(true);
    expect(splitProc.status).toBe('available');
    expect(typeof splitProc.execute).toBe('function');
    expect(isProcessorAvailable('split-pdf')).toBe(true);

    // 3. The remaining four tools remain unavailable placeholders
    const unavailableSlugs = ['rotate-pdf', 'delete-pages', 'reorder-pages', 'jpg-to-pdf'];
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
      'rotate-pdf': {
        id: 'rotate-pdf',
        isAvailable: true,
        execute: mockExecute,
      },
    };

    // With injected adapter
    const injected = getToolProcessor('rotate-pdf', customAdapters);
    expect(injected.isAvailable).toBe(true);
    expect(injected.execute).toBe(mockExecute);
    expect(isProcessorAvailable('rotate-pdf', customAdapters)).toBe(true);

    // Production registry remains unaltered (rotate-pdf is still unavailable in prod)
    const prod = getToolProcessor('rotate-pdf');
    expect(prod.isAvailable).toBe(false);
    expect(prod.execute).toBeNull();
    expect(isProcessorAvailable('rotate-pdf')).toBe(false);
  });

  it('lazily loads and executes mergePdf upon execute invocation', async () => {
    const mergeProc = getToolProcessor('merge-pdf');
    expect(typeof mergeProc.execute).toBe('function');

    // Calling execute dynamically imports mergePdf and enforces its contract
    await expect(mergeProc.execute({ files: [] })).rejects.toThrow(
      /at least two pdf files are required to merge/i
    );
  });

  it('lazily loads and executes splitPdf upon execute invocation', async () => {
    const splitProc = getToolProcessor('split-pdf');
    expect(typeof splitProc.execute).toBe('function');

    // Calling execute dynamically imports splitPdf and enforces its contract
    await expect(splitProc.execute({ files: [] })).rejects.toThrow(
      /requires exactly one source document/i
    );
  });
});
