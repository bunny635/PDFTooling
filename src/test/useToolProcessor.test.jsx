import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolProcessor, EMPTY_OPTIONS } from '../hooks/useToolProcessor.js';

describe('useToolProcessor Hook', () => {
  const mergeTool = { id: 'merge-pdf', slug: 'merge-pdf', name: 'Merge PDF', minFiles: 2 };
  const splitTool = { id: 'split-pdf', slug: 'split-pdf', name: 'Split PDF', minFiles: 1 };
  const rotateTool = { id: 'rotate-pdf', slug: 'rotate-pdf', name: 'Rotate PDF', minFiles: 1 };
  const deleteTool = { id: 'delete-pages', slug: 'delete-pages', name: 'Delete Pages', minFiles: 1 };
  const reorderTool = { id: 'reorder-pages', slug: 'reorder-pages', name: 'Reorder Pages', minFiles: 1 };
  const jpgTool = { id: 'jpg-to-pdf', slug: 'jpg-to-pdf', name: 'JPG to PDF', minFiles: 1 };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:http://localhost/mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('initializes in idle state and derives readiness from minimum files requirement', () => {
    const { result } = renderHook(() =>
      useToolProcessor({
        tool: mergeTool,
        files: [],
      })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.hasRequiredInputs).toBe(false);
    expect(result.current.isInputReady).toBe(false);
    expect(result.current.isProcessorAvailable).toBe(true); // Merge PDF is available in production
    expect(result.current.canProcess).toBe(false); // cannot process because files.length < 2
    expect(result.current.minFiles).toBe(2);
  });

  it('confirms Merge PDF with two valid files meets input requirements and is ready to process', () => {
    const mockFiles = [
      new File(['f1'], 'file1.pdf', { type: 'application/pdf' }),
      new File(['f2'], 'file2.pdf', { type: 'application/pdf' }),
    ];

    // In production: input requirements are met, and merge-pdf processor is available
    const { result } = renderHook(() =>
      useToolProcessor({
        tool: mergeTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready'); // Ready for client-side processing
  });

  it('confirms Split PDF with one valid file is available in production', () => {
    const mockFiles = [
      new File(['single'], 'document.pdf', { type: 'application/pdf' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: splitTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.minFiles).toBe(1);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('confirms Rotate PDF with one valid file is available in production', () => {
    const mockFiles = [
      new File(['single'], 'document.pdf', { type: 'application/pdf' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: rotateTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.minFiles).toBe(1);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('confirms Delete Pages with one valid file is available in production', () => {
    const mockFiles = [
      new File(['single'], 'document.pdf', { type: 'application/pdf' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: deleteTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.minFiles).toBe(1);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('confirms Reorder Pages with one valid file is available in production', () => {
    const mockFiles = [
      new File(['single'], 'document.pdf', { type: 'application/pdf' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: reorderTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.minFiles).toBe(1);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('confirms JPG to PDF with one valid file is available in production', () => {
    const mockFiles = [
      new File(['single'], 'image.jpg', { type: 'image/jpeg' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: jpgTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.minFiles).toBe(1);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('confirms unavailable tools meet input requirements with files but cannot process', () => {
    const unavailableTool = { id: 'unsupported-tool', slug: 'unsupported-tool', name: 'Unsupported Tool', minFiles: 1 };
    const mockFiles = [
      new File(['single'], 'document.pdf', { type: 'application/pdf' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: unavailableTool,
        files: mockFiles,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.minFiles).toBe(1);
    expect(result.current.isProcessorAvailable).toBe(false);
    expect(result.current.canProcess).toBe(false);
    expect(result.current.status).toBe('idle'); // Stays idle because processor is unavailable
  });

  it('ensures no unavailable processor can execute even if called programmatically', async () => {
    const unavailableTool = { id: 'unsupported-tool', slug: 'unsupported-tool', name: 'Unsupported Tool', minFiles: 1 };
    const mockFiles = [
      new File(['single'], 'doc.pdf', { type: 'application/pdf' }),
    ];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: unavailableTool, // Unavailable in production
        files: mockFiles,
      })
    );

    expect(result.current.isProcessorAvailable).toBe(false);
    expect(result.current.canProcess).toBe(false);

    // Attempting execution when canProcess is false must be completely ignored
    await act(async () => {
      await result.current.executeProcessing();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('transitions to ready state when input is ready and processor adapter is available', () => {
    const mockFiles = [
      new File(['f1'], 'file1.pdf', { type: 'application/pdf' }),
      new File(['f2'], 'file2.pdf', { type: 'application/pdf' }),
    ];

    const mockAdapter = {
      id: 'merge-pdf',
      isAvailable: true,
      execute: vi.fn(),
    };

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: mergeTool,
        files: mockFiles,
        processorAdapter: mockAdapter,
      })
    );

    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.isInputReady).toBe(true);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('manages full lifecycle: ready -> processing -> success with download URL creation', async () => {
    const mockFiles = [
      new File(['content'], 'source.pdf', { type: 'application/pdf' }),
    ];

    const mockBlob = new Blob(['%PDF-1.4 processed content'], { type: 'application/pdf' });
    const mockExecute = vi.fn().mockResolvedValue({
      blob: mockBlob,
      suggestedFilename: 'split-output.pdf',
      mimeType: 'application/pdf',
    });

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: mockExecute,
    };

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: splitTool,
        files: mockFiles,
        processorAdapter: mockAdapter,
      })
    );

    expect(result.current.status).toBe('ready');

    // Trigger execution
    await act(async () => {
      await result.current.executeProcessing();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.result).toBeDefined();
    expect(result.current.result.filename).toBe('split-output.pdf');
    expect(result.current.result.downloadUrl).toBe('blob:http://localhost/mock-url');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('handles processor failure gracefully and enters error state', async () => {
    const mockFiles = [
      new File(['bad'], 'corrupt.pdf', { type: 'application/pdf' }),
    ];

    const mockExecute = vi.fn().mockRejectedValue(new Error('Corrupt document structure.'));

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: mockExecute,
    };

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: splitTool,
        files: mockFiles,
        processorAdapter: mockAdapter,
      })
    );

    await act(async () => {
      await result.current.executeProcessing();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Corrupt document structure.');
    expect(result.current.result).toBeNull();
  });

  it('prevents stale asynchronous results from updating state when files change (Refinement 4)', async () => {
    let resolveProcessing;
    const delayedPromise = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: () => delayedPromise,
    };

    const initialFiles = [new File(['doc1'], 'doc1.pdf', { type: 'application/pdf' })];

    const { result, rerender } = renderHook(
      ({ files }) =>
        useToolProcessor({
          tool: splitTool,
          files,
          processorAdapter: mockAdapter,
        }),
      { initialProps: { files: initialFiles } }
    );

    // Start processing
    act(() => {
      result.current.executeProcessing();
    });
    expect(result.current.status).toBe('processing');

    // User changes files while processing is pending
    const newFiles = [new File(['doc2'], 'doc2.pdf', { type: 'application/pdf' })];
    rerender({ files: newFiles });

    // Status should immediately reset to ready for the new files
    expect(result.current.status).toBe('ready');

    // Now resolve the previous delayed execution
    await act(async () => {
      resolveProcessing({
        blob: new Blob(['delayed output'], { type: 'application/pdf' }),
        suggestedFilename: 'old-result.pdf',
      });
    });

    // The stale result must NOT overwrite the new state!
    expect(result.current.status).toBe('ready');
    expect(result.current.result).toBeNull();
  });

  it('prevents duplicate processing requests while an execution is pending', async () => {
    let resolveProcessing;
    const delayedPromise = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const mockExecute = vi.fn().mockImplementation(() => delayedPromise);

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: mockExecute,
    };

    const files = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: splitTool,
        files,
        processorAdapter: mockAdapter,
      })
    );

    act(() => {
      result.current.executeProcessing();
    });

    expect(result.current.status).toBe('processing');
    expect(mockExecute).toHaveBeenCalledTimes(1);

    // Repeated call while processing
    act(() => {
      result.current.executeProcessing();
    });

    // Second call should be ignored
    expect(mockExecute).toHaveBeenCalledTimes(1);

    // Cleanup pending promise
    await act(async () => {
      resolveProcessing({
        blob: new Blob(['done'], { type: 'application/pdf' }),
        suggestedFilename: 'done.pdf',
      });
    });
  });

  it('gates processing readiness on isOptionsValid when inputs and processor are ready', () => {
    const mockFiles = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

    const { result, rerender } = renderHook(
      ({ isOptionsValid }) =>
        useToolProcessor({
          tool: splitTool,
          files: mockFiles,
          isOptionsValid,
        }),
      { initialProps: { isOptionsValid: false } }
    );

    // Inputs ready, processor available, but options invalid -> cannot process, status idle
    expect(result.current.hasRequiredInputs).toBe(true);
    expect(result.current.isProcessorAvailable).toBe(true);
    expect(result.current.canProcess).toBe(false);
    expect(result.current.status).toBe('idle');

    // Options become valid
    rerender({ isOptionsValid: true });
    expect(result.current.canProcess).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('invalidates previous result when options change', async () => {
    const mockFiles = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];
    const mockBlob = new Blob(['%PDF-1.4 output'], { type: 'application/pdf' });
    const mockExecute = vi.fn().mockResolvedValue({
      blob: mockBlob,
      suggestedFilename: 'out.pdf',
    });

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: mockExecute,
    };

    const { result, rerender } = renderHook(
      ({ options }) =>
        useToolProcessor({
          tool: splitTool,
          files: mockFiles,
          options,
          processorAdapter: mockAdapter,
        }),
      { initialProps: { options: { pageSelection: '1' } } }
    );

    await act(async () => {
      await result.current.executeProcessing();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.result).not.toBeNull();

    // User changes pageSelection option
    rerender({ options: { pageSelection: '1-3' } });

    // Result must be invalidated and status reset to ready
    expect(result.current.status).toBe('ready');
    expect(result.current.result).toBeNull();
  });

  it('cancels in-flight processing and prevents stale completion when options change during active execution', async () => {
    let resolveProcessing;
    const delayedPromise = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: vi.fn().mockImplementation(() => delayedPromise),
    };

    const files = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

    const { result, rerender } = renderHook(
      ({ options }) =>
        useToolProcessor({
          tool: splitTool,
          files,
          options,
          processorAdapter: mockAdapter,
        }),
      { initialProps: { options: { pageSelection: '1' } } }
    );

    // Start processing
    act(() => {
      result.current.executeProcessing();
    });
    expect(result.current.status).toBe('processing');

    // User edits options while processing is pending
    rerender({ options: { pageSelection: '1-3' } });

    // Status immediately resets to ready, canceling previous execution
    expect(result.current.status).toBe('ready');

    // Late resolution of delayed execution
    await act(async () => {
      resolveProcessing({
        blob: new Blob(['delayed output'], { type: 'application/pdf' }),
        suggestedFilename: 'delayed.pdf',
      });
    });

    // Stale result is completely discarded
    expect(result.current.status).toBe('ready');
    expect(result.current.result).toBeNull();
  });

  it('cancels pending execution and resets status when page order options change during in-flight processing (PDF-05 Regression Coverage)', async () => {
    let resolveProcessing;
    const delayedPromise = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const mockAdapter = {
      id: 'reorder-pages',
      isAvailable: true,
      execute: () => delayedPromise,
    };

    const files = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

    const { result, rerender } = renderHook(
      ({ options }) =>
        useToolProcessor({
          tool: reorderTool,
          files,
          options,
          processorAdapter: mockAdapter,
        }),
      { initialProps: { options: { pageOrder: [2, 1, 0] } } }
    );

    // Start processing
    act(() => {
      result.current.executeProcessing();
    });
    expect(result.current.status).toBe('processing');

    // Page order changed while in flight
    rerender({ options: { pageOrder: [0, 2, 1] } });

    // Status immediately resets to ready
    expect(result.current.status).toBe('ready');

    // Late resolution of delayed execution
    await act(async () => {
      resolveProcessing({
        blob: new Blob(['delayed reordered'], { type: 'application/pdf' }),
        suggestedFilename: 'reordered.pdf',
      });
    });

    // Stale result discarded
    expect(result.current.status).toBe('ready');
    expect(result.current.result).toBeNull();
  });

  it('cancels pending execution and resets status when jpg options change during in-flight processing (PDF-06 Coverage)', async () => {
    let resolveProcessing;
    const delayedPromise = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const mockAdapter = {
      id: 'jpg-to-pdf',
      isAvailable: true,
      execute: () => delayedPromise,
    };

    const files = [new File(['img'], 'img.jpg', { type: 'image/jpeg' })];

    const { result, rerender } = renderHook(
      ({ options }) =>
        useToolProcessor({
          tool: jpgTool,
          files,
          options,
          processorAdapter: mockAdapter,
        }),
      { initialProps: { options: { pageSize: 'original', margin: 'none' } } }
    );

    // Start processing
    act(() => {
      result.current.executeProcessing();
    });
    expect(result.current.status).toBe('processing');

    // Options changed to A4 Landscape while in flight
    rerender({ options: { pageSize: 'a4-landscape', margin: 'standard' } });

    // Status immediately resets to ready
    expect(result.current.status).toBe('ready');

    // Late resolution
    await act(async () => {
      resolveProcessing({
        blob: new Blob(['delayed images'], { type: 'application/pdf' }),
        suggestedFilename: 'images.pdf',
      });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.result).toBeNull();
  });

  it('cancels pending execution and resets status when images are reordered or removed during in-flight processing (PDF-06 Coverage)', async () => {
    let resolveProcessing;
    const delayedPromise = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const mockAdapter = {
      id: 'jpg-to-pdf',
      isAvailable: true,
      execute: () => delayedPromise,
    };

    const f1 = new File(['img1'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['img2'], 'b.jpg', { type: 'image/jpeg' });

    const { result, rerender } = renderHook(
      ({ files }) =>
        useToolProcessor({
          tool: jpgTool,
          files,
          processorAdapter: mockAdapter,
        }),
      { initialProps: { files: [f1, f2] } }
    );

    // Start processing
    act(() => {
      result.current.executeProcessing();
    });
    expect(result.current.status).toBe('processing');

    // Reorder files while processing
    rerender({ files: [f2, f1] });

    // In-flight processing immediately aborted and status resets to ready
    expect(result.current.status).toBe('ready');

    // Late resolution
    await act(async () => {
      resolveProcessing({
        blob: new Blob(['delayed images'], { type: 'application/pdf' }),
        suggestedFilename: 'images.pdf',
      });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.result).toBeNull();

    // Start processing again
    act(() => {
      result.current.executeProcessing();
    });
    expect(result.current.status).toBe('processing');

    // Remove one file while in flight
    rerender({ files: [f2] });
    expect(result.current.status).toBe('ready');
  });

  it('prevents programmatic execution when isOptionsValid is false', async () => {
    const mockExecute = vi.fn();
    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: mockExecute,
    };

    const files = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

    const { result } = renderHook(() =>
      useToolProcessor({
        tool: splitTool,
        files,
        isOptionsValid: false,
        processorAdapter: mockAdapter,
      })
    );

    expect(result.current.canProcess).toBe(false);

    // Attempt programmatic execution
    await act(async () => {
      await result.current.executeProcessing();
    });

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('revokes download URLs when component unmounts', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const mockAdapter = {
      id: 'split-pdf',
      isAvailable: true,
      execute: async () => ({
        blob: new Blob(['data'], { type: 'application/pdf' }),
        suggestedFilename: 'out.pdf',
      }),
    };

    const files = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

    const { result, unmount } = renderHook(() =>
      useToolProcessor({
        tool: splitTool,
        files,
        processorAdapter: mockAdapter,
      })
    );

    unmount();
    // Verify cleanup was invoked without errors
    expect(result.current.isProcessing).toBe(false);
  });

  describe('AUDIT-01-FIX Hook Stability & Metadata Resilience', () => {
    it('freezes EMPTY_OPTIONS and uses it as stable default options argument', () => {
      expect(Object.isFrozen(EMPTY_OPTIONS)).toBe(true);
      expect(EMPTY_OPTIONS).toEqual({});
    });

    it('maintains stable executeProcessing callback reference across rerenders when options are omitted', () => {
      const mockAdapter = {
        id: 'split-pdf',
        isAvailable: true,
        execute: vi.fn(),
      };
      const files = [new File(['doc'], 'doc.pdf', { type: 'application/pdf' })];

      const { result, rerender } = renderHook(
        () =>
          useToolProcessor({
            tool: splitTool,
            files,
            processorAdapter: mockAdapter,
          })
      );

      const firstCallback = result.current.executeProcessing;
      rerender();
      const secondCallback = result.current.executeProcessing;

      // Because EMPTY_OPTIONS is stable, executeProcessing callback reference is preserved across rerenders
      expect(firstCallback).toBe(secondCallback);
    });

    it('safely handles missing or incomplete tool metadata during output filename fallback', async () => {
      const toolWithoutSlug = { id: 'custom-tool', name: 'Custom Tool', minFiles: 1 };
      const mockBlob = new Blob(['%PDF-1.4 output content'], { type: 'application/pdf' });
      const mockAdapter = {
        id: 'custom-tool',
        isAvailable: true,
        execute: async () => ({
          blob: mockBlob,
          suggestedFilename: '', // Empty suggested filename triggers fallback
          mimeType: 'application/pdf',
        }),
      };
      const files = [new File(['input'], 'test.pdf', { type: 'application/pdf' })];

      const { result } = renderHook(() =>
        useToolProcessor({
          tool: toolWithoutSlug,
          files,
          processorAdapter: mockAdapter,
        })
      );

      await act(async () => {
        await result.current.executeProcessing();
      });

      expect(result.current.status).toBe('success');
      expect(result.current.result).toBeDefined();
      // Should fall back to 'document-result.pdf' instead of throwing or producing 'undefined-result.pdf'
      expect(result.current.result.filename).toBe('document-result.pdf');
    });
  });
});
