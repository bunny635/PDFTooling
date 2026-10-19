import {
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  OPENXML_NS,
} from './constants.js';
import {
  parseXmlSafely,
  getChildElementsByLocalName,
  getFirstChildElementByLocalName,
  getSafeAttribute,
} from './xmlParser.js';

/**
 * Normalizes paragraph alignment strings to standardized values.
 *
 * @param {string|null} rawJc
 * @returns {'left'|'center'|'right'|'justify'}
 */
function normalizeAlignment(rawJc) {
  if (!rawJc) return 'left';
  const lower = rawJc.toLowerCase();
  if (lower === 'both') return 'justify';
  if (lower === 'center' || lower === 'right' || lower === 'justify') return lower;
  return 'left';
}

/**
 * Converts OpenXML twips (1/20th of a point) to PDF points (1/72th of an inch).
 *
 * @param {string|number|null} twips
 * @param {number} fallbackPoints
 * @returns {number} Points
 */
function twipsToPoints(twips, fallbackPoints = 0) {
  if (twips === null || twips === undefined || twips === '') return fallbackPoints;
  const num = Number(twips);
  return Number.isNaN(num) ? fallbackPoints : num / 20;
}

/**
 * Converts OpenXML half-points (1/144th of an inch) to PDF points.
 *
 * @param {string|number|null} halfPoints
 * @param {number} fallbackPoints
 * @returns {number} Points
 */
function halfPointsToPoints(halfPoints, fallbackPoints = 12) {
  if (halfPoints === null || halfPoints === undefined || halfPoints === '') return fallbackPoints;
  const num = Number(halfPoints);
  return Number.isNaN(num) ? fallbackPoints : num / 2;
}

/**
 * Extracts page dimensions and margins from a <w:sectPr> element.
 *
 * @param {Element|null} sectPrElement
 * @returns {{
 *   width: number,
 *   height: number,
 *   orientation: 'portrait'|'landscape',
 *   margins: { top: number, bottom: number, left: number, right: number, header: number, footer: number }
 * }}
 */
export function parseSectionProperties(sectPrElement) {
  const result = {
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
    orientation: 'portrait',
    margins: {
      top: DEFAULT_MARGIN,
      bottom: DEFAULT_MARGIN,
      left: DEFAULT_MARGIN,
      right: DEFAULT_MARGIN,
      header: DEFAULT_MARGIN / 2,
      footer: DEFAULT_MARGIN / 2,
    },
  };

  if (!sectPrElement) return result;

  // Page Size: <w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/>
  const pgSz = getFirstChildElementByLocalName(sectPrElement, 'pgSz');
  if (pgSz) {
    const rawW = getSafeAttribute(pgSz, 'w');
    const rawH = getSafeAttribute(pgSz, 'h');
    const rawOrient = getSafeAttribute(pgSz, 'orient');

    if (rawW) result.width = twipsToPoints(rawW, DEFAULT_PAGE_WIDTH);
    if (rawH) result.height = twipsToPoints(rawH, DEFAULT_PAGE_HEIGHT);
    if (rawOrient && rawOrient.toLowerCase() === 'landscape') {
      result.orientation = 'landscape';
    }
  }

  // Page Margins: <w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/>
  const pgMar = getFirstChildElementByLocalName(sectPrElement, 'pgMar');
  if (pgMar) {
    result.margins.top = twipsToPoints(getSafeAttribute(pgMar, 'top'), DEFAULT_MARGIN);
    result.margins.bottom = twipsToPoints(getSafeAttribute(pgMar, 'bottom'), DEFAULT_MARGIN);
    result.margins.left = twipsToPoints(getSafeAttribute(pgMar, 'left'), DEFAULT_MARGIN);
    result.margins.right = twipsToPoints(getSafeAttribute(pgMar, 'right'), DEFAULT_MARGIN);
    result.margins.header = twipsToPoints(getSafeAttribute(pgMar, 'header'), DEFAULT_MARGIN / 2);
    result.margins.footer = twipsToPoints(getSafeAttribute(pgMar, 'footer'), DEFAULT_MARGIN / 2);
  }

  return result;
}

/**
 * Parses style definitions from word/styles.xml.
 *
 * @param {string} stylesXml
 * @returns {Map<string, { id: string, name: string, headingLevel: number|null, bold: boolean, italic: boolean, fontSize: number|null }>}
 */
