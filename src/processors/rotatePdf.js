import { PDFDocument, degrees } from 'pdf-lib';
import { parsePageRange } from '../utils/pageSelection.js';

/**
 * Safely reads a File or Blob into an ArrayBuffer across modern browsers
 * and environments with FileReader fallback.
 *
 * @param {File|Blob} file
 * @returns {Promise<ArrayBuffer>}
 */
async function readFileAsArrayBuffer(file) {
  if (typeof file?.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error('ArrayBuffer file reading is not supported in this environment.');
}

/**
 * Checks whether an advisory AbortSignal has been triggered.
 *
 * @param {AbortSignal} [signal]
 */
function checkAborted(signal) {
  if (signal?.aborted) {
    throw new Error('Processing was canceled.');
  }
}

/**
 * Pure client-side Rotate PDF processor.
 * Rotates all pages or user-selected pages of one source PDF clockwise by 90°, 180°, or 270°.
 * Applies rotation relative to each page's current rotation, normalized modulo 360°.
 * Strictly local in-browser memory execution; zero server uploads or external network requests.
 *
 * Contract:
 * @param {object} params
 * @param {File[]} params.files - Ordered array containing exactly one source File object
 * @param {object} [params.options] - Rotation options
 * @param {number|string} [params.options.angle=90] - Clockwise rotation angle: 90, 180, or 270
 * @param {'all'|'selected'} [params.options.scope='all'] - Scope of pages to rotate
 * @param {string} [params.options.pageSelection] - 1-based page range expression when scope is 'selected'
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{ blob: Blob, suggestedFilename: string, mimeType: string }>}
 */
export async function rotatePdf({ files, options = {}, signal }) {
  checkAborted(signal);

  // 1. Minimum input validation: exactly one source document
  if (!Array.isArray(files) || files.length !== 1) {
    throw new Error('Rotate PDF requires exactly one source document.');
  }

  const file = files[0];
  const fileName = file?.name || 'Document';

  if (!file || typeof file.size !== 'number' || file.size === 0) {
    throw new Error(`File "${fileName}" is empty (0 bytes) and cannot be processed.`);
  }

  // 2. Validate rotation angle (90, 180, 270)
  const angle = Number(options?.angle);
  if (![90, 180, 270].includes(angle)) {
    throw new Error(
      'Invalid rotation angle. Supported angles are 90, 180, and 270 degrees clockwise.'
    );
  }

  // 3. Validate rotation scope ('all' or 'selected')
  const scope = options?.scope || 'all';
  if (scope !== 'all' && scope !== 'selected') {
    throw new Error('Invalid rotation scope. Supported scopes are "all" and "selected".');
  }

  // 4. Read file binary buffer
  let arrayBuffer;
  try {
    arrayBuffer = await readFileAsArrayBuffer(file);
  } catch (readErr) {
    checkAborted(signal);
    throw new Error(`Failed to read file "${fileName}". Please ensure the file is accessible.`);
  }

  checkAborted(signal);

  // 5. Load PDFDocument with encryption detection
  let doc;
  try {
    doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
  } catch (loadErr) {
    checkAborted(signal);
    const msg = (loadErr?.message || '').toLowerCase();
    const errName = loadErr?.name || '';

    if (
      msg.includes('password') ||
      msg.includes('encrypt') ||
      errName === 'EncryptedPDFError' ||
      errName === 'PasswordError'
    ) {
      throw new Error(
        `File "${fileName}" is password-protected or encrypted. Password-protected PDFs are not supported.`
      );
    }

    if (msg.includes('out of memory') || msg.includes('allocation')) {
      throw new Error(
        `Out of browser memory while loading "${fileName}". Please try with smaller files.`
      );
    }

    throw new Error(
      `File "${fileName}" appears to be corrupted or is not a valid PDF document.`
    );
  }

  checkAborted(signal);

  const totalPages = doc.getPageCount();
  if (totalPages === 0) {
    throw new Error(`File "${fileName}" contains no pages and cannot be rotated.`);
  }

  // 6. If scope is 'selected', validate and parse requested page selection
  let selectedIndicesSet = null;
  if (scope === 'selected') {
    const pageSelection = options?.pageSelection || '';
    const parseResult = parsePageRange(pageSelection, totalPages);
    if (!parseResult.valid) {
      throw new Error(parseResult.error || 'Invalid page selection.');
    }
    selectedIndicesSet = new Set(parseResult.pageIndices);
  }

  // 7. Apply rotation to target pages relative to existing orientation
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    checkAborted(signal);
    if (scope === 'all' || (selectedIndicesSet && selectedIndicesSet.has(i))) {
      const page = pages[i];
      const rawCurrent = page.getRotation();
      const currentAngle =
        typeof rawCurrent === 'object' && rawCurrent !== null
          ? rawCurrent.angle || 0
          : typeof rawCurrent === 'number'
          ? rawCurrent
          : 0;

      const newAngle = ((currentAngle + angle) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
  }

  checkAborted(signal);

  // 8. Save modified document
  let rotatedBytes;
  try {
    rotatedBytes = await doc.save();
  } catch (saveErr) {
    checkAborted(signal);
    const msg = (saveErr?.message || '').toLowerCase();
    if (msg.includes('out of memory') || msg.includes('allocation')) {
      throw new Error('Out of browser memory while generating rotated PDF.');
    }
    throw new Error('Failed to assemble rotated PDF document. Please try again.');
  }

  checkAborted(signal);

  return {
    blob: new Blob([rotatedBytes], { type: 'application/pdf' }),
    suggestedFilename: 'rotated.pdf',
    mimeType: 'application/pdf',
  };
}
