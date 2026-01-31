/**
 * Centralized API service for SonicMirror frontend
 * Handles all backend communication with proper error handling and token management
 */

import config from './config';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
}

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email?: string;
  images: { url: string }[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string; display_name: string };
  external_urls?: { spotify: string };
}

export interface AudioFeatures {
  avg_danceability: number;
  avg_energy: number;
  avg_valence: number;
  avg_tempo: number;
  avg_speechiness: number;
  avg_acousticness: number;
  avg_instrumentalness: number;
  avg_liveness: number;
}

export interface GenreCount {
  genre: string;
  count: number;
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

let currentTokens: TokenData | null = null;

/**
 * Get tokens from URL params (after OAuth redirect)
 */
export function getTokensFromUrl(): TokenData | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in = params.get('expires_in');

  if (access_token && refresh_token && expires_in) {
    const tokens: TokenData = {
      access_token,
      refresh_token,
      expires_in: parseInt(expires_in, 10),
      expires_at: Date.now() + parseInt(expires_in, 10) * 1000,
    };

    // Store tokens
    setTokens(tokens);

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    return tokens;
  }

  return null;
}

/**
 * Get stored tokens
 */
export function getTokens(): TokenData | null {
  if (currentTokens) return currentTokens;

  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(config.tokens.storageKey);
    if (stored) {
      currentTokens = JSON.parse(stored);
      return currentTokens;
    }
  } catch (e) {
    console.error('Failed to get tokens from storage:', e);
  }

  return null;
}

/**
 * Store tokens
 */
export function setTokens(tokens: TokenData): void {
  currentTokens = tokens;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(config.tokens.storageKey, JSON.stringify(tokens));
    } catch (e) {
      console.error('Failed to store tokens:', e);
    }
  }
}

/**
 * Clear tokens (logout)
 */
export function clearTokens(): void {
  currentTokens = null;

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(config.tokens.storageKey);
    } catch (e) {
      console.error('Failed to clear tokens:', e);
    }
  }
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(): boolean {
  const tokens = getTokens();
  if (!tokens || !tokens.expires_at) return true;

  return Date.now() >= tokens.expires_at - config.tokens.refreshBufferMs;
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<TokenData | null> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) return null;

  try {
    const response = await fetch(`${config.api.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    const newTokens: TokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    setTokens(newTokens);
    return newTokens;
  } catch (e) {
    console.error('Token refresh failed:', e);
    clearTokens();
    return null;
  }
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = getTokens();

  if (!tokens) return null;

  if (isTokenExpired()) {
    tokens = await refreshToken();
    if (!tokens) return null;
  }

  return tokens.access_token;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Make an API request with proper error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  includeToken = true
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (includeToken) {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        return { data: null, error: 'Not authenticated', success: false };
      }
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || data.message || `Request failed with status ${response.status}`,
        success: false,
      };
    }

    return { data, error: null, success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unexpected error occurred';
    console.error('API request failed:', message);
    return { data: null, error: message, success: false };
  }
}

// =============================================================================
// SPOTIFY API
// =============================================================================

export const spotifyApi = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<SpotifyProfile>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest<SpotifyProfile>(
      `/spotify/me?access_token=${tokens.access_token}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Get top artists
   */
  async getTopArtists(
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
    limit = 10
  ): Promise<ApiResponse<{ items: SpotifyArtist[] }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/top-artists?access_token=${tokens.access_token}&time_range=${timeRange}&limit=${limit}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Get top tracks
   */
  async getTopTracks(
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
    limit = 10
  ): Promise<ApiResponse<{ items: SpotifyTrack[] }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/top-tracks?access_token=${tokens.access_token}&time_range=${timeRange}&limit=${limit}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Get recently played tracks
   */
  async getRecentlyPlayed(limit = 50): Promise<ApiResponse<{ items: RecentlyPlayedItem[] }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/recently-played?access_token=${tokens.access_token}&limit=${limit}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Get top genres
   */
  async getTopGenres(
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
  ): Promise<ApiResponse<{ topGenres: GenreCount[] }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/top-genres?access_token=${tokens.access_token}&time_range=${timeRange}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Get audio features
   */
  async getAudioFeatures(
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
  ): Promise<ApiResponse<AudioFeatures>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/audio-features?access_token=${tokens.access_token}&time_range=${timeRange}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Create playlist
   */
  async createPlaylist(
    name: string,
    description?: string,
    trackUris?: string[]
  ): Promise<ApiResponse<{ success: boolean; playlist: SpotifyPlaylist }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/create-playlist?access_token=${tokens.access_token}`,
      {
        method: 'POST',
        body: JSON.stringify({ name, description, trackUris }),
      },
      false
    );
  },

  /**
   * Follow artist
   */
  async followArtist(artistId: string): Promise<ApiResponse<{ success: boolean }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/follow-artist?access_token=${tokens.access_token}`,
      {
        method: 'POST',
        body: JSON.stringify({ artistId }),
      },
      false
    );
  },

  /**
   * Search tracks
   */
  async searchTracks(query: string, limit = 5): Promise<ApiResponse<{ tracks: { items: SpotifyTrack[] } }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/search-tracks?access_token=${tokens.access_token}&q=${encodeURIComponent(query)}&limit=${limit}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Search artists
   */
  async searchArtists(query: string, limit = 5): Promise<ApiResponse<{ artists: { items: SpotifyArtist[] } }>> {
    const tokens = getTokens();
    if (!tokens) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    return apiRequest(
      `/spotify/search-artists?access_token=${tokens.access_token}&q=${encodeURIComponent(query)}&limit=${limit}`,
      { method: 'GET' },
      false
    );
  },
};

