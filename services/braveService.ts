import { Channel, Category, Language, ChannelStatus } from '../types';

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
    // and exclude individual message links if possible
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
  
  // Clean title
  const rawTitle = result.title;
  const rawDesc = result.description;

  // Status Detection
  let status = ChannelStatus.ACTIVE;
  const statusCheck = (rawTitle + ' ' + rawDesc).toLowerCase();
  
  if (statusCheck.includes('channel not found') || statusCheck.includes('page not found') || statusCheck.includes('deleted account')) {
    status = ChannelStatus.DELETED;
  } else if (statusCheck.includes('unavailable due to') || statusCheck.includes('copyright infringement') || statusCheck.includes('pornographic content') || statusCheck.includes('blocked in your country')) {
    status = ChannelStatus.BANNED;
  }

  const name = rawTitle.replace(/ – Telegram.*/, '').replace(/ \| Telegram.*/, '').trim();

  return {
    id: `web-${index}-${Date.now()}`,
    name: name,
    username: username,
    description: rawDesc || 'No description available.',
    members: 0, 
    category: Category.ALL, 
    language: mapLanguage(result.language),
    lastActive: result.age ? result.age : 'Recently',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=229ED9&color=fff`, 
    verified: false,
    status: status
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