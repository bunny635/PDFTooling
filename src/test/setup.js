import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Provide safe URL.createObjectURL and URL.revokeObjectURL polyfills for jsdom environment
if (typeof URL !== 'undefined') {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-url');
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = vi.fn();
  }
}
