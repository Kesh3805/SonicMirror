# SonicMirror Backend

Express.js backend for SonicMirror, providing Spotify OAuth, AI-powered music analysis, and data endpoints.

## 🚀 Features

- **Spotify OAuth**: Complete OAuth 2.0 flow with token refresh
- **AI Integration**: Google Gemini AI for music analysis and roasts
- **Rate Limiting**: Built-in rate limiting for API protection
- **Error Handling**: Comprehensive error handling with fallbacks
- **Security**: CORS, security headers, and request validation

## 📁 Project Structure

```
backend/
├── config/                  # Configuration management
│   └── index.js             # Centralized configuration
├── middleware/              # Express middleware
│   ├── errorHandler.js      # Error handling & async wrapper
│   ├── logger.js            # Request logging
│   ├── rateLimit.js         # Rate limiting
│   ├── validation.js        # Request validation
│   └── index.js             # Middleware exports
├── routes/                  # API routes
│   ├── auth.js              # Spotify OAuth endpoints
│   ├── llm.js               # AI/LLM endpoints
│   └── spotify.js           # Spotify data endpoints
├── services/                # Business logic services
│   ├── geminiService.js     # Google Gemini AI integration
│   ├── spotifyService.js    # Spotify API wrapper
│   └── index.js             # Service exports
├── index.js                 # Application entry point
├── env.example              # Environment template
└── package.json
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.1.0
- **AI**: Google Generative AI (Gemini 1.5 Flash)
- **HTTP Client**: Axios
- **Environment**: dotenv

## 📡 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Initiate Spotify OAuth flow |
| GET | `/auth/callback` | OAuth callback handler |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/status` | Check authentication status |

### Spotify Data (`/spotify`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spotify/me` | Get user profile |
| GET | `/spotify/top-artists` | Get top artists |
| GET | `/spotify/top-tracks` | Get top tracks |
| GET | `/spotify/recently-played` | Get recently played |
| GET | `/spotify/audio-features` | Get audio features |
| GET | `/spotify/playlists` | Get user playlists |

### AI Features (`/llm`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/llm/roast` | Generate music taste roast |
| POST | `/llm/personality` | Analyze music personality |
| POST | `/llm/mood` | Analyze current mood |
| POST | `/llm/recommendations` | Get AI recommendations |
| POST | `/llm/story` | Generate music story |
| POST | `/llm/spotify-wrapped` | Generate wrapped summary |
| GET | `/llm/status` | Check AI service status |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Spotify Developer account
- Google AI API key (for Gemini)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your credentials
# See env.example for detailed instructions

# Start development server
npm run dev

# Or start production server
npm start
```

### Environment Setup

1. **Spotify Developer Dashboard**
   - Go to https://developer.spotify.com/dashboard
   - Create a new app
   - Add your redirect URI (e.g., `http://localhost:3001/auth/callback`)
   - Copy Client ID and Client Secret

2. **Google Gemini API**
   - Go to https://makersuite.google.com/app/apikey
   - Create a new API key
   - Copy the key to your `.env`

## 📦 Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start with --watch (auto-reload)
npm run setup-gemini  # Test Gemini API setup
```

## 🔒 Security Features

- **Rate Limiting**: Protects against abuse
  - AI endpoints: 15 requests/minute
  - Spotify endpoints: 100 requests/minute
- **CORS**: Configurable origin whitelist
- **Security Headers**: XSS protection, content type options
- **Input Validation**: Request body validation
- **Error Sanitization**: Safe error messages in production

## 🔧 Configuration

All configuration is centralized in `config/index.js`:

```javascript
const config = require('./config');

// Access configuration
config.server.port      // Server port
config.spotify.clientId // Spotify client ID
config.gemini.apiKey    // Gemini API key
config.rateLimit.ai     // AI rate limit settings
```

## 🚀 Deployment

### Render (Recommended)

1. Connect your repository to Render
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `env.example`

### Environment Variables for Production

```env
NODE_ENV=production
SPOTIFY_REDIRECT_URI=https://your-backend.onrender.com/auth/callback
FRONTEND_URI=https://your-frontend.onrender.com/dashboard
CORS_ORIGIN=https://your-frontend.onrender.com
```

## 📄 License

MIT 