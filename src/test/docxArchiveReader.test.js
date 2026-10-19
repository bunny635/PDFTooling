import { describe, it, expect } from 'vitest';
import * as fflate from 'fflate';
import {
  readDocxDocument,
  readDocxArchive,
  buildDocumentModel,
  parseXmlSafely,
  validateXmlSecurity,
  validateXmlStructure,
  sanitizeArchivePath,
  inspectContentTypes,
  parseRelationships,
  MAX_FILE_SIZE,
  MAX_ENTRY_COUNT,
  MAX_XML_DEPTH,
  MAX_XML_NODE_COUNT,
} from '../processors/word/index.js';

/**
 * Creates a valid synthetic minimal DOCX file buffer.
 *
 * @param {object} [options]
 * @param {string} [options.documentXml]
 * @param {string} [options.stylesXml]
 * @param {Record<string, Uint8Array>} [options.extraFiles]
 * @returns {Uint8Array}
 */
function createDocxArchive(options = {}) {
  const defaultDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Hello world</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/>
      <w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const archiveTree = {
    '[Content_Types].xml': fflate.strToU8(contentTypesXml),
    '_rels/.rels': fflate.strToU8(rootRelsXml),
    'word/document.xml': fflate.strToU8(options.documentXml || defaultDocXml),
    ...(options.stylesXml ? { 'word/styles.xml': fflate.strToU8(options.stylesXml) } : {}),
    ...(options.extraFiles || {}),
  };

  return fflate.zipSync(archiveTree);
}

