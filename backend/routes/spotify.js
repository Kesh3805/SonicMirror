const express = require('express');
const axios = require('axios');
const router = express.Router();

// Helper to get access token from query or header
function getAccessToken(req) {
  return (
    req.query.access_token ||
    req.headers['authorization']?.replace('Bearer ', '')
  );
}

// Get user profile
router.get('/me', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch profile', details: err.response?.data || err.message });
  }
});

// Get top artists
router.get('/top-artists', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 10, time_range: req.query.time_range || 'medium_term' },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch top artists', details: err.response?.data || err.message });
  }
});

// Get top tracks
router.get('/top-tracks', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 10, time_range: req.query.time_range || 'medium_term' },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch top tracks', details: err.response?.data || err.message });
  }
});

// Get recently played tracks
router.get('/recently-played', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 50 },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch recently played', details: err.response?.data || err.message });
  }
});

// Get top genres (from top artists)
router.get('/top-genres', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 20, time_range: req.query.time_range || 'medium_term' },
    });
    // Aggregate genres
    const genreCounts = {};
    data.items.forEach(artist => {
      artist.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    // Sort by count
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));
    res.json({ topGenres: sortedGenres });
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch top genres', details: err.response?.data || err.message });
  }
});

// Get audio features for top tracks
router.get('/audio-features', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  try {
    // Get top tracks first
    const { data: tracksData } = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 20, time_range: req.query.time_range || 'medium_term' },
    });
    const trackIds = tracksData.items.map(track => track.id).join(',');
    console.log('Track IDs for audio features:', trackIds);
    if (!trackIds) {
      return res.status(400).json({ error: 'No top tracks found for audio features.' });
    }
    // Get audio features
    const { data: featuresData } = await axios.get('https://api.spotify.com/v1/audio-features', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { ids: trackIds },
    });
    // Calculate averages
    const features = featuresData.audio_features || [];
    const avg = (key) => features.reduce((sum, f) => sum + (f?.[key] || 0), 0) / (features.length || 1);
    res.json({
      avg_danceability: avg('danceability'),
      avg_energy: avg('energy'),
      avg_valence: avg('valence'),
      avg_tempo: avg('tempo'),
      avg_speechiness: avg('speechiness'),
      avg_acousticness: avg('acousticness'),
      avg_instrumentalness: avg('instrumentalness'),
      avg_liveness: avg('liveness'),
    });
  } catch (err) {
    console.error('Spotify audio features error:', err.response?.data || err.message);
    res.status(400).json({ error: 'Failed to fetch audio features', details: err.response?.data || err.message });
  }
});

// Get multiple artists' info (including genres)
router.get('/artists', async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: 'Missing ids parameter' });
  try {
    const accessToken = req.session?.access_token;
    if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });
    const response = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch artists', details: err.message });
  }
});

// Create a playlist
router.post('/create-playlist', async (req, res) => {
  const accessToken = getAccessToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
  
  const { name, description, trackUris } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name is required' });
  
  try {
    // Validate track URIs if provided
    if (trackUris && trackUris.length > 0) {
      for (const uri of trackUris) {
        if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) {
          return res.status(400).json({ 
            error: 'Invalid track URI format', 
            details: `Invalid URI: ${uri}. Must be in format: spotify:track:ID` 
          });
        }
      }
    }
    
    // First, get user ID
    const { data: userData } = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    // Create playlist
    const { data: playlistData } = await axios.post(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        name,
        description: description || 'Created by SonicMirror',
        public: false
      },
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );
    
    // Add tracks if provided
    if (trackUris && trackUris.length > 0) {
      try {
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
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