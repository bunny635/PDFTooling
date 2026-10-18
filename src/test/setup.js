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

// Provide Blob/File.prototype.arrayBuffer polyfill for jsdom environment using FileReader
if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsArrayBuffer(this);
    });
  };
}
if (typeof File !== 'undefined' && typeof File.prototype.arrayBuffer !== 'function') {
  File.prototype.arrayBuffer = Blob.prototype.arrayBuffer;
}

