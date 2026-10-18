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
 * Asynchronously inspects the total page count of a source PDF file without retaining parsed document objects in memory.
 * Catches corruption and password protection gracefully.
 *
 * @param {File|Blob} file
 * @param {AbortSignal} [signal]
 * @returns {Promise<number>}
 */
export async function getPdfPageCount(file, signal) {
  checkAborted(signal);
  if (!file || typeof file.size !== 'number' || file.size === 0) {
    throw new Error(`File "${file?.name || 'Document'}" is empty (0 bytes).`);
  }

  const arrayBuffer = await readFileAsArrayBuffer(file);
  checkAborted(signal);

  let doc;
  try {
    doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
  } catch (err) {
    checkAborted(signal);
    const msg = (err?.message || '').toLowerCase();
    const errName = err?.name || '';
    if (
      msg.includes('password') ||
      msg.includes('encrypt') ||
      errName === 'EncryptedPDFError' ||
      errName === 'PasswordError'
    ) {
      throw new Error(
        `File "${file.name}" is password-protected or encrypted. Password-protected PDFs are not supported.`
      );
    }
    throw new Error(`File "${file.name}" appears to be corrupted or is not a valid PDF document.`);
  }

  checkAborted(signal);
  const count = doc.getPageCount();
  return count;
}

/**
 * Pure client-side Split PDF processor.
 * Extracts user-selected pages from one source PDF and produces one downloadable PDF
 * containing only those pages, in their original document order.
 * Strictly local in-browser memory execution; zero server uploads or API dependencies.
 *
 * Contract:
 * @param {object} params
 * @param {File[]} params.files - Ordered array containing exactly one source File object
 * @param {object} [params.options] - Split options
 * @param {string} [params.options.pageSelection] - Human-entered page range expression (e.g. "1-3, 5")
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{ blob: Blob, suggestedFilename: string, mimeType: string }>}
 */
export async function splitPdf({ files, options = {}, signal }) {
  checkAborted(signal);

  // 1. Minimum input validation: exactly one source document
  if (!Array.isArray(files) || files.length !== 1) {
    throw new Error('Split PDF requires exactly one source document.');
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
    throw new Error(`File "${fileName}" contains no pages and cannot be split.`);
  }

  // 4. Validate and parse requested page selection
  const pageSelection = options?.pageSelection || options?.pages || '';
  const parseResult = parsePageRange(pageSelection, totalPages);
  if (!parseResult.valid) {
    throw new Error(parseResult.error || 'Invalid page selection.');
  }

  const { pageIndices } = parseResult;

  // 5. Initialize fresh output PDF and copy requested pages
  checkAborted(signal);
  const splitDoc = await PDFDocument.create();

  const copiedPages = await splitDoc.copyPages(srcDoc, pageIndices);
  for (let p = 0; p < copiedPages.length; p++) {
    checkAborted(signal);
    splitDoc.addPage(copiedPages[p]);
  }

  checkAborted(signal);

  // 6. Save extracted document
  let splitBytes;
  try {
    splitBytes = await splitDoc.save();
  } catch (saveErr) {
    checkAborted(signal);
    const msg = (saveErr?.message || '').toLowerCase();
    if (msg.includes('out of memory') || msg.includes('allocation')) {
      throw new Error('Out of browser memory while generating extracted PDF.');
    }
    throw new Error('Failed to assemble extracted PDF document. Please try again.');
  }

  checkAborted(signal);

  const outputBlob = new Blob([splitBytes], { type: 'application/pdf' });

  return {
    blob: outputBlob,
    suggestedFilename: 'extracted-pages.pdf',
    mimeType: 'application/pdf',
  };
}
