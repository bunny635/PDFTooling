import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdf } from '../processors/mergePdf.js';

/**
 * Helper to generate small, valid, distinguishable PDF fixtures in memory.
 * Uses distinct page dimensions so source page order can be verified with mathematical precision.
 *
 * @param {object} options
 * @param {number} [options.pageCount=1]
 * @param {number} [options.baseDimension=100]
 * @param {string} [options.name='test.pdf']
 * @returns {Promise<File>}
 */
async function createTestPdfFile({ pageCount = 1, baseDimension = 100, name = 'test.pdf' } = {}) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    // Unique page width: baseDimension + (i * 10)
    doc.addPage([baseDimension + i * 10, baseDimension + i * 10]);
  }
  const bytes = await doc.save();
  return new File([bytes], name, { type: 'application/pdf', lastModified: Date.now() });
}

describe('mergePdf Processor', () => {
  it('requires at least two input files', async () => {
    const file1 = await createTestPdfFile({ baseDimension: 100, name: 'single.pdf' });

    await expect(mergePdf({ files: [] })).rejects.toThrow(/at least two pdf files are required/i);
    await expect(mergePdf({ files: [file1] })).rejects.toThrow(/at least two pdf files are required/i);
    await expect(mergePdf({ files: null })).rejects.toThrow(/at least two pdf files are required/i);
    await expect(mergePdf({ files: undefined })).rejects.toThrow(/at least two pdf files are required/i);
  });

  it('merges two PDFs into a single valid PDF and returns compliant contract output', async () => {
    const file1 = await createTestPdfFile({ pageCount: 1, baseDimension: 100, name: 'doc1.pdf' });
    const file2 = await createTestPdfFile({ pageCount: 2, baseDimension: 200, name: 'doc2.pdf' });

    const result = await mergePdf({ files: [file1, file2] });

    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.blob.type).toBe('application/pdf');
    expect(result.suggestedFilename).toBe('merged.pdf');
    expect(result.blob.size).toBeGreaterThan(0);

    // Verify resulting PDF structure with pdf-lib
    const mergedArrayBuffer = await result.blob.arrayBuffer();
    const mergedDoc = await PDFDocument.load(mergedArrayBuffer);

    // 1 page + 2 pages = 3 total pages
    expect(mergedDoc.getPageCount()).toBe(3);
  });

  it('merges three PDFs and strictly preserves page order and dimensions', async () => {
    // Doc A: 1 page (width: 100)
    const fileA = await createTestPdfFile({ pageCount: 1, baseDimension: 100, name: 'a.pdf' });
    // Doc B: 2 pages (widths: 200, 210)
    const fileB = await createTestPdfFile({ pageCount: 2, baseDimension: 200, name: 'b.pdf' });
    // Doc C: 1 page (width: 300)
    const fileC = await createTestPdfFile({ pageCount: 1, baseDimension: 300, name: 'c.pdf' });

    const result = await mergePdf({ files: [fileA, fileB, fileC] });

    const mergedArrayBuffer = await result.blob.arrayBuffer();
    const mergedDoc = await PDFDocument.load(mergedArrayBuffer);

    expect(mergedDoc.getPageCount()).toBe(4);

    // Verify exact sequential order of pages via their unique widths
    const pages = mergedDoc.getPages();
    expect(pages[0].getWidth()).toBe(100);
    expect(pages[1].getWidth()).toBe(200);
    expect(pages[2].getWidth()).toBe(210);
    expect(pages[3].getWidth()).toBe(300);
  });

  it('rejects corrupted or invalid PDF files with a clean user-facing error message', async () => {
    const validFile = await createTestPdfFile({ pageCount: 1, baseDimension: 100, name: 'good.pdf' });
    const corruptFile = new File(['not-a-valid-pdf-data'], 'damaged.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(mergePdf({ files: [validFile, corruptFile] })).rejects.toThrow(
      'File "damaged.pdf" appears to be corrupted or is not a valid PDF document.'
    );
  });

  it('rejects empty 0-byte files with an explicit message', async () => {
    const validFile = await createTestPdfFile({ pageCount: 1, baseDimension: 100, name: 'good.pdf' });
    const emptyFile = new File([], 'empty.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(mergePdf({ files: [validFile, emptyFile] })).rejects.toThrow(
      'File "empty.pdf" is empty (0 bytes) and cannot be merged.'
    );
  });

  it('rejects genuine zero-page PDFs', async () => {
    const validFile = await createTestPdfFile({ pageCount: 1, baseDimension: 100, name: 'good.pdf' });

    // Genuine syntactically valid zero-page PDF with empty /Kids array and Count 0
    const zeroPageRaw = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Root 1 0 R /Size 3 >>\nstartxref\n115\n%%EOF`;
    const zeroPageFile = new File([zeroPageRaw], 'zero-pages.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(mergePdf({ files: [validFile, zeroPageFile] })).rejects.toThrow(
      'File "zero-pages.pdf" contains no pages and cannot be merged.'
    );
  });

  it('respects AbortSignal cancellation before processing begins', async () => {
    const file1 = await createTestPdfFile({ baseDimension: 100, name: 'doc1.pdf' });
    const file2 = await createTestPdfFile({ baseDimension: 200, name: 'doc2.pdf' });

    const controller = new AbortController();
    controller.abort();

    await expect(mergePdf({ files: [file1, file2], signal: controller.signal })).rejects.toThrow(
      'Processing was canceled.'
    );
  });

  it('rejects genuine binary encrypted PDF fixture without bypassing encryption', async () => {
    const validFile = await createTestPdfFile({ baseDimension: 100, name: 'doc1.pdf' });

    // Genuine syntactically valid PDF binary with an active /Encrypt standard dictionary
    const genuineEncryptedRaw =
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -4 >>\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000188 00000 n \ntrailer\n<< /Root 1 0 R /Encrypt 4 0 R /Size 5 >>\nstartxref\n296\n%%EOF';

    const genuineEncryptedFile = new File([genuineEncryptedRaw], 'genuine-encrypted.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(mergePdf({ files: [validFile, genuineEncryptedFile] })).rejects.toThrow(
      'File "genuine-encrypted.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
    );
  });

  it('handles password-protected or encrypted PDF errors with accurate classification (mocked fallback verification)', async () => {
    const validFile = await createTestPdfFile({ baseDimension: 100, name: 'doc1.pdf' });

    // Create a mock encrypted error scenario
    const encryptedFile = {
      name: 'secure.pdf',
      size: 1024,
      arrayBuffer: async () => new ArrayBuffer(1024),
    };

    // Spy on PDFDocument.load to simulate EncryptedPDFError
    const originalLoad = PDFDocument.load;
    PDFDocument.load = async (buffer, opts) => {
      if (opts?.ignoreEncryption === false && buffer.byteLength === 1024) {
        const err = new Error('Input document is encrypted');
        err.name = 'EncryptedPDFError';
        throw err;
      }
      return originalLoad.call(PDFDocument, buffer, opts);
    };

    try {
      await expect(mergePdf({ files: [validFile, encryptedFile] })).rejects.toThrow(
        'File "secure.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
      );
    } finally {
      PDFDocument.load = originalLoad;
    }
  });
});
