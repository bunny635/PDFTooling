import { PDFDocument } from 'pdf-lib';
import { parsePageRange } from '../utils/pageSelection.js';

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
 * Pure client-side Delete PDF Pages processor.
 * Removes user-specified pages from one source PDF and produces one downloadable PDF
 * containing all remaining pages in their original document order and orientation.
 * Strictly local in-browser memory execution; zero server uploads or external network requests.
 *
 * Contract:
 * @param {object} params
 * @param {File[]} params.files - Ordered array containing exactly one source File object
 * @param {object} [params.options] - Delete options
 * @param {string} [params.options.pageSelection] - 1-based page range expression of pages to delete (e.g. "1-3, 5")
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{ blob: Blob, suggestedFilename: string, mimeType: string }>}
 */
export async function deletePdf({ files, options = {}, signal }) {
  checkAborted(signal);

  // 1. Minimum input validation: exactly one source document
  if (!Array.isArray(files) || files.length !== 1) {
    throw new Error('Delete Pages requires exactly one source document.');
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
    throw new Error(`File "${fileName}" contains no pages and cannot be processed.`);
  }

  // 4. Validate and parse requested page selection
  const pageSelection = options?.pageSelection || '';
  const parseResult = parsePageRange(pageSelection, totalPages);
  if (!parseResult.valid) {
    throw new Error(parseResult.error || 'Invalid page selection.');
  }

  const deleteIndices = parseResult.pageIndices;

  // 5. Guard against deleting all pages (document must retain at least one page)
  if (deleteIndices.length >= totalPages) {
    throw new Error('Cannot delete all pages from the document. At least one page must remain.');
  }

  // 6. Remove pages in strictly descending index order to preserve lower page index offsets
  const descendingIndices = [...deleteIndices].sort((a, b) => b - a);

  for (let i = 0; i < descendingIndices.length; i++) {
    checkAborted(signal);
    doc.removePage(descendingIndices[i]);
  }

  checkAborted(signal);

  // 7. Save modified document
  let modifiedBytes;
  try {
    modifiedBytes = await doc.save();
  } catch (saveErr) {
    checkAborted(signal);
    const msg = (saveErr?.message || '').toLowerCase();
    if (msg.includes('out of memory') || msg.includes('allocation')) {
      throw new Error('Out of browser memory while generating PDF with deleted pages.');
    }
    throw new Error('Failed to assemble modified PDF document. Please try again.');
  }

  checkAborted(signal);

  return {
    blob: new Blob([modifiedBytes], { type: 'application/pdf' }),
    suggestedFilename: 'pages-removed.pdf',
    mimeType: 'application/pdf',
  };
}
