/**
 * LLM/AI features hook for SonicMirror
 * Handles all AI-powered analysis features with caching
 */

import { useState, useCallback } from 'react';
import { 
  llmApi, 
  LLMPayload,
  MoodAnalysis,
  Recommendation,
  GenreAnalysis,
  ListeningHabits,
  MusicTherapy,
  SpotifyWrapped,
  PlaylistSuggestion,
  MusicalCompatibility,
  LyricalAnalysis,
} from '../lib/api';
import { cache, cacheKeys, cacheTTL } from '../lib/cache';

export type AIFeature = 
  | 'roast'
  | 'personality'
  | 'mood'
  | 'recommendations'
  | 'genre'
  | 'habits'
  | 'therapy'
  | 'story'
  | 'wrapped'
  | 'playlist'
  | 'compatibility'
  | 'lyrical';

interface AIFeatureState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  isFromCache: boolean;
}

interface UseLLMFeaturesReturn {
  // State
  roast: AIFeatureState<string>;
  personality: AIFeatureState<string>;
  mood: AIFeatureState<MoodAnalysis>;
  recommendations: AIFeatureState<Recommendation[]>;
  genreAnalysis: AIFeatureState<GenreAnalysis>;
  listeningHabits: AIFeatureState<ListeningHabits>;
  musicTherapy: AIFeatureState<MusicTherapy>;
  wrappedStory: AIFeatureState<string>;
  spotifyWrapped: AIFeatureState<SpotifyWrapped>;
  playlistGenerator: AIFeatureState<PlaylistSuggestion>;
  compatibility: AIFeatureState<MusicalCompatibility>;
  lyricalAnalysis: AIFeatureState<LyricalAnalysis>;
  
  // Actions
  fetchRoast: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchPersonality: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchMood: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchRecommendations: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchGenreAnalysis: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchListeningHabits: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchMusicTherapy: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchWrappedStory: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchSpotifyWrapped: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchPlaylistGenerator: (payload: LLMPayload & { mood?: string; occasion?: string }, skipCache?: boolean) => Promise<void>;
  fetchCompatibility: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  fetchLyricalAnalysis: (payload: LLMPayload, skipCache?: boolean) => Promise<void>;
  
  // Utilities
  resetAll: () => void;
  clearCache: () => void;
  isAnyLoading: boolean;
}

const initialState = <T>(): AIFeatureState<T> => ({
  data: null,
  isLoading: false,
  error: null,
  isFallback: false,
  isFromCache: false,
});

/**
 * Generate a cache key based on payload
 */
function generatePayloadHash(payload: LLMPayload): string {
  const artists = payload.topArtists?.slice(0, 3).map((a) => typeof a === 'string' ? a : (a as { name: string }).name).join(',') || '';
  const tracks = payload.topTracks?.slice(0, 3).map((t) => typeof t === 'string' ? t : (t as { name: string }).name).join(',') || '';
  return btoa(artists + tracks).slice(0, 16);
}

/**
 * Hook for managing all AI/LLM features with caching
 */
