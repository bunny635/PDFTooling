/**
 * File validation and formatting utilities for PDFTooling workspaces.
 * Strictly client-side: evaluates metadata without reading file content.
 */

/**
 * Format bytes into human-readable B, KB, MB, GB strings.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(i, units.length - 1);
  const size = bytes / Math.pow(1024, unitIndex);

  // Return clean decimal representation (e.g., 2.4 MB or 512 B)
  if (unitIndex === 0) {
    return `${Math.round(size)} B`;
  }
  return `${size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Validates a single File object against tool-specific requirements.
 * - Rejects empty files (size === 0)
 * - Validates file extension
 * - Gracefully accepts empty MIME types when extension is valid
 * - Rejects non-empty conflicting MIME types
 *
 * @param {File} file
 * @param {object} tool
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileForTool(file, tool) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. Rejection of empty 0-byte files
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty (0 bytes) and cannot be processed.`,
    };
  }

  const isJpgTool = tool?.id === 'jpg-to-pdf';
  const fileNameLower = (file.name || '').toLowerCase();

  // 2. Extension validation
  if (isJpgTool) {
    const hasJpgExtension =
      fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
    if (!hasJpgExtension) {
      return {
        valid: false,
        error: `File "${file.name}" is not a supported JPEG image. Please select .jpg or .jpeg files.`,
      };
    }

    // 3. MIME type validation if present
    if (file.type && file.type.trim() !== '') {
      const mime = file.type.toLowerCase();
      const isAllowedMime =
        mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/pjpeg';
      if (!isAllowedMime) {
        return {
          valid: false,
          error: `File "${file.name}" has a conflicting file type (${file.type}) and cannot be accepted as a JPEG image.`,
        };
      }
    }
  } else {
    // Standard PDF tools
    const hasPdfExtension = fileNameLower.endsWith('.pdf');
    if (!hasPdfExtension) {
      return {
        valid: false,
        error: `File "${file.name}" is not a PDF. Please select .pdf files only.`,
      };
    }

    // 3. MIME type validation if present
    if (file.type && file.type.trim() !== '') {
      const mime = file.type.toLowerCase();
      const isAllowedMime =
        mime === 'application/pdf' ||
        mime === 'application/x-pdf' ||
        mime === 'application/acrobat' ||
        mime === 'applications/vnd.pdf';
      if (!isAllowedMime) {
        return {
          valid: false,
          error: `File "${file.name}" has a conflicting file type (${file.type}) and cannot be accepted as a PDF.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Checks if a candidate file is already present in an array of files.
 * Uses filename, size, MIME type, and lastModified timestamp.
 *
 * @param {File} newFile
 * @param {File[]} existingFiles
 * @returns {boolean}
 */
export function isDuplicateFile(newFile, existingFiles) {
  if (!newFile || !Array.isArray(existingFiles)) return false;

  return existingFiles.some(
    (existing) =>
      existing.name === newFile.name &&
      existing.size === newFile.size &&
      existing.type === newFile.type &&
      existing.lastModified === newFile.lastModified
  );
}
