import { describe, it, expect } from 'vitest';
import { detectUserLanguage, getTransliterationFallback } from '../services/language'; // adjust

describe('language helpers', () => {
  it.each([
    ['नमस्ते डॉक्टर साहब', 'hi'],
    ['ഹലോ ഡോക്ടർ', 'ml'],
    ['Hello doctor saab', 'en'],
  ])('detects %s → %s', (text, expected) => {
    expect(detectUserLanguage(text)).toBe(expected);
  });

  it('provides devanagari fallback when Gemini transliteration fails', () => {
    expect(getTransliterationFallback('Paracetamol', 'hi')).toMatch(/पैरासिटामॉल/i);
  });
});
