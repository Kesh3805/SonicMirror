/**
 * Configuration for the SonicMirror frontend
 */

const config = {
  // API Base URLs
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://sonicmirror-backend.onrender.com',
  },

  // Spotify OAuth
  spotify: {
    loginUrl: `${process.env.NEXT_PUBLIC_API_URL || 'https://sonicmirror-backend.onrender.com'}/auth/login`,
  },

  // Feature flags
  features: {
    enableDebugMode: process.env.NODE_ENV === 'development',
  },

  // Token management
  tokens: {
    storageKey: 'sonicmirror_tokens',
    refreshBufferMs: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  },
};

export default config;
