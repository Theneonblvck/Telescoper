import { Channel } from '../types';

export const performNeuralSearch = async (query: string): Promise<Channel[]> => {
  try {
    const response = await fetch('/api/search/neural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) throw new Error("Neural link unstable");
    return await response.json();
  } catch (error) {
    console.error("Neural Search Error:", error);
    throw error;
  }
};

export const performIndexSearch = async (query: string, cseId: string): Promise<Channel[]> => {
  try {
    const response = await fetch('/api/search/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, cseId }),
    });

    if (!response.ok) throw new Error("Index unavailable");
    return await response.json();
  } catch (error) {
    console.error("Index Search Error:", error);
    throw error;
  }
};

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
  try {
    const response = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return await response.json();
  } catch (e) {
    return [];
  }
};
