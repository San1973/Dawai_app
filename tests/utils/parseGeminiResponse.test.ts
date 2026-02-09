import { describe, it, expect } from 'vitest';

// Example – adapt to actual function name & location
import { extractStructuredPrescription } from '../services/geminiService'; // or utils/

describe('extractStructuredPrescription', () => {
  it('parses valid Gemini JSON block', () => {
    const raw = `
\`\`\`json
{
  "medicines": [
    {"name": "Amlodipine 5mg", "dosage": "1-0-1", "duration": "30 days"}
  ],
  "language": "hi",
  "transliteration": "एम्लोडिपाइन",
  "simplified_explanation": "यह दवा ब्लड प्रेशर को कंट्रोल करती है"
}
\`\`\`
    `;

    const result = extractStructuredPrescription(raw);
    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Amlodipine 5mg');
    expect(result.simplified_explanation).toContain('ब्लड प्रेशर');
  });

  it('returns fallback when no valid JSON', () => {
    const result = extractStructuredPrescription('some random text');
    expect(result).toEqual({ medicines: [], language: 'en', error: expect.any(String) });
  });

  it('handles markdown with extra whitespace', () => {
    // ... similar test
  });
});
