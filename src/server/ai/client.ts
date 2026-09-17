import { GoogleGenAI } from '@google/genai';

/**
 * The Gemini key is server-side only (metadata.json declares
 * MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API). It must never be sent to the
 * browser, which is why parsing and prediction stay behind the API.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
