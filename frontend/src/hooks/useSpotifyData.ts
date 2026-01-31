/**
 * Spotify data hook for SonicMirror
 * Fetches and manages all Spotify-related data with caching
 */

import { useState, useEffect, useCallback } from 'react';
import {
  spotifyApi,
  SpotifyArtist,
  SpotifyTrack,
  AudioFeatures,
  GenreCount,
  RecentlyPlayedItem,
} from '../lib/api';
import { cache, cacheKeys, cacheTTL } from '../lib/cache';

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface SpotifyDataState {
  topArtists: SpotifyArtist[];
  topTracks: SpotifyTrack[];
  recentlyPlayed: SpotifyTrack[];
  topGenres: GenreCount[];
  audioFeatures: AudioFeatures | null;
  isLoading: boolean;
  isFromCache: boolean;
  errors: Record<string, string | null>;
}

interface UseSpotifyDataOptions {
  timeRange?: TimeRange;
  autoFetch?: boolean;
  useCache?: boolean;
}

interface UseSpotifyDataReturn extends SpotifyDataState {
  refetch: (skipCache?: boolean) => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  timeRange: TimeRange;
  clearCache: () => void;
}

/**
 * Hook for fetching and managing Spotify data with caching
 */
export function useSpotifyData(options: UseSpotifyDataOptions = {}): UseSpotifyDataReturn {
  const { 
    timeRange: initialTimeRange = 'medium_term',
    autoFetch = true,
    useCache = true,
  } = options;

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [state, setState] = useState<SpotifyDataState>({
    topArtists: [],
    topTracks: [],
    recentlyPlayed: [],
    topGenres: [],
    audioFeatures: null,
    isLoading: true,
    isFromCache: false,
    errors: {},
  });

  /**
   * Clear all cached Spotify data
   */
  const clearCache = useCallback(() => {
    cache.clearPattern('spotify:');
  }, []);

  /**
   * Fetch all Spotify data with optional caching
   */
  const fetchData = useCallback(async (skipCache = false) => {
    setState(prev => ({ ...prev, isLoading: true, errors: {} }));

    const errors: Record<string, string | null> = {};

    // Try to load from cache first if enabled
    if (useCache && !skipCache) {
      const cachedArtists = cache.get<SpotifyArtist[]>(cacheKeys.topArtists(timeRange));
      const cachedTracks = cache.get<SpotifyTrack[]>(cacheKeys.topTracks(timeRange));
      const cachedRecent = cache.get<SpotifyTrack[]>(cacheKeys.recentlyPlayed());
      const cachedGenres = cache.get<GenreCount[]>(cacheKeys.topArtists(timeRange) + ':genres');
      const cachedFeatures = cache.get<AudioFeatures>(cacheKeys.audioFeatures());

      if (cachedArtists && cachedTracks && cachedRecent) {
        setState({
          topArtists: cachedArtists,
          topTracks: cachedTracks,
          recentlyPlayed: cachedRecent,
          topGenres: cachedGenres || [],
          audioFeatures: cachedFeatures || null,
          isLoading: false,
          isFromCache: true,
          errors: {},
        });
        return;
      }
    }

    // Fetch all data in parallel
    const [
      artistsRes,
      tracksRes,
      recentRes,
      genresRes,
      featuresRes,
    ] = await Promise.all([
      spotifyApi.getTopArtists(timeRange, 10),
      spotifyApi.getTopTracks(timeRange, 10),
      spotifyApi.getRecentlyPlayed(50),
      spotifyApi.getTopGenres(timeRange),
      spotifyApi.getAudioFeatures(timeRange),
    ]);

    // Handle errors
    if (artistsRes.error) errors.topArtists = artistsRes.error;
    if (tracksRes.error) errors.topTracks = tracksRes.error;
    if (recentRes.error) errors.recentlyPlayed = recentRes.error;
    if (genresRes.error) errors.topGenres = genresRes.error;
    if (featuresRes.error) errors.audioFeatures = featuresRes.error;

    // Cache successful responses
    if (useCache) {
      if (artistsRes.data?.items) {
        cache.set(cacheKeys.topArtists(timeRange), artistsRes.data.items, cacheTTL.medium);
      }
      if (tracksRes.data?.items) {
        cache.set(cacheKeys.topTracks(timeRange), tracksRes.data.items, cacheTTL.medium);
      }
      if (recentRes.data?.items) {
        const recentTracks = recentRes.data.items.map((item: RecentlyPlayedItem) => item.track);
        cache.set(cacheKeys.recentlyPlayed(), recentTracks, cacheTTL.short);
      }
      if (genresRes.data?.topGenres) {
        cache.set(cacheKeys.topArtists(timeRange) + ':genres', genresRes.data.topGenres, cacheTTL.medium);
      }
      if (featuresRes.data) {
        cache.set(cacheKeys.audioFeatures(), featuresRes.data, cacheTTL.medium);
      }
    }

    setState({
      topArtists: artistsRes.data?.items || [],
      topTracks: tracksRes.data?.items || [],
      recentlyPlayed: recentRes.data?.items?.map((item: RecentlyPlayedItem) => item.track) || [],
      topGenres: genresRes.data?.topGenres || [],
      audioFeatures: featuresRes.data || null,
      isLoading: false,
      isFromCache: false,
      errors,
    });
  }, [timeRange, useCache]);

  // Auto-fetch on mount and when timeRange changes
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    ...state,
    refetch: fetchData,
    setTimeRange,
    timeRange,
    clearCache,
  };
}

