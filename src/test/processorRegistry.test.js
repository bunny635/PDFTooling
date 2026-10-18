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

  it('marks all six tools as available and functional in production', () => {
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

    // 3. Rotate PDF is active and functional
    const rotateProc = getToolProcessor('rotate-pdf');
    expect(rotateProc).toBeDefined();
    expect(rotateProc.id).toBe('rotate-pdf');
    expect(rotateProc.isAvailable).toBe(true);
    expect(rotateProc.status).toBe('available');
    expect(typeof rotateProc.execute).toBe('function');
    expect(isProcessorAvailable('rotate-pdf')).toBe(true);

    // 4. Delete Pages is active and functional
    const deleteProc = getToolProcessor('delete-pages');
    expect(deleteProc).toBeDefined();
    expect(deleteProc.id).toBe('delete-pages');
    expect(deleteProc.isAvailable).toBe(true);
    expect(deleteProc.status).toBe('available');
    expect(typeof deleteProc.execute).toBe('function');
    expect(isProcessorAvailable('delete-pages')).toBe(true);

    // 5. Reorder Pages is active and functional
    const reorderProc = getToolProcessor('reorder-pages');
    expect(reorderProc).toBeDefined();
    expect(reorderProc.id).toBe('reorder-pages');
    expect(reorderProc.isAvailable).toBe(true);
    expect(reorderProc.status).toBe('available');
    expect(typeof reorderProc.execute).toBe('function');
    expect(isProcessorAvailable('reorder-pages')).toBe(true);

    // 6. JPG to PDF is active and functional
    const jpgProc = getToolProcessor('jpg-to-pdf');
    expect(jpgProc).toBeDefined();
    expect(jpgProc.id).toBe('jpg-to-pdf');
    expect(jpgProc.isAvailable).toBe(true);
    expect(jpgProc.status).toBe('available');
    expect(typeof jpgProc.execute).toBe('function');
    expect(isProcessorAvailable('jpg-to-pdf')).toBe(true);
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
      'custom-tool': {
        id: 'custom-tool',
        isAvailable: true,
        execute: mockExecute,
      },
    };

    // With injected adapter
    const injected = getToolProcessor('custom-tool', customAdapters);
    expect(injected.isAvailable).toBe(true);
    expect(injected.execute).toBe(mockExecute);
    expect(isProcessorAvailable('custom-tool', customAdapters)).toBe(true);

    // Production registry remains unaltered (custom-tool does not exist in prod)
    const prod = getToolProcessor('custom-tool');
    expect(prod).toBeUndefined();
    expect(isProcessorAvailable('custom-tool')).toBe(false);
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

  it('lazily loads and executes rotatePdf upon execute invocation', async () => {
    const rotateProc = getToolProcessor('rotate-pdf');
    expect(typeof rotateProc.execute).toBe('function');

    // Calling execute dynamically imports rotatePdf and enforces its contract
    await expect(rotateProc.execute({ files: [] })).rejects.toThrow(
      /requires exactly one source document/i
    );
  });

  it('lazily loads and executes deletePdf upon execute invocation', async () => {
    const deleteProc = getToolProcessor('delete-pages');
    expect(typeof deleteProc.execute).toBe('function');

    // Calling execute dynamically imports deletePdf and enforces its contract
    await expect(deleteProc.execute({ files: [] })).rejects.toThrow(
      /requires exactly one source document/i
    );
  });

  it('lazily loads and executes reorderPdf upon execute invocation', async () => {
    const reorderProc = getToolProcessor('reorder-pages');
    expect(typeof reorderProc.execute).toBe('function');

    // Calling execute dynamically imports reorderPdf and enforces its contract
    await expect(reorderProc.execute({ files: [] })).rejects.toThrow(
      /requires exactly one source document/i
    );
  });

  it('lazily loads and executes jpgToPdf upon execute invocation', async () => {
    const jpgProc = getToolProcessor('jpg-to-pdf');
    expect(typeof jpgProc.execute).toBe('function');

    // Calling execute dynamically imports jpgToPdf and enforces its contract
    await expect(jpgProc.execute({ files: [] })).rejects.toThrow(
      /at least one jpeg image is required/i
    );
  });
});
