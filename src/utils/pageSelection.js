/**
 * Page selection and range parsing utilities for Split PDF and page operations.
 * Pure, client-side, zero external dependencies.
 */

/**
 * Parses and validates a human-readable 1-based page range string against a document's total page count.
 *
 * Supported formats:
 * - Single pages: "1", "5"
 * - Ranges: "1-3", "8-10"
 * - Combinations: "1-3, 5, 8-10"
 *
 * Behavior:
 * - Rejects empty inputs, zero, negative numbers, floats, and non-numeric characters.
 * - Rejects malformed tokens such as trailing/empty commas ("1,,3", "1,") and multiple dashes ("1-2-3").
 * - Rejects reversed ranges (e.g., "5-2").
 * - Rejects page numbers exceeding totalPages.
 * - Deduplicates repeated pages (e.g., "5, 1-3, 3" -> pages 1, 2, 3, 5).
 * - Returns 0-based page indices sorted in ascending document order.
 *
 * @param {string} rangeStr - The raw human-entered page range expression
 * @param {number} totalPages - The total number of pages in the source PDF
 * @returns {{ valid: boolean, pageIndices?: number[], error?: string }}
 */
export function parsePageRange(rangeStr, totalPages) {
  // 1. Validate totalPages
  if (typeof totalPages !== 'number' || !Number.isInteger(totalPages) || totalPages < 1) {
    return { valid: false, error: 'Invalid total pages count.' };
  }

  // 2. Validate range string
  if (typeof rangeStr !== 'string' || !rangeStr.trim()) {
    return {
      valid: false,
      error: 'Please enter page numbers or ranges (e.g. 1-3, 5).',
    };
  }

  const trimmed = rangeStr.trim();

  // Reject leading or trailing commas or consecutive commas
  if (trimmed.startsWith(',') || trimmed.endsWith(',')) {
    return {
      valid: false,
      error: 'Malformed page selection: unexpected leading or trailing comma.',
    };
  }

  const rawTokens = trimmed.split(',');
  const indicesSet = new Set();

  for (let idx = 0; idx < rawTokens.length; idx++) {
    const rawToken = rawTokens[idx];
    const token = rawToken.trim();

    if (!token) {
      return {
        valid: false,
        error: 'Malformed page selection: empty token encountered.',
      };
    }

    if (token.includes('-')) {
      // Range expression: "A-B"
      const parts = token.split('-');
      if (parts.length !== 2) {
        return {
          valid: false,
          error: `Invalid page range "${token}". Expected format: start-end (e.g. 1-5).`,
        };
      }

      const startStr = parts[0].trim();
      const endStr = parts[1].trim();

      if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) {
        return {
          valid: false,
          error: `Invalid page range "${token}". Page numbers must be positive integers.`,
        };
      }

      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (start === 0 || end === 0) {
        return {
          valid: false,
          error: 'Page numbers must be 1 or greater. Page 0 does not exist.',
        };
      }

      if (start > end) {
        return {
          valid: false,
          error: `Reversed page range "${token}". Start page (${start}) cannot be greater than end page (${end}).`,
        };
      }

      if (start > totalPages || end > totalPages) {
        return {
          valid: false,
          error: `Page range "${token}" exceeds total document pages (${totalPages}).`,
        };
      }

      for (let p = start; p <= end; p++) {
        indicesSet.add(p - 1);
      }
    } else {
      // Single page expression: "A"
      if (!/^\d+$/.test(token)) {
        return {
          valid: false,
          error: `Invalid page number "${token}". Please enter positive integers and ranges only.`,
        };
      }

      const pageNum = parseInt(token, 10);

      if (pageNum === 0) {
        return {
          valid: false,
          error: 'Page numbers must be 1 or greater. Page 0 does not exist.',
        };
      }

      if (pageNum > totalPages) {
        return {
          valid: false,
          error: `Page ${pageNum} exceeds total document pages (${totalPages}).`,
        };
      }

      indicesSet.add(pageNum - 1);
    }
  }

  if (indicesSet.size === 0) {
    return { valid: false, error: 'No valid pages selected.' };
  }

  // Ascending 0-based page indices
  const pageIndices = Array.from(indicesSet).sort((a, b) => a - b);

  return {
    valid: true,
    pageIndices,
  };
}
