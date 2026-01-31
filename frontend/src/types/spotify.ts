// Spotify API Types
export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images: SpotifyImage[];
  product?: string;
  country?: string;
  followers?: {
    total: number;
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres?: string[];
  popularity?: number;
  followers?: {
    total: number;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date?: string;
  total_tracks?: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  album: SpotifyAlbum;
  artists: { id: string; name: string }[];
  duration_ms?: number;
  popularity?: number;
  preview_url?: string;
  explicit?: boolean;
}

export interface SpotifyPlaylistTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images: SpotifyImage[];
  tracks: {
    total: number;
    items?: SpotifyPlaylistTrack[];
  };
  owner: {
    id: string;
    display_name: string;
  };
  public?: boolean;
}

export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

// Audio Features Types
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

export interface TrackAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  mode: number;
  key: number;
  time_signature: number;
}

// Genre Types
export interface GenreCount {
  genre: string;
  count: number;
}

// Time Range Types
export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface TimeRangeOption {
  label: string;
  value: TimeRange;
  description: string;
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: 'Last 4 weeks', value: 'short_term', description: 'Short term' },
  { label: 'Last 6 months', value: 'medium_term', description: 'Medium term' },
  { label: 'All time', value: 'long_term', description: 'Long term' },
];

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  fallback?: boolean;
}

export interface TopItemsResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface RecentlyPlayedResponse {
  items: RecentlyPlayedItem[];
  cursors?: {
    after: string;
    before: string;
  };
}

// LLM Feature Types
export interface RoastResponse {
  roast: string;
  fallback: boolean;
  error?: string;
}

export interface PersonalityResponse {
  personality: string;
  fallback: boolean;
  error?: string;
}

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

export interface MoodResponse {
  mood: MoodAnalysis;
  fallback: boolean;
  error?: string;
}

export interface RecommendationsResponse {
  recommendations: string[] | RecommendationItem[];
  fallback: boolean;
  error?: string;
}

export interface RecommendationItem {
  name: string;
  reason?: string;
  genre?: string;
}

export interface StoryResponse {
  story: string;
  fallback: boolean;
  error?: string;
}

export interface WrappedArtist {
  name: string;
  rank: number;
  minutes: number;
}

export interface WrappedTrack {
  name: string;
  rank: number;
  plays: number;
}

export interface WrappedGenre {
  name: string;
  rank: number;
  percentage: number;
}

export interface WrappedData {
  year: number;
  totalMinutes: number;
  topArtists: WrappedArtist[];
  topTracks: WrappedTrack[];
  topGenres: WrappedGenre[];
  audioPersonality: {
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
  };
  listeningPersonality: string;
  yearSummary: string;
  topMonth: string;
  mostListenedDay: string;
  favoriteTime: string;
}

export interface WrappedResponse {
  wrapped: WrappedData;
  fallback: boolean;
  error?: string;
}

// Dashboard State Types
export interface DashboardState {
  profile: SpotifyUser | null;
  topArtists: SpotifyArtist[];
  topTracks: SpotifyTrack[];
  recentlyPlayed: RecentlyPlayedItem[];
  topGenres: GenreCount[];
  audioFeatures: AudioFeatures | null;
  loading: boolean;
  error: string;
}

// LLM Payload Type
export interface LLMPayload {
  topArtists: string[];
  topTracks: string[];
  topGenres: string[];
  audioProfile: {
    danceability: number;
    energy: number;
    valence: number;
    tempo?: number;
    acousticness?: number;
    instrumentalness?: number;
  };
  recentlyPlayed?: string[];
  listeningStats?: {
    totalTracks: number;
    uniqueArtists: number;
    uniqueGenres: number;
  };
}

// Auth Types
export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  isLoading: boolean;
  user: SpotifyUser | null;
}

// Error Types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// UI State Types
export interface LoadingState {
  roast: boolean;
  personality: boolean;
  mood: boolean;
  recommendations: boolean;
  story: boolean;
  wrapped: boolean;
}

export interface ErrorState {
  roast: string;
  personality: string;
  mood: string;
  recommendations: string;
  story: string;
  wrapped: string;
}

// Utility function to create LLM payload from dashboard data
export function createLLMPayload(
  artists: SpotifyArtist[],
  tracks: SpotifyTrack[],
  genres: GenreCount[],
  audioFeatures: AudioFeatures | null
): LLMPayload {
  return {
    topArtists: artists.slice(0, 10).map(a => a.name),
    topTracks: tracks.slice(0, 10).map(t => `${t.name} by ${t.artists[0]?.name || 'Unknown'}`),
    topGenres: genres.slice(0, 10).map(g => g.genre),
    audioProfile: {
      danceability: audioFeatures?.avg_danceability || 0.5,
      energy: audioFeatures?.avg_energy || 0.5,
      valence: audioFeatures?.avg_valence || 0.5,
      tempo: audioFeatures?.avg_tempo || 120,
      acousticness: audioFeatures?.avg_acousticness || 0.5,
      instrumentalness: audioFeatures?.avg_instrumentalness || 0.5,
    },
    listeningStats: {
      totalTracks: tracks.length,
      uniqueArtists: artists.length,
      uniqueGenres: genres.length,
    },
  };
}

// Helper to get artist image URL
export function getArtistImage(artist: SpotifyArtist, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!artist.images || artist.images.length === 0) {
    return '/placeholder-artist.png';
  }
  
  const sizeIndex = size === 'large' ? 0 : size === 'medium' ? 1 : 2;
  return artist.images[Math.min(sizeIndex, artist.images.length - 1)]?.url || artist.images[0].url;
}

// Helper to get track image URL
export function getTrackImage(track: SpotifyTrack, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!track.album?.images || track.album.images.length === 0) {
    return '/placeholder-album.png';
  }
  
  const sizeIndex = size === 'large' ? 0 : size === 'medium' ? 1 : 2;
  return track.album.images[Math.min(sizeIndex, track.album.images.length - 1)]?.url || track.album.images[0].url;
}

// Helper to format duration
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper to format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
