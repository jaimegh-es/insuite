import { describe, it, expect } from 'vitest';
import { unicodeToAscii } from './unicodeToAscii';

describe('unicodeToAscii', () => {
  it('converts plain text (no change)', () => {
    expect(unicodeToAscii('Hello')).toBe('Hello');
  });

  it('converts bold sans', () => {
    expect(unicodeToAscii('𝗛𝗲𝗹𝗹𝗼')).toBe('Hello');
  });

  it('converts italic sans', () => {
    expect(unicodeToAscii('𝘏𝘦𝘭𝘭𝘰')).toBe('Hello');
  });
  
  it('converts script', () => {
    // Math Script
    expect(unicodeToAscii('𝒣𝒺𝓁𝓁𝓄')).toBe('Hello');
  });
  
  it('converts gothic', () => {
    expect(unicodeToAscii('ℌ𝔢𝔩𝔩𝔬')).toBe('Hello');
  });

  it('converts double struck', () => {
    expect(unicodeToAscii('ℍ𝕖𝕝𝕝𝕠')).toBe('Hello');
  });

  it('removes combining marks (underline/strike)', () => {
    expect(unicodeToAscii('H\u0332e\u0336llo')).toBe('Hello');
  });
});
