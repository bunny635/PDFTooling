/**
 * Immutable Production Processor Registry
 * Defines execution metadata and availability for all 6 MVP tools.
 * Merge PDF is active with client-side pdf-lib engine (lazily loaded on demand).
 * Other processors remain permanently unavailable until their dedicated implementation tickets.
 */

export const PROCESSOR_REGISTRY = Object.freeze({
  'merge-pdf': Object.freeze({
    id: 'merge-pdf',
    name: 'Merge PDF',
    isAvailable: true,
    status: 'available',
    reason: 'Pure client-side in-memory PDF merge engine.',
    execute: async (params) => {
      const { mergePdf } = await import('../processors/mergePdf.js');
      return mergePdf(params);
    },
  }),
  'split-pdf': Object.freeze({
    id: 'split-pdf',
    name: 'Split PDF',
    isAvailable: true,
    status: 'available',
    reason: 'Pure client-side in-memory PDF page extraction engine.',
    execute: async (params) => {
      const { splitPdf } = await import('../processors/splitPdf.js');
      return splitPdf(params);
    },
  }),
  'rotate-pdf': Object.freeze({
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    isAvailable: true,
    status: 'available',
    reason: 'Pure client-side in-memory PDF page rotation engine.',
    execute: async (params) => {
      const { rotatePdf } = await import('../processors/rotatePdf.js');
      return rotatePdf(params);
    },
  }),
  'delete-pages': Object.freeze({
    id: 'delete-pages',
    name: 'Delete Pages',
    isAvailable: true,
    status: 'available',
    reason: 'Pure client-side in-memory PDF page deletion engine.',
    execute: async (params) => {
      const { deletePdf } = await import('../processors/deletePdf.js');
      return deletePdf(params);
    },
  }),
  'reorder-pages': Object.freeze({
    id: 'reorder-pages',
    name: 'Reorder Pages',
    isAvailable: true,
    status: 'available',
    reason: 'Pure client-side in-memory PDF page reordering engine.',
    execute: async (params) => {
      const { reorderPdf } = await import('../processors/reorderPdf.js');
      return reorderPdf(params);
    },
  }),
  'jpg-to-pdf': Object.freeze({
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    isAvailable: false,
    status: 'unavailable',
    reason: 'Processing engine scheduled for implementation in upcoming ticket.',
    execute: null,
  }),
});

/**
 * Retrieves the processor entry for a given tool.
 * Allows test-specific dependency injection without mutating the production registry.
 *
 * @param {string} toolId
 * @param {Record<string, object>} [customAdapters] - Optional dependency-injected test adapters
 * @returns {object|undefined}
 */
export function getToolProcessor(toolId, customAdapters) {
  if (!toolId) return undefined;
  if (customAdapters && customAdapters[toolId]) {
    return customAdapters[toolId];
  }
  return PROCESSOR_REGISTRY[toolId];
}

/**
 * Checks whether a tool processor is currently implemented and ready to execute.
 *
 * @param {string} toolId
 * @param {Record<string, object>} [customAdapters] - Optional dependency-injected test adapters
 * @returns {boolean}
 */
export function isProcessorAvailable(toolId, customAdapters) {
  const proc = getToolProcessor(toolId, customAdapters);
  return Boolean(proc?.isAvailable && typeof proc.execute === 'function');
}
