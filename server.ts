import 'dotenv/config';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/server/app';
import { closePool } from './src/server/db/client';
import { ensureSchema } from './src/server/db/migrate';
import { store } from './src/server/store';
import express from 'express';

/**
 * Local development / self-hosted entry point. Production on Vercel goes
 * through api/index.ts instead and never executes this file.
 */

const PORT = Number(process.env.PORT ?? 3000);

async function startServer() {
  const app = createApiApp();

  if (store.isPersistent()) {
    // Fail loudly at boot rather than on the first farmer's submission.
    await ensureSchema();
  } else {
    console.warn(
      'DATABASE_URL is not set — running with the in-memory store. ' +
        'Submissions will be lost when this process exits.',
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (store: ${store.storeKind()})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down.`);
    server.close();
    await closePool().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
