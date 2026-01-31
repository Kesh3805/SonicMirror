/**
 * Centralized configuration management for SonicMirror backend
 * Loads and validates all environment variables
 */
require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // Spotify OAuth Configuration
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-follow-modify',
      'user-follow-read',
    ].join(' '),
  },

  // Frontend Configuration
  frontend: {
    uri: process.env.FRONTEND_URI || 'http://localhost:3000/dashboard',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://sonicmirror-frontend.onrender.com',
    ],
  },

  // AI/LLM Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Database Configuration (for future use)
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sonicmirror',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-default-secret-change-in-production',
    expiresIn: '7d',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequestsPerMinute: 15, // Conservative limit for free tier
    geminiMaxRetries: 3,
  },
};

/**
 * Validate required configuration
 * @returns {string[]} Array of missing configuration keys
 */
function validateConfig() {
  const requiredKeys = [
    { key: 'spotify.clientId', value: config.spotify.clientId },
    { key: 'spotify.clientSecret', value: config.spotify.clientSecret },
    { key: 'spotify.redirectUri', value: config.spotify.redirectUri },
  ];

  const missing = requiredKeys
    .filter(({ value }) => !value)
    .map(({ key }) => key);

  if (missing.length > 0) {
    console.warn(`⚠️ Missing required configuration: ${missing.join(', ')}`);
  }

  // Check Gemini API key
  if (!config.gemini.apiKey || config.gemini.apiKey === 'your-gemini-api-key-here') {
    console.warn('⚠️ GEMINI_API_KEY is not configured. AI features will use fallback responses.');
  }

  return missing;
}

// Validate on load
validateConfig();

module.exports = config;
