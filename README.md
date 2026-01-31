<div align="center">

# ✨ 🎵 ✨

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,16,18,20&height=200&section=header&text=SonicMirror&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=ffffff&desc=Your%20Music%20Taste%20Has%20a%20Personality.%20We%20Roast%20It.&descAlignY=55&descSize=20" width="100%"/>

<br/>

[![Spotify](https://img.shields.io/badge/Spotify-1DB954?style=for-the-badge&logo=spotify&logoColor=white)](https://spotify.com)
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

<br/>

<p align="center">
  <a href="https://sonicmirror-frontend.onrender.com">🌐 Live Demo</a> •
  <a href="#-features">✨ Features</a> •
  <a href="#-quick-start">🚀 Quick Start</a> •
  <a href="#-architecture">🏗️ Architecture</a>
</p>

<br/>

```
 ╔═══════════════════════════════════════════════════════════════════╗
 ║                                                                   ║
 ║   🎧  Connect Your Spotify  →  🤖  AI Analyzes  →  🔥  Get Roasted  ║
 ║                                                                   ║
 ╚═══════════════════════════════════════════════════════════════════╝
```

</div>

---

<div align="center">

## 🪞 What is SonicMirror?

</div>

<table>
<tr>
<td width="50%">

### 🎭 The Concept

**SonicMirror** holds up a mirror to your soul... through your Spotify data. 

Using the power of **Google Gemini AI**, we analyze your top artists, tracks, genres, and listening patterns to generate:

- 🔥 **Brutally honest roasts** of your music taste
- 🧠 **Deep personality insights** 
- 💫 **Mood analysis** based on audio features
- 🎯 **Smart recommendations** you'll actually love

</td>
<td width="50%">

### 🌈 The Vibe

```
┌─────────────────────────────────┐
│                                 │
│   You listen to Taylor Swift    │
│   at 2am crying? Say less. 😭   │
│                                 │
│   Your Spotify Wrapped isn't    │
│   a flex, it's a cry for help.  │
│                                 │
│              - AI Roast Bot     │
│                                 │
└─────────────────────────────────┘
```

*We roast because we care* 💕

</td>
</tr>
</table>

---

<div align="center">

## ✨ Features

</div>

<table>
<tr>
<td align="center" width="25%">

### 🔥
### AI Roasts
Get absolutely *destroyed* by our AI based on your music taste. It's therapy, but funnier.

</td>
<td align="center" width="25%">

### 🧠
### Personality
Discover the psychological profile hidden in your playlists. *Who ARE you?*

</td>
<td align="center" width="25%">

### 🎭
### Mood Detection
We know you're sad. The data doesn't lie. Here's a tissue. 🥲

</td>
<td align="center" width="25%">

### 💡
### Smart Recs
AI recommendations that actually slap. No more algorithm torture.

</td>
</tr>
</table>

<table>
<tr>
<td align="center" width="25%">

### 📊
### Dashboard
Beautiful visualizations of your musical journey through time.

</td>
<td align="center" width="25%">

### 🎵
### Audio Analysis
Danceability, energy, valence—we break down the *science* of your taste.

</td>
<td align="center" width="25%">

### 📤
### Share & Export
Flex (or expose yourself) on social media with beautiful shareable cards.

</td>
<td align="center" width="25%">

### 📱
### Responsive
Looks gorgeous on everything from phones to ultrawide monitors.

</td>
</tr>
</table>

---

<div align="center">

## 🏗️ Architecture

```
                                 ┌──────────────────────┐
                                 │   🌐 Spotify API     │
                                 └──────────┬───────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
          ┌─────────▼─────────┐                         ┌───────────▼──────────┐
          │                   │                         │                      │
          │  🎨 Frontend      │◄───────────────────────►│  ⚡ Backend          │
          │  Next.js 15       │         REST API        │  Express 5.x         │
          │  React 19         │                         │  Node.js             │
          │  TypeScript       │                         │                      │
          │  Tailwind CSS     │                         └───────────┬──────────┘
          │  Framer Motion    │                                     │
          │                   │                         ┌───────────▼──────────┐
          └───────────────────┘                         │                      │
                                                        │  🤖 Gemini AI        │
                                                        │  1.5 Flash           │
                                                        │                      │
                                                        └──────────────────────┘
```

</div>

<details>
<summary>📁 <b>Project Structure</b> (click to expand)</summary>

```
SonicMirror/
│
├── 🔧 backend/                    # Express.js API Server
│   ├── config/                    # Environment & configuration
│   │   └── index.js               # Centralized config management
│   ├── middleware/                # Express middleware stack
│   │   ├── errorHandler.js        # Global error handling
│   │   ├── validation.js          # Request validation
│   │   ├── logger.js              # Request logging
│   │   ├── rateLimit.js           # Rate limiting
│   │   ├── compression.js         # Response compression
│   │   ├── cache.js               # Response caching
│   │   └── index.js               # Middleware exports
│   ├── routes/                    # API route handlers
│   │   ├── auth.js                # OAuth & authentication
│   │   ├── spotify.js             # Spotify data endpoints
│   │   └── llm.js                 # AI/LLM endpoints
│   ├── services/                  # Business logic layer
│   │   ├── spotifyService.js      # Spotify API wrapper
│   │   └── geminiService.js       # Gemini AI integration
│   └── index.js                   # Server entry point
│
├── 🎨 frontend/                   # Next.js 15 Application
│   └── src/
│       ├── app/                   # App Router pages
│       │   ├── page.tsx           # Landing page
│       │   ├── login/             # Authentication
│       │   ├── dashboard/         # Main dashboard
│       │   ├── roast/             # AI roast page
│       │   └── analysis/          # Deep analysis
│       ├── components/            
│       │   ├── ui/                # Reusable UI components
│       │   │   ├── Button.tsx     # Custom button
│       │   │   ├── Card.tsx       # Card component
│       │   │   ├── Loading.tsx    # Loading states
│       │   │   ├── Modal.tsx      # Modal dialogs
│       │   │   └── Tooltip.tsx    # Tooltips
│       │   └── layout/            # Layout components
│       │       ├── Navbar.tsx     # Navigation bar
│       │       └── Footer.tsx     # Site footer
│       ├── hooks/                 # Custom React hooks
│       │   ├── useAuth.ts         # Authentication hook
│       │   ├── useSpotifyData.ts  # Spotify data fetching
│       │   └── useLLMFeatures.ts  # AI features hook
│       ├── lib/                   # Utilities & services
│       │   ├── api.ts             # API client
│       │   ├── cache.ts           # Client-side caching
│       │   ├── config.ts          # Frontend config
│       │   └── utils.ts           # Helper functions
│       └── types/                 # TypeScript definitions
│           └── spotify.ts         # Spotify types
│
└── 📄 README.md                   # You are here! 👋
```

</details>

---

<div align="center">

## 🚀 Quick Start

</div>

### Prerequisites

<table>
<tr>
<td>

```bash
# Required
✅ Node.js 18+
✅ npm or yarn
✅ Git
```

</td>
<td>

```bash
# Accounts Needed
🎵 Spotify Developer Account
🤖 Google AI Studio API Key
```

</td>
</tr>
</table>

### Installation

```bash
# 1️⃣ Clone the magic
git clone https://github.com/yourusername/sonicmirror.git
cd sonicmirror

# 2️⃣ Setup Backend
cd backend
npm install
cp env.example .env
# ✏️ Edit .env with your API keys
npm run dev

# 3️⃣ Setup Frontend (new terminal)
cd frontend
npm install
npm run dev

# 4️⃣ Open your browser
# 🌐 http://localhost:3000
```

### 🔑 Get Your API Keys

<details>
<summary>📗 <b>Spotify API Setup</b></summary>

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in:
   - App name: `SonicMirror`
   - Redirect URI: `http://localhost:3001/auth/callback`
4. Copy your **Client ID** and **Client Secret**
5. Paste them in `backend/.env`

</details>

<details>
<summary>🤖 <b>Gemini AI Setup</b></summary>

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key
4. Paste in `backend/.env` as `GEMINI_API_KEY`

</details>

---

<div align="center">

## ☁️ Deployment

</div>

<table>
<tr>
<td width="50%">

### 🚀 Deploy on Render

**Backend:**
1. New **Web Service** → Connect repo
2. Root: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add env variables

</td>
<td width="50%">

**Frontend:**
1. New **Web Service** → Connect repo
2. Root: `frontend`
3. Build: `npm install && npm run build`
4. Start: `npm start`

</td>
</tr>
</table>

<details>
<summary>📋 <b>Environment Variables Reference</b></summary>

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `SPOTIFY_CLIENT_ID` | ✅ | From Spotify Dashboard |
| `SPOTIFY_CLIENT_SECRET` | ✅ | From Spotify Dashboard |
| `SPOTIFY_REDIRECT_URI` | ✅ | OAuth callback URL |
| `FRONTEND_URI` | ✅ | Your frontend URL |
| `GEMINI_API_KEY` | ✅ | From Google AI Studio |
| `PORT` | ❌ | Server port (default: 3001) |
| `NODE_ENV` | ❌ | `development` or `production` |

</details>

---

<div align="center">

## 🛡️ Security & Performance

</div>

<table>
<tr>
<td width="50%">

### 🔒 Security Features
- ✅ OAuth 2.0 PKCE flow
- ✅ CORS protection
- ✅ Rate limiting (100 req/15min)
- ✅ Input validation & sanitization
- ✅ Error message sanitization
- ✅ Secure token handling

</td>
<td width="50%">

### ⚡ Performance Optimizations
- ✅ Response compression (gzip)
- ✅ Client-side caching
- ✅ Server-side caching headers
- ✅ Optimized bundle size
- ✅ Lazy loading & code splitting
- ✅ Efficient API batching

</td>
</tr>
</table>

---

<div align="center">

## 🧰 Tech Stack

</div>

<table>
<tr>
<td align="center" width="20%">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br><b>Next.js 15</b>
<br><sub>React Framework</sub>
</td>
<td align="center" width="20%">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br><b>React 19</b>
<br><sub>UI Library</sub>
</td>
<td align="center" width="20%">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br><b>TypeScript 5</b>
<br><sub>Type Safety</sub>
</td>
<td align="center" width="20%">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br><b>Tailwind CSS 4</b>
<br><sub>Styling</sub>
</td>
<td align="center" width="20%">
<img src="https://skillicons.dev/icons?i=express" width="48" height="48" alt="Express" />
<br><b>Express 5</b>
<br><sub>Backend API</sub>
</td>
</tr>
</table>

---

<div align="center">

## 🤝 Contributing

</div>

We love contributions! Here's how to get started:

```bash
# Fork the repo, then:
git checkout -b feature/amazing-feature
git commit -m '✨ Add amazing feature'
git push origin feature/amazing-feature
# Open a Pull Request!
```

---

<div align="center">

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,16,18,20&height=120&section=footer&animation=twinkling" width="100%"/>

<br/>

**Made with 💜 and way too much ☕**

*Your music taste is valid... probably.*

<br/>

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/sonicmirror&type=Date)](https://star-history.com/#yourusername/sonicmirror&Date)

</div>
