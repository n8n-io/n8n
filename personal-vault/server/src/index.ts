import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, isDevelopment } from './config/index.js';
import {
  securityHeaders,
  apiRateLimiter,
  sanitizeRequest,
  httpsRedirect,
} from './middleware/security.js';
import routes from './routes/index.js';
import { disconnectDb } from './utils/db.js';

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// HTTPS redirect in production
if (!isDevelopment) {
  app.use(httpsRedirect);
}

// Security headers
app.use(securityHeaders);

// CORS
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request sanitization
app.use(sanitizeRequest);

// Rate limiting
app.use(apiRateLimiter);

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await disconnectDb();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`CORS origin: ${config.CORS_ORIGIN}`);
});

export { app, server };