export function parseStyles(stylesXml) {
  const styles = new Map();
  if (!stylesXml) return styles;

  try {
    const doc = parseXmlSafely(stylesXml, 'word/styles.xml');
    const styleElements = getChildElementsByLocalName(doc.documentElement, 'style');

    for (const styleEl of styleElements) {
      const styleId = getSafeAttribute(styleEl, 'styleId') || '';
      if (!styleId) continue;

      let name = styleId;
      const nameEl = getFirstChildElementByLocalName(styleEl, 'name');
      if (nameEl) {
        name = getSafeAttribute(nameEl, 'val') || styleId;
      }

      // Check heading level
      let headingLevel = null;
      const lowerName = name.toLowerCase();
      const lowerId = styleId.toLowerCase();
      const headingMatch = lowerName.match(/^heading\s*([1-6])$/) || lowerId.match(/^heading([1-6])$/);
      if (headingMatch) {
        headingLevel = parseInt(headingMatch[1], 10);
      }

      // Check outline level if present: <w:pPr><w:outlineLvl w:val="0"/>
      const pPr = getFirstChildElementByLocalName(styleEl, 'pPr');
      if (pPr) {
        const outlineLvl = getFirstChildElementByLocalName(pPr, 'outlineLvl');
        if (outlineLvl) {
          const val = parseInt(getSafeAttribute(outlineLvl, 'val') || '-1', 10);
          if (val >= 0 && val < 6 && headingLevel === null) {
            headingLevel = val + 1;
          }
        }
      }

      // Run formatting in style
      let bold = false;
      let italic = false;
      let fontSize = null;

      const rPr = getFirstChildElementByLocalName(styleEl, 'rPr');
      if (rPr) {
        const b = getFirstChildElementByLocalName(rPr, 'b');
        if (b && getSafeAttribute(b, 'val') !== '0' && getSafeAttribute(b, 'val') !== 'false') {
          bold = true;
        }
        const i = getFirstChildElementByLocalName(rPr, 'i');
        if (i && getSafeAttribute(i, 'val') !== '0' && getSafeAttribute(i, 'val') !== 'false') {
          italic = true;
        }
        const sz = getFirstChildElementByLocalName(rPr, 'sz');
        if (sz) {
          fontSize = halfPointsToPoints(getSafeAttribute(sz, 'val'), 12);
        }
      }

      styles.set(styleId, {
        id: styleId,
        name,
        headingLevel,
        bold,
        italic,
        fontSize,
      });
    }
  } catch {
    // If styles.xml fails or is absent, continue gracefully with default styles
  }

  return styles;
}

/**
 * Parses run formatting properties (<w:rPr>).
 *
 * @param {Element|null} rPrElement
 * @returns {{
 *   bold: boolean,
 *   italic: boolean,
 *   underline: boolean,
 *   strike: boolean,
 *   fontSize: number|null,
 *   color: string|null,
 *   fontFamily: string|null
 * }}
 */
function parseRunProperties(rPrElement) {
  const result = {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    fontSize: null,
    color: null,
    fontFamily: null,
  };

  if (!rPrElement) return result;

  // Bold: <w:b/> or <w:b w:val="true|1"/>
  const b = getFirstChildElementByLocalName(rPrElement, 'b');
  if (b) {
    const val = getSafeAttribute(b, 'val');
    result.bold = val === null || val === 'true' || val === '1';
  }

  // Italic: <w:i/>
  const i = getFirstChildElementByLocalName(rPrElement, 'i');
  if (i) {
    const val = getSafeAttribute(i, 'val');
    result.italic = val === null || val === 'true' || val === '1';
  }

  // Underline: <w:u w:val="single"/>
  const u = getFirstChildElementByLocalName(rPrElement, 'u');
  if (u) {
    const val = getSafeAttribute(u, 'val');
    result.underline = val !== null && val !== 'none' && val !== '0' && val !== 'false';
  }

  // Strikethrough: <w:strike/>
  const strike = getFirstChildElementByLocalName(rPrElement, 'strike');
  if (strike) {
    const val = getSafeAttribute(strike, 'val');
    result.strike = val === null || val === 'true' || val === '1';
  }

  // Font Size: <w:sz w:val="24"/> (half-points)
  const sz = getFirstChildElementByLocalName(rPrElement, 'sz');
  if (sz) {
    result.fontSize = halfPointsToPoints(getSafeAttribute(sz, 'val'), 12);
  }

  // Color: <w:color w:val="FF0000"/>
  const color = getFirstChildElementByLocalName(rPrElement, 'color');
  if (color) {
    const rawVal = getSafeAttribute(color, 'val');
    if (rawVal && rawVal !== 'auto') {
      result.color = rawVal.startsWith('#') ? rawVal : `#${rawVal}`;
    }
  }

  // Font Family: <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
  const rFonts = getFirstChildElementByLocalName(rPrElement, 'rFonts');
  if (rFonts) {
    result.fontFamily =
      getSafeAttribute(rFonts, 'ascii') ||
      getSafeAttribute(rFonts, 'hAnsi') ||
      getSafeAttribute(rFonts, 'cs') ||
      null;
  }

  return result;
}

