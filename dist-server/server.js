"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const node_cache_1 = __importDefault(require("node-cache"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const genai_1 = require("@google/genai");
// import fetch from 'node-fetch'; // Using native Node.js 20 fetch
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Trust the first proxy (Cloud Run Load Balancer)
app.set('trust proxy', 1);
// Security Headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://esm.sh"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://picsum.photos", "https://ui-avatars.com", "*.googleusercontent.com"],
            connectSrc: ["'self'", "https://api.search.brave.com", "https://generativelanguage.googleapis.com", "https://www.googleapis.com", "https://cdn.tailwindcss.com", "https://esm.sh"],
            upgradeInsecureRequests: [],
        },
    },
}));
app.use(express_1.default.json());
// Rate Limiting
// Stricter limit for expensive Search APIs
const searchLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Search limit exceeded. Please try again later.' }
});
// Generous limit for cheap/cached suggestions
const suggestionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many suggestion requests.' }
});
// Apply rate limiting to API routes
app.use('/api/gemini/suggestions', suggestionLimiter);
app.use('/api/brave/search', searchLimiter);
app.use('/api/google/search', searchLimiter);
// Caching
const cache = new node_cache_1.default({ stdTTL: 86400 }); // Cache for 24 hours (86400 seconds)
// API Clients
const geminiApiKey = process.env.GEMINI_API_KEY;
const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
const googleSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY || geminiApiKey; // Fallback
const googleCseId = process.env.GOOGLE_CSE_ID;
const ai = geminiApiKey ? new genai_1.GoogleGenAI({ apiKey: geminiApiKey }) : null;
// --- API Routes ---
// Gemini Suggestions BFF
app.post('/api/gemini/suggestions', async (req, res) => {
    const { query } = req.body;
    if (!query)
        return res.status(400).json({ error: 'Query is required' });
    const cacheKey = `gemini_${query}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return res.json(cached);
    if (!ai)
        return res.status(500).json({ error: 'Gemini API not configured' });
    try {
        const model = 'gemini-3-flash-preview';
        const prompt = `Given the user search query "${query}" for a Telegram Channel discovery app, provide 5 short, relevant tags, synonyms, or related categories that would help the user find what they are looking for. Return strictly a JSON array of strings. Do not include markdown formatting.`;
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: genai_1.Type.ARRAY,
                    items: { type: genai_1.Type.STRING }
                }
            }
        });
        let result = [];
        if (response.text) {
            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed)) {
                result = parsed.slice(0, 5);
            }
        }
        cache.set(cacheKey, result);
        return res.json(result);
    }
    catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});
// Brave Search BFF
app.post('/api/brave/search', async (req, res) => {
    const { query } = req.body;
    if (!query)
        return res.status(400).json({ error: 'Query is required' });
    const cacheKey = `brave_${query}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return res.json(cached);
    if (!braveApiKey)
        return res.status(500).json({ error: 'Brave API not configured' });
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
        if (!response.ok) {
            throw new Error(`Brave API Error: ${response.statusText}`);
        }
        const data = await response.json();
        cache.set(cacheKey, data);
        return res.json(data);
    }
    catch (error) {
        console.error('Brave API Error:', error);
        return res.status(500).json({ error: 'Failed to search Brave' });
    }
});
// Google Search BFF
app.post('/api/google/search', async (req, res) => {
    const { query, cseId } = req.body;
    const targetCseId = cseId || googleCseId;
    if (!query)
        return res.status(400).json({ error: 'Query is required' });
    // Note: Google Custom Search usage might be complex to fully proxy if using Gemini for search logic.
    // For now, let's implement the Gemini Search function on the backend as seen in frontend service
    // DECISION: The frontend `googleSearchService.ts` had two modes: Custom Search and Gemini-based "Search".
    // We will support both via this endpoint or separate ones. 
    // To match the frontend service structure, let's handle the logic here.
    if (targetCseId) {
        // Custom Search Implementation
        const cacheKey = `google_cse_${query}_${targetCseId}`;
        const cached = cache.get(cacheKey);
        if (cached)
            return res.json(cached);
        if (!googleSearchApiKey)
            return res.status(500).json({ error: 'Google Search API Key missing' });
        try {
            // Logic from frontend/services/googleSearchService.ts (searchWithCSE)
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
                key: googleSearchApiKey,
                cx: targetCseId,
                q: finalQuery,
                num: '10'
            });
            if (langParam)
                searchParams.append('lr', langParam);
            const response = await fetch(`https://www.googleapis.com/customsearch/v1?${searchParams.toString()}`);
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error?.message || response.statusText);
            cache.set(cacheKey, data);
            return res.json(data);
        }
        catch (error) {
            console.error('Google CSE Error:', error);
            return res.status(500).json({ error: 'Failed to search Google CSE' });
        }
    }
    else {
        // Gemini-powered Search Implementation
        const cacheKey = `gemini_search_${query}`;
        const cached = cache.get(cacheKey);
        if (cached)
            return res.json(cached);
        if (!ai)
            return res.status(500).json({ error: 'Gemini API not configured' });
        try {
            const model = 'gemini-3-flash-preview';
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
                - username: The username part of the t.me link.
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
                        type: genai_1.Type.ARRAY,
                        items: {
                            type: genai_1.Type.OBJECT,
                            properties: {
                                name: { type: genai_1.Type.STRING },
                                username: { type: genai_1.Type.STRING },
                                description: { type: genai_1.Type.STRING },
                                members: { type: genai_1.Type.NUMBER },
                                language: { type: genai_1.Type.STRING },
                            }
                        }
                    }
                }
            });
            let result = [];
            if (response.text) {
                const parsed = JSON.parse(response.text);
                if (Array.isArray(parsed))
                    result = parsed;
            }
            cache.set(cacheKey, result);
            return res.json(result);
        }
        catch (error) {
            console.error('Gemini Search Error:', error);
            return res.status(500).json({ error: 'Failed to search Gemini' });
        }
    }
});
// Serve Static Files (Vite Build)
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
// SPA Fallback
app.get(/(.*)/, (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../dist', 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
