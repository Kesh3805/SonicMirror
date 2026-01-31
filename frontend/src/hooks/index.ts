/**
 * Hooks index - exports all custom hooks
 */

export { useAuth, useRequireAuth } from './useAuth';
export { 
  useSpotifyData, 
  useTopArtists, 
  useTopTracks, 
  useAudioFeatures,
  type TimeRange 
} from './useSpotifyData';
export { 
  useLLMFeatures, 
  useSingleFeature,
  type AIFeature 
} from './useLLMFeatures';