/**
 * Parses paragraph formatting properties (<w:pPr>).
 *
 * @param {Element|null} pPrElement
 * @param {Map<string, object>} styles
 * @returns {{
 *   styleId: string|null,
 *   headingLevel: number|null,
 *   alignment: 'left'|'center'|'right'|'justify',
 *   spacing: { before: number, after: number, line: number },
 *   isPageBreakBefore: boolean
 * }}
 */
function parseParagraphProperties(pPrElement, styles) {
  const result = {
    styleId: null,
    headingLevel: null,
    alignment: 'left',
    spacing: { before: 0, after: 0, line: 0 },
    isPageBreakBefore: false,
  };

  if (!pPrElement) return result;

  // Style: <w:pStyle w:val="Heading1"/>
  const pStyle = getFirstChildElementByLocalName(pPrElement, 'pStyle');
  if (pStyle) {
    result.styleId = getSafeAttribute(pStyle, 'val');
    if (result.styleId && styles.has(result.styleId)) {
      const styleDef = styles.get(result.styleId);
      if (styleDef.headingLevel) {
        result.headingLevel = styleDef.headingLevel;
      }
    }
  }

  // Outline Level: <w:outlineLvl w:val="0"/> -> headingLevel 1
  const outlineLvl = getFirstChildElementByLocalName(pPrElement, 'outlineLvl');
  if (outlineLvl) {
    const val = parseInt(getSafeAttribute(outlineLvl, 'val') || '-1', 10);
    if (val >= 0 && val < 6 && result.headingLevel === null) {
      result.headingLevel = val + 1;
    }
  }

  // Alignment: <w:jc w:val="center"/>
  const jc = getFirstChildElementByLocalName(pPrElement, 'jc');
  if (jc) {
    result.alignment = normalizeAlignment(getSafeAttribute(jc, 'val'));
  }

  // Spacing: <w:spacing w:before="240" w:after="120" w:line="240"/>
  const spacing = getFirstChildElementByLocalName(pPrElement, 'spacing');
  if (spacing) {
    result.spacing.before = twipsToPoints(getSafeAttribute(spacing, 'before'), 0);
    result.spacing.after = twipsToPoints(getSafeAttribute(spacing, 'after'), 0);
    result.spacing.line = twipsToPoints(getSafeAttribute(spacing, 'line'), 0);
  }

  // Page break before: <w:pageBreakBefore/>
  const pb = getFirstChildElementByLocalName(pPrElement, 'pageBreakBefore');
  if (pb) {
    const val = getSafeAttribute(pb, 'val');
    result.isPageBreakBefore = val === null || val === 'true' || val === '1';
  }

  return result;
}

/**
 * Builds the normalized document model from parsed DOCX XML components.
 * Preserves exact original Unicode characters, builds typed paragraphs and runs,
 * and catalogs unsupported constructs.
 *
 * @param {object} params
 * @param {string} params.documentXml - Raw XML string of word/document.xml
 * @param {string} [params.stylesXml] - Raw XML string of word/styles.xml
 * @returns {{
 *   pageSetup: { width: number, height: number, orientation: string, margins: object },
 *   paragraphs: Array<object>,
 *   unsupportedFeatures: string[],
 *   stats: { paragraphCount: number, runCount: number, headingCount: number, characterCount: number }
 * }}
 */
