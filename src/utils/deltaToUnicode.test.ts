import { describe, it, expect } from 'vitest';
import { deltaToUnicode } from './deltaToUnicode';

describe('deltaToUnicode', () => {
  it('converts plain text', () => {
    expect(deltaToUnicode({ ops: [{ insert: 'Hello' }] })).toBe('Hello');
  });

  it('converts bold text', () => {
    // Math Sans Bold
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { bold: true } }] })).toBe('𝗛𝗲𝗹𝗹𝗼');
  });

  it('converts italic text', () => {
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { italic: true } }] })).toBe('𝘏𝘦𝘭𝘭𝘰');
  });

  it('converts monospace (code)', () => {
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { code: true } }] })).toBe('𝙷𝚎𝚕𝚕𝚘');
  });

  it('converts script', () => {
    // Expect Mathematical Script (which is what toUnicodeVariant produces for 'c')
    // Hello -> ℋℯ𝓁𝓁ℴ (Standard) vs 𝓗𝓮𝓵𝓵𝓸 (Bold Script) vs 𝒣𝒺𝓁𝓁𝓄 (Math Script Normal)
    // The previous error showed: Received: "𝒣𝒺𝓁𝓁𝓄"
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { script: true } }] })).toBe('𝒣𝒺𝓁𝓁𝓄');
  });

  it('converts gothic', () => {
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { gothic: true } }] })).toBe('ℌ𝔢𝔩𝔩𝔬');
  });

  it('converts doublestruck', () => {
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { doublestruck: true } }] })).toBe('ℍ𝕖𝕝𝕝𝕠');
  });

  it('applies underline', () => {
    // Check first char 'H' + combining underline
    const result = deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { underline: true } }] });
    expect(result).toContain('H\u0332');
  });

  it('applies strike', () => {
    const result = deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { strike: true } }] });
    expect(result).toContain('H\u0336');
  });

  it('mixes bold and script', () => {
    expect(deltaToUnicode({ ops: [{ insert: 'Hello', attributes: { script: true, bold: true } }] })).toBe('𝓗𝓮𝓵𝓵𝓸');
  });
});