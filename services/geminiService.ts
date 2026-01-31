export const getSmartSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch('/api/gemini/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (response.status === 429) {
      console.warn("Rate limit exceeded for suggestions");
      return [];
    }

    if (!response.ok) {
      throw new Error('Suggestion API failed');
    }

    const tags = await response.json();
    return Array.isArray(tags) ? tags.slice(0, 5) : [];
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return [];
  }
};