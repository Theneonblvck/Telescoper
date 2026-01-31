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

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🚀 Starting Telescoper server...');
console.log(`📋 Node version: ${process.version}`);
console.log(`📋 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📋 API_KEY set: ${process.env.API_KEY ? 'Yes' : 'No'}`);

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;
console.log(`📋 PORT: ${port}`);

// --- Caching Setup ---
// 1. Local In-Memory Cache (Free, Fast, Stateless)
const localCache = new NodeCache({ stdTTL: 86400 }); // 24 hours default TTL

// 2. Redis Cache (Optional, Persistent, Shared)
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    // Suppress connection refused errors if we expect to run without Redis
    if ((err as any).code !== 'ECONNREFUSED') {
        console.error('Redis Client Error', err);
    }
});

// Connect to Redis asynchronously
let isRedisConnected = false;
(async () => {
  try {
    // Only attempt connection if a specific URL is provided or we are local
    if (process.env.REDIS_URL) {
        await redisClient.connect();
        isRedisConnected = true;
        console.log('✅ Connected to Redis (Persistent Cache Active)');
    } else {
        console.log('ℹ️ No REDIS_URL found. Using In-Memory Cache (Free Tier Mode).');
    }
  } catch (err) {
    console.warn('⚠️ Redis connection failed. Falling back to In-Memory Cache.', err);
  }
})();

// --- API Client Setup ---
const apiKey = process.env.API_KEY || '';
if (!apiKey) {
  console.error('⚠️ WARNING: API_KEY environment variable is not set. Gemini features will not work.');
}
const genAI = new GoogleGenAI({ apiKey });
const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.API_KEY || '';
const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || '';

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

// --- Rate Limiters ---
const suggestionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: 'Too many suggestion requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { error: 'Search rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5, 
  message: { error: 'Too many feedback submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Helper Functions ---
const getFromCache = async (key: string) => {
  try {
    // Try Redis first if connected
    if (isRedisConnected && redisClient.isOpen) {
        const data = await redisClient.get(key);
        if (data) return JSON.parse(data);
    }
    
    // Fallback to Local Cache
    const localData = localCache.get(key);
    if (localData) return localData;

    return null;
  } catch (error) {
    console.error(`Cache get error for ${key}:`, error);
    return null;
  }
};

const setInCache = async (key: string, data: any, ttlSeconds = 86400) => {
  try {
    // Set in Redis if connected
    if (isRedisConnected && redisClient.isOpen) {
        await redisClient.set(key, JSON.stringify(data), { EX: ttlSeconds });
    }
    
    // Always set in Local Cache as backup/primary
    localCache.set(key, data, ttlSeconds);
  } catch (error) {
    console.error(`Cache set error for ${key}:`, error);
  }
};

const logSearchQuery = async (query: string, source: string) => {
  const safeQuery = (query || '').substring(0, 100);
  if (!safeQuery) return;

  const entry = {
    query: safeQuery,
    source,
    timestamp: new Date().toISOString()
  };

  console.log(`[ANALYTICS] Search: "${safeQuery}" via ${source}`);

  if (isRedisConnected && redisClient.isOpen) {
    try {
      await redisClient.lPush('analytics:search_queries', JSON.stringify(entry));
    } catch (err) {
      console.warn('Failed to log analytics to Redis:', err);
    }
  }
};

// --- Routes ---

// 1. Gemini Suggestions
app.post('/api/gemini/suggestions', suggestionLimiter, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `suggestions-${query.toLowerCase()}`;
  const cached = await getFromCache(cacheKey);
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

    // Safely parse
    let tags = [];
    if (response.text) {
        try {
            tags = JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse suggestion JSON", e);
        }
    }
    
    await setInCache(cacheKey, tags, 86400);
    res.json(tags);
  } catch (error) {
    console.error('Gemini Suggestion Error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// 2. Brave Search
app.post('/api/brave/search', searchLimiter, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  logSearchQuery(query, 'brave');

  if (!braveApiKey) return res.status(503).json({ error: 'Search service unavailable' });

  const cacheKey = `brave-${query.toLowerCase()}`;
  const cached = await getFromCache(cacheKey);
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
    await setInCache(cacheKey, data, 86400);
    res.json(data);
  } catch (error) {
    console.error('Brave Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 3. Google/Gemini Search
app.post('/api/google/search', searchLimiter, async (req, res) => {
  const { query, cseId } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const source = cseId ? 'cse' : 'ai';
  logSearchQuery(query, source);

  const cacheKey = `gsearch-${cseId || 'ai'}-${query.toLowerCase()}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    if (cseId) {
      if (!searchApiKey) return res.status(503).json({ error: 'CSE Service unavailable' });
      
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
      
      await setInCache(cacheKey, data, 86400);
      return res.json(data);
    }

    // Gemini AI Search
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

    let result = [];
    if (response.text) {
        try {
            result = JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse Gemini search response", e);
        }
    }
    
    await setInCache(cacheKey, result, 86400);
    res.json(result);

  } catch (error) {
    console.error('Google/Gemini Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 4. Feedback
app.post('/api/feedback', feedbackLimiter, async (req, res) => {
  const { type, message } = req.body;
  if (!type || !message) return res.status(400).json({ error: 'Missing fields' });

  console.log(`[FEEDBACK] Type: ${type} | Message: ${message}`);

  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    type,
    message,
    ip: req.ip
  });
  
  fs.appendFile('feedback.jsonl', logEntry + '\n', (err) => {
    if (err) console.error('Failed to write to feedback log file:', err);
  });

  if (isRedisConnected && redisClient.isOpen) {
    try {
      await redisClient.lPush('feedback_submissions', logEntry);
    } catch (err) {
      console.warn('Failed to save feedback to Redis:', err);
    }
  }

  res.status(200).json({ success: true });
});

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Serve Frontend ---
const staticPath = path.join(__dirname, '../dist');
console.log(`📋 Static path: ${staticPath}`);
app.use(express.static(staticPath));

// Catch-all route for SPA - Express 5 requires named parameter for wildcards
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Explicitly bind to 0.0.0.0 for Cloud Run
const host = '0.0.0.0';
app.listen(Number(port), host, () => {
  console.log(`✅ Server running on http://${host}:${port}`);
});