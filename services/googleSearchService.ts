// import { GoogleGenAI, Type } from "@google/genai"; // Removed for BFF
import { Channel, Category, Language, ChannelStatus } from '../types';

// const apiKey = process.env.API_KEY || '';
// const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.API_KEY || ''; 
// const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

export const searchTelegramChannels = async (query: string, cseId?: string): Promise<Channel[]> => {
  // If a specific CSE ID is provided, use the Custom Search JSON API via BFF
  if (cseId) {
    return searchWithCSE(query, cseId);
  }
  // Default to Gemini AI Search via BFF
  return searchWithGemini(query);
};

const searchWithGemini = async (query: string): Promise<Channel[]> => {
  try {
    const response = await fetch('/api/google/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (response.status === 429) {
      console.warn('Rate limit exceeded for Gemini search');
      return [];
    }

    if (!response.ok) {
      throw new Error(`Gemini Search API Error: ${response.statusText}`);
    }

    const parsed = await response.json();
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, index: number) => ({
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
    return [];

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

const searchWithCSE = async (query: string, cseId: string): Promise<Channel[]> => {
  try {
    const response = await fetch('/api/google/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, cseId })
    });

    if (response.status === 429) {
      console.warn('Rate limit exceeded for CSE search');
      return [];
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || response.statusText);
    }

    const data = await response.json();

    if (!data.items) return [];

    return data.items
      .filter((item: any) => item.link.includes('t.me/'))
      .map((item: any, index: number) => transformCSEItemToChannel(item, index));

  } catch (error) {
    console.error('Failed to search CSE:', error);
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

  // Status Detection
  let status = ChannelStatus.ACTIVE;
  const statusCheck = (rawTitle + ' ' + rawDescription).toLowerCase();

  if (statusCheck.includes('channel not found') || statusCheck.includes('page not found') || statusCheck.includes('deleted account')) {
    status = ChannelStatus.DELETED;
  } else if (statusCheck.includes('unavailable due to') || statusCheck.includes('copyright infringement') || statusCheck.includes('pornographic content') || statusCheck.includes('blocked in your country')) {
    status = ChannelStatus.BANNED;
  }

  // Name Cleaning
  let name = rawTitle
    .replace(/ – Telegram.*/, '')
    .replace(/ \| Telegram.*/, '')
    .replace(/^Telegram: Contact @/, '')
    .replace(/^Telegram: /, '')
    .trim();

  // If the name is just the username and it's suspended, it often looks like "username"
  if (!name || name.toLowerCase() === 'telegram') {
    name = username;
  }

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
    if (!isNaN(val)) {
      return Math.floor(val * multiplier);
    }
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
  if (lower.includes(' de ') || lower.includes(' y ') || lower.includes(' el ') || lower.includes(' la ') || lower.includes(' en español ')) return Language.SPANISH;
  if (lower.includes(' der ') || lower.includes(' und ') || lower.includes(' ist ')) return Language.GERMAN;
  if (/[а-яА-Я]/.test(text)) return Language.RUSSIAN;
  if (lower.includes(' hindi ') || /[\u0900-\u097F]/.test(text)) return Language.HINDI;
  return Language.ENGLISH;
};