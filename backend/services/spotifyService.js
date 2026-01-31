/**
 * Spotify API Service
 * Centralized service for all Spotify API interactions
 */
const axios = require('axios');
const config = require('../config');
const { logSpotifyCall } = require('../middleware/logger');

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

/**
 * Create Spotify API client with authorization
 * @param {string} accessToken - Spotify access token
 * @returns {Object} Axios instance
 */
function createSpotifyClient(accessToken) {
  const client = axios.create({
    baseURL: SPOTIFY_API_BASE,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Add response interceptor for logging
  client.interceptors.response.use(
    (response) => {
      logSpotifyCall(response.config.url, response.status, 0);
      return response;
    },
    (error) => {
      logSpotifyCall(
        error.config?.url || 'unknown',
        error.response?.status || 500,
        0
      );
      throw error;
    }
  );

  return client;
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Spotify
 * @returns {Promise<Object>} Token data
 */
async function exchangeCodeForTokens(code) {
  const response = await axios.post(
    `${SPOTIFY_ACCOUNTS_BASE}/api/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.spotify.redirectUri,
      client_id: config.spotify.clientId,
      client_secret: config.spotify.clientSecret,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  return response.data;
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token data
 */
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(
    `${SPOTIFY_ACCOUNTS_BASE}/api/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.spotify.clientId,
      client_secret: config.spotify.clientSecret,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  return response.data;
}

/**
 * Get user profile
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} User profile
 */
async function getUserProfile(accessToken) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/me');
  return data;
}

/**
 * Get user's top artists
 * @param {string} accessToken - Access token
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Top artists
 */
async function getTopArtists(accessToken, options = {}) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/me/top/artists', {
    params: {
      limit: options.limit || 10,
      time_range: options.timeRange || 'medium_term',
    },
  });
  return data;
}

/**
 * Get user's top tracks
 * @param {string} accessToken - Access token
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Top tracks
 */
async function getTopTracks(accessToken, options = {}) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/me/top/tracks', {
    params: {
      limit: options.limit || 10,
      time_range: options.timeRange || 'medium_term',
    },
  });
  return data;
}

/**
 * Get recently played tracks
 * @param {string} accessToken - Access token
 * @param {number} limit - Number of tracks
 * @returns {Promise<Object>} Recently played tracks
 */
async function getRecentlyPlayed(accessToken, limit = 50) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/me/player/recently-played', {
    params: { limit },
  });
  return data;
}

/**
 * Get audio features for tracks
 * @param {string} accessToken - Access token
 * @param {string[]} trackIds - Array of track IDs
 * @returns {Promise<Object>} Audio features
 */
async function getAudioFeatures(accessToken, trackIds) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/audio-features', {
    params: { ids: trackIds.join(',') },
  });
  return data;
}

/**
 * Calculate average audio features
 * @param {Object[]} features - Audio features array
 * @returns {Object} Average features
 */
function calculateAverageFeatures(features) {
  if (!features || features.length === 0) {
    return null;
  }

  const validFeatures = features.filter(f => f !== null);
  const avg = (key) => 
    validFeatures.reduce((sum, f) => sum + (f?.[key] || 0), 0) / validFeatures.length;

  return {
    avg_danceability: avg('danceability'),
    avg_energy: avg('energy'),
    avg_valence: avg('valence'),
    avg_tempo: avg('tempo'),
    avg_speechiness: avg('speechiness'),
    avg_acousticness: avg('acousticness'),
    avg_instrumentalness: avg('instrumentalness'),
    avg_liveness: avg('liveness'),
  };
}

/**
 * Extract top genres from artists
 * @param {Object[]} artists - Artists array
 * @returns {Object[]} Sorted genres with counts
 */
function extractTopGenres(artists) {
  const genreCounts = {};
  
  artists.forEach(artist => {
    (artist.genres || []).forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));
}

/**
 * Create playlist
 * @param {string} accessToken - Access token
 * @param {string} userId - User ID
 * @param {Object} playlistData - Playlist data
 * @returns {Promise<Object>} Created playlist
 */
async function createPlaylist(accessToken, userId, playlistData) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.post(`/users/${userId}/playlists`, {
    name: playlistData.name,
    description: playlistData.description || 'Created by SonicMirror',
    public: playlistData.public ?? false,
  });
  return data;
}

/**
 * Add tracks to playlist
 * @param {string} accessToken - Access token
 * @param {string} playlistId - Playlist ID
 * @param {string[]} trackUris - Track URIs
 * @returns {Promise<Object>} Response
 */
async function addTracksToPlaylist(accessToken, playlistId, trackUris) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.post(`/playlists/${playlistId}/tracks`, {
    uris: trackUris,
  });
  return data;
}

/**
 * Follow an artist
 * @param {string} accessToken - Access token
 * @param {string} artistId - Artist ID
 * @returns {Promise<void>}
 */
async function followArtist(accessToken, artistId) {
  const client = createSpotifyClient(accessToken);
  await client.put('/me/following', null, {
    params: { type: 'artist', ids: artistId },
  });
}

/**
 * Search for tracks
 * @param {string} accessToken - Access token
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Object>} Search results
 */
async function searchTracks(accessToken, query, limit = 5) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/search', {
    params: { q: query, type: 'track', limit },
  });
  return data;
}

/**
 * Search for artists
 * @param {string} accessToken - Access token
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Object>} Search results
 */
async function searchArtists(accessToken, query, limit = 5) {
  const client = createSpotifyClient(accessToken);
  const { data } = await client.get('/search', {
    params: { q: query, type: 'artist', limit },
  });
  return data;
}

module.exports = {
  createSpotifyClient,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserProfile,
  getTopArtists,
  getTopTracks,
  getRecentlyPlayed,
  getAudioFeatures,
  calculateAverageFeatures,
  extractTopGenres,
  createPlaylist,
  addTracksToPlaylist,
  followArtist,
  searchTracks,
  searchArtists,
};
