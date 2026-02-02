import { getSmartSuggestions as apiGetSuggestions } from './googleSearchService';

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 3) return [];
  return await apiGetSuggestions(query);
};
