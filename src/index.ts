import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { apiReference } from '@scalar/hono-api-reference';
import { env } from './config/env.config.js';
import { logger } from './utils/logger.js';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware.js';
import { healthRoute } from './features/health/health.route.js';
import { authRoute } from './features/auth/auth.route.js';
import { masterRoute } from './features/master/master-data.route.js';
import { validationRoute } from './features/validation/validation.route.js';
import { startCircuitBreakerJob } from './jobs/circuit-breaker-recovery.job.js';

const app = new OpenAPIHono();

// Configure CORS for Frontend UI (reads CORS_ORIGIN from env)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] || 'http://localhost:5173';
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return origin;
      }
      return allowedOrigins[0] || 'http://localhost:5173';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
  })
);

// Global Error Handler
app.onError(errorHandlerMiddleware);

// Mount Routes
app.route('/api/v1/public', healthRoute);
app.route('/api/v1/public', validationRoute);
app.route('/api/v1/admin', authRoute);
app.route('/api/v1/admin', masterRoute);

// Configure OpenAPI JSON Doc
app.doc('/api/v1/openapi.json', () => ({
  openapi: '3.0.0',
  info: {
    title: 'Validation Platform API',
    version: '1.0.0',
    description: 'Centralized Game Account Validation Gateway Engine & Admin Management API',
  },
  servers: [
    {
      url: 'https://api.neetflix.monster',
      description: 'Production API Gateway Server (Live)',
    },
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-KEY',
        description: 'Public Web Topup Client API Key',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
}));

// Mount Scalar Interactive OpenAPI Documentation UI
app.get(
  '/api/v1/docs',
  apiReference({
    spec: {
      url: '/api/v1/openapi.json',
    },
    theme: 'saturn',
  })
);

// Start Server
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(`🚀 Validation Platform API running on http://localhost:${info.port}`);
    logger.info(`📄 OpenAPI JSON Spec available at http://localhost:${info.port}/api/v1/openapi.json`);
    logger.info(`📚 Scalar API Documentation available at http://localhost:${info.port}/api/v1/docs`);
    logger.info(`🏥 Health Check available at http://localhost:${info.port}/api/v1/public/health`);
    logger.info(`⚡ Public Validation Gateway at http://localhost:${info.port}/api/v1/public/validate-account`);

    // Start Circuit Breaker Auto-Recovery Background Worker
    startCircuitBreakerJob();
  }
);

export default app;
