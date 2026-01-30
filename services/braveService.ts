import { Channel, Category, Language, ChannelStatus } from '../types';

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
  try {
    const response = await fetch('/api/brave/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (response.status === 429) {
      console.warn("Rate limit exceeded");
      throw new Error("System cooling down. Please wait a moment.");
    }

    if (!response.ok) {
      throw new Error(`Brave API Error: ${response.statusText}`);
    }

    const data: BraveResponse = await response.json();
    
    if (!data.web || !data.web.results) {
      return [];
    }

    return data.web.results
      .filter(result => result.url.includes('t.me/'))
      .map((result, index) => transformToChannel(result, index));

  } catch (error) {
    console.error('Failed to search Brave:', error);
    return [];
  }
};

const transformToChannel = (result: BraveResult, index: number): Channel => {
  const urlParts = result.url.split('/');
  const username = urlParts[urlParts.length - 1] || 'unknown';
  
  const rawTitle = result.title;
  const rawDesc = result.description;

  let status = ChannelStatus.ACTIVE;
  const statusCheck = (rawTitle + ' ' + rawDesc).toLowerCase();
  
  if (statusCheck.includes('channel not found') || statusCheck.includes('page not found') || statusCheck.includes('deleted account')) {
    status = ChannelStatus.DELETED;
  } else if (statusCheck.includes('unavailable due to') || statusCheck.includes('copyright infringement')) {
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