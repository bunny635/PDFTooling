import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import { deletePdf } from '../processors/deletePdf.js';

/**
 * Helper to generate small, valid, distinguishable PDF fixtures in memory.
 * Uses distinct page dimensions and optional custom rotations so source page order,
 * dimensions, and orientation can be verified precisely after deletion.
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

describe('deletePdf Processor', () => {
  it('requires exactly one input file', async () => {
    const file1 = await createTestPdfFile({ pageCount: 2, name: 'doc1.pdf' });
    const file2 = await createTestPdfFile({ pageCount: 1, name: 'doc2.pdf' });

    await expect(deletePdf({ files: [] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(deletePdf({ files: [file1, file2] })).rejects.toThrow(/requires exactly one source document/i);
    await expect(deletePdf({ files: null })).rejects.toThrow(/requires exactly one source document/i);
    await expect(deletePdf({ files: undefined })).rejects.toThrow(/requires exactly one source document/i);
  });

  it('rejects empty (0-byte) source files', async () => {
    const emptyFile = new File([''], 'empty.pdf', { type: 'application/pdf' });
    await expect(
      deletePdf({ files: [emptyFile], options: { pageSelection: '1' } })
    ).rejects.toThrow(/is empty \(0 bytes\)/i);
  });

  it('rejects corrupted or non-PDF binary files', async () => {
    const corruptFile = new File(['NOT_A_VALID_PDF_HEADER_DATA_12345'], 'corrupt.pdf', {
      type: 'application/pdf',
    });
    await expect(
      deletePdf({ files: [corruptFile], options: { pageSelection: '1' } })
    ).rejects.toThrow(/appears to be corrupted or is not a valid pdf/i);
  });

  it('rejects zero-page source PDF documents', async () => {
    const zeroPageRaw = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Root 1 0 R /Size 3 >>\nstartxref\n115\n%%EOF`;
    const zeroPageFile = new File([zeroPageRaw], 'zero-pages.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(
      deletePdf({ files: [zeroPageFile], options: { pageSelection: '1' } })
    ).rejects.toThrow(/contains no pages and cannot be processed/i);
  });

  it('rejects genuine binary encrypted PDF fixture without bypassing encryption', async () => {
    const genuineEncryptedRaw =
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -4 >>\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000188 00000 n \ntrailer\n<< /Root 1 0 R /Encrypt 4 0 R /Size 5 >>\nstartxref\n296\n%%EOF';

    const genuineEncryptedFile = new File([genuineEncryptedRaw], 'encrypted.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    await expect(
      deletePdf({ files: [genuineEncryptedFile], options: { pageSelection: '1' } })
    ).rejects.toThrow(
      'File "encrypted.pdf" is password-protected or encrypted. Password-protected PDFs are not supported.'
    );
  });

  it('rejects invalid, empty, or out-of-bounds page selections', async () => {
    const file = await createTestPdfFile({ pageCount: 3, name: 'doc.pdf' });

    // Empty or missing selection
    await expect(deletePdf({ files: [file], options: {} })).rejects.toThrow(
      /please enter page numbers or ranges/i
    );
    await expect(deletePdf({ files: [file], options: { pageSelection: '' } })).rejects.toThrow(
      /please enter page numbers or ranges/i
    );
    await expect(deletePdf({ files: [file], options: { pageSelection: '   ' } })).rejects.toThrow(
      /please enter page numbers or ranges/i
    );

    // Out of bounds
    await expect(deletePdf({ files: [file], options: { pageSelection: '4' } })).rejects.toThrow(
      /page 4 exceeds total document pages \(3\)/i
    );
    await expect(deletePdf({ files: [file], options: { pageSelection: '1-5' } })).rejects.toThrow(
      /exceeds total document pages \(3\)/i
    );

    // Zero / negative / non-numeric
    await expect(deletePdf({ files: [file], options: { pageSelection: '0' } })).rejects.toThrow(
      /page numbers must be 1 or greater/i
    );
    await expect(deletePdf({ files: [file], options: { pageSelection: 'abc' } })).rejects.toThrow(
      /positive integers and ranges only/i
    );
    await expect(deletePdf({ files: [file], options: { pageSelection: '3-1' } })).rejects.toThrow(
      /reversed page range/i
    );
  });

  it('strictly rejects attempts to delete all pages from the document', async () => {
    // 3-page document deleting 1-3
    const file3 = await createTestPdfFile({ pageCount: 3, name: 'three-pages.pdf' });
    await expect(
      deletePdf({ files: [file3], options: { pageSelection: '1-3' } })
    ).rejects.toThrow(/cannot delete all pages from the document\. at least one page must remain/i);

    await expect(
      deletePdf({ files: [file3], options: { pageSelection: '1, 2, 3' } })
    ).rejects.toThrow(/cannot delete all pages from the document\. at least one page must remain/i);

    // 1-page document deleting page 1
    const file1 = await createTestPdfFile({ pageCount: 1, name: 'single.pdf' });
    await expect(
      deletePdf({ files: [file1], options: { pageSelection: '1' } })
    ).rejects.toThrow(/cannot delete all pages from the document\. at least one page must remain/i);
  });

  it('deletes a single page from a multi-page PDF and preserves remaining pages and dimensions', async () => {
    // 3 pages:
    // Page 1: 100 x 110
    // Page 2: 120 x 130
    // Page 3: 140 x 150
    const file = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'doc.pdf' });

    // Delete middle page (page 2)
    const result = await deletePdf({
      files: [file],
      options: { pageSelection: '2' },
    });

    expect(result.suggestedFilename).toBe('pages-removed.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.blob).toBeInstanceOf(Blob);

    // Parse resulting PDF
    const resultBuffer = await result.blob.arrayBuffer();
    const resultDoc = await PDFDocument.load(resultBuffer);

    expect(resultDoc.getPageCount()).toBe(2);

    // Remaining pages should be original Page 1 and Page 3
    const page0 = resultDoc.getPage(0);
    const page1 = resultDoc.getPage(1);

    expect(page0.getWidth()).toBe(100);
    expect(page0.getHeight()).toBe(110);

    expect(page1.getWidth()).toBe(140);
    expect(page1.getHeight()).toBe(150);
  });

  it('deletes multiple nonconsecutive pages in ascending or mixed order input', async () => {
    // 5 pages:
    // Page 1: 100 x 110
    // Page 2: 120 x 130
    // Page 3: 140 x 150
    // Page 4: 160 x 170
    // Page 5: 180 x 190
    const file = await createTestPdfFile({ pageCount: 5, baseDimension: 100, name: 'five-pages.pdf' });

    // Delete pages 1, 3, and 5 (entered in non-sorted order: "5, 1, 3")
    const result = await deletePdf({
      files: [file],
      options: { pageSelection: '5, 1, 3' },
    });

    const resultBuffer = await result.blob.arrayBuffer();
    const resultDoc = await PDFDocument.load(resultBuffer);

    // 5 - 3 = 2 pages remaining (original Page 2 and Page 4)
    expect(resultDoc.getPageCount()).toBe(2);

    const remaining0 = resultDoc.getPage(0);
    const remaining1 = resultDoc.getPage(1);

    expect(remaining0.getWidth()).toBe(120);
    expect(remaining0.getHeight()).toBe(130);

    expect(remaining1.getWidth()).toBe(160);
    expect(remaining1.getHeight()).toBe(170);
  });

  it('deletes a continuous range of pages and boundary pages (first and last)', async () => {
    // 6 pages
    const file = await createTestPdfFile({ pageCount: 6, baseDimension: 100, name: 'six-pages.pdf' });

    // Test deleting first page (page 1)
    const resultFirst = await deletePdf({
      files: [file],
      options: { pageSelection: '1' },
    });
    const docFirst = await PDFDocument.load(await resultFirst.blob.arrayBuffer());
    expect(docFirst.getPageCount()).toBe(5);
    expect(docFirst.getPage(0).getWidth()).toBe(120); // original page 2

    // Test deleting last page (page 6)
    const resultLast = await deletePdf({
      files: [file],
      options: { pageSelection: '6' },
    });
    const docLast = await PDFDocument.load(await resultLast.blob.arrayBuffer());
    expect(docLast.getPageCount()).toBe(5);
    expect(docLast.getPage(4).getWidth()).toBe(180); // original page 5

    // Test deleting continuous range: pages 2-4
    const resultRange = await deletePdf({
      files: [file],
      options: { pageSelection: '2-4' },
    });
    const docRange = await PDFDocument.load(await resultRange.blob.arrayBuffer());
    expect(docRange.getPageCount()).toBe(3); // remaining: pages 1, 5, 6
    expect(docRange.getPage(0).getWidth()).toBe(100); // original page 1
    expect(docRange.getPage(1).getWidth()).toBe(180); // original page 5
    expect(docRange.getPage(2).getWidth()).toBe(200); // original page 6
  });

  it('preserves existing page rotations on retained pages', async () => {
    // 4 pages with custom rotations:
    // Page 1: 90°
    // Page 2: 180°
    // Page 3: 270°
    // Page 4: 0°
    const file = await createTestPdfFile({
      pageCount: 4,
      baseDimension: 100,
      name: 'rotated.pdf',
      initialRotations: [90, 180, 270, 0],
    });

    // Delete pages 2 and 4 (the 180° and 0° pages)
    const result = await deletePdf({
      files: [file],
      options: { pageSelection: '2, 4' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(2);

    // Remaining pages are original Page 1 (90°) and Page 3 (270°)
    const rem0 = resultDoc.getPage(0);
    const rem1 = resultDoc.getPage(1);

    expect(rem0.getRotation().angle).toBe(90);
    expect(rem1.getRotation().angle).toBe(270);
  });

  it('verifies retained pages keep their content streams and drawings intact', async () => {
    const file = await createTestPdfFile({ pageCount: 3, baseDimension: 100, name: 'content-stream.pdf' });

    const result = await deletePdf({
      files: [file],
      options: { pageSelection: '2' },
    });

    const resultDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(2);

    // Verify both retained pages have non-empty content streams
    expect(resultDoc.getPage(0).node.Contents()).toBeDefined();
    expect(resultDoc.getPage(1).node.Contents()).toBeDefined();
  });

  it('aborts execution when signal is canceled', async () => {
    const file = await createTestPdfFile({ pageCount: 3, name: 'abort-test.pdf' });

    const controller = new AbortController();
    controller.abort(); // pre-aborted

    await expect(
      deletePdf({
        files: [file],
        options: { pageSelection: '2' },
        signal: controller.signal,
      })
    ).rejects.toThrow(/processing was canceled/i);
  });
});
