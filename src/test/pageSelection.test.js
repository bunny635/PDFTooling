import { describe, it, expect } from 'vitest';
import { parsePageRange, parsePageOrder } from '../utils/pageSelection.js';

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

describe('parsePageOrder Utility', () => {
  const totalPages = 4;

  it('preserves the exact explicit order entered by user without sorting', () => {
    const res = parsePageOrder('4, 1, 3, 2', totalPages);
    expect(res).toEqual({
      valid: true,
      pageIndices: [3, 0, 2, 1],
    });

    const res2 = parsePageOrder('2, 3, 4, 1', totalPages);
    expect(res2).toEqual({
      valid: true,
      pageIndices: [1, 2, 3, 0],
    });
  });

  it('expands ascending and descending ranges in correct directional order', () => {
    // Ascending range "1-4"
    expect(parsePageOrder('1-4', totalPages)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2, 3],
    });

    // Descending range "4-1"
    expect(parsePageOrder('4-1', totalPages)).toEqual({
      valid: true,
      pageIndices: [3, 2, 1, 0],
    });
  });

  it('expands mixed comma-separated values and ranges preserving exact sequence', () => {
    expect(parsePageOrder('4, 1-3', totalPages)).toEqual({
      valid: true,
      pageIndices: [3, 0, 1, 2],
    });

    expect(parsePageOrder('3-1, 4', totalPages)).toEqual({
      valid: true,
      pageIndices: [2, 1, 0, 3],
    });
  });

  it('performs cardinality checks against expanded sequence rather than raw token count', () => {
    // "1-4" is 1 token, but expands to 4 pages -> valid for 4-page doc
    expect(parsePageOrder('1-4', 4)).toEqual({
      valid: true,
      pageIndices: [0, 1, 2, 3],
    });

    // "1-3" is 1 token, but expands to 3 pages -> missing page 4
    const resMissing = parsePageOrder('1-3', 4);
    expect(resMissing.valid).toBe(false);
    expect(resMissing.error).toMatch(/missing page\(s\): 4/i);
  });

  it('handles single-page documents correctly', () => {
    expect(parsePageOrder('1', 1)).toEqual({
      valid: true,
      pageIndices: [0],
    });
  });

  it('rejects missing pages with specific error message', () => {
    const res = parsePageOrder('1, 2, 4', totalPages);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/missing page\(s\): 3\. all 4 pages must be included/i);

    const resTwoMissing = parsePageOrder('1, 4', totalPages);
    expect(resTwoMissing.valid).toBe(false);
    expect(resTwoMissing.error).toMatch(/missing page\(s\): 2, 3/i);
  });

  it('rejects duplicate pages across explicit tokens and ranges', () => {
    const resDup = parsePageOrder('1, 2, 2, 3', totalPages);
    expect(resDup.valid).toBe(false);
    expect(resDup.error).toMatch(/duplicate page 2 detected/i);

    const resRangeDup = parsePageOrder('1-3, 2, 4', 4);
    expect(resRangeDup.valid).toBe(false);
    expect(resRangeDup.error).toMatch(/duplicate page 2 detected/i);
  });

  it('rejects out-of-bounds page numbers', () => {
    const res = parsePageOrder('1, 2, 5, 4', totalPages);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/page 5 exceeds total document pages \(4\)/i);

    const resRange = parsePageOrder('1, 2-5', totalPages);
    expect(resRange.valid).toBe(false);
    expect(resRange.error).toMatch(/page range "2-5" exceeds total document pages \(4\)/i);
  });

  it('rejects zero, negative, floats, and non-numeric values', () => {
    expect(parsePageOrder('0, 1, 2, 3', totalPages).valid).toBe(false);
    expect(parsePageOrder('1, 2, 3, -4', totalPages).valid).toBe(false);
    expect(parsePageOrder('1.5, 2, 3, 4', totalPages).valid).toBe(false);
    expect(parsePageOrder('a, b, c, d', totalPages).valid).toBe(false);
  });

  it('rejects malformed commas and empty tokens', () => {
    expect(parsePageOrder('1, 2,, 3, 4', totalPages).valid).toBe(false);
    expect(parsePageOrder(',1, 2, 3, 4', totalPages).valid).toBe(false);
    expect(parsePageOrder('1, 2, 3, 4,', totalPages).valid).toBe(false);
  });

  it('rejects empty, null, and invalid totalPages', () => {
    expect(parsePageOrder('', totalPages).valid).toBe(false);
    expect(parsePageOrder('   ', totalPages).valid).toBe(false);
    expect(parsePageOrder(null, totalPages).valid).toBe(false);
    expect(parsePageOrder('1, 2, 3, 4', 0).valid).toBe(false);
    expect(parsePageOrder('1, 2, 3, 4', -1).valid).toBe(false);
  });
});
