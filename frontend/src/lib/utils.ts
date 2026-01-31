import { SpotifyArtist, SpotifyTrack, GenreCount, AudioFeatures, LLMPayload } from '@/types';

/**
 * Extract token from URL parameters
 */
export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('access_token');
}

/**
 * Store token in localStorage
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('spotify_access_token', token);
  localStorage.setItem('spotify_token_timestamp', Date.now().toString());
}

/**
 * Get stored token from localStorage
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('spotify_access_token');
}

/**
 * Check if stored token is likely still valid (rough check)
 */
export function isTokenValid(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('spotify_access_token');
  const timestamp = localStorage.getItem('spotify_token_timestamp');
  
  if (!token || !timestamp) return false;
  
  // Tokens typically expire in 1 hour (3600000 ms)
  const tokenAge = Date.now() - parseInt(timestamp);
  const TOKEN_LIFETIME = 55 * 60 * 1000; // 55 minutes to be safe
  
  return tokenAge < TOKEN_LIFETIME;
}

/**
 * Clear stored token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_token_timestamp');
}

/**
 * Format duration from milliseconds to MM:SS
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format large numbers (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Get image URL from Spotify artist
 */
export function getArtistImageUrl(artist: SpotifyArtist, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!artist.images || artist.images.length === 0) {
    return '/placeholder-artist.png';
  }
  const sizeIndex = size === 'large' ? 0 : size === 'medium' ? 1 : 2;
  return artist.images[Math.min(sizeIndex, artist.images.length - 1)]?.url || artist.images[0].url;
}

/**
 * Get image URL from Spotify track
 */
export function getTrackImageUrl(track: SpotifyTrack, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!track.album?.images || track.album.images.length === 0) {
    return '/placeholder-album.png';
  }
  const sizeIndex = size === 'large' ? 0 : size === 'medium' ? 1 : 2;
  return track.album.images[Math.min(sizeIndex, track.album.images.length - 1)]?.url || track.album.images[0].url;
}

/**
 * Calculate mainstream score from artist popularity
 */
export function calculateMainstreamScore(artists: SpotifyArtist[]): number | null {
  if (!artists || artists.length === 0) return null;
  
  const popularities = artists
    .filter(a => typeof a.popularity === 'number')
    .map(a => a.popularity as number);
  
  if (popularities.length === 0) return null;
  
  return Math.round(popularities.reduce((sum, p) => sum + p, 0) / popularities.length);
}

/**
 * Get mainstream badge text from score
 */
export function getMainstreamBadge(score: number | null): string {
  if (score === null) return 'Unknown';
  if (score >= 80) return 'Mainstream';
  if (score >= 60) return 'Balanced';
  if (score >= 40) return 'Indie';
  return 'Underground';
}

/**
 * Create LLM payload from dashboard data
 */
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
      danceability: audioFeatures?.avg_danceability ?? 0.5,
      energy: audioFeatures?.avg_energy ?? 0.5,
      valence: audioFeatures?.avg_valence ?? 0.5,
      tempo: audioFeatures?.avg_tempo ?? 120,
      acousticness: audioFeatures?.avg_acousticness ?? 0.5,
      instrumentalness: audioFeatures?.avg_instrumentalness ?? 0.5,
    },
    listeningStats: {
      totalTracks: tracks.length,
      uniqueArtists: artists.length,
      uniqueGenres: genres.length,
    },
  };
}

/**
 * Debounce function for limiting API calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Extract genres from artists
 */
export function extractGenresFromArtists(artists: SpotifyArtist[]): GenreCount[] {
  const genreMap = new Map<string, number>();
  
  artists.forEach(artist => {
    artist.genres?.forEach(genre => {
      genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    });
  });
  
  return Array.from(genreMap.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate audio features average from tracks
 */
export function calculateAudioFeaturesAverage(features: Array<{
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
}>): AudioFeatures | null {
  if (!features || features.length === 0) return null;
  
  const sum = features.reduce(
    (acc, f) => ({
      danceability: acc.danceability + f.danceability,
      energy: acc.energy + f.energy,
      valence: acc.valence + f.valence,
      tempo: acc.tempo + f.tempo,
      speechiness: acc.speechiness + f.speechiness,
      acousticness: acc.acousticness + f.acousticness,
      instrumentalness: acc.instrumentalness + f.instrumentalness,
      liveness: acc.liveness + f.liveness,
    }),
    {
      danceability: 0,
      energy: 0,
      valence: 0,
      tempo: 0,
      speechiness: 0,
      acousticness: 0,
      instrumentalness: 0,
      liveness: 0,
    }
  );
  
  const count = features.length;
  return {
    avg_danceability: sum.danceability / count,
    avg_energy: sum.energy / count,
    avg_valence: sum.valence / count,
    avg_tempo: sum.tempo / count,
    avg_speechiness: sum.speechiness / count,
    avg_acousticness: sum.acousticness / count,
    avg_instrumentalness: sum.instrumentalness / count,
    avg_liveness: sum.liveness / count,
  };
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate share text for social media
 */
export function generateShareText(
  displayName: string,
  topArtist: string,
  topTrack: string,
  mainstreamBadge: string
): string {
  return `Check out my Spotify stats!
Name: ${displayName}
Top Artist: ${topArtist}
Top Track: ${topTrack}
Taste: ${mainstreamBadge}
#SonicMirror`;
}

/**
 * Get social share URLs
 */
export function getSocialShareUrls(text: string) {
  const encodedText = encodeURIComponent(text);
  
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    tumblr: `https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=spotify,sonicmirror&content=${encodedText}`,
  };
}

/**
 * Class name utility (simple cn implementation)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
