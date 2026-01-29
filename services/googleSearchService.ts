import { GoogleGenAI, Type } from "@google/genai";
import { Channel, Category, Language } from '../types';

const apiKey = process.env.API_KEY || '';
// Separate key for Custom Search JSON API if available, otherwise fall back to generic key
const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.API_KEY || ''; 
const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

const ai = new GoogleGenAI({ apiKey });

export const searchTelegramChannels = async (query: string, cseId?: string): Promise<Channel[]> => {
  // If a specific CSE ID is provided, use the Custom Search JSON API
  if (cseId) {
    return searchWithCSE(query, cseId);
  }
  // Default to Gemini AI Search
  return searchWithGemini(query);
};

const searchWithGemini = async (query: string): Promise<Channel[]> => {
  if (!apiKey) {
    console.warn('Gemini API Key is missing');
    return [];
  }

  try {
    const model = 'gemini-3-flash-preview';
    
    // Enhanced prompt to handle operators
    const prompt = `Search for public Telegram channels related to: "${query}".
    
    The user query may contain specific operators. Interpret them as follows:
    - "phrase": Match exact phrases in channel name or description.
    - -word: Exclude channels containing this word.
    - intitle:word: The word MUST appear in the channel name.
    - lang:xx : Prioritize channels in this language code (en, es, ru, de, etc).
    - cat:xx or category:xx : Focus on this category context.
    - site:t.me : This is implicit, always find t.me links.

    Focus on finding real, active channels.
    Return a list of at least 5 channels found.
    For each channel, provide:
    - name: The channel name.
    - username: The username part of the t.me link (e.g. for t.me/durov, username is durov).
    - description: A brief description.
    - members: An estimated member count if available (number), otherwise 0.
    - language: The primary language of the channel (English, Spanish, Russian, Hindi, German, or Other).
    
    Ensure the links are valid Telegram links (t.me).`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              username: { type: Type.STRING },
              description: { type: Type.STRING },
              members: { type: Type.NUMBER },
              language: { type: Type.STRING },
            }
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
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
          verified: false
        }));
      }
    }
    
    return [];

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

const searchWithCSE = async (query: string, cseId: string): Promise<Channel[]> => {
  if (!searchApiKey) {
    console.warn('Google Search API Key is missing');
    return [];
  }

  try {
    // 1. Parse 'lang:' operator to use Google's 'lr' (language restriction) parameter
    let finalQuery = query;
    let langParam = '';

    const langMatch = query.match(/lang:([a-zA-Z-]+)/);
    if (langMatch) {
      const code = langMatch[1].toLowerCase();
      finalQuery = finalQuery.replace(langMatch[0], '').trim();
      // Map common codes to Google 'lr' format
      if (['en', 'es', 'ru', 'de', 'fr', 'it', 'pt', 'zh'].includes(code)) {
        langParam = `lang_${code}`;
      }
    }

    // 2. Parse 'cat:' operator to simply append keywords, as CSE doesn't have a category param
    // We treat 'cat:tech' as adding "tech" to the query string
    finalQuery = finalQuery.replace(/cat:(\w+)/g, '$1').replace(/category:(\w+)/g, '$1');

    // 3. 'intitle:', '-', 'site:', '""' are supported natively by Google CSE, so we leave them in `finalQuery`

    const searchParams = new URLSearchParams({
      key: searchApiKey,
      cx: cseId,
      q: finalQuery,
      num: '10'
    });

    if (langParam) {
      searchParams.append('lr', langParam);
    }

    const response = await fetch(`${GOOGLE_API_URL}?${searchParams.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      console.error(`Google API Error: ${data.error?.message || response.statusText}`);
      return [];
    }

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
  let name = metatags['og:title'] || item.title;
  name = name
    .replace(/ – Telegram.*/, '')
    .replace(/ \| Telegram.*/, '')
    .replace(/^Telegram: Contact @/, '')
    .replace(/^Telegram: /, '')
    .trim();

  const description = metatags['og:description'] || item.snippet || 'No description available.';
  
  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=229ED9&color=fff`;
  if (metatags['og:image']) {
    avatarUrl = metatags['og:image'];
  } else if (item.pagemap?.cse_image?.length > 0) {
    avatarUrl = item.pagemap.cse_image[0].src;
  }

  const members = extractMembers(description) || extractMembers(item.snippet);

  return {
    id: `cse-${index}-${Date.now()}`,
    name: name,
    username: username,
    description: description,
    members: members,
    category: Category.ALL,
    language: detectLanguage(description + ' ' + name),
    lastActive: 'Recently',
    avatarUrl: avatarUrl,
    verified: false
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
