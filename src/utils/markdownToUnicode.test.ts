import { describe, it, expect } from 'vitest';
import { markdownToUnicode } from './markdownToUnicode';

describe('markdownToUnicode', () => {
  it('converts bold markdown to unicode bold sans', () => {
    const input = 'This is **bold** text.';
    // 'bold' in unicode sans bold is 𝗯𝗼𝗹𝗱
    // 'This is ' and ' text.' remain normal
    // expect(markdownToUnicode(input)).toContain('𝗯𝗼𝗹𝗱');
    // Let's be precise.
    // T = T, h = h ...
    // b = 𝗯 (U+1D5EF)
    const expected = 'This is 𝗯𝗼𝗹𝗱 text.';
    expect(markdownToUnicode(input)).toBe(expected);
  });

  it('converts italic markdown to unicode italic sans', () => {
    const input = 'This is *italic* text.';
    const expected = 'This is 𝘪𝘵𝘢𝘭𝘪𝘤 text.';
    expect(markdownToUnicode(input)).toBe(expected);
  });

  it('converts list items to bullet points', () => {
    const input = '- Item 1\n- Item 2';
    const expected = '• Item 1\n• Item 2';
    expect(markdownToUnicode(input)).toBe(expected);
  });
  
  it('converts mixed formatting', () => {
      const input = 'Start **bold** and *italic* end.';
      const expected = 'Start 𝗯𝗼𝗹𝗱 and 𝘪𝘵𝘢𝘭𝘪𝘤 end.';
      expect(markdownToUnicode(input)).toBe(expected);
  })
});
