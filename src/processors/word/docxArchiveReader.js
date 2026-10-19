import * as fflate from 'fflate';
import {
  MAX_FILE_SIZE,
  MAX_ENTRY_COUNT,
  MAX_TOTAL_UNCOMPRESSED_SIZE,
  MAX_XML_ENTRY_SIZE,
  MAX_MEDIA_ENTRY_SIZE,
  MAX_COMPRESSION_RATIO,
  REQUIRED_PACKAGE_PARTS,
  DISALLOWED_ENTRY_PATTERNS,
  WORD_MAIN_CONTENT_TYPE,
  WORD_MACRO_CONTENT_TYPE,
  WORD_MACRO_TEMPLATE_CONTENT_TYPE,
  OPENXML_NS,
} from './constants.js';
import { parseXmlSafely, getChildElementsByLocalName, getSafeAttribute } from './xmlParser.js';

/**
 * Checks whether an advisory AbortSignal has been triggered.
 * @param {AbortSignal} [signal]
 */
function checkAborted(signal) {
  if (signal?.aborted) {
    throw new Error('Operation was canceled by user.');
  }
}

/**
 * Safely converts an input File, Blob, ArrayBuffer, or Uint8Array into a Uint8Array.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} input
 * @returns {Promise<Uint8Array>}
 */
async function toUint8Array(input) {
  if (!input) {
    throw new Error('No document provided for processing.');
  }

  if (input instanceof Uint8Array) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  if (typeof input.arrayBuffer === 'function') {
    const buffer = await input.arrayBuffer();
    return new Uint8Array(buffer);
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(reader.error || new Error('Failed to read file data.'));
      reader.readAsArrayBuffer(input);
    });
  }

  throw new Error('Unsupported input type: cannot read document bytes.');
}

/**
 * Validates file metadata (name, extension, MIME type, and size) prior to decompression.
 *
 * @param {File|Blob|object} file
 */
