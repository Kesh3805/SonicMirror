/**
 * Response Compression Middleware
 * Compresses responses using gzip for better performance
 */

const zlib = require('zlib');

/**
 * Simple compression middleware
 * Compresses JSON responses larger than threshold
 */
function compressionMiddleware(options = {}) {
  const {
    threshold = 1024, // Only compress responses larger than 1KB
    level = 6, // Compression level (1-9)
  } = options;

  return (req, res, next) => {
    // Check if client accepts gzip
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }

    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override json method
    res.json = (data) => {
      const body = JSON.stringify(data);
      
      if (body.length < threshold) {
        res.setHeader('Content-Type', 'application/json');
        return originalSend(body);
      }

      zlib.gzip(body, { level }, (err, compressed) => {
        if (err) {
          res.setHeader('Content-Type', 'application/json');
          return originalSend(body);
        }

        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Vary', 'Accept-Encoding');
        originalSend(compressed);
      });
    };

    next();
  };
}

module.exports = { compressionMiddleware };
