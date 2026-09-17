import { Router } from 'express';
import { asyncHandler } from '../http';
import { store } from '../store';
import { GEMINI_MODEL, isGeminiConfigured } from '../ai/client';
import { PREDICT_LIMIT, WHATSAPP_PARSE_LIMIT } from '../middleware/rateLimit';

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
      // Presence only. The key itself must never appear in a response, a log
      // line, or an error message — health output is frequently pasted into
      // chats and issue trackers.
      gemini: {
        configured: isGeminiConfigured(),
        model: GEMINI_MODEL,
        limitsPerHour: { parseWhatsapp: WHATSAPP_PARSE_LIMIT, predictPrice: PREDICT_LIMIT },
      },
      time: new Date().toISOString(),
    });
  }),
);
