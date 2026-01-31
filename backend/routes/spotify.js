const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotifyService');
const { 
  asyncHandler, 
  validateAccessToken, 
  ErrorTypes,
  spotifyRateLimit,
} = require('../middleware');

// Apply rate limiting to all Spotify routes
router.use(spotifyRateLimit());

/**
 * Helper to get access token from request
 */
function getAccessToken(req) {
  return (
    req.accessToken ||
    req.query.access_token ||
    req.headers['authorization']?.replace('Bearer ', '')
  );
}

// =============================================================================
// USER PROFILE ROUTES
// =============================================================================

/**
 * GET /spotify/me
 * Get current user's profile
 */
router.get('/me', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const profile = await spotifyService.getUserProfile(accessToken);
  res.json(profile);
}));

// =============================================================================
// TOP CONTENT ROUTES
// =============================================================================

/**
 * GET /spotify/top-artists
 * Get user's top artists
 */
router.get('/top-artists', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const data = await spotifyService.getTopArtists(accessToken, {
    limit: parseInt(req.query.limit) || 10,
    timeRange: req.query.time_range || 'medium_term',
  });
  
  res.json(data);
}));

/**
 * GET /spotify/top-tracks
 * Get user's top tracks
 */
router.get('/top-tracks', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const data = await spotifyService.getTopTracks(accessToken, {
    limit: parseInt(req.query.limit) || 10,
    timeRange: req.query.time_range || 'medium_term',
  });
  
  res.json(data);
}));

/**
 * GET /spotify/recently-played
 * Get user's recently played tracks
 */
router.get('/recently-played', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const data = await spotifyService.getRecentlyPlayed(
    accessToken, 
    parseInt(req.query.limit) || 50
  );
  
  res.json(data);
}));

/**
 * GET /spotify/top-genres
 * Get user's top genres (derived from top artists)
 */
router.get('/top-genres', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const artistsData = await spotifyService.getTopArtists(accessToken, {
    limit: 20,
    timeRange: req.query.time_range || 'medium_term',
  });

  const topGenres = spotifyService.extractTopGenres(artistsData.items);
  res.json({ topGenres });
}));

// =============================================================================
// AUDIO FEATURES ROUTES
// =============================================================================

/**
 * GET /spotify/audio-features
 * Get audio features for user's top tracks
 */
router.get('/audio-features', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  // Get top tracks first
  const tracksData = await spotifyService.getTopTracks(accessToken, {
    limit: 20,
    timeRange: req.query.time_range || 'medium_term',
  });

  if (!tracksData.items || tracksData.items.length === 0) {
    throw ErrorTypes.BAD_REQUEST('No top tracks found for audio features.');
  }

  const trackIds = tracksData.items.map(track => track.id);
  
  // Get audio features
  const featuresData = await spotifyService.getAudioFeatures(accessToken, trackIds);
  
  // Calculate averages
  const averages = spotifyService.calculateAverageFeatures(featuresData.audio_features);
  
  res.json(averages);
}));

// =============================================================================
// PLAYLIST ROUTES
// =============================================================================

/**
 * POST /spotify/create-playlist
 * Create a new playlist
 */
router.post('/create-playlist', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const { name, description, trackUris } = req.body;
  
  if (!name) {
    throw ErrorTypes.BAD_REQUEST('Playlist name is required');
  }

  // Validate track URIs if provided
  if (trackUris && trackUris.length > 0) {
    for (const uri of trackUris) {
      if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) {
        throw ErrorTypes.BAD_REQUEST(
          'Invalid track URI format',
          { invalidUri: uri, expectedFormat: 'spotify:track:ID' }
        );
      }
    }
  }

  // Get user ID
  const userData = await spotifyService.getUserProfile(accessToken);

  // Create playlist
  const playlist = await spotifyService.createPlaylist(accessToken, userData.id, {
    name,
    description: description || 'Created by SonicMirror',
    public: false,
  });

  // Add tracks if provided
  let trackWarning = null;
  if (trackUris && trackUris.length > 0) {
    try {
      await spotifyService.addTracksToPlaylist(accessToken, playlist.id, trackUris);
    } catch (trackError) {
      console.error('Error adding tracks to playlist:', trackError.message);
      trackWarning = 'Some tracks could not be added to the playlist';
    }
  }

  res.json({
    success: true,
    playlist,
    message: trackWarning 
      ? 'Playlist created, but some tracks could not be added.' 
      : 'Playlist created successfully!',
    ...(trackWarning && { warning: trackWarning }),
  });
}));

