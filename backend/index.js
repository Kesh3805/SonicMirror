const express = require('express');
const cors = require('cors');
const config = require('./config');
const { 
  requestLogger, 
  errorHandler, 
  notFoundHandler,
  sanitizeBody,
  rateLimit,
  compressionMiddleware,
} = require('./middleware');

const app = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// CORS configuration
app.use(cors({
  origin: config.frontend.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Response compression for better performance
app.use(compressionMiddleware({ threshold: 1024 }));

// Parse JSON bodies with size limit
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Sanitize all request bodies
app.use(sanitizeBody);

// General rate limiting (100 requests per minute)
app.use(rateLimit({
  windowMs: 60000,
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again later.',
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cache control for static responses
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=60');
  }
  next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SonicMirror Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API health check with detailed status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    services: {
      spotify: !!config.spotify.clientId,
      gemini: !!config.gemini.apiKey && config.gemini.apiKey !== 'your-gemini-api-key-here',
    },
  });
});

// Auth routes (Spotify OAuth)
app.use('/auth', require('./routes/auth'));

// LLM routes (AI features)
app.use('/llm', require('./routes/llm'));

// Spotify API routes
app.use('/spotify', require('./routes/spotify'));

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log('');
  console.log('🎵 ========================================');
  console.log('   SonicMirror Backend Server');
  console.log('🎵 ========================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   Spotify: ${config.spotify.clientId ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   Gemini: ${config.gemini.apiKey && config.gemini.apiKey !== 'your-gemini-api-key-here' ? '✓ Configured' : '✗ Not configured'}`);
  console.log('🎵 ========================================');
  console.log('');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app; 