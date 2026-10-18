import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { rotatePdf } from '../processors/rotatePdf.js';

/**
 * Helper to generate small, valid, distinguishable PDF fixtures in memory.
 * Uses distinct page dimensions so source page order and dimensions can be verified precisely.
 * Optionally allows setting initial rotation per page.
 *
 * @param {object} options
 * @param {number} [options.pageCount=1]
 * @param {number} [options.baseDimension=100]
 * @param {string} [options.name='test.pdf']
 * @param {number[]} [options.initialRotations=[]]
 * @returns {Promise<File>}
 */
async function createTestPdfFile({
  pageCount = 1,
  baseDimension = 100,
  name = 'test.pdf',
  initialRotations = [],
} = {}) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    // Unique page dimensions: baseDimension + (i * 10)
    const page = doc.addPage([baseDimension + i * 10, baseDimension + i * 10]);
    if (initialRotations[i] !== undefined) {
      page.setRotation(degrees(initialRotations[i]));
    }
  }
  const bytes = await doc.save();
  return new File([bytes], name, { type: 'application/pdf', lastModified: Date.now() });
}

describe('rotatePdf Processor', () => {
  it('requires exactly one input file', async () => {
    const file1 = await createTestPdfFile({ pageCount: 2, name: 'doc1.pdf' });
    const file2 = await createTestPdfFile({ pageCount: 1, name: 'doc2.pdf' });

    await expect(rotatePdf({ files: [] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(rotatePdf({ files: [file1, file2] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(rotatePdf({ files: null })).rejects.toThrow(/requires exactly one source document/i);
    await expect(rotatePdf({ files: undefined })).rejects.toThrow(/requires exactly one source document/i);
  });

  it('rejects invalid rotation angles with an explicit error message', async () => {
    const file = await createTestPdfFile({ pageCount: 1, name: 'doc.pdf' });

    await expect(rotatePdf({ files: [file], options: { angle: 0 } })).rejects.toThrow(
      /supported angles are 90, 180, and 270/i
    );
    await expect(rotatePdf({ files: [file], options: { angle: 45 } })).rejects.toThrow(
      /supported angles are 90, 180, and 270/i
    );
    await expect(rotatePdf({ files: [file], options: { angle: 360 } })).rejects.toThrow(
      /supported angles are 90, 180, and 270/i
    );
    await expect(rotatePdf({ files: [file], options: { angle: -90 } })).rejects.toThrow(
      /supported angles are 90, 180, and 270/i
    );
    await expect(rotatePdf({ files: [file], options: { angle: 'invalid' } })).rejects.toThrow(
      /supported angles are 90, 180, and 270/i
    );
    await expect(rotatePdf({ files: [file], options: {} })).rejects.toThrow(
      /supported angles are 90, 180, and 270/i
    );
  });

  it('rejects invalid rotation scope options', async () => {
    const file = await createTestPdfFile({ pageCount: 1, name: 'doc.pdf' });

    await expect(rotatePdf({ files: [file], options: { angle: 90, scope: 'invalid' } })).rejects.toThrow(
      /invalid rotation scope/i
    );
  });

  it('rotates all pages by 90° clockwise by default and returns compliant contract output', async () => {
    const file = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'doc.pdf' });

    const result = await rotatePdf({
      files: [file],
      options: { angle: 90 },
    });

    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.suggestedFilename).toBe('rotated.pdf');
    expect(result.blob.size).toBeGreaterThan(0);

    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(3);

    const pages = doc.getPages();
    expect(pages[0].getRotation().angle).toBe(90);
    expect(pages[1].getRotation().angle).toBe(90);
    expect(pages[2].getRotation().angle).toBe(90);

    // Verify page dimensions and order are preserved
    expect(pages[0].getWidth()).toBe(100);
    expect(pages[1].getWidth()).toBe(110);
    expect(pages[2].getWidth()).toBe(120);
  });

  it('supports 180° and 270° clockwise rotations on all pages', async () => {
    const file = await createTestPdfFile({ pageCount: 2, baseDimension: 100, name: 'doc.pdf' });

    // Test 180°
    const result180 = await rotatePdf({
      files: [file],
      options: { angle: 180, scope: 'all' },
    });
    const doc180 = await PDFDocument.load(await result180.blob.arrayBuffer());
    expect(doc180.getPages()[0].getRotation().angle).toBe(180);
    expect(doc180.getPages()[1].getRotation().angle).toBe(180);

    // Test 270°
    const result270 = await rotatePdf({
      files: [file],
      options: { angle: 270, scope: 'all' },
    });
    const doc270 = await PDFDocument.load(await result270.blob.arrayBuffer());
    expect(doc270.getPages()[0].getRotation().angle).toBe(270);
    expect(doc270.getPages()[1].getRotation().angle).toBe(270);
  });

  it('rotates only user-selected pages and preserves original orientation of unselected pages', async () => {
    // 4 pages: indices 0, 1, 2, 3
    const file = await createTestPdfFile({ pageCount: 4, baseDimension: 100, name: 'doc.pdf' });

    // Rotate pages 2 and 4 by 90°
    const result = await rotatePdf({
      files: [file],
      options: { angle: 90, scope: 'selected', pageSelection: '2, 4' },
    });

    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(4);

    const pages = doc.getPages();
    expect(pages[0].getRotation().angle).toBe(0);  // page 1 (unselected)
    expect(pages[1].getRotation().angle).toBe(90); // page 2 (selected)
    expect(pages[2].getRotation().angle).toBe(0);  // page 3 (unselected)
    expect(pages[3].getRotation().angle).toBe(90); // page 4 (selected)

    // Verify all dimensions preserved
    expect(pages[0].getWidth()).toBe(100);
    expect(pages[1].getWidth()).toBe(110);
    expect(pages[2].getWidth()).toBe(120);
    expect(pages[3].getWidth()).toBe(130);
  });

  it('correctly calculates cumulative rotation normalized modulo 360°', async () => {
    // Document with pre-existing rotations: Page 1: 90°, Page 2: 180°, Page 3: 270°
    const file = await createTestPdfFile({
      pageCount: 3,
      name: 'pre-rotated.pdf',
      initialRotations: [90, 180, 270],
    });

    // Add 90° clockwise
    // Page 1: 90 + 90 = 180°
    // Page 2: 180 + 90 = 270°
    // Page 3: 270 + 90 = 360° -> 0°
    const result = await rotatePdf({
      files: [file],
      options: { angle: 90, scope: 'all' },
    });

    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    const pages = doc.getPages();
    expect(pages[0].getRotation().angle).toBe(180);
    expect(pages[1].getRotation().angle).toBe(270);
    expect(pages[2].getRotation().angle).toBe(0);
  });

  it('rejects invalid or out-of-bounds page selection expressions when scope is selected', async () => {
    const file = await createTestPdfFile({ pageCount: 3, name: 'doc.pdf' });

    await expect(
      rotatePdf({ files: [file], options: { angle: 90, scope: 'selected', pageSelection: '' } })
    ).rejects.toThrow(/please enter page numbers or ranges/i);

    await expect(
      rotatePdf({ files: [file], options: { angle: 90, scope: 'selected', pageSelection: '0' } })
    ).rejects.toThrow(/page numbers must be 1 or greater/i);

    await expect(
      rotatePdf({ files: [file], options: { angle: 90, scope: 'selected', pageSelection: '5' } })
    ).rejects.toThrow(/page 5 exceeds total document pages \(3\)/i);

    await expect(
      rotatePdf({ files: [file], options: { angle: 90, scope: 'selected', pageSelection: '3-1' } })
    ).rejects.toThrow(/reversed page range/i);

    await expect(
      rotatePdf({ files: [file], options: { angle: 90, scope: 'selected', pageSelection: 'abc' } })
    ).rejects.toThrow(/invalid page number "abc"/i);
  });

  it('rejects corrupted or invalid PDF files with a clear error message', async () => {
    const corruptFile = new File(['not-a-valid-pdf'], 'damaged.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(rotatePdf({ files: [corruptFile], options: { angle: 90 } })).rejects.toThrow(
      'File "damaged.pdf" appears to be corrupted or is not a valid PDF document.'
    );
  });

  it('rejects empty 0-byte files with an explicit message', async () => {
    const emptyFile = new File([], 'empty.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(rotatePdf({ files: [emptyFile], options: { angle: 90 } })).rejects.toThrow(
      'File "empty.pdf" is empty (0 bytes) and cannot be processed.'
    );
  });

  it('rejects zero-page PDFs', async () => {
    const zeroPageRaw = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Root 1 0 R /Size 3 >>\nstartxref\n115\n%%EOF`;
    const zeroPageFile = new File([zeroPageRaw], 'zero-pages.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(rotatePdf({ files: [zeroPageFile], options: { angle: 90 } })).rejects.toThrow(
      'File "zero-pages.pdf" contains no pages and cannot be rotated.'
    );
  });

  it('respects AbortSignal cancellation', async () => {
    const file = await createTestPdfFile({ pageCount: 2, name: 'doc.pdf' });
    const controller = new AbortController();
    controller.abort();

    await expect(
      rotatePdf({ files: [file], options: { angle: 90 }, signal: controller.signal })
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
      rotatePdf({ files: [genuineEncryptedFile], options: { angle: 90 } })
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
        rotatePdf({ files: [encryptedFile], options: { angle: 90 } })
      ).rejects.toThrow(
        'File "locked.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
      );
    } finally {
      PDFDocument.load = originalLoad;
    }
  });
});
