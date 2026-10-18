import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import { reorderPdf } from '../processors/reorderPdf.js';

/**
 * Helper to generate small, valid, distinguishable PDF fixtures in memory.
 * Uses distinct page dimensions and optional custom rotations so source page order,
 * dimensions, and orientation can be verified precisely after reordering.
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
    // Unique page dimensions: width = baseDimension + (i * 20), height = baseDimension + (i * 20) + 10
    const page = doc.addPage([baseDimension + i * 20, baseDimension + i * 20 + 10]);
    if (initialRotations[i] !== undefined) {
      page.setRotation(degrees(initialRotations[i]));
    }
    // Draw simple distinguishable shape
    page.drawRectangle({
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      color: rgb(0.1 * i, 0.2, 0.3),
    });
  }
  const bytes = await doc.save();
  return new File([bytes], name, { type: 'application/pdf', lastModified: Date.now() });
}

describe('reorderPdf Processor', () => {
  it('requires exactly one input file', async () => {
    const file1 = await createTestPdfFile({ pageCount: 2, name: 'doc1.pdf' });
    const file2 = await createTestPdfFile({ pageCount: 1, name: 'doc2.pdf' });

    await expect(reorderPdf({ files: [] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(reorderPdf({ files: [file1, file2] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(reorderPdf({ files: null })).rejects.toThrow(/requires exactly one source document/i);
    await expect(reorderPdf({ files: undefined })).rejects.toThrow(/requires exactly one source document/i);
  });

  it('rejects empty (0-byte) source files', async () => {
    const emptyFile = new File([''], 'empty.pdf', { type: 'application/pdf' });
    await expect(
      reorderPdf({ files: [emptyFile], options: { pageOrder: '1' } })
    ).rejects.toThrow(/is empty \(0 bytes\)/i);
  });

  it('rejects corrupted or non-PDF binary files', async () => {
    const corruptFile = new File(['NOT_A_VALID_PDF_HEADER_DATA_12345'], 'corrupt.pdf', {
      type: 'application/pdf',
    });
    await expect(
      reorderPdf({ files: [corruptFile], options: { pageOrder: '1' } })
    ).rejects.toThrow(/appears to be corrupted or is not a valid pdf/i);
  });

  it('rejects zero-page source PDF documents', async () => {
    const zeroPageRaw = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Root 1 0 R /Size 3 >>\nstartxref\n115\n%%EOF`;
    const zeroPageFile = new File([zeroPageRaw], 'zero-pages.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(
      reorderPdf({ files: [zeroPageFile], options: { pageOrder: '1' } })
    ).rejects.toThrow(/contains no pages and cannot be reordered/i);
  });

  it('rejects genuine binary encrypted PDF fixture without bypassing encryption', async () => {
    const genuineEncryptedRaw =
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -4 >>\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000188 00000 n \ntrailer\n<< /Root 1 0 R /Encrypt 4 0 R /Size 5 >>\nstartxref\n296\n%%EOF';

    const genuineEncryptedFile = new File([genuineEncryptedRaw], 'encrypted.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(
      reorderPdf({ files: [genuineEncryptedFile], options: { pageOrder: '1' } })
    ).rejects.toThrow(
      'File "encrypted.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
    );
  });

  it('rejects invalid, incomplete, or out-of-bounds page sequences', async () => {
    const file = await createTestPdfFile({ pageCount: 4, name: 'doc.pdf' });

    // Empty or missing order
    await expect(reorderPdf({ files: [file], options: {} })).rejects.toThrow(
      /please enter the desired page sequence/i
    );
    await expect(reorderPdf({ files: [file], options: { pageOrder: '' } })).rejects.toThrow(
      /please enter the desired page sequence/i
    );

    // Missing page 3
    await expect(reorderPdf({ files: [file], options: { pageOrder: '1, 2, 4' } })).rejects.toThrow(
      /missing page\(s\): 3/i
    );

    // Duplicate page 2
    await expect(reorderPdf({ files: [file], options: { pageOrder: '1, 2, 2, 4' } })).rejects.toThrow(
      /duplicate page 2 detected/i
    );

    // Out of bounds page 5
    await expect(reorderPdf({ files: [file], options: { pageOrder: '1, 2, 5, 4' } })).rejects.toThrow(
      /page 5 exceeds total document pages \(4\)/i
    );

    // Zero / negative / non-numeric
    await expect(reorderPdf({ files: [file], options: { pageOrder: '0, 1, 2, 3' } })).rejects.toThrow(
      /page numbers must be 1 or greater/i
    );
    await expect(reorderPdf({ files: [file], options: { pageOrder: 'a, b, c, d' } })).rejects.toThrow(
      /positive integers and ranges only/i
    );
  });

  it('reorders all pages in full reverse order (e.g. 3, 2, 1)', async () => {
    // 3 pages:
    // Page 1: 100 x 110
    // Page 2: 120 x 130
    // Page 3: 140 x 150
    const file = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'three-pages.pdf' });

    const result = await reorderPdf({
      files: [file],
      options: { pageOrder: '3, 2, 1' },
    });

    expect(result.suggestedFilename).toBe('reordered.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.blob).toBeInstanceOf(Blob);

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(3);

    // Verify reverse page dimensions
    expect(resultDoc.getPage(0).getWidth()).toBe(140); // was page 3
    expect(resultDoc.getPage(1).getWidth()).toBe(120); // was page 2
    expect(resultDoc.getPage(2).getWidth()).toBe(100); // was page 1
  });

  it('swaps two pages accurately in a multi-page document', async () => {
    // 3 pages: 100, 120, 140
    const file = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'swap.pdf' });

    // Swap pages 1 and 2: sequence "2, 1, 3"
    const result = await reorderPdf({
      files: [file],
      options: { pageOrder: '2, 1, 3' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(3);

    expect(resultDoc.getPage(0).getWidth()).toBe(120); // was page 2
    expect(resultDoc.getPage(1).getWidth()).toBe(100); // was page 1
    expect(resultDoc.getPage(2).getWidth()).toBe(140); // was page 3
  });

  it('executes arbitrary page permutations (e.g. 4, 1, 3, 2)', async () => {
    // 4 pages: 100, 120, 140, 160
    const file = await createTestPdfFile({ pageCount: 4, baseDimension: 100, name: 'permute.pdf' });

    const result = await reorderPdf({
      files: [file],
      options: { pageOrder: '4, 1, 3, 2' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(4);

    expect(resultDoc.getPage(0).getWidth()).toBe(160); // was page 4
    expect(resultDoc.getPage(1).getWidth()).toBe(100); // was page 1
    expect(resultDoc.getPage(2).getWidth()).toBe(140); // was page 3
    expect(resultDoc.getPage(3).getWidth()).toBe(120); // was page 2
  });

  it('supports ranges in page order expressions (e.g. 4, 1-3)', async () => {
    const file = await createTestPdfFile({ pageCount: 4, baseDimension: 100, name: 'range-permute.pdf' });

    const result = await reorderPdf({
      files: [file],
      options: { pageOrder: '4, 1-3' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(4);

    expect(resultDoc.getPage(0).getWidth()).toBe(160); // was page 4
    expect(resultDoc.getPage(1).getWidth()).toBe(100); // was page 1
    expect(resultDoc.getPage(2).getWidth()).toBe(120); // was page 2
    expect(resultDoc.getPage(3).getWidth()).toBe(140); // was page 3
  });

  it('handles single-page documents correctly with order "1"', async () => {
    const file = await createTestPdfFile({ pageCount: 1, baseDimension: 100, name: 'single.pdf' });

    const result = await reorderPdf({
      files: [file],
      options: { pageOrder: '1' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(1);
    expect(resultDoc.getPage(0).getWidth()).toBe(100);
  });

  it('preserves page dimensions, custom rotations, and content streams across reordering', async () => {
    // 3 pages with distinct dimensions, rotations, and drawings:
    // Page 1: 100 x 110, 90°
    // Page 2: 120 x 130, 180°
    // Page 3: 140 x 150, 270°
    const file = await createTestPdfFile({
      pageCount: 3,
      baseDimension: 100,
      name: 'preserve.pdf',
      initialRotations: [90, 180, 270],
    });

    // Reorder to "3, 1, 2"
    const result = await reorderPdf({
      files: [file],
      options: { pageOrder: '3, 1, 2' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(3);

    // Page 0 (original page 3): 140 x 150, 270°
    const p0 = resultDoc.getPage(0);
    expect(p0.getWidth()).toBe(140);
    expect(p0.getHeight()).toBe(150);
    expect(p0.getRotation().angle).toBe(270);
    expect(p0.node.Contents()).toBeDefined();

    // Page 1 (original page 1): 100 x 110, 90°
    const p1 = resultDoc.getPage(1);
    expect(p1.getWidth()).toBe(100);
    expect(p1.getHeight()).toBe(110);
    expect(p1.getRotation().angle).toBe(90);
    expect(p1.node.Contents()).toBeDefined();

    // Page 2 (original page 2): 120 x 130, 180°
    const p2 = resultDoc.getPage(2);
    expect(p2.getWidth()).toBe(120);
    expect(p2.getHeight()).toBe(130);
    expect(p2.getRotation().angle).toBe(180);
    expect(p2.node.Contents()).toBeDefined();
  });

  it('aborts execution when signal is canceled', async () => {
    const file = await createTestPdfFile({ pageCount: 3, name: 'abort-test.pdf' });

    const controller = new AbortController();
    controller.abort(); // pre-aborted

    await expect(
      reorderPdf({
        files: [file],
        options: { pageOrder: '3, 2, 1' },
        signal: controller.signal,
      })
    ).rejects.toThrow(/processing was canceled/i);
  });
});
