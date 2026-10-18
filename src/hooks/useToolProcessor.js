import { useState, useRef, useEffect, useCallback } from 'react';
import { getToolProcessor, isProcessorAvailable } from '../services/processorRegistry.js';
import {
  validateOutputBlob,
  sanitizeFilename,
  createDownloadUrl,
  revokeDownloadUrl,
  triggerBlobDownload,
} from '../utils/downloadManager.js';

export const EMPTY_OPTIONS = Object.freeze({});

/**
 * useToolProcessor
 * Reusable lifecycle hook managing tool processing states (idle, ready, processing, success, error),
 * input readiness separation, execution tokens, unmount guards, automatic URL cleanup, and download triggering.
 *
 * @param {object} params
 * @param {object} params.tool - Current tool descriptor from toolRegistry
 * @param {File[]} params.files - Currently selected files
 * @param {object} [params.options] - Tool-specific execution options
 * @param {object} [params.processorAdapter] - Optional dependency-injected test adapter
 */
export function useToolProcessor({ tool, files = [], options = EMPTY_OPTIONS, processorAdapter = null }) {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executionTokenRef = useRef(0);
  const isMountedRef = useRef(true);
  const retainedResultUrlsRef = useRef(new Set());
  const abortControllerRef = useRef(null);

  // Derive tool processor and availability (immutable production registry or injected test adapter)
  const processor = getToolProcessor(
    tool?.id,
    processorAdapter ? { [tool.id]: processorAdapter } : undefined
  );
  const processorAvailable = isProcessorAvailable(
    tool?.id,
    processorAdapter ? { [tool.id]: processorAdapter } : undefined
  );

  // Concern 1: Separate input readiness from processor availability
  const minFiles = tool?.minFiles || (tool?.id === 'merge-pdf' ? 2 : 1);
  const hasRequiredInputs = Array.isArray(files) && files.length >= minFiles;

  // canProcess: true only when both input requirements AND processor availability are met, and not currently processing
  const canProcess = Boolean(hasRequiredInputs && processorAvailable && status !== 'processing');

  // Cleanup helper specifically for component-retained result URLs
  const cleanupRetainedUrls = useCallback(() => {
    retainedResultUrlsRef.current.forEach((url) => {
      revokeDownloadUrl(url);
    });
    retainedResultUrlsRef.current.clear();
  }, []);

  // When files change, clear previous results, abort ongoing tasks, and compute status
  useEffect(() => {
    // Invalidate any in-flight asynchronous operations
    executionTokenRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clean up retained result URLs from previous execution
    cleanupRetainedUrls();
    setResult(null);
    setError(null);

    // Compute lifecycle status: remains idle unless both inputs and processor are available
    if (hasRequiredInputs && processorAvailable) {
      setStatus('ready');
    } else {
      setStatus('idle');
    }
  }, [files, hasRequiredInputs, processorAvailable, cleanupRetainedUrls]);

  // Component unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      executionTokenRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cleanupRetainedUrls();
    };
  }, [cleanupRetainedUrls]);

  // Execute processing
  const executeProcessing = useCallback(async () => {
    // Primary action and programmatic invocation guards
    if (!canProcess) return;
    if (status === 'processing') return;
    if (!hasRequiredInputs) return;
    if (!processorAvailable || typeof processor?.execute !== 'function') return;

    setStatus('processing');
    setError(null);

    // Clean up any previously held result URLs before starting new run
    cleanupRetainedUrls();
    setResult(null);

    // Increment token and initialize advisory AbortController
    const currentToken = ++executionTokenRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const output = await processor.execute({
        files,
        options,
        signal: controller.signal,
      });

      // Stale execution or unmount guard
      if (!isMountedRef.current || executionTokenRef.current !== currentToken) {
        return;
      }

      // Validate output blob
      const validation = validateOutputBlob(output?.blob, {
        expectedMimeType: output?.mimeType || 'application/pdf',
      });
      if (!validation.valid) {
        throw new Error(validation.error || 'Processor produced an invalid document.');
      }

      // Sanitize output filename
      const safeFilename = sanitizeFilename(output?.suggestedFilename, {
        expectedExtension: '.pdf',
        fallback: `${tool?.slug || 'document'}-result.pdf`,
      });

      // Create retained object URL for result state
      const url = createDownloadUrl(output.blob);
      retainedResultUrlsRef.current.add(url);

      setResult({
        blob: output.blob,
        filename: safeFilename,
        downloadUrl: url,
        mimeType: output.mimeType || 'application/pdf',
      });
      setStatus('success');
    } catch (err) {
      // Stale execution or unmount guard
      if (!isMountedRef.current || executionTokenRef.current !== currentToken) {
        return;
      }

      // Cleanup any URLs created during this attempt
      cleanupRetainedUrls();
      setResult(null);
      setError(err?.message || 'Processing failed. Please check your files and try again.');
      setStatus('error');
    } finally {
      if (executionTokenRef.current === currentToken) {
        abortControllerRef.current = null;
      }
    }
  }, [canProcess, status, hasRequiredInputs, processorAvailable, processor, files, options, tool, cleanupRetainedUrls]);

  // Trigger download of successful result
  const downloadResult = useCallback(() => {
    if (!result?.blob || !result?.filename) return;
    triggerBlobDownload(result.blob, result.filename);
  }, [result]);

  // Manual reset helper
  const resetProcessing = useCallback(() => {
    executionTokenRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanupRetainedUrls();
    setResult(null);
    setError(null);
    setStatus(hasRequiredInputs && processorAvailable ? 'ready' : 'idle');
  }, [hasRequiredInputs, processorAvailable, cleanupRetainedUrls]);

  return {
    status,
    isProcessing: status === 'processing',
    hasRequiredInputs,
    isInputReady: hasRequiredInputs, // backwards-compatible alias
    isProcessorAvailable: processorAvailable,
    canProcess,
    result,
    error,
    minFiles,
    executeProcessing,
    downloadResult,
    resetProcessing,
  };
}
