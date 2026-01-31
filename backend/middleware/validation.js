/**
 * Request validation middleware for SonicMirror
 */
const { ErrorTypes } = require('./errorHandler');

/**
 * Validate required fields in request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Function} Express middleware
 */
function validateBody(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return next(ErrorTypes.BAD_REQUEST(
        `Missing required fields: ${missing.join(', ')}`,
        { missingFields: missing }
      ));
    }

    next();
  };
}

/**
 * Validate access token is present
 */
function validateAccessToken(req, res, next) {
  const accessToken = 
    req.query.access_token ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!accessToken) {
    return next(ErrorTypes.UNAUTHORIZED('Missing access token'));
  }

  // Attach token to request for easy access
  req.accessToken = accessToken;
  next();
}

/**
 * Validate LLM request payload
 */
function validateLLMPayload(req, res, next) {
  const { topArtists, topTracks, topGenres, audioProfile } = req.body;

  const errors = [];

  if (!Array.isArray(topArtists) || topArtists.length === 0) {
    errors.push('topArtists must be a non-empty array');
  }

  if (!Array.isArray(topTracks) || topTracks.length === 0) {
    errors.push('topTracks must be a non-empty array');
  }

  if (!Array.isArray(topGenres) || topGenres.length === 0) {
    errors.push('topGenres must be a non-empty array');
  }

  if (!audioProfile || typeof audioProfile !== 'object') {
    errors.push('audioProfile must be an object');
  } else {
    const { danceability, energy, valence } = audioProfile;
    if (typeof danceability !== 'number' && typeof danceability !== 'string') {
      errors.push('audioProfile.danceability must be a number');
    }
    if (typeof energy !== 'number' && typeof energy !== 'string') {
      errors.push('audioProfile.energy must be a number');
    }
    if (typeof valence !== 'number' && typeof valence !== 'string') {
      errors.push('audioProfile.valence must be a number');
    }
  }

  if (errors.length > 0) {
    return next(ErrorTypes.BAD_REQUEST('Invalid request payload', { errors }));
  }

  next();
}

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .slice(0, 1000) // Limit length
    .replace(/<[^>]*>/g, ''); // Remove HTML tags
}

/**
 * Sanitize request body middleware
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    const sanitizeObject = (obj) => {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'string' ? sanitizeString(item) : item
          );
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };
    
    req.body = sanitizeObject(req.body);
  }
  next();
}

module.exports = {
  validateBody,
  validateAccessToken,
  validateLLMPayload,
  sanitizeString,
  sanitizeBody,
};