export function buildDocumentModel({ documentXml, stylesXml = '' }) {
  const doc = parseXmlSafely(documentXml, 'word/document.xml');
  const styles = parseStyles(stylesXml);

  const unsupportedFeatures = [];
  const paragraphs = [];
  let headingCount = 0;
  let runCount = 0;
  let characterCount = 0;

  // Locate <w:body>
  const body = getFirstChildElementByLocalName(doc.documentElement, 'body');
  if (!body) {
    throw new Error('Invalid DOCX document: missing <w:body> element in word/document.xml.');
  }

  // Extract document-wide <w:sectPr> (usually the last child of <w:body>)
  let lastSectPr = null;
  const bodyChildren = body.children || [];
  for (let i = 0; i < bodyChildren.length; i++) {
    const child = bodyChildren[i];
    const localName = child.localName || child.nodeName.split(':').pop();
    if (localName === 'sectPr') {
      lastSectPr = child;
    }
  }

  const pageSetup = parseSectionProperties(lastSectPr);

  // Traverse body children (<w:p>, <w:tbl>, etc.)
  for (let i = 0; i < bodyChildren.length; i++) {
    const child = bodyChildren[i];
    const localName = child.localName || child.nodeName.split(':').pop();

    if (localName === 'p') {
      // Paragraph node
      const pPr = getFirstChildElementByLocalName(child, 'pPr');
      const paragraphProps = parseParagraphProperties(pPr, styles);

      if (paragraphProps.headingLevel) {
        headingCount++;
      }

      const runs = [];
      let paragraphText = '';

      // Traverse children of <w:p> to extract runs (<w:r>), breaks, tabs, or hyperlinks
      const pChildren = child.children || [];
      for (let j = 0; j < pChildren.length; j++) {
        const pChild = pChildren[j];
        const pChildName = pChild.localName || pChild.nodeName.split(':').pop();

        if (pChildName === 'r') {
          // Run element
          const rPr = getFirstChildElementByLocalName(pChild, 'rPr');
          const runProps = parseRunProperties(rPr);

          // Inherit style-level font size / bold / italic if not specified in run
          if (paragraphProps.styleId && styles.has(paragraphProps.styleId)) {
            const styleDef = styles.get(paragraphProps.styleId);
            if (!runProps.bold && styleDef.bold) runProps.bold = true;
            if (!runProps.italic && styleDef.italic) runProps.italic = true;
            if (runProps.fontSize === null && styleDef.fontSize) runProps.fontSize = styleDef.fontSize;
          }

          // Inspect children of <w:r> (<w:t>, <w:br>, <w:tab>, <w:drawing>)
          const rChildren = pChild.children || [];
          for (let k = 0; k < rChildren.length; k++) {
            const rChild = rChildren[k];
            const rChildName = rChild.localName || rChild.nodeName.split(':').pop();

            if (rChildName === 't') {
              // Exact Unicode preservation without transliteration or normalization
              const text = rChild.textContent || '';
              if (text.length > 0) {
                runs.push({
                  type: 'text',
                  text,
                  ...runProps,
                });
                paragraphText += text;
                runCount++;
                characterCount += text.length;
              }
            } else if (rChildName === 'br') {
              const brType = getSafeAttribute(rChild, 'type');
              if (brType && brType.toLowerCase() === 'page') {
                runs.push({
                  type: 'pageBreak',
                  isPageBreak: true,
                });
              } else {
                runs.push({
                  type: 'lineBreak',
                  isLineBreak: true,
                });
                paragraphText += '\n';
              }
              runCount++;
            } else if (rChildName === 'tab') {
              runs.push({
                type: 'tab',
                isTab: true,
              });
              paragraphText += '\t';
              runCount++;
            } else if (rChildName === 'drawing') {
              unsupportedFeatures.push('embedded drawing or image (rendering deferred to Milestone D)');
            }
          }
        } else if (pChildName === 'hyperlink') {
          // Hyperlink wrapper containing runs
          const hChildren = pChild.children || [];
          for (let h = 0; h < hChildren.length; h++) {
            const hChild = hChildren[h];
            if ((hChild.localName || hChild.nodeName.split(':').pop()) === 'r') {
              const rPr = getFirstChildElementByLocalName(hChild, 'rPr');
              const runProps = parseRunProperties(rPr);
              // Default hyperlinks to underline and blue if not explicitly colored
              if (!runProps.color) runProps.color = '#0563C1';
              runProps.underline = true;

              const t = getFirstChildElementByLocalName(hChild, 't');
              if (t) {
                const text = t.textContent || '';
                runs.push({
                  type: 'text',
                  text,
                  ...runProps,
                });
                paragraphText += text;
                runCount++;
                characterCount += text.length;
              }
            }
          }
        }
      }

      paragraphs.push({
        id: `p-${paragraphs.length + 1}`,
        ...paragraphProps,
        runs,
        text: paragraphText,
      });
    } else if (localName === 'tbl') {
      unsupportedFeatures.push('table structure (rendering deferred to Milestone D)');
    } else if (localName === 'm:oMath' || localName === 'oMath' || localName === 'oMathPara') {
      unsupportedFeatures.push('mathematical equation (unsupported)');
    } else if (localName !== 'sectPr') {
      unsupportedFeatures.push(`unsupported construct <w:${localName}>`);
    }
  }

  // Deduplicate recorded unsupported features
  const uniqueUnsupported = Array.from(new Set(unsupportedFeatures));

  return {
    pageSetup,
    paragraphs,
    unsupportedFeatures: uniqueUnsupported,
    stats: {
      paragraphCount: paragraphs.length,
      runCount,
      headingCount,
      characterCount,
    },
  };
}
