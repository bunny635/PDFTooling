/**
 * Word to PDF Security and Specification Constants
 * Enforces strict memory, decompression, depth, and cardinality boundaries.
 */

// File upload limits
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB max compressed upload

// Archive structure limits
export const MAX_ENTRY_COUNT = 250; // Maximum number of archive entries
export const MAX_TOTAL_UNCOMPRESSED_SIZE = 50 * 1024 * 1024; // 50 MB cumulative uncompressed size
export const MAX_XML_ENTRY_SIZE = 20 * 1024 * 1024; // 20 MB max for any single XML part
export const MAX_MEDIA_ENTRY_SIZE = 25 * 1024 * 1024; // 25 MB max for any single media file
export const MAX_COMPRESSION_RATIO = 100; // 100:1 max ratio for entries > 1 MB (ZIP bomb defense)

// XML parsing limits
export const MAX_XML_DEPTH = 32; // Maximum nested element depth
export const MAX_XML_NODE_COUNT = 50000; // Maximum elements/nodes per XML part

// Content Types & Namespaces
export const WORD_MAIN_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
export const WORD_MACRO_CONTENT_TYPE =
  'application/vnd.ms-word.document.macroEnabled.main+xml';
export const WORD_TEMPLATE_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml';
export const WORD_MACRO_TEMPLATE_CONTENT_TYPE =
  'application/vnd.ms-word.template.macroEnabledTemplate.main+xml';

export const OPENXML_NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
};

// Required package parts
export const REQUIRED_PACKAGE_PARTS = [
  '[Content_Types].xml',
  '_rels/.rels',
];

// Dangerous / Active Content Patterns to immediately reject
export const DISALLOWED_ENTRY_PATTERNS = [
  /vbaProject\.bin$/i,
  /word\/vbaData\.xml$/i,
  /word\/activeX\//i,
  /word\/embeddings\//i,
  /\.exe$/i,
  /\.dll$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.vbs$/i,
  /\.js$/i,
  /\.wsf$/i,
  /\.ps1$/i,
];

// Standard Paper Dimensions (in points: 1 inch = 72 points = 1440 twips)
export const DEFAULT_PAGE_WIDTH = 612; // US Letter width (8.5 in)
export const DEFAULT_PAGE_HEIGHT = 792; // US Letter height (11 in)
export const A4_PAGE_WIDTH = 595.28; // A4 width
export const A4_PAGE_HEIGHT = 841.89; // A4 height
export const DEFAULT_MARGIN = 72; // 1 inch (1440 twips)
