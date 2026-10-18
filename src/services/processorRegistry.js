/**
 * Immutable Production Processor Registry
 * Defines execution metadata and availability for all 6 MVP tools.
 * All processors are permanently marked unavailable until their dedicated implementation tickets.
 */

export const PROCESSOR_REGISTRY = Object.freeze({
  'merge-pdf': Object.freeze({
    id: 'merge-pdf',
    name: 'Merge PDF',
    isAvailable: false,
    status: 'unavailable',
    reason: 'Processing engine scheduled for implementation in upcoming ticket.',
    execute: null,
  }),
  'split-pdf': Object.freeze({
    id: 'split-pdf',
    name: 'Split PDF',
    isAvailable: false,
    status: 'unavailable',
    reason: 'Processing engine scheduled for implementation in upcoming ticket.',
    execute: null,
  }),
  'rotate-pdf': Object.freeze({
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    isAvailable: false,
    status: 'unavailable',
    reason: 'Processing engine scheduled for implementation in upcoming ticket.',
    execute: null,
  }),
  'delete-pages': Object.freeze({
    id: 'delete-pages',
    name: 'Delete Pages',
    isAvailable: false,
    status: 'unavailable',
    reason: 'Processing engine scheduled for implementation in upcoming ticket.',
    execute: null,
  }),
  'reorder-pages': Object.freeze({
    id: 'reorder-pages',
    name: 'Reorder Pages',
    isAvailable: false,
    status: 'unavailable',
    reason: 'Processing engine scheduled for implementation in upcoming ticket.',
    execute: null,
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
 * In production, returns false for all tools.
 *
 * @param {string} toolId
 * @param {Record<string, object>} [customAdapters] - Optional dependency-injected test adapters
 * @returns {boolean}
 */
export function isProcessorAvailable(toolId, customAdapters) {
  const proc = getToolProcessor(toolId, customAdapters);
  return Boolean(proc?.isAvailable && typeof proc.execute === 'function');
}
