import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 3 || !apiKey) return [];

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Given the user search query "${query}" for a Telegram Channel discovery app, provide 5 short, relevant tags, synonyms, or related categories that would help the user find what they are looking for. Return strictly a JSON array of strings. Do not include markdown formatting.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      }
    }
    return [];
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return [];
  }
};
