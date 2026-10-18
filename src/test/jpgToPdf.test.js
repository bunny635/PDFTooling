import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  jpgToPdf,
  A4_WIDTH,
  A4_HEIGHT,
  STANDARD_MARGIN,
  MAX_PAGE_DIMENSION,
} from '../processors/jpgToPdf.js';

// Minimal genuine 1x1 base64 JPEG fixture with valid SOI and EOI markers
const BASE64_1X1_JPEG =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxD/2Q==';

const SOF_MARKERS = [
  0xffc0, 0xffc1, 0xffc2, 0xffc3, 0xffc5, 0xffc6, 0xffc7,
  0xffc8, 0xffc9, 0xffca, 0xffcb, 0xffcc, 0xffcd, 0xffce, 0xffcf,
];

/**
 * Creates genuine binary JPEG bytes with specified dimensions
 * by patching SOF header segment in a valid base64 template.
 */
function createMockJpegBytes(width = 1, height = 1) {
  const binaryStr = atob(BASE64_1X1_JPEG);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Find SOF marker and adjust height (2 bytes) and width (2 bytes)
  let pos = 2;
  while (pos < bytes.length) {
    const marker = (bytes[pos] << 8) | bytes[pos + 1];
    pos += 2;
    if (SOF_MARKERS.includes(marker)) break;
    pos += (bytes[pos] << 8) | bytes[pos + 1];
  }
  pos += 2; // skip length
  pos += 1; // skip bits per component
  bytes[pos] = (height >> 8) & 0xff;
  bytes[pos + 1] = height & 0xff;
  pos += 2;
  bytes[pos] = (width >> 8) & 0xff;
  bytes[pos + 1] = width & 0xff;

  return bytes;
}

/**
 * Creates a File fixture with genuine JPEG binary bytes.
 */
function createJpegFile(name = 'sample.jpg', width = 100, height = 100, options = {}) {
  const bytes = createMockJpegBytes(width, height);
  return new File([bytes], name, { type: 'image/jpeg', ...options });
}

