const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const router = express.Router();

// Load from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://localhost:3000/dashboard';

// Spotify scopes for permissions
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-follow-modify',
  'user-follow-read',
].join(' ');

// 1. Redirect user to Spotify authorization
router.get('/login', (req, res) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    show_dialog: true,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// 2. Handle Spotify callback and exchange code for tokens
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send('No code provided');

  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // For MVP: redirect to frontend with tokens in query (in production, use httpOnly cookies or JWT)
    const params = querystring.stringify({ access_token, refresh_token, expires_in });
    res.redirect(`${FRONTEND_URI}?${params}`);
  } catch (err) {
    console.error('Spotify token error:', err.response?.data || err.message);
    res.status(500).send('Authentication failed');
  }
});

module.exports = router; 