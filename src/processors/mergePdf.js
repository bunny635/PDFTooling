import { PDFDocument } from 'pdf-lib';

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
 * Pure client-side Merge PDF processor.
 * Combines two or more PDF files into a single unified document in sequential order.
 * Strictly local in-browser memory execution; no file data or metadata is ever transmitted across the network.
 *
 * Contract:
 * @param {object} params
 * @param {File[]} params.files - Ordered array of File objects to merge
 * @param {object} [params.options] - Merge options
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{ blob: Blob, suggestedFilename: string, mimeType: string }>}
 */
export async function mergePdf({ files, options = {}, signal }) {
  checkAborted(signal);

  // 1. Minimum input validation
  if (!Array.isArray(files) || files.length < 2) {
    throw new Error('At least two PDF files are required to merge.');
  }

  // 2. Initialize fresh output PDF document
  const mergedDoc = await PDFDocument.create();

  // 3. Sequentially process and copy pages from each input document
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    checkAborted(signal);
    const file = files[fileIndex];
    const fileName = file?.name || `Document ${fileIndex + 1}`;

    // Verify file is non-empty
    if (!file || typeof file.size !== 'number' || file.size === 0) {
      throw new Error(`File "${fileName}" is empty (0 bytes) and cannot be merged.`);
    }

    let arrayBuffer;
    try {
      arrayBuffer = await readFileAsArrayBuffer(file);
    } catch (readErr) {
      checkAborted(signal);
      throw new Error(`Failed to read file "${fileName}". Please ensure the file is accessible.`);
    }

    checkAborted(signal);

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

    const pageCount = srcDoc.getPageCount();
    if (pageCount === 0) {
      throw new Error(`File "${fileName}" contains no pages and cannot be merged.`);
    }

    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);

    for (let p = 0; p < copiedPages.length; p++) {
      checkAborted(signal);
      mergedDoc.addPage(copiedPages[p]);
    }
  }

  checkAborted(signal);

  let mergedBytes;
  try {
    mergedBytes = await mergedDoc.save();
  } catch (saveErr) {
    checkAborted(signal);
    const msg = (saveErr?.message || '').toLowerCase();
    if (msg.includes('out of memory') || msg.includes('allocation')) {
      throw new Error('Out of browser memory while generating combined PDF. Please try with fewer files.');
    }
    throw new Error('Failed to assemble merged PDF document. Please try again.');
  }

  checkAborted(signal);

  const outputBlob = new Blob([mergedBytes], { type: 'application/pdf' });

  return {
    blob: outputBlob,
    suggestedFilename: 'merged.pdf',
    mimeType: 'application/pdf',
  };
}
