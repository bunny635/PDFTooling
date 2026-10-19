import { readDocxArchive } from './docxArchiveReader.js';
import { buildDocumentModel } from './documentModel.js';

/**
 * High-level secure reader and normalized model builder for DOCX documents.
 * Adheres strictly to Milestone A requirements: parses the archive safely,
 * validates security bounds, builds the normalized document model, preserves exact Unicode,
 * and records unsupported features without performing PDF layout or rendering.
 *
 * @param {object} params
 * @param {File|Blob|ArrayBuffer|Uint8Array} params.file - Input DOCX document
 * @param {AbortSignal} [params.signal] - Advisory cancellation signal
 * @returns {Promise<{
 *   document: object,
 *   warnings: string[],
 *   externalRelationships: Array<object>,
 *   stats: object
 * }>}
 */
export async function readDocxDocument({ file, signal }) {
  // 1. Safe archive extraction and security inspection
  const { textParts, mainDocumentPart, externalRelationships } = await readDocxArchive({
    file,
    signal,
  });

  // 2. Retrieve main document XML and optional styles XML
  const documentXml = textParts.get(mainDocumentPart);
  if (!documentXml) {
    throw new Error(`Main document XML part "${mainDocumentPart}" is empty or not decoded.`);
  }

  const stylesXml = textParts.get('word/styles.xml') || '';

  // 3. Build normalized document model
  const docModel = buildDocumentModel({
    documentXml,
    stylesXml,
  });

  const warnings = [...docModel.unsupportedFeatures];
  if (externalRelationships.length > 0) {
    warnings.push(
      `Document references ${externalRelationships.length} external relationship(s) which will not be fetched over the network.`
    );
  }

  return {
    document: {
      pageSetup: docModel.pageSetup,
      paragraphs: docModel.paragraphs,
    },
    warnings,
    externalRelationships,
    stats: docModel.stats,
  };
}

export {
  readDocxArchive,
  sanitizeArchivePath,
  parseRelationships,
  inspectContentTypes,
  validateFileMetadata,
  extractZipArchive,
} from './docxArchiveReader.js';
export { buildDocumentModel, parseSectionProperties, parseStyles } from './documentModel.js';
export { parseXmlSafely, validateXmlSecurity, validateXmlStructure } from './xmlParser.js';
export * from './constants.js';
