import { Router } from 'express';
import { asyncHandler } from '../http';
import { store } from '../store';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const kind = store.storeKind();
    let recordCount: number | null = null;
    let databaseReachable: boolean | null = null;

    if (kind === 'postgres') {
      try {
        recordCount = await store.countPriceRecords();
        databaseReachable = true;
      } catch {
        databaseReachable = false;
      }
    } else {
      recordCount = await store.countPriceRecords();
    }

    // Reported explicitly so a deploy that silently lost DATABASE_URL — and is
    // therefore quietly discarding every farmer submission — is obvious.
    res.status(databaseReachable === false ? 503 : 200).json({
      status: databaseReachable === false ? 'degraded' : 'ok',
      store: kind,
      persistent: kind === 'postgres' && databaseReachable !== false,
      recordCount,
      time: new Date().toISOString(),
    });
  }),
);
