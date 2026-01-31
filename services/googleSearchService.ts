import { Channel, Category, Language, ChannelStatus } from '../types';

export const searchTelegramChannels = async (query: string, cseId?: string): Promise<Channel[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch('/api/google/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, cseId }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      console.warn("Rate limit hit");
      return []; 
    }

    if (!response.ok) {
      throw new Error(`Search service failed: ${response.status}`);
    }

    const data = await response.json();

    if (cseId) {
      // Handle CSE Response format
      if (!data.items) return [];
      return data.items
        .filter((item: any) => item.link.includes('t.me/'))
        .map((item: any, index: number) => transformCSEItemToChannel(item, index));
    } else {
      // Handle Gemini AI format
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
  } finally {
    clearTimeout(timeoutId);
  }
};

const transformCSEItemToChannel = (item: any, index: number): Channel => {
  const cleanLink = item.link.replace(/\/s\//, '/'); 
  const urlParts = cleanLink.split('/').filter((part: string) => part);
  const username = urlParts[urlParts.length - 1] || 'unknown';
  
  const metatags = item.pagemap?.metatags?.[0] || {};
  let rawTitle = metatags['og:title'] || item.title || '';
  const rawDescription = metatags['og:description'] || item.snippet || '';

  // Clean Title Logic
  let name = rawTitle
    .replace(/^Telegram: Contact @.+/, '') 
    .replace(/^Telegram: .+/g, '')
    .replace(/ – Telegram$/, '')
    .replace(/ \| Telegram$/, '')
    .replace(/\s*–\s*Telegram$/, '')
    .replace(/\s*\|\s*Telegram$/, '')
    .trim();

  // Fallback if name is generic
  if (!name || name.toLowerCase() === 'telegram') {
      if (metatags['og:title'] && metatags['og:title'] !== 'Telegram') {
          name = metatags['og:title'];
      } else {
          name = username; 
      }
  }

  // Robust Status Detection
  let status = ChannelStatus.ACTIVE;
  const combinedText = (rawTitle + ' ' + rawDescription).toLowerCase();
  
  const bannedPatterns = [
    /unavailable due to/i,
    /copyright infringement/i,
    /violated.*local laws/i,
    /pornography/i,
    /legal.*grounds/i,
    /channel.*blocked/i
  ];

  const deletedPatterns = [
    /channel not found/i,
    /page not found/i,
    /doesn'?t exist/i,
    /account.*deleted/i,
    /no longer exists/i,
    /^telegram: contact @.* \(deleted\)$/i
  ];
  
  if (bannedPatterns.some(p => p.test(combinedText))) {
    status = ChannelStatus.BANNED;
  } else if (deletedPatterns.some(p => p.test(combinedText))) {
    status = ChannelStatus.DELETED;
  }

  // Extract Members
  const members = extractMembers(rawDescription);

  // Avatar Logic
  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=229ED9&color=fff`;
  if (metatags['og:image'] && !metatags['og:image'].includes('telegram-logo')) {
    avatarUrl = metatags['og:image'];
  } else if (item.pagemap?.cse_image?.length > 0) {
    avatarUrl = item.pagemap.cse_image[0].src;
  }

  return {
    id: `cse-${index}-${Date.now()}`,
    name: name,
    username: username,
    description: rawDescription || 'No description available.',
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
  const regex = /([\d\s.,]+[kKmM]?)\s*(?:subscribers|members|subs)/i;
  const match = text.match(regex);
  if (!match) return 0;

  let numStr = match[1].trim().toUpperCase();
  let multiplier = 1;

  if (numStr.endsWith('K')) {
    multiplier = 1000;
    numStr = numStr.slice(0, -1);
  } else if (numStr.endsWith('M')) {
    multiplier = 1000000;
    numStr = numStr.slice(0, -1);
  }

  numStr = numStr.replace(/\s/g, '');

  if (multiplier > 1) {
    numStr = numStr.replace(',', '.');
  } else {
    numStr = numStr.replace(/,/g, '');
  }

  const val = parseFloat(numStr);
  return isNaN(val) ? 0 : Math.floor(val * multiplier);
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
  const t = text.toLowerCase();

  // 1. Script-based detection (Strong indicators)
  if (/[\u0400-\u04FF]/.test(t)) return Language.RUSSIAN; // Cyrillic
  if (/[\u0900-\u097F]/.test(t)) return Language.HINDI;   // Devanagari

  // 2. Vocabulary-based detection
  // German common words
  if (/\b(der|die|das|und|ist|nicht|eine|mit|fÃ¼r|sich|den|auf|dass|kann)\b/i.test(t)) return Language.GERMAN;

  // Spanish common words
  if (/\b(el|la|los|las|en|un|una|por|para|con|sobre|este|esta|todo|nada|mas|mÃ¡s)\b/i.test(t)) return Language.SPANISH;

  // English common words (Check last to avoid false positives from shared roots if possible, though basic list is safe)
  if (/\b(the|and|is|are|for|with|you|this|that|from|have|not|your)\b/i.test(t)) return Language.ENGLISH;

  return Language.ALL;
};