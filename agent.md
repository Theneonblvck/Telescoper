# TeleScope Project Documentation

## 1. Project Overview
**TeleScope** is a modern, AI-powered search engine designed to discover public Telegram channels. It utilizes a Cyberpunk/Terminal aesthetic (React + Tailwind) and aggregates results from Google Custom Search, Brave Search, and Gemini AI.

**Current Phase:** Migration to Cloud Run (BFF Architecture) complete. Rate limiting, Redis caching, and security protocols active. Global state refactored to Zustand.

---

## 2. Architecture & Tech Stack

### Frontend (Client)
- **Framework:** React 19 (via Vite).
- **State Management:** Zustand (Store-based architecture).
- **Styling:** Tailwind CSS with custom `jetBrains Mono` font and `tech-*` color palette.
- **Communication:** **Strictly** talks to the internal Node.js backend (`/api/*`). No external API calls allowed from the browser.

### Backend (BFF - Backend for Frontend)
- **Runtime:** Node.js (Express).
- **Role:** Proxy server, API Key guardian, Rate Limiter, and Cache layer.
- **Language:** TypeScript (`server.ts`).
- **Deployment:** Google Cloud Run (Dockerized).

### Infrastructure
- **Container:** Multi-stage Dockerfile (Build -> Serve).
- **Caching:** Redis (Stateless, 24h TTL).
- **Security:** Helmet (CSP), Express Rate Limit.

---

## 3. Coding Standards & Rules

### General
- **Files:** React components in `components/`, Logic in `services/`.
- **Formatting:** 2 spaces indentation, semicolons required.
- **Types:** Strict TypeScript interfaces (see `types.ts`).

### GenAI SDK Usage (@google/genai)
- **Import:** `import { GoogleGenAI } from "@google/genai";`
- **Initialization:** `const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });`
- **Model:** Default to `gemini-3-flash-preview` for text/logic tasks.
- **Prohibited:** Do not use the deprecated `GoogleGenerativeAI` class.

### UI/UX Guidelines
- **Theme:** "Dark Mode" by default.
- **Colors:**
  - Background: `#050505`
  - Accent: Telegram Blue (`#229ED9`), Warning Yellow (`#FACC15`).
- **Components:** Use `GlitchText` for headings. Input fields must have `font-mono`.

---

## 4. API Endpoints (Internal)

| Endpoint | Method | Purpose | Rate Limit (Target) |
| :--- | :--- | :--- | :--- |
| `/api/gemini/suggestions` | POST | Generate search tags | High (100/15m) |
| `/api/brave/search` | POST | Web search via Brave | Low (20/15m) |
| `/api/google/search` | POST | Web search via CSE/Gemini | Low (20/15m) |

---

## 5. Active Roadmap & Tasks

### 🔴 Immediate Priority
- **Error Handling:** Improve frontend "Toast" notifications for 429 (Rate Limit) errors.

### 🟡 Medium Priority
- **User Accounts:** Save favorite channels.
- **Analytics:** Track top searched terms anonymously.

### 🟢 Completed
- **State Refactor:** Migrated from local `useState` to Zustand global store.
- **Redis Integration:** Replaced `node-cache` with Redis for stateless Cloud Run scaling.
- **Split Rate Limiting:** Implemented strict limits for search, loose for suggestions.
- **Cache Duration:** Increased to 24 hours.
- **Deployment config:** Added `.gcloudignore` and `package.json` scripts.
- **Port Configuration:** Updated dev workflow.

---

## 6. Environment Variables
*Do not commit these values.*

```env
# Server Configuration
PORT=8080
REDIS_URL=redis://localhost:6379

# API Keys
API_KEY=AIzaSy... (Gemini)
GOOGLE_SEARCH_API_KEY=...
BRAVE_SEARCH_API_KEY=...
GOOGLE_CSE_ID=...
```

## 7. Operational Commands

**Local Development (Full Stack):**
1. `npm install`
2. `npm run dev` (Frontend on port 5173, Proxies to backend)
   *Note: Backend server requires separate start or ensuring Vite proxy is configured to a running backend instance.*
   
**Production Build Test:**
1. `npm run build` (Frontend)
2. `npm run build:server` (Backend)
3. `npm start` (Runs on port 8080)

**Deployment:**
`./deploy.sh` (Requires gcloud auth and project setup).