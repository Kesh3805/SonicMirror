/**
 * Centralized error handling middleware for Express
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types for common scenarios
 */
const ErrorTypes = {
  BAD_REQUEST: (message, details) => new ApiError(400, message || 'Bad Request', details),
  UNAUTHORIZED: (message) => new ApiError(401, message || 'Unauthorized'),
  FORBIDDEN: (message) => new ApiError(403, message || 'Forbidden'),
  NOT_FOUND: (message) => new ApiError(404, message || 'Not Found'),
  RATE_LIMIT: (message) => new ApiError(429, message || 'Too Many Requests'),
  INTERNAL: (message, details) => new ApiError(500, message || 'Internal Server Error', details),
  SERVICE_UNAVAILABLE: (message) => new ApiError(503, message || 'Service Unavailable'),
};

/**
 * Async wrapper to handle promise rejections
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found middleware - handles 404 errors
 */
function notFoundHandler(req, res, next) {
  next(ErrorTypes.NOT_FOUND(`Route ${req.originalUrl} not found`));
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error details
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle Spotify API errors
  if (err.response?.data?.error) {
    const spotifyError = err.response.data.error;
    return res.status(err.response.status || 400).json({
      success: false,
      error: spotifyError.message || 'Spotify API error',
      details: spotifyError,
    });
  }

  // Handle Axios errors
  if (err.isAxiosError) {
    const statusCode = err.response?.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.response?.data?.message || err.message || 'External API error',
      details: err.response?.data,
    });
  }

  // Handle rate limit errors
  if (err.message?.includes('Rate limit') || err.message?.includes('quota')) {
    return res.status(429).json({
      success: false,
      error: err.message || 'Rate limit exceeded',
      retryAfter: 60,
    });
  }

  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle unknown errors (hide details in production)
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = {
  ApiError,
  ErrorTypes,
  asyncHandler,
  notFoundHandler,
  errorHandler,
};
