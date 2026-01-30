import { Channel, Category, Language, ChannelStatus } from '../types';

export const searchTelegramChannels = async (query: string, cseId?: string): Promise<Channel[]> => {
  try {
    const response = await fetch('/api/google/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, cseId }),
    });

    if (response.status === 429) {
      throw new Error("System cooling down. Please wait a moment.");
    }

    if (!response.ok) {
      throw new Error('Search service failed');
    }

    const data = await response.json();

    if (cseId) {
      // Handle CSE Response format
      if (!data.items) return [];
      return data.items
        .filter((item: any) => item.link.includes('t.me/'))
        .map((item: any, index: number) => transformCSEItemToChannel(item, index));
    } else {
      // Handle Gemini AI format (which matches our Channel type mostly, but we re-map to be safe)
      if (Array.isArray(data)) {
        return data.map((item: any, index: number) => ({
          id: `gen-search-${index}-${Date.now()}`,
          name: item.name || 'Unknown Channel',
          username: item.username || 'unknown',
          description: item.description || 'No description found.',
          members: item.members || 0,
          category: Category.ALL,
          language: mapLanguage(item.language),
          lastActive: 'Recently',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'T')}&background=229ED9&color=fff`,
          verified: false,
          status: ChannelStatus.ACTIVE
        }));
      }
    }
    return [];

  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};

const transformCSEItemToChannel = (item: any, index: number): Channel => {
  const cleanLink = item.link.replace(/\/s\//, '/'); 
  const urlParts = cleanLink.split('/').filter((part: string) => part);
  const username = urlParts[urlParts.length - 1] || 'unknown';
  
  const metatags = item.pagemap?.metatags?.[0] || {};
  let rawTitle = metatags['og:title'] || item.title || '';
  const rawDescription = metatags['og:description'] || item.snippet || 'No description available.';

  let status = ChannelStatus.ACTIVE;
  const statusCheck = (rawTitle + ' ' + rawDescription).toLowerCase();
  
  if (statusCheck.includes('channel not found') || statusCheck.includes('page not found')) {
    status = ChannelStatus.DELETED;
  } else if (statusCheck.includes('unavailable due to')) {
    status = ChannelStatus.BANNED;
  }

  let name = rawTitle
    .replace(/ – Telegram.*/, '')
    .replace(/ \| Telegram.*/, '')
    .replace(/^Telegram: Contact @/, '')
    .trim();

  if (!name || name.toLowerCase() === 'telegram') name = username;

  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=229ED9&color=fff`;
  if (metatags['og:image']) {
    avatarUrl = metatags['og:image'];
  } else if (item.pagemap?.cse_image?.length > 0) {
    avatarUrl = item.pagemap.cse_image[0].src;
  }

  const members = extractMembers(rawDescription) || extractMembers(item.snippet);

  return {
    id: `cse-${index}-${Date.now()}`,
    name: name,
    username: username,
    description: rawDescription,
    members: members,
    category: Category.ALL,
    language: detectLanguage(rawDescription + ' ' + name),
    lastActive: 'Recently',
    avatarUrl: avatarUrl,
    verified: false,
    status: status
  };
};

const extractMembers = (text: string): number => {
  if (!text) return 0;
  const regex = /(\d+(?:[.,\s]\d+)*[kKmM]?)\s*(?:subscribers|members)/i;
  const match = text.match(regex);
  if (match) {
    let numStr = match[1].replace(/\s/g, '').toUpperCase();
    let multiplier = 1;
    if (numStr.includes('K')) {
      multiplier = 1000;
      numStr = numStr.replace('K', '');
    } else if (numStr.includes('M')) {
      multiplier = 1000000;
      numStr = numStr.replace('M', '');
    }
    const val = parseFloat(numStr.replace(',', '.'));
    if (!isNaN(val)) return Math.floor(val * multiplier);
  }
  return 0;
};

const mapLanguage = (langStr?: string): Language => {
  if (!langStr) return Language.ALL;
  const lower = langStr.toLowerCase();
  if (lower.includes('english')) return Language.ENGLISH;
  if (lower.includes('spanish') || lower.includes('español')) return Language.SPANISH;
  if (lower.includes('russian') || lower.includes('русский')) return Language.RUSSIAN;
  if (lower.includes('hindi')) return Language.HINDI;
  if (lower.includes('german') || lower.includes('deutsch')) return Language.GERMAN;
  return Language.ALL;
};

const detectLanguage = (text: string): Language => {
  const lower = text.toLowerCase();
  if (lower.includes(' de ') || lower.includes(' y ') || lower.includes(' en español ')) return Language.SPANISH;
  if (lower.includes(' der ') || lower.includes(' und ')) return Language.GERMAN;
  if (/[а-яА-Я]/.test(text)) return Language.RUSSIAN;
  return Language.ENGLISH;
};