// =============================================================================
// LLM/AI API
// =============================================================================

// LLM Response Types
export interface MoodAnalysis {
  primaryMood: string;
  moodEmoji: string;
  description: string;
  moodScore: {
    happiness: number;
    energy: number;
    danceability: number;
  };
  topGenres: string[];
  recommendation: string;
}

export interface Recommendation {
  name: string;
  reason?: string;
  genre?: string;
  type?: 'artist' | 'track' | 'album';
}

export interface GenreAnalysis {
  dominantGenre: string;
  genreBreakdown: { genre: string; percentage: number }[];
  personality: string;
  recommendations: string[];
}

export interface ListeningHabits {
  peakHour: string;
  averageSessionLength: string;
  weekdayVsWeekend: string;
  insights: string[];
}

export interface MusicTherapy {
  currentState: string;
  recommendations: string[];
  moodBooster: string;
  calmingTrack: string;
}

export interface SpotifyWrapped {
  year: number;
  totalMinutes: number;
  topArtists: { name: string; rank: number; minutes: number }[];
  topTracks: { name: string; rank: number; plays: number }[];
  topGenres: { name: string; rank: number; percentage: number }[];
  audioPersonality: { danceability: number; energy: number; valence: number; tempo: number };
  listeningPersonality: string;
  yearSummary: string;
}

export interface PlaylistSuggestion {
  name: string;
  description: string;
  tracks: string[];
  mood: string;
}

export interface MusicalCompatibility {
  score: number;
  description: string;
  sharedGenres: string[];
  recommendations: string[];
}

export interface LyricalAnalysis {
  themes: string[];
  sentiment: string;
  emotionalRange: string;
  insights: string[];
}

export interface LLMPayload {
  topArtists: string[];
  topTracks: string[];
  topGenres: string[];
  audioProfile: {
    danceability: number | string;
    energy: number | string;
    valence: number | string;
    tempo?: number;
  };
  recentlyPlayed?: string[];
  listeningStats?: Record<string, number | string>;
}

export const llmApi = {
  /**
   * Get AI roast
   */
  async getRoast(payload: LLMPayload): Promise<ApiResponse<{ roast: string; fallback?: boolean }>> {
    return apiRequest('/llm/roast', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get personality analysis
   */
  async getPersonality(payload: LLMPayload): Promise<ApiResponse<{ personality: string; fallback?: boolean }>> {
    return apiRequest('/llm/personality', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get mood analysis
   */
  async getMoodAnalysis(payload: LLMPayload): Promise<ApiResponse<{ moodAnalysis: MoodAnalysis; fallback?: boolean }>> {
    return apiRequest('/llm/mood-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get recommendations
   */
  async getRecommendations(payload: LLMPayload): Promise<ApiResponse<{ recommendations: Recommendation[]; fallback?: boolean }>> {
    return apiRequest('/llm/recommendations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get genre analysis
   */
  async getGenreAnalysis(payload: LLMPayload): Promise<ApiResponse<{ genreAnalysis: GenreAnalysis }>> {
    return apiRequest('/llm/genre-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get listening habits
   */
  async getListeningHabits(payload: LLMPayload): Promise<ApiResponse<{ listeningHabits: ListeningHabits }>> {
    return apiRequest('/llm/listening-habits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get music therapy
   */
  async getMusicTherapy(payload: LLMPayload): Promise<ApiResponse<{ musicTherapy: MusicTherapy }>> {
    return apiRequest('/llm/music-therapy', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get wrapped story
   */
  async getWrappedStory(payload: LLMPayload): Promise<ApiResponse<{ story: string; fallback?: boolean }>> {
    return apiRequest('/llm/wrapped-story', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get Spotify Wrapped
   */
  async getSpotifyWrapped(payload: LLMPayload): Promise<ApiResponse<{ wrapped: SpotifyWrapped; fallback?: boolean }>> {
    return apiRequest('/llm/spotify-wrapped', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get playlist generator
   */
  async getPlaylistGenerator(payload: LLMPayload & { mood?: string; occasion?: string }): Promise<ApiResponse<{ playlistGenerator: PlaylistSuggestion }>> {
    return apiRequest('/llm/playlist-generator', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get musical compatibility
   */
  async getMusicalCompatibility(payload: LLMPayload): Promise<ApiResponse<{ compatibility: MusicalCompatibility }>> {
    return apiRequest('/llm/musical-compatibility', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get lyrical analysis
   */
  async getLyricalAnalysis(payload: LLMPayload): Promise<ApiResponse<{ lyricalAnalysis: LyricalAnalysis }>> {
    return apiRequest('/llm/lyrical-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },
};

// Export API services
const apiServices = { spotifyApi, llmApi };
export default apiServices;
