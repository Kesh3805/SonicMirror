/**
 * Middleware index - exports all middleware
 */
const { errorHandler, notFoundHandler, asyncHandler, ApiError, ErrorTypes } = require('./errorHandler');
const { validateBody, validateAccessToken, validateLLMPayload, sanitizeBody } = require('./validation');
const { requestLogger, logSpotifyCall, logAICall } = require('./logger');
const { rateLimit, geminiRateLimit, spotifyRateLimit, checkRateLimit } = require('./rateLimit');
const { cacheMiddleware, cacheInstance, cacheTTL } = require('./cache');
const { compressionMiddleware } = require('./compression');

module.exports = {
  // Error handling
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError,
  ErrorTypes,
  
  // Validation
  validateBody,
  validateAccessToken,
  validateLLMPayload,
  sanitizeBody,
  
  // Logging
  requestLogger,
  logSpotifyCall,
  logAICall,
  
  // Rate limiting
  rateLimit,
  geminiRateLimit,
  spotifyRateLimit,
  checkRateLimit,
  
  // Caching
  cacheMiddleware,
  cacheInstance,
  cacheTTL,
  
  // Compression
  compressionMiddleware,
};
