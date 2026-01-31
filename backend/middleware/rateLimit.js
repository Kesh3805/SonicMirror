/**
 * Rate limiting middleware for SonicMirror
 */
const config = require('../config');

// In-memory store for rate limiting
// In production, use Redis or similar
const rateLimitStore = new Map();

/**
 * Clean up old entries from the store
 */
function cleanupStore() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.firstRequest > config.rateLimit.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every minute
setInterval(cleanupStore, 60000);

/**
 * Get client identifier
 * @param {Request} req - Express request
 * @returns {string} Client identifier
 */
function getClientId(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * General API rate limiter
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Window size in ms
 * @param {number} options.maxRequests - Max requests per window
 * @param {string} options.message - Error message
 * @returns {Function} Express middleware
 */
function rateLimit(options = {}) {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequestsPerMinute,
    message = 'Too many requests, please try again later',
  } = options;

  return (req, res, next) => {
    const clientId = getClientId(req);
    const key = `${clientId}:${req.baseUrl}`;
    const now = Date.now();

    let clientData = rateLimitStore.get(key);

    if (!clientData || now - clientData.firstRequest > windowMs) {
      // New window
      clientData = {
        count: 1,
        firstRequest: now,
      };
      rateLimitStore.set(key, clientData);
    } else {
      clientData.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - clientData.count);
    const resetTime = Math.ceil((clientData.firstRequest + windowMs) / 1000);
    
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': resetTime,
    });

    if (clientData.count > maxRequests) {
      const retryAfter = Math.ceil((clientData.firstRequest + windowMs - now) / 1000);
      res.set('Retry-After', retryAfter);
      
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Gemini-specific rate limiter
 * More conservative limits for free tier
 */
function geminiRateLimit() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 10, // Conservative for free tier
    message: 'AI service rate limit exceeded. Please wait a moment before trying again.',
  });
}

/**
 * Spotify API rate limiter
 */
function spotifyRateLimit() {
  return rateLimit({
    windowMs: 30000, // 30 seconds
    maxRequests: 30, // Spotify has generous limits
    message: 'Spotify API rate limit reached. Please wait a moment.',
  });
}

/**
 * Check rate limit without blocking (for internal use)
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Window size in ms
 * @returns {Object} Rate limit status
 */
function checkRateLimit(key, maxRequests = 15, windowMs = 60000) {
  const now = Date.now();
  let data = rateLimitStore.get(key);

  if (!data || now - data.firstRequest > windowMs) {
    data = { count: 1, firstRequest: now };
    rateLimitStore.set(key, data);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  data.count++;
  const remaining = maxRequests - data.count;
  const retryAfter = Math.ceil((data.firstRequest + windowMs - now) / 1000);

  if (data.count > maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter,
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds.`
    };
  }

  return { allowed: true, remaining };
}

module.exports = {
  rateLimit,
  geminiRateLimit,
  spotifyRateLimit,
  checkRateLimit,
  getClientId,
};
