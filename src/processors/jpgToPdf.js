import { PDFDocument } from 'pdf-lib';

export const MAX_FILES = 100;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per image
export const MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150 MB aggregate limit
export const MAX_PAGE_DIMENSION = 14400; // 200 inches @ 72 dpi (PDF spec maximum)

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const STANDARD_MARGIN = 20;

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
 * Validates JPEG binary SOI (0xFFD8) and EOI (0xFFD9) markers.
 *
 * @param {Uint8Array} bytes
 * @param {string} fileName
 */
function validateJpegMarkers(bytes, fileName) {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  ) {
    throw new Error(`File "${fileName}" is not a valid JPEG image (missing JPEG SOI/EOI markers).`);
  }
}

/**
 * Pure client-side JPG to PDF converter.
 * Converts one or more JPEG images into a single formatted PDF document,
 * strictly within the local browser sandbox. No image or metadata leaves the device.
 *
 * Contract:
 * @param {object} params
 * @param {File[]} params.files - Ordered array of JPEG File objects
 * @param {object} [params.options] - Formatting options
 * @param {'original'|'a4-portrait'|'a4-landscape'|'a4-auto'} [params.options.pageSize='a4-portrait']
 * @param {'standard'|'none'} [params.options.margin='standard']
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{ blob: Blob, suggestedFilename: string, mimeType: string }>}
 */
export async function jpgToPdf({ files, options = {}, signal }) {
  checkAborted(signal);

  // 1. Validate files array input
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('At least one JPEG image is required to generate a PDF.');
  }

  if (files.length > MAX_FILES) {
    throw new Error(
      `Too many images selected (${files.length}). Maximum allowed is ${MAX_FILES} images per document.`
    );
  }

  // 2. Validate individual file sizes, non-emptiness, and aggregate size
  let aggregateSize = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file?.name || `Image ${i + 1}`;

    if (!file || typeof file.size !== 'number' || file.size === 0) {
      throw new Error(`File "${fileName}" is empty (0 bytes) and cannot be processed.`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${fileName}" exceeds the maximum allowed file size of 50 MB.`);
    }

    aggregateSize += file.size;

    // Check extension
    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg')) {
      throw new Error(`File "${fileName}" is not a JPEG. Only .jpg and .jpeg files are supported.`);
    }

    // Check MIME type if present
    if (file.type && file.type.trim() !== '') {
      const mime = file.type.toLowerCase();
      const isAllowedMime =
        mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/pjpeg';
      if (!isAllowedMime) {
        throw new Error(
          `File "${fileName}" has unsupported type "${file.type}". Only JPEG images are accepted.`
        );
      }
    }
  }

  if (aggregateSize > MAX_TOTAL_SIZE) {
    throw new Error(
      `Total size of selected images (${(aggregateSize / (1024 * 1024)).toFixed(
        1
      )} MB) exceeds the maximum aggregate limit of 150 MB.`
    );
  }

  // 3. Extract layout options
  const pageSize = options.pageSize || 'a4-portrait';
  const marginOption = options.margin || 'standard';
  const isZeroMargin = marginOption === 'none';

  // 4. Initialize target PDFDocument
  const pdfDoc = await PDFDocument.create();

  // 5. Sequentially process and embed each image in user's specified order
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    checkAborted(signal);

    const file = files[fileIndex];
    const fileName = file.name || `Image ${fileIndex + 1}`;

    let arrayBuffer;
    try {
      arrayBuffer = await readFileAsArrayBuffer(file);
    } catch {
      checkAborted(signal);
      throw new Error(`Failed to read file "${fileName}". Please ensure the file is accessible.`);
    }

    checkAborted(signal);

    // Sliced Uint8Array ensures safe byteOffset handling in JpegEmbedder
    const uint8Array = new Uint8Array(
      arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer
    );

    // Check basic SOI/EOI markers first
    validateJpegMarkers(uint8Array, fileName);

    checkAborted(signal);

    // Embed JPEG into document
    let embeddedImage;
    try {
      embeddedImage = await pdfDoc.embedJpg(uint8Array);
    } catch {
      checkAborted(signal);
      throw new Error(`File "${fileName}" is not a valid or readable JPEG image.`);
    }

    const { width: imgWidth, height: imgHeight } = embeddedImage;

    if (!imgWidth || !imgHeight || imgWidth <= 0 || imgHeight <= 0) {
      throw new Error(
        `File "${fileName}" has invalid dimensions (width: ${imgWidth}, height: ${imgHeight}).`
      );
    }

    // 6. Calculate page dimensions, scaling, and centering based on selected layout mode
    if (pageSize === 'original') {
      let targetWidth = imgWidth;
      let targetHeight = imgHeight;

      // Cap at PDF specification maximum dimension (14,400 points) while preserving aspect ratio
      if (targetWidth > MAX_PAGE_DIMENSION || targetHeight > MAX_PAGE_DIMENSION) {
        const capScale = Math.min(
          MAX_PAGE_DIMENSION / targetWidth,
          MAX_PAGE_DIMENSION / targetHeight
        );
        targetWidth *= capScale;
        targetHeight *= capScale;
      }

      const page = pdfDoc.addPage([targetWidth, targetHeight]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: targetWidth,
        height: targetHeight,
      });
    } else {
      // A4 Layout Modes: portrait, landscape, or auto
      let pageWidth = A4_WIDTH;
      let pageHeight = A4_HEIGHT;

      if (pageSize === 'a4-landscape') {
        pageWidth = A4_HEIGHT;
        pageHeight = A4_WIDTH;
      } else if (pageSize === 'a4-auto') {
        if (imgWidth > imgHeight) {
          pageWidth = A4_HEIGHT;
          pageHeight = A4_WIDTH;
        } else {
          pageWidth = A4_WIDTH;
          pageHeight = A4_HEIGHT;
        }
      }

      const margin = isZeroMargin ? 0 : STANDARD_MARGIN;
      const availWidth = pageWidth - 2 * margin;
      const availHeight = pageHeight - 2 * margin;

      // Proportional fit scaling: allows smaller images to enlarge and larger images to shrink
      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      // Center within the available page area
      const x = margin + (availWidth - drawWidth) / 2;
      const y = margin + (availHeight - drawHeight) / 2;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  checkAborted(signal);

  // 7. Serialize final PDF document to byte array
  let pdfBytes;
  try {
    pdfBytes = await pdfDoc.save();
  } catch (saveErr) {
    checkAborted(signal);
    throw new Error(`Failed to generate final PDF: ${saveErr?.message || 'serialization error'}`);
  }

  checkAborted(signal);

  // 8. Package output as valid Blob
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  return {
    blob,
    suggestedFilename: 'images.pdf',
    mimeType: 'application/pdf',
  };
}
