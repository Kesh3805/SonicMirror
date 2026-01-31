/**
 * Client-side cache for Spotify data
 * Reduces API calls and improves perceived performance
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class ClientCache {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private storage: Storage | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.storage = window.sessionStorage;
      this.loadFromStorage();
    }
  }

  /**
   * Load cache from sessionStorage on init
   */
  private loadFromStorage(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem('sonicmirror_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Only restore non-expired items
        Object.entries(parsed).forEach(([key, item]) => {
          const cacheItem = item as CacheItem<unknown>;
          if (cacheItem.expiresAt > now) {
            this.cache.set(key, cacheItem);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Save cache to sessionStorage
   */
  private saveToStorage(): void {
    if (!this.storage) return;

    try {
      const cacheObject: Record<string, CacheItem<unknown>> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      this.storage.setItem('sonicmirror_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  /**
   * Get an item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Set an item in cache
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    
    this.cache.set(key, item);
    this.saveToStorage();
  }

  /**
   * Remove an item from cache
   */
  remove(key: string): void {
    this.cache.delete(key);
    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    if (this.storage) {
      this.storage.removeItem('sonicmirror_cache');
    }
  }

  /**
   * Clear cache for a specific pattern
   */
  clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new ClientCache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  profile: () => 'spotify:profile',
  topArtists: (timeRange: string) => `spotify:top-artists:${timeRange}`,
  topTracks: (timeRange: string) => `spotify:top-tracks:${timeRange}`,
  recentlyPlayed: () => 'spotify:recently-played',
  audioFeatures: () => 'spotify:audio-features',
  playlists: () => 'spotify:playlists',
  // LLM cache keys with payload hash for unique responses
  roast: (payloadHash: string) => `llm:roast:${payloadHash}`,
  personality: (payloadHash: string) => `llm:personality:${payloadHash}`,
  mood: (payloadHash: string) => `llm:mood:${payloadHash}`,
  recommendations: (payloadHash: string) => `llm:recommendations:${payloadHash}`,
  genreAnalysis: (payloadHash: string) => `llm:genre:${payloadHash}`,
  listeningHabits: (payloadHash: string) => `llm:habits:${payloadHash}`,
  musicTherapy: (payloadHash: string) => `llm:therapy:${payloadHash}`,
  wrappedStory: (payloadHash: string) => `llm:story:${payloadHash}`,
  spotifyWrapped: (payloadHash: string) => `llm:wrapped:${payloadHash}`,
  playlistGenerator: (payloadHash: string) => `llm:playlist:${payloadHash}`,
  compatibility: (payloadHash: string) => `llm:compatibility:${payloadHash}`,
  lyricalAnalysis: (payloadHash: string) => `llm:lyrical:${payloadHash}`,
};

/**
 * Cache TTL presets (in milliseconds)
 */
export const cacheTTL = {
  short: 60 * 1000,           // 1 minute
  medium: 5 * 60 * 1000,      // 5 minutes
  long: 15 * 60 * 1000,       // 15 minutes
  hour: 60 * 60 * 1000,       // 1 hour
  session: 24 * 60 * 60 * 1000, // 24 hours (session duration)
};

/**
 * Wrapper function for cached API calls
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL } = options;
  
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  cache.set(key, data, ttl);
  
  return data;
}

/**
 * Hook-friendly cached fetch that returns loading state
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  _options: CacheOptions = {}
): { data: T | null; isFromCache: boolean } {
  // Note: options reserved for future use (TTL override, force refresh, etc.)
  void _options;
  void fetchFn;
  const cached = cache.get<T>(key);
  
  return {
    data: cached,
    isFromCache: cached !== null,
  };
}

export default cache;