export function useLLMFeatures(): UseLLMFeaturesReturn {
  // Individual feature states
  const [roast, setRoast] = useState<AIFeatureState<string>>(initialState());
  const [personality, setPersonality] = useState<AIFeatureState<string>>(initialState());
  const [mood, setMood] = useState<AIFeatureState<MoodAnalysis>>(initialState());
  const [recommendations, setRecommendations] = useState<AIFeatureState<Recommendation[]>>(initialState());
  const [genreAnalysis, setGenreAnalysis] = useState<AIFeatureState<GenreAnalysis>>(initialState());
  const [listeningHabits, setListeningHabits] = useState<AIFeatureState<ListeningHabits>>(initialState());
  const [musicTherapy, setMusicTherapy] = useState<AIFeatureState<MusicTherapy>>(initialState());
  const [wrappedStory, setWrappedStory] = useState<AIFeatureState<string>>(initialState());
  const [spotifyWrapped, setSpotifyWrapped] = useState<AIFeatureState<SpotifyWrapped>>(initialState());
  const [playlistGenerator, setPlaylistGenerator] = useState<AIFeatureState<PlaylistSuggestion>>(initialState());
  const [compatibility, setCompatibility] = useState<AIFeatureState<MusicalCompatibility>>(initialState());
  const [lyricalAnalysis, setLyricalAnalysis] = useState<AIFeatureState<LyricalAnalysis>>(initialState());

  /**
   * Clear all cached LLM data
   */
  const clearCache = useCallback(() => {
    cache.clearPattern('llm:');
  }, []);

  // Generic fetch handler factory (not wrapped in useCallback)
  // Using ApiResponse type from api.ts for compatibility
  const createFetchHandler = <T, P extends LLMPayload>(
    setter: React.Dispatch<React.SetStateAction<AIFeatureState<T>>>,
    apiCall: (payload: P) => Promise<{ data: { [key: string]: unknown } | null; error: string | null; success?: boolean }>,
    dataKey: string,
    cacheKeyFn: (payloadHash: string) => string
  ) => {
    return async (payload: P, skipCache = false) => {
      const payloadHash = generatePayloadHash(payload);
      const cacheKey = cacheKeyFn(payloadHash);

      // Check cache first if not skipping
      if (!skipCache) {
        const cached = cache.get<T>(cacheKey);
        if (cached) {
          setter({
            data: cached,
            isLoading: false,
            error: null,
            isFallback: false,
            isFromCache: true,
          });
          return;
        }
      }

      setter({ data: null, isLoading: true, error: null, isFallback: false, isFromCache: false });

      try {
        const result = await apiCall(payload);

        if (result.error) {
          setter({
            data: null,
            isLoading: false,
            error: result.error,
            isFallback: false,
            isFromCache: false,
          });
        } else {
          const resultData = (result.data?.[dataKey] ?? result.data) as T;
          // Cache the result for 30 minutes
          cache.set(cacheKey, resultData, cacheTTL.long);
          setter({
            data: resultData,
            isLoading: false,
            error: null,
            isFallback: result.data?.fallback === true,
            isFromCache: false,
          });
        }
      } catch (e) {
        setter({
          data: null,
          isLoading: false,
          error: e instanceof Error ? e.message : 'An error occurred',
          isFallback: false,
          isFromCache: false,
        });
      }
    };
  };

  // Feature fetchers with cache keys - using useCallback with inline functions
  const fetchRoast = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<string, LLMPayload>(setRoast, llmApi.getRoast as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'roast', (h) => cacheKeys.roast(h))(payload, skipCache),
    []
  );

  const fetchPersonality = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<string, LLMPayload>(setPersonality, llmApi.getPersonality as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'personality', (h) => cacheKeys.personality(h))(payload, skipCache),
    []
  );

  const fetchMood = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<MoodAnalysis, LLMPayload>(setMood, llmApi.getMoodAnalysis as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'moodAnalysis', (h) => cacheKeys.mood(h))(payload, skipCache),
    []
  );

  const fetchRecommendations = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<Recommendation[], LLMPayload>(setRecommendations, llmApi.getRecommendations as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'recommendations', (h) => cacheKeys.recommendations(h))(payload, skipCache),
    []
  );

  const fetchGenreAnalysis = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<GenreAnalysis, LLMPayload>(setGenreAnalysis, llmApi.getGenreAnalysis as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'genreAnalysis', (h) => cacheKeys.genreAnalysis(h))(payload, skipCache),
    []
  );

  const fetchListeningHabits = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<ListeningHabits, LLMPayload>(setListeningHabits, llmApi.getListeningHabits as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'listeningHabits', (h) => cacheKeys.listeningHabits(h))(payload, skipCache),
    []
  );

  const fetchMusicTherapy = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<MusicTherapy, LLMPayload>(setMusicTherapy, llmApi.getMusicTherapy as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'musicTherapy', (h) => cacheKeys.musicTherapy(h))(payload, skipCache),
    []
  );

  const fetchWrappedStory = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<string, LLMPayload>(setWrappedStory, llmApi.getWrappedStory as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'story', (h) => cacheKeys.wrappedStory(h))(payload, skipCache),
    []
  );

  const fetchSpotifyWrapped = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<SpotifyWrapped, LLMPayload>(setSpotifyWrapped, llmApi.getSpotifyWrapped as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'wrapped', (h) => cacheKeys.spotifyWrapped(h))(payload, skipCache),
    []
  );

  const fetchPlaylistGenerator = useCallback(
    (payload: LLMPayload & { mood?: string; occasion?: string }, skipCache = false) =>
      createFetchHandler<PlaylistSuggestion, LLMPayload & { mood?: string; occasion?: string }>(setPlaylistGenerator, llmApi.getPlaylistGenerator as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'playlistGenerator', (h) => cacheKeys.playlistGenerator(h))(payload, skipCache),
    []
  );

  const fetchCompatibility = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<MusicalCompatibility, LLMPayload>(setCompatibility, llmApi.getMusicalCompatibility as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'compatibility', (h) => cacheKeys.compatibility(h))(payload, skipCache),
    []
  );

  const fetchLyricalAnalysis = useCallback(
    (payload: LLMPayload, skipCache = false) =>
      createFetchHandler<LyricalAnalysis, LLMPayload>(setLyricalAnalysis, llmApi.getLyricalAnalysis as (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>, 'lyricalAnalysis', (h) => cacheKeys.lyricalAnalysis(h))(payload, skipCache),
    []
  );

  // Reset all states
  const resetAll = useCallback(() => {
    setRoast(initialState());
    setPersonality(initialState());
    setMood(initialState());
    setRecommendations(initialState());
    setGenreAnalysis(initialState());
    setListeningHabits(initialState());
    setMusicTherapy(initialState());
    setWrappedStory(initialState());
    setSpotifyWrapped(initialState());
    setPlaylistGenerator(initialState());
    setCompatibility(initialState());
    setLyricalAnalysis(initialState());
  }, []);

  // Check if any feature is loading
  const isAnyLoading = [
    roast,
    personality,
    mood,
    recommendations,
    genreAnalysis,
    listeningHabits,
    musicTherapy,
    wrappedStory,
    spotifyWrapped,
    playlistGenerator,
    compatibility,
    lyricalAnalysis,
  ].some(state => state.isLoading);

  return {
    // State
    roast,
    personality,
    mood,
    recommendations,
    genreAnalysis,
    listeningHabits,
    musicTherapy,
    wrappedStory,
    spotifyWrapped,
    playlistGenerator,
    compatibility,
    lyricalAnalysis,

    // Actions
    fetchRoast,
    fetchPersonality,
    fetchMood,
    fetchRecommendations,
    fetchGenreAnalysis,
    fetchListeningHabits,
    fetchMusicTherapy,
    fetchWrappedStory,
    fetchSpotifyWrapped,
    fetchPlaylistGenerator,
    fetchCompatibility,
    fetchLyricalAnalysis,

    // Utilities
    resetAll,
    clearCache,
    isAnyLoading,
  };
}