describe('PDF-07A: Secure DOCX Archive Reader and Document Model', () => {
  describe('Valid DOCX Extraction & Document Model', () => {
    it('parses a valid minimal DOCX and extracts page setup and text content', async () => {
      const bytes = createDocxArchive();
      const file = new File([bytes], 'minimal.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await readDocxDocument({ file });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();

      // Page setup: 12240 twips = 612 pt (US Letter width), 15840 twips = 792 pt (US Letter height)
      expect(result.document.pageSetup.width).toBe(612);
      expect(result.document.pageSetup.height).toBe(792);
      expect(result.document.pageSetup.orientation).toBe('portrait');
      expect(result.document.pageSetup.margins.top).toBe(72);
      expect(result.document.pageSetup.margins.bottom).toBe(72);
      expect(result.document.pageSetup.margins.left).toBe(72);
      expect(result.document.pageSetup.margins.right).toBe(72);

      // Paragraphs & runs
      expect(result.document.paragraphs).toHaveLength(1);
      const p = result.document.paragraphs[0];
      expect(p.text).toBe('Hello world');
      expect(p.runs).toHaveLength(1);
      expect(p.runs[0].text).toBe('Hello world');
      expect(p.runs[0].bold).toBe(false);
      expect(p.runs[0].italic).toBe(false);
      expect(result.stats.paragraphCount).toBe(1);
      expect(result.stats.characterCount).toBe(11);
    });

    it('extracts multiple paragraphs with rich run formatting and paragraph alignments', async () => {
      const multiDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="120" w:line="360"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:color w:val="FF0000"/>
          <w:rFonts w:ascii="Arial"/>
        </w:rPr>
        <w:t>Bold Red Title</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
        </w:rPr>
        <w:t>Italic lead text. </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:u w:val="single"/>
          <w:strike/>
        </w:rPr>
        <w:t>Underline and strikethrough.</w:t>
      </w:r>
      <w:r>
        <w:br/>
      </w:r>
      <w:r>
        <w:t>Second line after break.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

      const bytes = createDocxArchive({ documentXml: multiDocXml });
      const file = new File([bytes], 'formatted.docx');

      const result = await readDocxDocument({ file });

      expect(result.document.paragraphs).toHaveLength(2);

      // Paragraph 1
      const p1 = result.document.paragraphs[0];
      expect(p1.alignment).toBe('center');
      expect(p1.spacing.before).toBe(12); // 240 / 20 = 12 pt
      expect(p1.spacing.after).toBe(6); // 120 / 20 = 6 pt
      expect(p1.spacing.line).toBe(18); // 360 / 20 = 18 pt
      expect(p1.runs).toHaveLength(1);
      expect(p1.runs[0].text).toBe('Bold Red Title');
      expect(p1.runs[0].bold).toBe(true);
      expect(p1.runs[0].fontSize).toBe(16); // 32 / 2 = 16 pt
      expect(p1.runs[0].color).toBe('#FF0000');
      expect(p1.runs[0].fontFamily).toBe('Arial');

      // Paragraph 2
      const p2 = result.document.paragraphs[1];
      expect(p2.alignment).toBe('justify');
      expect(p2.runs[0].italic).toBe(true);
      expect(p2.runs[1].underline).toBe(true);
      expect(p2.runs[1].strike).toBe(true);
      expect(p2.runs[2].isLineBreak).toBe(true);
      expect(p2.runs[3].text).toBe('Second line after break.');
    });

    it('identifies headings and page settings from styles.xml and sectPr', async () => {
      const headingDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r>
        <w:t>Main Section Heading</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:pageBreakBefore/>
      </w:pPr>
      <w:r>
        <w:t>Content on new page</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="720" w:bottom="720" w:left="720" w:right="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="40"/>
    </w:rPr>
  </w:style>
</w:styles>`;

      const bytes = createDocxArchive({ documentXml: headingDocXml, stylesXml });
      const file = new File([bytes], 'headings.docx');

      const result = await readDocxDocument({ file });

      expect(result.document.pageSetup.orientation).toBe('landscape');
      expect(result.document.pageSetup.margins.top).toBe(36); // 720 / 20 = 36 pt

      expect(result.document.paragraphs[0].headingLevel).toBe(1);
      expect(result.document.paragraphs[0].runs[0].bold).toBe(true); // inherited from style
      expect(result.document.paragraphs[0].runs[0].fontSize).toBe(20); // 40 / 2 = 20 pt

      expect(result.document.paragraphs[1].isPageBreakBefore).toBe(true);
      expect(result.stats.headingCount).toBe(1);
    });

    it('strictly preserves exact original Unicode characters without transliteration or loss', async () => {
      const unicodeDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>CJK: 你好世界，こんにちは世界</w:t></w:r>
      <w:r><w:t> Cyrillic: Привет мир</w:t></w:r>
      <w:r><w:t> Greek: Γειά σου Κόσμε</w:t></w:r>
      <w:r><w:t> Arabic: مرحبا بالعالم</w:t></w:r>
      <w:r><w:t> Symbols: ∑ ∫ √ π ≠ ≈ 🚀📄🛡️</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

      const bytes = createDocxArchive({ documentXml: unicodeDocXml });
      const file = new File([bytes], 'unicode.docx');

      const result = await readDocxDocument({ file });

      const text = result.document.paragraphs[0].text;
      expect(text).toContain('你好世界，こんにちは世界');
      expect(text).toContain('Привет мир');
      expect(text).toContain('Γειά σου Κόσμε');
      expect(text).toContain('مرحبا بالعالم');
      expect(text).toContain('∑ ∫ √ π ≠ ≈');
      expect(text).toContain('🚀📄🛡️');
    });

    it('records unsupported features like tables, drawings, and equations without crashing', async () => {
      const unsupportedDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    <w:p><w:r><w:t>Intro text</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p>
      <w:r>
        <w:drawing><wp:inline/></w:drawing>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

      const bytes = createDocxArchive({ documentXml: unsupportedDocXml });
      const file = new File([bytes], 'unsupported.docx');

      const result = await readDocxDocument({ file });

      expect(result.warnings.some((w) => w.includes('table structure'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('drawing or image'))).toBe(true);
      expect(result.document.paragraphs).toHaveLength(2);
    });
  });

  describe('Security Gate: Archive Structure & Zip Bombs', () => {
    it('rejects empty (0 byte) files', async () => {
      const emptyFile = new File([], 'empty.docx');
      await expect(readDocxDocument({ file: emptyFile })).rejects.toThrow(
        /selected document is empty \(0 bytes\)/i
      );
    });

    it('rejects non-ZIP files missing PK header signature', async () => {
      const notZip = new File([new Uint8Array([0x01, 0x02, 0x03, 0x04])], 'fake.docx');
      await expect(readDocxDocument({ file: notZip })).rejects.toThrow(
        /missing pk signature/i
      );
    });

    it('rejects files exceeding maximum upload limit of 25 MB', async () => {
      const largeFile = {
        name: 'huge.docx',
        size: 26 * 1024 * 1024,
      };
      await expect(readDocxDocument({ file: largeFile })).rejects.toThrow(
        /exceeds maximum upload size limit of 25 MB/i
      );
    });

    it('rejects invalid or non-docx file extensions', async () => {
      const txtFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'document.pdf');
      await expect(readDocxDocument({ file: txtFile })).rejects.toThrow(
        /only \.docx files are accepted/i
      );
    });

    it('rejects legacy binary .doc format with helpful format error', async () => {
      const docFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'legacy.doc');
      await expect(readDocxDocument({ file: docFile })).rejects.toThrow(
        /legacy binary word documents \(\.doc\) are not supported/i
      );
    });

    it('rejects macro-enabled .docm format immediately', async () => {
      const docmFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'macro.docm');
      await expect(readDocxDocument({ file: docmFile })).rejects.toThrow(
        /macro-enabled word documents/i
      );
    });

    it('rejects archives missing required package parts', async () => {
      // Archive missing [Content_Types].xml
      const brokenZip = fflate.zipSync({
        '_rels/.rels': fflate.strToU8('<root/>'),
        'word/document.xml': fflate.strToU8('<root/>'),
      });
      const file = new File([brokenZip], 'missing-types.docx');

      await expect(readDocxDocument({ file })).rejects.toThrow(
        /missing required part "\[Content_Types\]\.xml"/i
      );
    });

    it('rejects archives exceeding maximum entry count (250 entries)', async () => {
      const extraFiles = {};
      for (let i = 0; i < 252; i++) {
        extraFiles[`word/extra_${i}.xml`] = fflate.strToU8('<test/>');
      }

      const bombZip = createDocxArchive({ extraFiles });
      const file = new File([bombZip], 'too-many-entries.docx');

      await expect(readDocxDocument({ file })).rejects.toThrow(
        /archive contains too many entries/i
      );
    });

    it('rejects directory traversal paths and backslashes in archive entries', () => {
      expect(() => sanitizeArchivePath('../evil.xml')).toThrow(/directory traversal/i);
      expect(() => sanitizeArchivePath('folder/../../escape.xml')).toThrow(/directory traversal/i);
      expect(() => sanitizeArchivePath('/etc/passwd')).toThrow(/must not be absolute/i);
      expect(() => sanitizeArchivePath('word\\document.xml')).toThrow(/illegal backslash/i);
      expect(() => sanitizeArchivePath('word/doc\0ument.xml')).toThrow(/null byte/i);
    });

    it('rejects duplicate archive entry paths', async () => {
      // Create duplicate entry in raw ZIP
      const duplicateZip = fflate.zipSync({
        'word/document.xml': fflate.strToU8('<first/>'),
        'word/Document.xml': fflate.strToU8('<second/>'), // Case collision
      });
      const file = new File([duplicateZip], 'duplicate.docx');

      await expect(readDocxArchive({ file })).rejects.toThrow(
        /duplicate archive entry/i
      );
    });

    it('enforces bounded extraction and rejects entries exceeding single entry size limit', async () => {
      // Create an entry that expands to > 20 MB XML
      const largeXml = '<w:p>' + 'A'.repeat(21 * 1024 * 1024) + '</w:p>';
      const oversizedZip = createDocxArchive({ documentXml: largeXml });
      const file = new File([oversizedZip], 'oversized-entry.docx');

      await expect(readDocxDocument({ file })).rejects.toThrow(
        /(?:exceeded maximum decompressed size limit|declared size exceeds limit)/i
      );
    });
  });

  describe('Security Gate: Macros, Active Content & Relationships', () => {
    it('rejects documents declaring macro-enabled content types in [Content_Types].xml', async () => {
      const macroTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/>
</Types>`;

      const zipWithMacroType = fflate.zipSync({
        '[Content_Types].xml': fflate.strToU8(macroTypesXml),
        '_rels/.rels': fflate.strToU8('<Relationships/>'),
        'word/document.xml': fflate.strToU8('<document/>'),
      });

      const file = new File([zipWithMacroType], 'macro-type.docx');
      await expect(readDocxDocument({ file })).rejects.toThrow(
        /prohibited active content type/i
      );
    });

    it('rejects documents containing vbaProject.bin, activeX, or OLE embeddings', async () => {
      const vbaZip = createDocxArchive({
        extraFiles: {
          'word/vbaProject.bin': new Uint8Array([1, 2, 3, 4]),
        },
      });

      const file = new File([vbaZip], 'vba.docx');
      await expect(readDocxDocument({ file })).rejects.toThrow(
        /prohibited active content entry "word\/vbaProject\.bin"/i
      );
    });

    it('rejects root relationships pointing to external network targets', () => {
      const externalRootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://example.com/rel" Target="http://attacker.com/leak" TargetMode="External"/>
</Relationships>`;

      expect(() => parseRelationships(externalRootRels, '_rels/.rels')).toThrow(
        /root relationship "rId1" points to an external target/i
      );
    });

    it('flags external document relationships without attempting network fetches', async () => {
      const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://trusted.org" TargetMode="External"/>
</Relationships>`;

      const bytes = createDocxArchive({
        extraFiles: {
          'word/_rels/document.xml.rels': fflate.strToU8(docRelsXml),
        },
      });

      const file = new File([bytes], 'external-links.docx');
      const result = await readDocxDocument({ file });

      expect(result.externalRelationships).toHaveLength(1);
      expect(result.externalRelationships[0].target).toBe('https://trusted.org');
      expect(result.warnings.some((w) => w.includes('external relationship'))).toBe(true);
    });
  });

  describe('Security Gate: Safe XML Parsing & Entity Expansion Defense', () => {
    it('strictly rejects DOCTYPE and ENTITY declarations (XXE / Billion Laughs defense)', () => {
      const xxeXml = `<?xml version="1.0"?>
<!DOCTYPE test [
  <!ENTITY xxe "attack">
]>
<root>&xxe;</root>`;

      expect(() => validateXmlSecurity(xxeXml)).toThrow(
        /forbidden doctype or entity declaration/i
      );
      expect(() => parseXmlSafely(xxeXml)).toThrow(
        /forbidden doctype or entity declaration/i
      );
    });

    it('rejects malformed XML with unclosed tags', () => {
      const malformedXml = '<w:document><w:body><w:p><w:t>Unclosed';
      expect(() => parseXmlSafely(malformedXml)).toThrow(
        /malformed xml/i
      );
    });

    it('strictly enforces structural depth limits (MAX_XML_DEPTH = 32)', () => {
      let deepXml = '<node>';
      for (let i = 0; i < 35; i++) deepXml += '<level>';
      for (let i = 0; i < 35; i++) deepXml += '</level>';
      deepXml += '</node>';

      expect(() => parseXmlSafely(deepXml)).toThrow(
        /exceeds maximum nesting depth \(32 levels\)/i
      );
    });

    it('cooperatively cancels execution when AbortSignal is triggered', async () => {
      const controller = new AbortController();
      controller.abort();

      const bytes = createDocxArchive();
      const file = new File([bytes], 'canceled.docx');

      await expect(
        readDocxDocument({ file, signal: controller.signal })
      ).rejects.toThrow(/operation was canceled by user/i);
    });
  });
});
