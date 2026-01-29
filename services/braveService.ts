import { Channel, Category, Language } from '../types';

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY || '';
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

interface BraveResult {
  title: string;
  description: string;
  url: string;
  language?: string;
  age?: string;
}

interface BraveResponse {
  web?: {
    results: BraveResult[];
  };
}

export const searchTelegramChannels = async (query: string): Promise<Channel[]> => {
  if (!BRAVE_API_KEY) {
    console.warn('Brave Search API Key is missing');
    return [];
  }

  try {
    // We append site:t.me to ensure we are looking for telegram channels
    // and exclude individual message links if possible (tough with just site:t.me, but good enough)
    const searchParams = new URLSearchParams({
      q: `${query} site:t.me`,
      count: '20',
      result_filter: 'web',
      safesearch: 'moderate'
    });

    const response = await fetch(`${BRAVE_API_URL}?${searchParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API Error: ${response.statusText}`);
    }

    const data: BraveResponse = await response.json();
    
    if (!data.web || !data.web.results) {
      return [];
    }

    return data.web.results
      .filter(result => result.url.includes('t.me/')) // Ensure they are telegram links
      .map((result, index) => transformToChannel(result, index));

  } catch (error) {
    console.error('Failed to search Brave:', error);
    return [];
  }
};

const transformToChannel = (result: BraveResult, index: number): Channel => {
  // Extract username from URL (e.g., https://t.me/username)
  const urlParts = result.url.split('/');
  const username = urlParts[urlParts.length - 1] || 'unknown';
  
  // Clean title (Brave often includes " - Telegram" or similar suffixes)
  const name = result.title.replace(/ – Telegram.*/, '').replace(/ \| Telegram.*/, '').trim();

  return {
    id: `web-${index}-${Date.now()}`,
    name: name,
    username: username,
    description: result.description || 'No description available.',
    members: 0, // Web results don't provide member count
    category: Category.ALL, // Default to All as we can't easily categorize without AI analysis
    language: mapLanguage(result.language),
    lastActive: result.age ? result.age : 'Recently',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=229ED9&color=fff`, // Placeholder
    verified: false
  };
};

const mapLanguage = (langCode?: string): Language => {
  if (!langCode) return Language.ALL;
  if (langCode.startsWith('en')) return Language.ENGLISH;
  if (langCode.startsWith('es')) return Language.SPANISH;
  if (langCode.startsWith('ru')) return Language.RUSSIAN;
  if (langCode.startsWith('de')) return Language.GERMAN;
  if (langCode.startsWith('hi')) return Language.HINDI;
  return Language.ALL;
};
