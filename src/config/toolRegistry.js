/**
 * PDFTooling Tool Registry
 * Single source of truth for the 6 core MVP PDF tools.
 */

export const TOOLS = [
  {
    id: 'merge-pdf',
    slug: 'merge-pdf',
    name: 'Merge PDF',
    route: '/tools/merge-pdf',
    description: 'Combine multiple PDF files into a single unified document in your chosen order.',
    category: 'organize',
    iconName: 'Layers',
    acceptedMimeTypes: ['application/pdf'],
    multiple: true,
  },
  {
    id: 'split-pdf',
    slug: 'split-pdf',
    name: 'Split PDF',
    route: '/tools/split-pdf',
    description: 'Extract specific pages or page ranges from a PDF into a clean new document.',
    category: 'extract',
    iconName: 'Scissors',
    acceptedMimeTypes: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'rotate-pdf',
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    route: '/tools/rotate-pdf',
    description: 'Correct orientation of selected pages or entire documents with 90°, 180°, or 270° rotation.',
    category: 'organize',
    iconName: 'RotateCw',
    acceptedMimeTypes: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'delete-pages',
    slug: 'delete-pages',
    name: 'Delete Pages',
    route: '/tools/delete-pages',
    description: 'Remove unnecessary pages from your document while preserving remaining page order.',
    category: 'edit',
    iconName: 'Trash2',
    acceptedMimeTypes: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'reorder-pages',
    slug: 'reorder-pages',
    name: 'Reorder Pages',
    route: '/tools/reorder-pages',
    description: 'Rearrange page sequences with accessible move buttons and intuitive controls.',
    category: 'organize',
    iconName: 'ArrowUpDown',
    acceptedMimeTypes: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'jpg-to-pdf',
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    route: '/tools/jpg-to-pdf',
    description: 'Convert JPEG images into a formatted PDF with customizable page sizing and aspect ratio.',
    category: 'convert',
    iconName: 'Image',
    acceptedMimeTypes: ['image/jpeg', 'image/jpg'],
    multiple: true,
  },
];

export const TOOL_MAP = Object.freeze(
  TOOLS.reduce((acc, tool) => {
    acc[tool.slug] = tool;
    return acc;
  }, {})
);

export function getToolBySlug(slug) {
  if (!slug) return undefined;
  return TOOL_MAP[slug];
}

export function isValidToolSlug(slug) {
  return Boolean(slug && TOOL_MAP[slug]);
}

export function getAllTools() {
  return TOOLS;
}

export function getToolsByCategory(category) {
  return TOOLS.filter((tool) => tool.category === category);
}
