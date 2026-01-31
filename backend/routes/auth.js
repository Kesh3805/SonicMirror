const express = require('express');
const querystring = require('querystring');
const router = express.Router();
const config = require('../config');
const { asyncHandler, ErrorTypes } = require('../middleware');
const spotifyService = require('../services/spotifyService');

// =============================================================================
// SPOTIFY OAUTH ROUTES
// =============================================================================

/**
 * GET /auth/login
 * Redirect user to Spotify authorization
 */
router.get('/login', (req, res) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id: config.spotify.clientId,
    scope: config.spotify.scopes,
    redirect_uri: config.spotify.redirectUri,
    show_dialog: true,
  });
  
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

/**
 * GET /auth/callback
 * Handle Spotify callback and exchange code for tokens
 */
router.get('/callback', asyncHandler(async (req, res) => {
  const code = req.query.code || null;
  const error = req.query.error || null;

  // Handle authorization errors
  if (error) {
    console.error('Spotify authorization error:', error);
    return res.redirect(`${config.frontend.uri}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${config.frontend.uri}?error=no_code`);
  }

  try {
    // Exchange code for tokens using the service
    const tokenData = await spotifyService.exchangeCodeForTokens(code);
    const { access_token, refresh_token, expires_in } = tokenData;

    // For MVP: redirect to frontend with tokens in query
    // In production, use httpOnly cookies or JWT
    const params = querystring.stringify({ 
      access_token, 
      refresh_token, 
      expires_in 
    });
    
    res.redirect(`${config.frontend.uri}?${params}`);
  } catch (err) {
    console.error('Spotify token error:', err.response?.data || err.message);
    res.redirect(`${config.frontend.uri}?error=auth_failed`);
  }
}));

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw ErrorTypes.BAD_REQUEST('Refresh token is required');
  }

  try {
    const tokenData = await spotifyService.refreshAccessToken(refresh_token);
    
    res.json({
      success: true,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      // Some refreshes also return a new refresh token
      ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
    });
  } catch (err) {
    console.error('Token refresh error:', err.response?.data || err.message);
    throw ErrorTypes.UNAUTHORIZED('Failed to refresh token');
  }
}));

/**
 * POST /auth/logout
 * Logout endpoint (client-side token removal)
 * In production, this would also invalidate the session on the server
 */
router.post('/logout', (req, res) => {
  // For now, just acknowledge the logout
  // In production with sessions/cookies, clear them here
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /auth/status
 * Check if the provided token is still valid
 */
router.get('/status', asyncHandler(async (req, res) => {
  const accessToken = req.query.access_token || 
                      req.headers['authorization']?.replace('Bearer ', '');

  if (!accessToken) {
    return res.json({ authenticated: false });
  }

  try {
    // Try to get user profile to verify token
    const profile = await spotifyService.getUserProfile(accessToken);
    
    res.json({
      authenticated: true,
      user: {
        id: profile.id,
        display_name: profile.display_name,
        email: profile.email,
        image: profile.images?.[0]?.url,
      },
    });
  } catch (err) {
    res.json({ authenticated: false });
  }
}));

module.exports = router; 