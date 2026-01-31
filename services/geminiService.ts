// import { GoogleGenAI, Type } from "@google/genai"; // Removed for BFF

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch('/api/gemini/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (response.status === 429) {
      console.warn('Rate limit exceeded for suggestions');
      return [];
    }

    if (!response.ok) {
      throw new Error(`Suggestion API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];

  } catch (error) {
    console.error("Gemini Suggestions Error:", error);
    return [];
  }
};
