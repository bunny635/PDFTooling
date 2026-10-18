/**
 * Download & Blob Lifecycle Infrastructure
 * Pure client-side utilities for output validation, filename sanitization,
 * and safe browser download triggering with asynchronous object URL cleanup.
 */

/**
 * Validates that an object is a non-empty Blob compatible with expected MIME types.
 *
 * @param {any} blob
 * @param {object} [options]
 * @param {string} [options.expectedMimeType='application/pdf']
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateOutputBlob(blob, options = {}) {
  const { expectedMimeType = 'application/pdf' } = options;

  if (!blob) {
    return { valid: false, error: 'No output document generated (Blob is undefined or null).' };
  }

  // Check instance of Blob or duck-type in synthetic environments
  const isBlobLike =
    (typeof Blob !== 'undefined' && blob instanceof Blob) ||
    (typeof blob === 'object' && typeof blob.size === 'number' && typeof blob.slice === 'function');

  if (!isBlobLike) {
    return { valid: false, error: 'Generated output is not a valid Blob document.' };
  }

  if (blob.size <= 0) {
    return { valid: false, error: 'Generated document is empty (0 bytes).' };
  }

  // Validate non-empty MIME type compatibility if specified
  if (expectedMimeType && blob.type && blob.type.trim() !== '') {
    const actualMime = blob.type.toLowerCase();
    const expected = expectedMimeType.toLowerCase();

    const isPdfCompatible =
      expected === 'application/pdf' &&
      (actualMime === 'application/pdf' ||
        actualMime === 'application/x-pdf' ||
        actualMime === 'application/acrobat');

    const isImageCompatible =
      expected.startsWith('image/') && actualMime.startsWith('image/');

    const isExact = actualMime === expected;

    if (!isPdfCompatible && !isImageCompatible && !isExact) {
      return {
        valid: false,
        error: `Output document MIME type (${blob.type}) conflicts with expected ${expectedMimeType}.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Output-type-aware filename sanitization.
 * Prevents path traversal, strips illegal OS characters, trims whitespace and trailing dots,
 * and guarantees appropriate output extension without trusting arbitrary extensions.
 *
 * @param {string} [rawName]
 * @param {object} [options]
 * @param {string} [options.expectedExtension='.pdf']
 * @param {string} [options.fallback='document.pdf']
 * @returns {string}
 */
export function sanitizeFilename(rawName, options = {}) {
  const { expectedExtension = '.pdf', fallback = 'document.pdf' } = options;

  if (typeof rawName !== 'string' || !rawName.trim()) {
    return fallback;
  }

  let cleaned = rawName.trim();

  // 1. Remove path traversal patterns (e.g., ../, ..\, /etc/passwd)
  cleaned = cleaned.replace(/^[a-zA-Z]:[\\/]/, ''); // Strip Windows drive letter
  cleaned = cleaned.replace(/^(\.\.[/\\])+/, '');
  cleaned = cleaned.replace(/[/\\]+/g, '-');

  // 2. Strip illegal filesystem characters: < > : " / \ | ? * and control chars (0x00-0x1F)
  cleaned = cleaned.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

  // 3. Normalize multiple spaces, dots, or dashes
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/-{2,}/g, '-');

  // 4. Strip leading and trailing dots, spaces, dashes, or underscores
  cleaned = cleaned.replace(/^[\s._-]+|[\s._-]+$/g, '');

  const extClean = expectedExtension.replace(/^\./, '').toLowerCase();
  if (!cleaned || cleaned.toLowerCase() === extClean) {
    return fallback;
  }

  // 5. Enforce appropriate expected extension (case-insensitive)
  const ext = expectedExtension.toLowerCase();
  if (!cleaned.toLowerCase().endsWith(ext)) {
    cleaned = `${cleaned}${expectedExtension}`;
  }

  // Ensure result isn't just the extension (e.g. ".pdf")
  if (cleaned.toLowerCase() === ext) {
    return fallback;
  }

  return cleaned;
}

/**
 * Creates an object URL for a validated Blob.
 *
 * @param {Blob} blob
 * @returns {string}
 */
export function createDownloadUrl(blob) {
  const validation = validateOutputBlob(blob);
  if (!validation.valid) {
    throw new Error(validation.error || 'Cannot create download URL for invalid Blob.');
  }

  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Object URL creation is not supported in this environment.');
  }

  return URL.createObjectURL(blob);
}

/**
 * Safely revokes an object URL.
 *
 * @param {string} url
 */
export function revokeDownloadUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revocation errors in teardown environments
    }
  }
}

/**
 * Triggers a real browser file download using a temporary anchor element.
 * Refinement: Does NOT revoke the URL synchronously immediately after clicking,
 * allowing browser download engines sufficient time to read the Blob.
 * Schedules revocation asynchronously while also returning the URL for component cleanup.
 *
 * @param {Blob} blob
 * @param {string} suggestedFilename
 * @param {object} [options]
 * @param {number} [options.revokeDelayMs=1000]
 * @param {string} [options.expectedExtension='.pdf']
 * @returns {{ success: boolean, filename: string, url: string }}
 */
export function triggerBlobDownload(blob, suggestedFilename, options = {}) {
  const { revokeDelayMs = 1000, expectedExtension = '.pdf' } = options;

  const validation = validateOutputBlob(blob);
  if (!validation.valid) {
    throw new Error(validation.error || 'Cannot trigger download for invalid Blob.');
  }

  const safeFilename = sanitizeFilename(suggestedFilename, {
    expectedExtension,
    fallback: `document${expectedExtension}`,
  });

  const url = createDownloadUrl(blob);

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = url;
    anchor.download = safeFilename;
    anchor.rel = 'noopener';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Asynchronously schedule revocation so the browser download manager can consume the blob
    if (revokeDelayMs > 0) {
      setTimeout(() => {
        revokeDownloadUrl(url);
      }, revokeDelayMs);
    }
  }

  return {
    success: true,
    filename: safeFilename,
    url,
  };
}