// =============================================================================
// FOLLOW/UNFOLLOW ROUTES
// =============================================================================

/**
 * POST /spotify/follow-artist
 * Follow an artist
 */
router.post('/follow-artist', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const { artistId } = req.body;
  
  if (!artistId) {
    throw ErrorTypes.BAD_REQUEST('Artist ID is required');
  }

  await spotifyService.followArtist(accessToken, artistId);

  res.json({
    success: true,
    message: 'Artist followed successfully!',
  });
}));

// =============================================================================
// SEARCH ROUTES
// =============================================================================

/**
 * GET /spotify/search-tracks
 * Search for tracks
 */
router.get('/search-tracks', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const { q } = req.query;
  
  if (!q) {
    throw ErrorTypes.BAD_REQUEST('Search query is required');
  }

  const data = await spotifyService.searchTracks(
    accessToken, 
    q, 
    parseInt(req.query.limit) || 5
  );
  
  res.json(data);
}));

/**
 * GET /spotify/search-artists
 * Search for artists
 */
router.get('/search-artists', asyncHandler(async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    throw ErrorTypes.UNAUTHORIZED('Missing access token');
  }

  const { q } = req.query;
  
  if (!q) {
    throw ErrorTypes.BAD_REQUEST('Search query is required');
  }

  const data = await spotifyService.searchArtists(
    accessToken, 
    q, 
    parseInt(req.query.limit) || 5
  );
  
  res.json(data);
}));

module.exports = router;
          { uris: trackUris },
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
          }
        );
      } catch (trackError) {
        console.error('Error adding tracks to playlist:', trackError.response?.data || trackError.message);
        // Still return success for playlist creation, but with warning about tracks
        return res.json({ 
          success: true, 
          playlist: playlistData,
          message: 'Playlist created successfully, but some tracks could not be added.',
          warning: 'Some tracks could not be added to the playlist'
        });
      }
    }
    
    res.json({ 
      success: true, 
      playlist: playlistData,
      message: 'Playlist created successfully!' 
    });
  } catch (err) {
    console.error('Spotify playlist creation error:', err.response?.data || err.message);
    res.status(400).json({ 
      error: 'Failed to create playlist', 
      details: err.response?.data || err.message 
    });
  }
});

// Follow an artist
router.post('/follow-artist', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  
  const { artistId } = req.body;
  if (!artistId) return res.status(400).json({ error: 'Artist ID is required' });
  
  try {
    await axios.put(
      `https://api.spotify.com/v1/me/following?type=artist&ids=${artistId}`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Artist followed successfully!' 
    });
  } catch (err) {
    console.error('Spotify follow artist error:', err.response?.data || err.message);
    res.status(400).json({ 
      error: 'Failed to follow artist', 
      details: err.response?.data || err.message 
    });
  }
});

// Search for tracks by name and artist
router.get('/search-tracks', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });
  
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 
        q,
        type: 'track',
        limit: 5
      },
    });
    
    res.json(data);
  } catch (err) {
    console.error('Spotify search error:', err.response?.data || err.message);
    res.status(400).json({ 
      error: 'Failed to search tracks', 
      details: err.response?.data || err.message 
    });
  }
});

// Search for artists by name
router.get('/search-artists', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });
  
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 
        q,
        type: 'artist',
        limit: 5
      },
    });
    
    res.json(data);
  } catch (err) {
    console.error('Spotify search error:', err.response?.data || err.message);
    res.status(400).json({ 
      error: 'Failed to search artists', 
      details: err.response?.data || err.message 
    });
  }
});

module.exports = router; 