import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  validateFileForTool,
  isDuplicateFile,
} from '../utils/fileValidation.js';

describe('fileValidation Utilities', () => {
  describe('formatFileSize', () => {
    it('handles 0, negative, or invalid values', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-100)).toBe('0 B');
      expect(formatFileSize(null)).toBe('0 B');
      expect(formatFileSize(undefined)).toBe('0 B');
      expect(formatFileSize('not-a-number')).toBe('0 B');
    });

    it('formats bytes correctly', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2457)).toBe('2.4 KB');
      expect(formatFileSize(50 * 1024)).toBe('50 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2.4 MB');
      expect(formatFileSize(15 * 1024 * 1024)).toBe('15 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('validateFileForTool', () => {
    const pdfTool = { id: 'merge-pdf', name: 'Merge PDF', acceptedMimeTypes: ['application/pdf'] };
    const jpgTool = { id: 'jpg-to-pdf', name: 'JPG to PDF', acceptedMimeTypes: ['image/jpeg', 'image/jpg'] };

    it('rejects null or undefined file', () => {
      expect(validateFileForTool(null, pdfTool)).toEqual({
        valid: false,
        error: 'No file provided.',
      });
    });

    it('rejects 0-byte empty files', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      const result = validateFileForTool(emptyFile, pdfTool);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/is empty \(0 bytes\) and cannot be processed/i);
    });

    it('rejects non-PDF files for PDF tools', () => {
      const docxFile = new File(['content'], 'document.docx', { type: 'application/vnd.openxmlformats' });
      const result = validateFileForTool(docxFile, pdfTool);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/is not a PDF\. Please select \.pdf files only\./i);
    });

    it('accepts valid PDF with matching MIME type', () => {
      const validPdf = new File(['%PDF-1.4 sample content'], 'report.pdf', {
        type: 'application/pdf',
      });
      expect(validateFileForTool(validPdf, pdfTool)).toEqual({ valid: true });
    });

    it('accepts valid PDF with missing/empty MIME type if extension is .pdf', () => {
      const validPdfNoMime = new File(['%PDF-1.4 sample content'], 'report.pdf', {
        type: '',
      });
      expect(validateFileForTool(validPdfNoMime, pdfTool)).toEqual({ valid: true });
    });

    it('rejects PDF with conflicting non-empty MIME type', () => {
      const fakePdf = new File(['fake content'], 'invoice.pdf', {
        type: 'image/png',
      });
      const result = validateFileForTool(fakePdf, pdfTool);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/conflicting file type \(image\/png\)/i);
    });

    it('validates JPG tool correctly for .jpg and .jpeg', () => {
      const validJpg = new File(['image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
      const validJpeg = new File(['image-bytes'], 'photo.jpeg', { type: '' });
      expect(validateFileForTool(validJpg, jpgTool)).toEqual({ valid: true });
      expect(validateFileForTool(validJpeg, jpgTool)).toEqual({ valid: true });
    });

    it('rejects non-JPEG for JPG tool', () => {
      const pngFile = new File(['png-bytes'], 'graphic.png', { type: 'image/png' });
      const result = validateFileForTool(pngFile, jpgTool);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/is not a supported JPEG image/i);
    });

    it('rejects JPG with conflicting non-empty MIME type', () => {
      const fakeJpg = new File(['fake bytes'], 'photo.jpg', {
        type: 'application/pdf',
      });
      const result = validateFileForTool(fakeJpg, jpgTool);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/conflicting file type \(application\/pdf\)/i);
    });
  });

  describe('isDuplicateFile', () => {
    it('returns true when name, size, type, and lastModified match', () => {
      const file1 = new File(['content'], 'file.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      const file2 = new File(['content'], 'file.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      expect(isDuplicateFile(file2, [file1])).toBe(true);
    });

    it('returns false when lastModified differs', () => {
      const file1 = new File(['content'], 'file.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      const file2 = new File(['content'], 'file.pdf', {
        type: 'application/pdf',
        lastModified: 1700000005000,
      });
      expect(isDuplicateFile(file2, [file1])).toBe(false);
    });

    it('returns false when size differs', () => {
      const file1 = new File(['short'], 'file.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      const file2 = new File(['much longer content'], 'file.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      expect(isDuplicateFile(file2, [file1])).toBe(false);
    });

    it('returns false when name differs', () => {
      const file1 = new File(['content'], 'file1.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      const file2 = new File(['content'], 'file2.pdf', {
        type: 'application/pdf',
        lastModified: 1700000000000,
      });
      expect(isDuplicateFile(file2, [file1])).toBe(false);
    });
  });
});
