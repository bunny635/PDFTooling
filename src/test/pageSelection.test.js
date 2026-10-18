import { describe, it, expect } from 'vitest';
import { parsePageRange } from '../utils/pageSelection.js';

describe('parsePageRange Utility', () => {
  const totalPages = 10;

  it('parses valid single page numbers into 0-based index', () => {
    expect(parsePageRange('1', totalPages)).toEqual({
      valid: true,
      pageIndices: [0],
    });
    expect(parsePageRange('5', totalPages)).toEqual({
      valid: true,
      pageIndices: [4],
    });
    expect(parsePageRange('10', totalPages)).toEqual({
      valid: true,
      pageIndices: [9],
    });
  });

  it('parses continuous page ranges correctly', () => {
    expect(parsePageRange('1-3', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2],
    });
    expect(parsePageRange('4-7', totalPages)).toEqual({
      valid: true,
      pageIndices: [3, 4, 5, 6],
    });
    expect(parsePageRange('5-5', totalPages)).toEqual({
      valid: true,
      pageIndices: [4],
    });
  });

  it('parses comma-separated pages and ranges', () => {
    expect(parsePageRange('1,3,5', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 2, 4],
    });
    expect(parsePageRange('1-3,5,8-10', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2, 4, 7, 8, 9],
    });
  });

  it('handles whitespace around tokens and parts gracefully', () => {
    expect(parsePageRange('  1 - 3 ,  5 , 8 - 10  ', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2, 4, 7, 8, 9],
    });
  });

  it('deduplicates overlapping pages and returns ascending document order (prompt example)', () => {
    // Example from ticket prompt: Input: "5,1-3,3" -> Output: [0, 1, 2, 4]
    expect(parsePageRange('5,1-3,3', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2, 4],
    });

    expect(parsePageRange('10, 8-10, 1, 2-4, 3', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2, 3, 7, 8, 9],
    });
  });

  it('rejects empty, null, or whitespace-only expressions', () => {
    expect(parsePageRange('', totalPages).valid).toBe(false);
    expect(parsePageRange('   ', totalPages).valid).toBe(false);
    expect(parsePageRange(null, totalPages).valid).toBe(false);
    expect(parsePageRange(undefined, totalPages).valid).toBe(false);
    expect(parsePageRange('', totalPages).error).toMatch(/please enter page numbers or ranges/i);
  });

  it('rejects invalid totalPages arguments', () => {
    expect(parsePageRange('1-3', 0).valid).toBe(false);
    expect(parsePageRange('1-3', -5).valid).toBe(false);
    expect(parsePageRange('1-3', '10').valid).toBe(false);
    expect(parsePageRange('1-3', null).valid).toBe(false);
    expect(parsePageRange('1-3', 0).error).toMatch(/invalid total pages count/i);
  });

  it('rejects page zero and negative page numbers', () => {
    const resZero = parsePageRange('0', totalPages);
    expect(resZero.valid).toBe(false);
    expect(resZero.error).toMatch(/page numbers must be 1 or greater/i);

    const resZeroRange = parsePageRange('0-3', totalPages);
    expect(resZeroRange.valid).toBe(false);
    expect(resZeroRange.error).toMatch(/page numbers must be 1 or greater/i);

    const resNeg = parsePageRange('-1', totalPages);
    expect(resNeg.valid).toBe(false);
  });

  it('rejects reversed ranges', () => {
    const res = parsePageRange('5-2', totalPages);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/reversed page range "5-2"/i);
  });

  it('rejects page numbers exceeding totalPages count', () => {
    const resSingle = parsePageRange('11', 10);
    expect(resSingle.valid).toBe(false);
    expect(resSingle.error).toMatch(/page 11 exceeds total document pages \(10\)/i);

    const resRange = parsePageRange('8-15', 10);
    expect(resRange.valid).toBe(false);
    expect(resRange.error).toMatch(/page range "8-15" exceeds total document pages \(10\)/i);
  });

  it('rejects malformed syntax: empty tokens, double commas, and multi-dashes', () => {
    expect(parsePageRange('1,,3', totalPages).valid).toBe(false);
    expect(parsePageRange('1,', totalPages).valid).toBe(false);
    expect(parsePageRange(',1', totalPages).valid).toBe(false);
    expect(parsePageRange('1-2-3', totalPages).valid).toBe(false);
    expect(parsePageRange('1-', totalPages).valid).toBe(false);
    expect(parsePageRange('-3', totalPages).valid).toBe(false);
  });

  it('rejects non-numeric tokens and floats', () => {
    expect(parsePageRange('abc', totalPages).valid).toBe(false);
    expect(parsePageRange('1-abc', totalPages).valid).toBe(false);
    expect(parsePageRange('1.5', totalPages).valid).toBe(false);
    expect(parsePageRange('1, two, 3', totalPages).valid).toBe(false);
  });
});