/**
 * Hook specifically for fetching top artists with caching
 */
export function useTopArtists(timeRange: TimeRange = 'medium_term', limit = 10) {
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      
      // Check cache first
      const cacheKey = cacheKeys.topArtists(timeRange);
      const cached = cache.get<SpotifyArtist[]>(cacheKey);
      if (cached) {
        setArtists(cached.slice(0, limit));
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }

      const { data, error } = await spotifyApi.getTopArtists(timeRange, limit);
      if (data?.items) {
        cache.set(cacheKey, data.items, cacheTTL.medium);
        setArtists(data.items);
      } else {
        setArtists([]);
      }
      setError(error);
      setIsFromCache(false);
      setIsLoading(false);
    }
    fetch();
  }, [timeRange, limit]);

  return { artists, isLoading, error, isFromCache };
}

/**
 * Hook specifically for fetching top tracks with caching
 */
export function useTopTracks(timeRange: TimeRange = 'medium_term', limit = 10) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      
      // Check cache first
      const cacheKey = cacheKeys.topTracks(timeRange);
      const cached = cache.get<SpotifyTrack[]>(cacheKey);
      if (cached) {
        setTracks(cached.slice(0, limit));
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }

      const { data, error } = await spotifyApi.getTopTracks(timeRange, limit);
      if (data?.items) {
        cache.set(cacheKey, data.items, cacheTTL.medium);
        setTracks(data.items);
      } else {
        setTracks([]);
      }
      setError(error);
      setIsFromCache(false);
      setIsLoading(false);
    }
    fetch();
  }, [timeRange, limit]);

  return { tracks, isLoading, error, isFromCache };
}

/**
 * Hook for audio features with caching
 */
export function useAudioFeatures(timeRange: TimeRange = 'medium_term') {
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      
      // Check cache first
      const cacheKey = cacheKeys.audioFeatures();
      const cached = cache.get<AudioFeatures>(cacheKey);
      if (cached) {
        setFeatures(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }

      const { data, error } = await spotifyApi.getAudioFeatures(timeRange);
      if (data) {
        cache.set(cacheKey, data, cacheTTL.medium);
        setFeatures(data);
      } else {
        setFeatures(null);
      }
      setError(error);
      setIsFromCache(false);
      setIsLoading(false);
    }
    fetch();
  }, [timeRange]);

  return { features, isLoading, error, isFromCache };
}

export default useSpotifyData;