export function validateFileMetadata(file) {
  if (!file) {
    throw new Error('A valid Word document (.docx) is required.');
  }

  const name = file.name || '';
  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.docm') || lowerName.endsWith('.dotm')) {
      throw new Error(
        'Security Error: Macro-enabled Word documents (.docm/.dotm) are not supported.'
      );
    }
    if (lowerName.endsWith('.doc')) {
      throw new Error(
        'Format Error: Legacy binary Word documents (.doc) are not supported. Only modern .docx files can be processed.'
      );
    }
    if (!lowerName.endsWith('.docx')) {
      throw new Error(`Invalid file extension for "${name}". Only .docx files are accepted.`);
    }
  }

  // Validate MIME type if explicitly declared
  const type = (file.type || '').trim().toLowerCase();
  if (type) {
    const isDocxMime =
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      type === 'application/x-zip-compressed' ||
      type === 'application/zip' ||
      type === 'application/octet-stream';

    if (type.includes('macro') || type === WORD_MACRO_CONTENT_TYPE) {
      throw new Error(
        'Security Error: Macro-enabled Word document MIME type is not allowed.'
      );
    }

    if (!isDocxMime) {
      throw new Error(`Unsupported MIME type "${file.type}". Expected a .docx document.`);
    }
  }

  if (typeof file.size === 'number') {
    if (file.size <= 0) {
      throw new Error('Selected document is empty (0 bytes).');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File exceeds maximum upload size limit of ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(
          0
        )} MB.`
      );
    }
  }
}

/**
 * Normalizes an archive path and verifies it contains no path traversal,
 * absolute paths, backslashes, or null bytes.
 *
 * @param {string} rawPath
 * @returns {string} Normalized path
 * @throws {Error} If path is malicious or invalid
 */
export function sanitizeArchivePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    throw new Error('Security Error: Empty or invalid archive path.');
  }

  if (rawPath.includes('\0')) {
    throw new Error('Security Error: Archive entry path contains null byte.');
  }

  if (rawPath.includes('\\')) {
    throw new Error('Security Error: Archive entry path contains illegal backslash separator.');
  }

  // Check absolute paths
  if (rawPath.startsWith('/') || /^[a-zA-Z]:/.test(rawPath)) {
    throw new Error('Security Error: Archive entry path must not be absolute.');
  }

  // Normalize segments
  const segments = rawPath.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error(`Security Error: Directory traversal attempt detected in path "${rawPath}".`);
    }
  }

  return rawPath;
}

/**
 * Extracts and strictly validates all entries from a DOCX ZIP archive.
 * Enforces pre-flight limits on entry count, duplicate paths, compression ratio,
 * per-entry decompressed size, and aggregate uncompressed size.
 *
 * @param {Uint8Array} zipBytes
 * @param {AbortSignal} [signal]
 * @returns {Promise<Map<string, Uint8Array>>} Map of sanitized relative path to file bytes
 */
export async function extractZipArchive(zipBytes, signal) {
  checkAborted(signal);

  // Validate ZIP magic number (PK\x03\x04 = 0x50, 0x4B, 0x03, 0x04)
  if (
    zipBytes.length < 4 ||
    zipBytes[0] !== 0x50 ||
    zipBytes[1] !== 0x4b ||
    zipBytes[2] !== 0x03 ||
    zipBytes[3] !== 0x04
  ) {
    throw new Error('File is not a valid ZIP/DOCX archive (missing PK signature).');
  }

  return new Promise((resolve, reject) => {
    const entries = new Map();
    const seenPaths = new Set();
    let entryCount = 0;
    let totalDecompressedBytes = 0;
    let isTerminated = false;

    function fail(err) {
      if (!isTerminated) {
        isTerminated = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }

    const unzipper = new fflate.Unzip();
    unzipper.register(fflate.UnzipInflate);
    unzipper.register(fflate.UnzipPassThrough);

    unzipper.onfile = (file) => {
      if (isTerminated) return;

      try {
        checkAborted(signal);
      } catch (err) {
        return fail(err);
      }

      entryCount++;
      if (entryCount > MAX_ENTRY_COUNT) {
        return fail(
          new Error(
            `Security Error: Archive contains too many entries (maximum allowed is ${MAX_ENTRY_COUNT}).`
          )
        );
      }

      let sanitizedPath;
      try {
        sanitizedPath = sanitizeArchivePath(file.name);
      } catch (err) {
        return fail(err);
      }

      // Detect duplicate archive paths (shadowed files / collision attacks)
      const lowerPath = sanitizedPath.toLowerCase();
      if (seenPaths.has(lowerPath)) {
        return fail(
          new Error(
            `Security Error: Malformed DOCX contains duplicate archive entry "${sanitizedPath}".`
          )
        );
      }
      seenPaths.add(lowerPath);

      // Check disallowed / active content patterns
      for (const pattern of DISALLOWED_ENTRY_PATTERNS) {
        if (pattern.test(sanitizedPath)) {
          return fail(
            new Error(
              `Security Error: Document contains prohibited active content entry "${sanitizedPath}".`
            )
          );
        }
      }

      // Skip directory entries
      if (sanitizedPath.endsWith('/')) {
        return;
      }

      const isXml = sanitizedPath.endsWith('.xml') || sanitizedPath.endsWith('.rels');
      const maxEntryLimit = isXml ? MAX_XML_ENTRY_SIZE : MAX_MEDIA_ENTRY_SIZE;

      // Initial header sanity checks if available
      if (file.originalSize && file.originalSize > maxEntryLimit) {
        return fail(
          new Error(
            `Security Error: Archive entry "${sanitizedPath}" declared size exceeds limit.`
          )
        );
      }

      const chunks = [];
      let entryDecompressedBytes = 0;

      file.ondata = (err, chunk, final) => {
        if (isTerminated) return;

        if (err) {
          return fail(
            new Error(`Decompression error in "${sanitizedPath}": ${err.message || err}`)
          );
        }

        try {
          checkAborted(signal);
        } catch (abortErr) {
          return fail(abortErr);
        }

        if (chunk && chunk.length > 0) {
          entryDecompressedBytes += chunk.length;
          totalDecompressedBytes += chunk.length;

          // Bounded extraction: Hard per-entry byte ceiling check
          if (entryDecompressedBytes > maxEntryLimit) {
            return fail(
              new Error(
                `Security Error: Entry "${sanitizedPath}" exceeded maximum decompressed size limit.`
              )
            );
          }

          // Bounded extraction: Cumulative uncompressed size ceiling check
          if (totalDecompressedBytes > MAX_TOTAL_UNCOMPRESSED_SIZE) {
            return fail(
              new Error(
                `Security Error: Aggregate decompressed size exceeded limit of ${(
                  MAX_TOTAL_UNCOMPRESSED_SIZE /
                  (1024 * 1024)
                ).toFixed(0)} MB.`
              )
            );
          }

          // ZIP bomb ratio defense: check ratio for entries whose compressed size > 1 MB
          if (file.size && file.size > 1024 * 1024) {
            const ratio = entryDecompressedBytes / file.size;
            if (ratio > MAX_COMPRESSION_RATIO) {
              return fail(
                new Error(
                  `Security Error: Archive entry "${sanitizedPath}" exceeded safe compression ratio threshold (${MAX_COMPRESSION_RATIO}:1).`
                )
              );
            }
          }

          chunks.push(chunk);
        }

        if (final) {
          // Combine chunks into single Uint8Array
          let combined;
          if (chunks.length === 1) {
            combined = chunks[0];
          } else {
            combined = new Uint8Array(entryDecompressedBytes);
            let offset = 0;
            for (const c of chunks) {
              combined.set(c, offset);
              offset += c.length;
            }
          }

          entries.set(sanitizedPath, combined);
        }
      };

      try {
        file.start();
      } catch (startErr) {
        fail(new Error(`Failed to extract entry "${sanitizedPath}": ${startErr.message || startErr}`));
      }
    };

    try {
      unzipper.push(zipBytes, true);
    } catch (pushErr) {
      return fail(
        new Error(`Failed to parse ZIP archive structure: ${pushErr.message || pushErr}`)
      );
    }

    if (!isTerminated) {
      resolve(entries);
    }
  });
}

/**
 * Inspects [Content_Types].xml to ensure the package represents a standard WordprocessingML
 * document and contains no macro-enabled or forbidden parts.
 *
 * @param {string} contentTypesXml
 * @returns {{ mainDocumentPart: string|null, overrideTypes: Map<string, string> }}
 */
export function inspectContentTypes(contentTypesXml) {
  const doc = parseXmlSafely(contentTypesXml, '[Content_Types].xml');
  const overrideTypes = new Map();
  let mainDocumentPart = null;

  // Check <Override> elements
  const overrides = getChildElementsByLocalName(doc.documentElement, 'Override', OPENXML_NS.ct);
  for (const override of overrides) {
    const partName = (getSafeAttribute(override, 'PartName', OPENXML_NS.ct) || '').replace(/^\//, '');
    const contentType = (getSafeAttribute(override, 'ContentType', OPENXML_NS.ct) || '').trim();

    if (
      contentType === WORD_MACRO_CONTENT_TYPE ||
      contentType === WORD_MACRO_TEMPLATE_CONTENT_TYPE ||
      contentType.includes('macroEnabled') ||
      contentType.includes('activeX') ||
      contentType.includes('oleObject')
    ) {
      throw new Error(
        `Security Error: Document contains prohibited active content type "${contentType}" in part "${partName}".`
      );
    }

    if (contentType === WORD_MAIN_CONTENT_TYPE) {
      mainDocumentPart = partName;
    }

    overrideTypes.set(partName, contentType);
  }

  // Check <Default> elements for macro extensions
  const defaults = getChildElementsByLocalName(doc.documentElement, 'Default', OPENXML_NS.ct);
  for (const def of defaults) {
    const ext = (getSafeAttribute(def, 'Extension', OPENXML_NS.ct) || '').toLowerCase();
    const ct = (getSafeAttribute(def, 'ContentType', OPENXML_NS.ct) || '').trim();
    if (ext === 'bin' && (ct.includes('vba') || ct.includes('macro'))) {
      throw new Error('Security Error: Document contains macro binary extension declarations.');
    }
  }

  return { mainDocumentPart, overrideTypes };
}

/**
 * Parses relationship XML files (_rels/.rels or word/_rels/document.xml.rels).
 * Flags external relationships and verifies target paths.
 *
 * @param {string} relsXml
 * @param {string} relsPath
 * @returns {Map<string, { id: string, type: string, target: string, isExternal: boolean }>}
 */
export function parseRelationships(relsXml, relsPath) {
  const doc = parseXmlSafely(relsXml, relsPath);
  const relationships = new Map();

  const relElements = getChildElementsByLocalName(doc.documentElement, 'Relationship', OPENXML_NS.rel);
  for (const rel of relElements) {
    const id = getSafeAttribute(rel, 'Id', OPENXML_NS.rel) || '';
    const type = getSafeAttribute(rel, 'Type', OPENXML_NS.rel) || '';
    const target = getSafeAttribute(rel, 'Target', OPENXML_NS.rel) || '';
    const targetMode = getSafeAttribute(rel, 'TargetMode', OPENXML_NS.rel) || '';
    const isExternal = targetMode.toLowerCase() === 'external';

    if (!id || !target) continue;

    // Disallow external targets in root relationships
    if (relsPath === '_rels/.rels' && isExternal) {
      throw new Error(`Security Error: Root relationship "${id}" points to an external target.`);
    }

    relationships.set(id, {
      id,
      type,
      target,
      isExternal,
    });
  }

  return relationships;
}

/**
 * High-level secure reader for DOCX archives.
 * Validates file constraints, decompresses archive entries with bounded streaming,
 * inspects content types, verifies required parts, and parses package relationships.
 *
 * @param {object} params
 * @param {File|Blob|ArrayBuffer|Uint8Array} params.file
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{
 *   entries: Map<string, Uint8Array>,
 *   textParts: Map<string, string>,
 *   mainDocumentPart: string,
 *   relationships: Map<string, { id: string, type: string, target: string, isExternal: boolean }>,
 *   externalRelationships: Array<{ id: string, type: string, target: string }>
 * }>}
 */
export async function readDocxArchive({ file, signal }) {
  checkAborted(signal);

  validateFileMetadata(file);

  const bytes = await toUint8Array(file);
  checkAborted(signal);

  if (bytes.length > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds maximum upload size limit of ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(
        0
      )} MB.`
    );
  }

  const entries = await extractZipArchive(bytes, signal);
  checkAborted(signal);

  // Verify mandatory package parts
  for (const requiredPart of REQUIRED_PACKAGE_PARTS) {
    if (!entries.has(requiredPart)) {
      throw new Error(`Invalid DOCX package: missing required part "${requiredPart}".`);
    }
  }

  // Decode text parts
  const textParts = new Map();
  for (const [path, entryBytes] of entries.entries()) {
    if (path.endsWith('.xml') || path.endsWith('.rels')) {
      textParts.set(path, fflate.strFromU8(entryBytes));
    }
  }

  // Inspect [Content_Types].xml
  const contentTypesXml = textParts.get('[Content_Types].xml');
  const { mainDocumentPart: declaredMainPart } = inspectContentTypes(contentTypesXml);

  // Parse root relationships to identify main document part
  const rootRelsXml = textParts.get('_rels/.rels');
  const rootRels = parseRelationships(rootRelsXml, '_rels/.rels');

  let mainDocPath = declaredMainPart;
  if (!mainDocPath) {
    for (const rel of rootRels.values()) {
      if (
        rel.type === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument'
      ) {
        mainDocPath = rel.target.replace(/^\//, '');
        break;
      }
    }
  }

  if (!mainDocPath) {
    mainDocPath = 'word/document.xml';
  }

  if (!entries.has(mainDocPath)) {
    throw new Error(`Invalid DOCX package: main document part "${mainDocPath}" not found.`);
  }

  // Parse main document relationships if present
  const docRelsPath = `word/_rels/document.xml.rels`;
  let relationships = new Map();
  const externalRelationships = [];

  if (textParts.has(docRelsPath)) {
    relationships = parseRelationships(textParts.get(docRelsPath), docRelsPath);
    for (const rel of relationships.values()) {
      if (rel.isExternal) {
        externalRelationships.push(rel);
      }
    }
  }

  return {
    entries,
    textParts,
    mainDocumentPart: mainDocPath,
    relationships,
    externalRelationships,
  };
}