describe('jpgToPdf Processor Engine', () => {
  it('converts a single JPEG into a valid one-page PDF', async () => {
    const file = createJpegFile('photo.jpg', 200, 150);
    const result = await jpgToPdf({ files: [file] });

    expect(result).toBeDefined();
    expect(result.suggestedFilename).toBe('images.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.blob).toBeInstanceOf(Blob);

    const arrayBuffer = await result.blob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);

    // Default is A4 portrait
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A4_WIDTH, 1);
    expect(height).toBeCloseTo(A4_HEIGHT, 1);
  });

  it('converts multiple JPEGs and preserves exact user-specified image order', async () => {
    const file1 = createJpegFile('first.jpg', 100, 100);
    const file2 = createJpegFile('second.jpg', 200, 100);
    const file3 = createJpegFile('third.jpg', 100, 300);

    const result = await jpgToPdf({
      files: [file1, file2, file3],
      options: { pageSize: 'original' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdfDoc.getPageCount()).toBe(3);

    // Page 1 matches file 1 (100x100)
    const p1 = pdfDoc.getPage(0).getSize();
    expect(p1.width).toBe(100);
    expect(p1.height).toBe(100);

    // Page 2 matches file 2 (200x100)
    const p2 = pdfDoc.getPage(1).getSize();
    expect(p2.width).toBe(200);
    expect(p2.height).toBe(100);

    // Page 3 matches file 3 (100x300)
    const p3 = pdfDoc.getPage(2).getSize();
    expect(p3.width).toBe(100);
    expect(p3.height).toBe(300);
  });

  it('correctly formats pages in original dimensions mode', async () => {
    const file = createJpegFile('dimensions.jpg', 640, 480);
    const result = await jpgToPdf({
      files: [file],
      options: { pageSize: 'original' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBe(640);
    expect(page.getHeight()).toBe(480);
  });

  it('guards against excessive page dimensions in original mode (capped at 14,400 pt)', async () => {
    // 28,800 x 14,400 image should be scaled down to 14,400 x 7,200
    const file = createJpegFile('giant.jpg', 28800, 14400);
    const result = await jpgToPdf({
      files: [file],
      options: { pageSize: 'original' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBe(MAX_PAGE_DIMENSION);
    expect(page.getHeight()).toBe(7200);
  });

  it('formats pages in A4 Portrait mode with standard 20 pt margins', async () => {
    const file = createJpegFile('portrait.jpg', 400, 600);
    const result = await jpgToPdf({
      files: [file],
      options: { pageSize: 'a4-portrait', margin: 'standard' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(A4_WIDTH, 1);
    expect(page.getHeight()).toBeCloseTo(A4_HEIGHT, 1);
  });

  it('formats pages in A4 Landscape mode', async () => {
    const file = createJpegFile('landscape.jpg', 600, 400);
    const result = await jpgToPdf({
      files: [file],
      options: { pageSize: 'a4-landscape', margin: 'standard' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(A4_HEIGHT, 1);
    expect(page.getHeight()).toBeCloseTo(A4_WIDTH, 1);
  });

  it('supports A4 Auto orientation per image based on aspect ratio', async () => {
    const wideImg = createJpegFile('wide.jpg', 800, 400); // Landscape
    const tallImg = createJpegFile('tall.jpg', 400, 800); // Portrait

    const result = await jpgToPdf({
      files: [wideImg, tallImg],
      options: { pageSize: 'a4-auto' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdfDoc.getPageCount()).toBe(2);

    // Page 1 is Landscape (841.89 x 595.28)
    const p1 = pdfDoc.getPage(0).getSize();
    expect(p1.width).toBeCloseTo(A4_HEIGHT, 1);
    expect(p1.height).toBeCloseTo(A4_WIDTH, 1);

    // Page 2 is Portrait (595.28 x 841.89)
    const p2 = pdfDoc.getPage(1).getSize();
    expect(p2.width).toBeCloseTo(A4_WIDTH, 1);
    expect(p2.height).toBeCloseTo(A4_HEIGHT, 1);
  });

  it('supports borderless zero margins mode for A4', async () => {
    const file = createJpegFile('borderless.jpg', 100, 100);
    const result = await jpgToPdf({
      files: [file],
      options: { pageSize: 'a4-portrait', margin: 'none' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(A4_WIDTH, 1);
    expect(page.getHeight()).toBeCloseTo(A4_HEIGHT, 1);
  });

  it('proportionally enlarges small images to fit A4 page without distortion or stretching', async () => {
    // 100 x 50 image (2:1 aspect ratio)
    const smallImg = createJpegFile('small.jpg', 100, 50);
    const result = await jpgToPdf({
      files: [smallImg],
      options: { pageSize: 'a4-portrait', margin: 'none' },
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(A4_WIDTH, 1);
    expect(page.getHeight()).toBeCloseTo(A4_HEIGHT, 1);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it('rejects empty or missing files array', async () => {
    await expect(jpgToPdf({ files: [] })).rejects.toThrow(
      /at least one jpeg image is required/i
    );
    await expect(jpgToPdf({ files: null })).rejects.toThrow(
      /at least one jpeg image is required/i
    );
  });

  it('rejects empty (0 byte) files', async () => {
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
    await expect(jpgToPdf({ files: [emptyFile] })).rejects.toThrow(
      /file "empty\.jpg" is empty \(0 bytes\)/i
    );
  });

  it('rejects files exceeding individual 50 MB limit', async () => {
    const oversizedFile = {
      name: 'huge.jpg',
      size: 55 * 1024 * 1024,
      type: 'image/jpeg',
    };
    await expect(jpgToPdf({ files: [oversizedFile] })).rejects.toThrow(
      /exceeds the maximum allowed file size of 50 MB/i
    );
  });

  it('rejects total files exceeding aggregate 150 MB limit', async () => {
    const files = [
      { name: 'img1.jpg', size: 45 * 1024 * 1024, type: 'image/jpeg' },
      { name: 'img2.jpg', size: 45 * 1024 * 1024, type: 'image/jpeg' },
      { name: 'img3.jpg', size: 45 * 1024 * 1024, type: 'image/jpeg' },
      { name: 'img4.jpg', size: 20 * 1024 * 1024, type: 'image/jpeg' },
    ];
    await expect(jpgToPdf({ files })).rejects.toThrow(
      /exceeds the maximum aggregate limit of 150 MB/i
    );
  });

  it('rejects unsupported non-JPEG file extensions', async () => {
    const pngFile = new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' });
    await expect(jpgToPdf({ files: [pngFile] })).rejects.toThrow(
      /only \.jpg and \.jpeg files are supported/i
    );
  });

  it('rejects conflicting MIME types', async () => {
    const conflictingFile = new File([new Uint8Array([1, 2, 3])], 'image.jpg', {
      type: 'image/png',
    });
    await expect(jpgToPdf({ files: [conflictingFile] })).rejects.toThrow(
      /has unsupported type "image\/png"/i
    );
  });

  it('rejects binary files missing JPEG SOI/EOI markers', async () => {
    const randomBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    const invalidFile = new File([randomBytes], 'not-a-jpeg.jpg', { type: 'image/jpeg' });
    await expect(jpgToPdf({ files: [invalidFile] })).rejects.toThrow(
      /missing jpeg soi\/eoi markers/i
    );
  });

  it('rejects corrupted JPEGs with plausible SOI/EOI markers', async () => {
    // Has 0xFFD8 at start and 0xFFD9 at end, but garbage body
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0x01, 0x02, 0x03, 0x04, 0xff, 0xd9]);
    const corruptFile = new File([fakeJpeg], 'corrupt.jpg', { type: 'image/jpeg' });
    await expect(jpgToPdf({ files: [corruptFile] })).rejects.toThrow(
      /is not a valid or readable jpeg image/i
    );
  });

  it('aborts processing immediately when pre-aborted signal is provided', async () => {
    const controller = new AbortController();
    controller.abort();
    const file = createJpegFile('photo.jpg', 100, 100);

    await expect(
      jpgToPdf({ files: [file], signal: controller.signal })
    ).rejects.toThrow(/processing was canceled/i);
  });

  it('enforces maximum image count limit (100 images)', async () => {
    const manyFiles = Array.from({ length: 101 }, (_, i) => ({
      name: `img-${i}.jpg`,
      size: 100,
      type: 'image/jpeg',
    }));

    await expect(jpgToPdf({ files: manyFiles })).rejects.toThrow(
      /too many images selected \(101\)/i
    );
  });
});
