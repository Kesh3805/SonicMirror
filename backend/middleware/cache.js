/**
 * Response Cache Middleware
 * Provides in-memory caching for API responses to reduce load
 */

class ResponseCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 60000; // 1 minute default
    this.maxSize = options.maxSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 30000; // 30 seconds
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    const token = req.headers.authorization?.split(' ')[1] || 'anonymous';
    // Use first 8 chars of token to differentiate users without storing full token
    const userKey = token.substring(0, 8);
    return `${req.method}:${req.originalUrl}:${userKey}`;
  }

  /**
   * Get item from cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Set item in cache
   */
  set(key, data, ttl = this.defaultTTL) {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 100);
      keysToDelete.forEach(k => this.cache.delete(k));
    }
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  /**
   * Clear all cache or specific pattern
   */
  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, this.cleanupInterval);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
    };
  }
}

// Singleton cache instance
const cacheInstance = new ResponseCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
});

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in milliseconds
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {boolean} options.enabled - Whether caching is enabled
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    keyGenerator = null,
    enabled = true,
  } = options;

  return (req, res, next) => {
    if (!enabled || req.method !== 'GET') {
      return next();
    }

    const key = keyGenerator ? keyGenerator(req) : cacheInstance.generateKey(req);
    const cached = cacheInstance.get(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheInstance.set(key, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// Cache TTL presets
const cacheTTL = {
  short: 60 * 1000,      // 1 minute
  medium: 5 * 60 * 1000, // 5 minutes
  long: 15 * 60 * 1000,  // 15 minutes
  hour: 60 * 60 * 1000,  // 1 hour
};

module.exports = {
  ResponseCache,
  cacheInstance,
  cacheMiddleware,
  cacheTTL,
};
