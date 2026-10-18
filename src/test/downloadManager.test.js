import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateOutputBlob,
  sanitizeFilename,
  createDownloadUrl,
  revokeDownloadUrl,
  triggerBlobDownload,
} from '../utils/downloadManager.js';

describe('downloadManager Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateOutputBlob', () => {
    it('rejects null or undefined inputs', () => {
      expect(validateOutputBlob(null)).toEqual({
        valid: false,
        error: 'No output document generated (Blob is undefined or null).',
      });
      expect(validateOutputBlob(undefined)).toEqual({
        valid: false,
        error: 'No output document generated (Blob is undefined or null).',
      });
    });

    it('rejects non-Blob objects', () => {
      expect(validateOutputBlob('string-content')).toEqual({
        valid: false,
        error: 'Generated output is not a valid Blob document.',
      });
      expect(validateOutputBlob({ foo: 'bar' })).toEqual({
        valid: false,
        error: 'Generated output is not a valid Blob document.',
      });
    });

    it('rejects 0-byte empty Blobs', () => {
      const emptyBlob = new Blob([], { type: 'application/pdf' });
      expect(validateOutputBlob(emptyBlob)).toEqual({
        valid: false,
        error: 'Generated document is empty (0 bytes).',
      });
    });

    it('accepts valid non-empty PDF Blobs', () => {
      const validBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
      expect(validateOutputBlob(validBlob)).toEqual({ valid: true });
    });

    it('accepts valid Blobs with empty MIME type', () => {
      const untypedBlob = new Blob(['%PDF-1.4 mock content'], { type: '' });
      expect(validateOutputBlob(untypedBlob)).toEqual({ valid: true });
    });

    it('rejects Blobs with conflicting non-empty MIME types', () => {
      const conflictingBlob = new Blob(['PNG-data'], { type: 'image/png' });
      const result = validateOutputBlob(conflictingBlob, { expectedMimeType: 'application/pdf' });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/MIME type \(image\/png\) conflicts with expected application\/pdf/i);
    });
  });

  describe('sanitizeFilename', () => {
    it('returns fallback for empty, null, or whitespace-only inputs', () => {
      expect(sanitizeFilename('', { fallback: 'fallback.pdf' })).toBe('fallback.pdf');
      expect(sanitizeFilename('   ', { fallback: 'fallback.pdf' })).toBe('fallback.pdf');
      expect(sanitizeFilename(null, { fallback: 'fallback.pdf' })).toBe('fallback.pdf');
    });

    it('strips path traversal patterns and directory separators', () => {
      expect(sanitizeFilename('../../etc/passwd', { fallback: 'doc.pdf' })).toBe('etc-passwd.pdf');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\bad.pdf')).toBe('Windows-System32-bad.pdf');
      expect(sanitizeFilename('C:\\Documents\\report.pdf')).toBe('Documents-report.pdf');
    });

    it('strips illegal filesystem characters and control characters', () => {
      expect(sanitizeFilename('annual<report>:2024*?"|.pdf')).toBe('annualreport2024.pdf');
    });

    it('trims leading and trailing dots, spaces, dashes, and underscores', () => {
      expect(sanitizeFilename(' ...---___my-doc___---... ')).toBe('my-doc.pdf');
    });

    it('enforces expected extension without duplicating it', () => {
      expect(sanitizeFilename('contract', { expectedExtension: '.pdf' })).toBe('contract.pdf');
      expect(sanitizeFilename('contract.pdf', { expectedExtension: '.pdf' })).toBe('contract.pdf');
      expect(sanitizeFilename('CONTRACT.PDF', { expectedExtension: '.pdf' })).toBe('CONTRACT.PDF');
    });

    it('falls back if resulting name is only the extension', () => {
      expect(sanitizeFilename('.pdf', { fallback: 'default.pdf' })).toBe('default.pdf');
      expect(sanitizeFilename('...', { fallback: 'default.pdf' })).toBe('default.pdf');
    });
  });

  describe('createDownloadUrl and revokeDownloadUrl', () => {
    it('creates and revokes object URLs safely', () => {
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/test-uuid');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const blob = new Blob(['data'], { type: 'application/pdf' });
      const url = createDownloadUrl(blob);

      expect(url).toBe('blob:http://localhost/test-uuid');
      expect(createSpy).toHaveBeenCalledWith(blob);

      revokeDownloadUrl(url);
      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
    });

    it('throws error when attempting to create URL for invalid Blob', () => {
      expect(() => createDownloadUrl(null)).toThrow(/No output document generated/i);
      expect(() => createDownloadUrl(new Blob([]))).toThrow(/empty \(0 bytes\)/i);
    });

    it('ignores non-blob URLs in revokeDownloadUrl gracefully', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      revokeDownloadUrl('https://example.com/file.pdf');
      revokeDownloadUrl(null);
      expect(revokeSpy).not.toHaveBeenCalled();
    });
  });

  describe('triggerBlobDownload', () => {
    it('creates temporary anchor, triggers click, and schedules delayed revocation (Refinement 1)', () => {
      vi.useFakeTimers();

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/download-test');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      let clicked = false;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          el.click = () => {
            clicked = true;
          };
        }
        return el;
      });

      const blob = new Blob(['document content'], { type: 'application/pdf' });
      const result = triggerBlobDownload(blob, 'final-report.pdf', { revokeDelayMs: 1000 });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('final-report.pdf');
      expect(result.url).toBe('blob:http://localhost/download-test');
      expect(clicked).toBe(true);

      // Verify URL is NOT revoked synchronously immediately after clicking
      expect(revokeSpy).not.toHaveBeenCalled();

      // Advance timers by 1000ms
      vi.advanceTimersByTime(1000);
      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/download-test');

      vi.useRealTimers();
    });
  });
});
