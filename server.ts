import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// --- API Client Setup ---
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
// Fallback for search key if specific one not provided
const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.API_KEY || '';
const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || '';

// --- Middleware ---
app.set('trust proxy', 1); // Essential for Cloud Run

// Configure Security Headers (CSP) to allow external images
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some hydration scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://picsum.photos", "https://fastly.picsum.photos", "https://ui-avatars.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://*.googleapis.com"],
    },
  },
}));

app.use(express.json());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// --- Routes ---

// 1. Gemini Suggestions
app.post('/api/gemini/suggestions', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `suggestions-${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const prompt = `Given the user search query "${query}" for a Telegram Channel discovery app, provide 5 short, relevant tags, synonyms, or related categories that would help the user find what they are looking for. Return strictly a JSON array of strings.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const tags = response.text ? JSON.parse(response.text) : [];
    cache.set(cacheKey, tags);
    res.json(tags);
  } catch (error) {
    console.error('Gemini Suggestion Error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// 2. Brave Search
app.post('/api/brave/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  if (!braveApiKey) return res.status(503).json({ error: 'Search service unavailable' });

  const cacheKey = `brave-${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const searchParams = new URLSearchParams({
      q: `${query} site:t.me`,
      count: '20',
      result_filter: 'web',
      safesearch: 'moderate'
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey
      }
    });

    if (!response.ok) throw new Error(`Brave API: ${response.statusText}`);
    
    const data = await response.json();
    cache.set(cacheKey, data, 1800); // Cache for 30 mins
    res.json(data);
  } catch (error) {
    console.error('Brave Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 3. Google/Gemini Search (Unified)
app.post('/api/google/search', async (req, res) => {
  const { query, cseId } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `gsearch-${cseId || 'ai'}-${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // A. Custom Search Engine (CSE)
    if (cseId) {
      if (!searchApiKey) return res.status(503).json({ error: 'CSE Service unavailable' });
      
      // Parse Lang logic
      let finalQuery = query;
      let langParam = '';
      const langMatch = query.match(/lang:([a-zA-Z-]+)/);
      if (langMatch) {
        const code = langMatch[1].toLowerCase();
        finalQuery = finalQuery.replace(langMatch[0], '').trim();
        if (['en', 'es', 'ru', 'de', 'fr', 'it', 'pt', 'zh'].includes(code)) {
          langParam = `lang_${code}`;
        }
      }
      finalQuery = finalQuery.replace(/cat:(\w+)/g, '$1').replace(/category:(\w+)/g, '$1');

      const searchParams = new URLSearchParams({
        key: searchApiKey,
        cx: cseId,
        q: finalQuery,
        num: '10'
      });
      if (langParam) searchParams.append('lr', langParam);

      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${searchParams.toString()}`);
      const data = await response.json();
      
      cache.set(cacheKey, data, 3600);
      return res.json(data);
    }

    // B. Gemini AI Search
    const prompt = `Search for public Telegram channels related to: "${query}".
    Interpret operators: "phrase", -word, intitle:word, lang:xx, cat:xx.
    Focus on finding active channels. Return list of at least 5 channels.
    Schema: name, username, description, members (number), language.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    const result = response.text ? JSON.parse(response.text) : [];
    cache.set(cacheKey, result, 3600);
    res.json(result);

  } catch (error) {
    console.error('Google/Gemini Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- Serve Frontend ---
// Adjust path to point to ../dist since server.js will be in /app/dist-server/
const staticPath = path.join(__dirname, '../dist');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});