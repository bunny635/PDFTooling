import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitPdf, getPdfPageCount } from '../processors/splitPdf.js';

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
    // Page 1 (i=0): baseDimension, Page 2 (i=1): baseDimension + 10, etc.
    doc.addPage([baseDimension + i * 10, baseDimension + i * 10]);
  }
  const bytes = await doc.save();
  return new File([bytes], name, { type: 'application/pdf', lastModified: Date.now() });
}

describe('splitPdf Processor', () => {
  it('requires exactly one input file', async () => {
    const file1 = await createTestPdfFile({ pageCount: 3, name: 'doc1.pdf' });
    const file2 = await createTestPdfFile({ pageCount: 2, name: 'doc2.pdf' });

    await expect(splitPdf({ files: [] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(splitPdf({ files: [file1, file2] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(splitPdf({ files: null })).rejects.toThrow(/requires exactly one source document/i);
    await expect(splitPdf({ files: undefined })).rejects.toThrow(/requires exactly one source document/i);
  });

  it('extracts a single page from a multi-page PDF', async () => {
    // 5 pages: widths 100, 110, 120, 130, 140
    const sourceFile = await createTestPdfFile({ pageCount: 5, baseDimension: 100, name: 'source.pdf' });

    const result = await splitPdf({
      files: [sourceFile],
      options: { pageSelection: '2' },
    });

    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.suggestedFilename).toBe('extracted-pages.pdf');
    expect(result.blob.size).toBeGreaterThan(0);

    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPages()[0].getWidth()).toBe(110); // Page 2 has width 110
  });

  it('extracts a continuous range of pages in original document order', async () => {
    // 5 pages: widths 100, 110, 120, 130, 140
    const sourceFile = await createTestPdfFile({ pageCount: 5, baseDimension: 100, name: 'source.pdf' });

    const result = await splitPdf({
      files: [sourceFile],
      options: { pageSelection: '2-4' },
    });

    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(3);

    const pages = doc.getPages();
    expect(pages[0].getWidth()).toBe(110); // Page 2
    expect(pages[1].getWidth()).toBe(120); // Page 3
    expect(pages[2].getWidth()).toBe(130); // Page 4
  });

  it('extracts non-consecutive pages, deduplicates, and preserves original document order', async () => {
    // 6 pages: widths 100, 110, 120, 130, 140, 150
    const sourceFile = await createTestPdfFile({ pageCount: 6, baseDimension: 100, name: 'source.pdf' });

    // Request out of order with duplicates: "5, 1-3, 3" -> pages 1, 2, 3, 5
    const result = await splitPdf({
      files: [sourceFile],
      options: { pageSelection: '5, 1-3, 3' },
    });

    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(4);

    const pages = doc.getPages();
    expect(pages[0].getWidth()).toBe(100); // Page 1
    expect(pages[1].getWidth()).toBe(110); // Page 2
    expect(pages[2].getWidth()).toBe(120); // Page 3
    expect(pages[3].getWidth()).toBe(140); // Page 5
  });

  it('rejects invalid, empty, or out-of-bounds page selections', async () => {
    const sourceFile = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'source.pdf' });

    await expect(splitPdf({ files: [sourceFile], options: { pageSelection: '' } })).rejects.toThrow(
      /please enter page numbers or ranges/i
    );
    await expect(splitPdf({ files: [sourceFile], options: { pageSelection: '0' } })).rejects.toThrow(
      /page numbers must be 1 or greater/i
    );
    await expect(splitPdf({ files: [sourceFile], options: { pageSelection: '5' } })).rejects.toThrow(
      /page 5 exceeds total document pages \(3\)/i
    );
    await expect(splitPdf({ files: [sourceFile], options: { pageSelection: '3-1' } })).rejects.toThrow(
      /reversed page range/i
    );
    await expect(splitPdf({ files: [sourceFile], options: { pageSelection: 'abc' } })).rejects.toThrow(
      /invalid page number "abc"/i
    );
  });

  it('rejects corrupted or invalid PDF files with an explicit message', async () => {
    const corruptFile = new File(['not-a-valid-pdf'], 'corrupt.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(splitPdf({ files: [corruptFile], options: { pageSelection: '1' } })).rejects.toThrow(
      'File "corrupt.pdf" appears to be corrupted or is not a valid PDF document.'
    );
  });

  it('rejects empty 0-byte files with an explicit message', async () => {
    const emptyFile = new File([], 'empty.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(splitPdf({ files: [emptyFile], options: { pageSelection: '1' } })).rejects.toThrow(
      'File "empty.pdf" is empty (0 bytes) and cannot be processed.'
    );
  });

  it('rejects genuine zero-page PDFs', async () => {
    const zeroPageRaw = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Root 1 0 R /Size 3 >>\nstartxref\n115\n%%EOF`;
    const zeroPageFile = new File([zeroPageRaw], 'zero-pages.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(splitPdf({ files: [zeroPageFile], options: { pageSelection: '1' } })).rejects.toThrow(
      'File "zero-pages.pdf" contains no pages and cannot be split.'
    );
  });

  it('respects AbortSignal cancellation', async () => {
    const sourceFile = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'source.pdf' });
    const controller = new AbortController();
    controller.abort();

    await expect(
      splitPdf({ files: [sourceFile], options: { pageSelection: '1' }, signal: controller.signal })
    ).rejects.toThrow('Processing was canceled.');
  });

  it('rejects genuine binary encrypted PDF fixture without bypassing encryption', async () => {
    const genuineEncryptedRaw =
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -4 >>\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000188 00000 n \ntrailer\n<< /Root 1 0 R /Encrypt 4 0 R /Size 5 >>\nstartxref\n296\n%%EOF';

    const genuineEncryptedFile = new File([genuineEncryptedRaw], 'encrypted.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(
      splitPdf({ files: [genuineEncryptedFile], options: { pageSelection: '1' } })
    ).rejects.toThrow(
      'File "encrypted.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
    );
  });

  it('handles password-protected or encrypted PDF errors with accurate classification (mocked fallback verification)', async () => {
    const encryptedFile = {
      name: 'locked.pdf',
      size: 1024,
      arrayBuffer: async () => new ArrayBuffer(1024),
    };

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
      await expect(
        splitPdf({ files: [encryptedFile], options: { pageSelection: '1' } })
      ).rejects.toThrow(
        'File "locked.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
      );
    } finally {
      PDFDocument.load = originalLoad;
    }
  });
});

describe('getPdfPageCount Helper', () => {
  it('accurately inspects page counts of valid PDFs', async () => {
    const file1 = await createTestPdfFile({ pageCount: 1, name: 'one.pdf' });
    const file4 = await createTestPdfFile({ pageCount: 4, name: 'four.pdf' });

    expect(await getPdfPageCount(file1)).toBe(1);
    expect(await getPdfPageCount(file4)).toBe(4);
  });

  it('rejects 0-byte empty files', async () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    await expect(getPdfPageCount(emptyFile)).rejects.toThrow(/empty \(0 bytes\)/i);
  });

  it('rejects corrupt files', async () => {
    const corruptFile = new File(['bad'], 'corrupt.pdf', { type: 'application/pdf' });
    await expect(getPdfPageCount(corruptFile)).rejects.toThrow(/corrupted or is not a valid PDF/i);
  });

  it('rejects encrypted files', async () => {
    const genuineEncryptedRaw =
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -4 >>\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000188 00000 n \ntrailer\n<< /Root 1 0 R /Encrypt 4 0 R /Size 5 >>\nstartxref\n296\n%%EOF';
    const encryptedFile = new File([genuineEncryptedRaw], 'secret.pdf', { type: 'application/pdf' });
    await expect(getPdfPageCount(encryptedFile)).rejects.toThrow(
      'File "secret.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
    );
  });

  it('respects AbortSignal cancellation', async () => {
    const file = await createTestPdfFile({ pageCount: 2, name: 'two.pdf' });
    const controller = new AbortController();
    controller.abort();

    await expect(getPdfPageCount(file, controller.signal)).rejects.toThrow('Processing was canceled.');
  });
});
