/**
 * Request logging middleware for SonicMirror
 */

/**
 * Generate request ID
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format duration in ms
 * @param {number} startTime - Start time in ms
 * @returns {string} Formatted duration
 */
function formatDuration(startTime) {
  const duration = Date.now() - startTime;
  return `${duration}ms`;
}

/**
 * Get color for status code (for console output)
 * @param {number} statusCode 
 * @returns {string} ANSI color code
 */
function getStatusColor(statusCode) {
  if (statusCode >= 500) return '\x1b[31m'; // Red
  if (statusCode >= 400) return '\x1b[33m'; // Yellow
  if (statusCode >= 300) return '\x1b[36m'; // Cyan
  if (statusCode >= 200) return '\x1b[32m'; // Green
  return '\x1b[0m'; // Reset
}

/**
 * Request logger middleware
 * Logs incoming requests and response times
 */
function requestLogger(req, res, next) {
  // Generate and attach request ID
  req.requestId = generateRequestId();
  
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log incoming request
  console.log(`→ ${timestamp} [${req.requestId}] ${req.method} ${req.originalUrl}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = formatDuration(startTime);
    const statusColor = getStatusColor(res.statusCode);
    const resetColor = '\x1b[0m';
    
    console.log(
      `← ${timestamp} [${req.requestId}] ${req.method} ${req.originalUrl} ` +
      `${statusColor}${res.statusCode}${resetColor} ${duration}`
    );
  });
  
  next();
}

/**
 * Log API call to Spotify
 * @param {string} endpoint - Spotify API endpoint
 * @param {number} statusCode - Response status
 * @param {number} duration - Request duration in ms
 */
function logSpotifyCall(endpoint, statusCode, duration) {
  const timestamp = new Date().toISOString();
  const statusColor = getStatusColor(statusCode);
  const resetColor = '\x1b[0m';
  
  console.log(
    `🎵 ${timestamp} Spotify API: ${endpoint} ` +
    `${statusColor}${statusCode}${resetColor} ${duration}ms`
  );
}

/**
 * Log AI/LLM call
 * @param {string} model - AI model used
 * @param {string} feature - Feature name (roast, personality, etc.)
 * @param {boolean} success - Whether call succeeded
 * @param {number} duration - Request duration in ms
 */
function logAICall(model, feature, success, duration) {
  const timestamp = new Date().toISOString();
  const status = success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  
  console.log(
    `🤖 ${timestamp} AI [${model}] ${feature}: ${status} ${duration}ms`
  );
}

module.exports = {
  requestLogger,
  logSpotifyCall,
  logAICall,
  generateRequestId,
};
