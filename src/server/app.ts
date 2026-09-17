import express, { Express } from 'express';
import { errorHandler } from './http';
import { aiRouter } from './routes/ai';
import { healthRouter } from './routes/health';
import { marketConfigRouter } from './routes/marketConfig';
import { pricesRouter } from './routes/prices';

/**
 * Builds the API with no assumptions about how it is served. The local dev
 * server mounts it alongside Vite middleware; the serverless entry hands it
 * straight to the platform's request handler.
 */
export function createApiApp(): Express {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.disable('x-powered-by');

  app.use('/api', healthRouter);
  app.use('/api', pricesRouter);
  app.use('/api', marketConfigRouter);
  app.use('/api', aiRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Unknown API endpoint' });
  });

  app.use(errorHandler);

  return app;
}