/**
 * Simplified hook for single feature with caching
 */
export function useSingleFeature<T>(
  featureName: AIFeature,
  apiCall: (payload: LLMPayload) => Promise<{ data: { [key: string]: unknown } | null; error: string | null }>,
  dataKey: string,
  getCacheKey?: (payloadHash: string) => string
) {
  const [state, setState] = useState<AIFeatureState<T>>(initialState());

  const fetch = useCallback(async (payload: LLMPayload, skipCache = false) => {
    // Generate cache key if caching is enabled
    if (getCacheKey && !skipCache) {
      const artists = payload.topArtists?.slice(0, 3).map((a) => typeof a === 'string' ? a : (a as { name: string }).name).join(',') || '';
      const tracks = payload.topTracks?.slice(0, 3).map((t) => typeof t === 'string' ? t : (t as { name: string }).name).join(',') || '';
      const payloadHash = btoa(artists + tracks).slice(0, 16);
      const cacheKey = getCacheKey(payloadHash);
      
      const cached = cache.get<T>(cacheKey);
      if (cached) {
        setState({
          data: cached,
          isLoading: false,
          error: null,
          isFallback: false,
          isFromCache: true,
        });
        return;
      }
    }

    setState({ data: null, isLoading: true, error: null, isFallback: false, isFromCache: false });

    try {
      const result = await apiCall(payload);

      if (result.error) {
        setState({
          data: null,
          isLoading: false,
          error: result.error,
          isFallback: false,
          isFromCache: false,
        });
      } else {
        const resultData = (result.data?.[dataKey] ?? result.data) as T;
        
        // Cache the result if caching is enabled
        if (getCacheKey) {
          const artists = payload.topArtists?.slice(0, 3).map((a) => typeof a === 'string' ? a : (a as { name: string }).name).join(',') || '';
          const tracks = payload.topTracks?.slice(0, 3).map((t) => typeof t === 'string' ? t : (t as { name: string }).name).join(',') || '';
          const payloadHash = btoa(artists + tracks).slice(0, 16);
          cache.set(getCacheKey(payloadHash), resultData, cacheTTL.long);
        }
        
        setState({
          data: resultData,
          isLoading: false,
          error: null,
          isFallback: result.data?.fallback === true,
          isFromCache: false,
        });
      }
    } catch (e) {
      setState({
        data: null,
        isLoading: false,
        error: e instanceof Error ? e.message : 'An error occurred',
        isFallback: false,
        isFromCache: false,
      });
    }
  }, [apiCall, dataKey, getCacheKey]);

  const reset = useCallback(() => {
    setState(initialState());
  }, []);

  return { ...state, fetch, reset };
}

export default useLLMFeatures;
