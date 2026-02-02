import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import { GoogleGenAI, Type } from "@google/genai";
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// --- Cache Configuration ---
const localCache = new NodeCache({ stdTTL: 3600 }); // 1 hour local TTL
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    if ((err as any).code !== 'ECONNREFUSED') console.error('Redis Client Error', err);
});

let isRedisConnected = false;
(async () => {
  if (process.env.REDIS_URL) {
      try {
        await redisClient.connect();
        isRedisConnected = true;
        console.log('✅ Connected to Redis');
      } catch (e) {
        console.log('ℹ️ Redis unavailable, using local cache');
      }
  }
})();

// --- AI & API Setup ---
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.API_KEY;

// --- Middleware ---
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], 
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://picsum.photos", "https://fastly.picsum.photos", "https://ui-avatars.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://*.googleapis.com"],
    },
  },
}));
app.use(express.json());

// --- Utilities ---
const getCache = async (key: string) => {
  if (isRedisConnected && redisClient.isOpen) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }
  return localCache.get(key);
};

const setCache = async (key: string, data: any, ttl = 3600) => {
  if (isRedisConnected && redisClient.isOpen) {
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
  }
  localCache.set(key, data, ttl);
};

const cleanJSON = (text: string): string => {
  if (!text) return '[]';
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const first = cleaned.indexOf('[');
  const last = cleaned.lastIndexOf(']');
  if (first !== -1 && last !== -1) {
    cleaned = cleaned.substring(first, last + 1);
  }
  return cleaned;
};

// --- Endpoints ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', env: process.env.NODE_ENV });
});

/**
 * Endpoint: Neural Search (AI + Grounding)
 * Uses Gemini 3 Flash with Google Search Tool to find and parse channels.
 */
app.post('/api/search/neural', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `neural:${query.toLowerCase().trim()}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    console.log(`[NEURAL] Searching for: ${query}`);
    
    // Strict System Instruction for JSON output
    const prompt = `You are a specialized Telemetry Parser for the Telegram network.
    Task: Use Google Search to find public Telegram channels related to: "${query}".
    
    Requirements:
    1. LOCATE valid "t.me/" links in the search results.
    2. EXTRACT the Channel Name, Username (from the URL), Description, and Member count (if visible).
    3. DISCARD any results that are not Telegram channels.
    4. FORMAT the output strictly as a JSON Array of objects.
    
    JSON Schema per object:
    {
      "name": "string",
      "username": "string (no @ symbol)",
      "description": "string",
      "members": number (approximate),
      "category": "string (Crypto, Tech, News, etc)",
      "language": "string (English, Spanish, etc)"
    }
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json'
      }
    });

    let results = [];
    if (response.text) {
      try {
        results = JSON.parse(cleanJSON(response.text));
        
        // Post-processing to add IDs and avatars
        results = results.map((item: any, idx: number) => ({
          ...item,
          id: `ai-${Date.now()}-${idx}`,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=229ED9&color=fff`,
          status: 'Active',
          lastActive: 'Recently'
        }));

      } catch (e) {
        console.error("JSON Parse Error on Neural Search:", e);
      }
    }

    await setCache(cacheKey, results, 7200); // 2 hour cache
    res.json(results);

  } catch (error) {
    console.error("Neural Search Failed:", error);
    res.status(500).json({ error: "Neural link failed." });
  }
});

/**
 * Endpoint: Index Search (Google CSE)
 * Fallback or specific index search using standard API.
 */
app.post('/api/search/index', async (req, res) => {
  const { query, cseId } = req.body;
  if (!query || !cseId) return res.status(400).json({ error: 'Missing parameters' });

  const cacheKey = `index:${cseId}:${query.toLowerCase().trim()}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    console.log(`[INDEX] Searching CSE: ${cseId} for ${query}`);
    
    const params = new URLSearchParams({
      key: searchApiKey,
      cx: cseId,
      q: query,
      num: '10'
    });

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (!response.ok) throw new Error(`CSE Error: ${response.status}`);
    
    const data = await response.json();
    
    // Transform CSE items to Channel format
    const channels = (data.items || [])
      .filter((item: any) => item.link && item.link.includes('t.me/'))
      .map((item: any, idx: number) => {
        const username = item.link.split('/').pop();
        const meta = item.pagemap?.metatags?.[0] || {};
        
        return {
          id: `cse-${Date.now()}-${idx}`,
          name: meta['og:title'] || item.title || username,
          username: username,
          description: meta['og:description'] || item.snippet,
          members: 0, // CSE doesn't reliably give members
          category: 'All',
          language: 'All',
          avatarUrl: meta['og:image'] || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0A0A0A&color=fff`,
          status: 'Active',
          lastActive: 'Unknown'
        };
      });

    await setCache(cacheKey, channels, 7200);
    res.json(channels);

  } catch (error) {
    console.error("Index Search Failed:", error);
    res.status(500).json({ error: "Index access failed." });
  }
});

/**
 * Endpoint: Suggestions
 */
app.post('/api/suggestions', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json([]);

  const cacheKey = `sugg:${query.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const prompt = `Generate 5 short, relevant search tags for Telegram channels related to: "${query}". Return JSON array of strings.`;
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const tags = JSON.parse(cleanJSON(response.text || '[]'));
    await setCache(cacheKey, tags, 86400);
    res.json(tags);
  } catch (error) {
    res.json([]);
  }
});

app.post('/api/feedback', (req, res) => {
  res.json({ received: true });
});

// Serve Frontend
const staticPath = path.join(__dirname, '../dist');
app.use(express.static(staticPath));
app.get('*', (req, res) => res.sendFile(path.join(staticPath, 'index.html')));

app.listen(port, () => console.log(`TeleScope Signal Active on ${port}`));
