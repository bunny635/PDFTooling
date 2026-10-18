import { PDFDocument } from 'pdf-lib';
import { parsePageOrder } from '../utils/pageSelection.js';

/**
 * Safely reads a File or Blob into an ArrayBuffer across both modern browsers
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
 * Pure client-side Reorder PDF Pages processor.
 * Rearranges pages of one source PDF into user-specified permutation order and produces
 * one downloadable PDF containing the same pages in the requested sequence.
 * Strictly local in-browser memory execution; zero server uploads or external network requests.
 *
 * Contract:
 * @param {object} params
 * @param {File[]} params.files - Ordered array containing exactly one source File object
 * @param {object} [params.options] - Reorder options
 * @param {string} [params.options.pageOrder] - Complete 1-based page sequence expression (e.g. "4, 1, 3, 2" or "4, 1-3")
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{ blob: Blob, suggestedFilename: string, mimeType: string }>}
 */
export async function reorderPdf({ files, options = {}, signal }) {
  checkAborted(signal);

  // 1. Minimum input validation: exactly one source document
  if (!Array.isArray(files) || files.length !== 1) {
    throw new Error('Reorder Pages requires exactly one source document.');
  }

  const file = files[0];
  const fileName = file?.name || 'Document';

  if (!file || typeof file.size !== 'number' || file.size === 0) {
    throw new Error(`File "${fileName}" is empty (0 bytes) and cannot be processed.`);
  }

  // 2. Read file binary buffer
  let arrayBuffer;
  try {
    arrayBuffer = await readFileAsArrayBuffer(file);
  } catch (readErr) {
    checkAborted(signal);
    throw new Error(`Failed to read file "${fileName}". Please ensure the file is accessible.`);
  }

  checkAborted(signal);

  // 3. Load PDFDocument with encryption detection
  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
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

  const totalPages = srcDoc.getPageCount();
  if (totalPages === 0) {
    throw new Error(`File "${fileName}" contains no pages and cannot be reordered.`);
  }

  // 4. Validate and parse requested page sequence
  const pageOrder = options?.pageOrder || options?.pageSelection || '';
  const parseResult = parsePageOrder(pageOrder, totalPages);
  if (!parseResult.valid) {
    throw new Error(parseResult.error || 'Invalid page order.');
  }

  const { pageIndices } = parseResult;

  // 5. Initialize fresh destination document and copy pages in exact requested order
  checkAborted(signal);
  const destDoc = await PDFDocument.create();

  const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
  for (let p = 0; p < copiedPages.length; p++) {
    checkAborted(signal);
    destDoc.addPage(copiedPages[p]);
  }

  checkAborted(signal);

  // 6. Save reordered document
  let reorderedBytes;
  try {
    reorderedBytes = await destDoc.save();
  } catch (saveErr) {
    checkAborted(signal);
    const msg = (saveErr?.message || '').toLowerCase();
    if (msg.includes('out of memory') || msg.includes('allocation')) {
      throw new Error('Out of browser memory while generating reordered PDF.');
    }
    throw new Error('Failed to assemble reordered PDF document. Please try again.');
  }

  checkAborted(signal);

  return {
    blob: new Blob([reorderedBytes], { type: 'application/pdf' }),
    suggestedFilename: 'reordered.pdf',
    mimeType: 'application/pdf',
  };
}
