import { Router } from 'express';
import { asyncHandler } from '../http.js';
import { store } from '../store/index.js';
import { GEMINI_MODEL, isGeminiConfigured } from '../ai/client.js';
import { PREDICT_LIMIT, WHATSAPP_PARSE_LIMIT } from '../middleware/rateLimit.js';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const kind = store.storeKind();
    let recordCount: number | null = null;
    let databaseReachable: boolean | null = null;

    let databaseErrorCode: string | null = null;

    if (kind === 'postgres') {
      try {
        recordCount = await store.countPriceRecords();
        databaseReachable = true;
      } catch (err) {
        databaseReachable = false;
        // The code only, never the message. Postgres and Node error codes are
        // safe to publish; the message can echo the host or username from the
        // connection string, and health output gets pasted into chats.
        const code = (err as { code?: unknown }).code;
        databaseErrorCode = typeof code === 'string' ? code : 'UNKNOWN';
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
      // A misconfigured connection string is the most common reason a deploy
      // comes up non-persistent, and the code says which kind: 28P01 is a bad
      // password, XX000 from Supabase's pooler usually means the username is
      // missing its project ref, ENOTFOUND is a bad host, ETIMEDOUT is usually
      // the wrong port or an IPv6-only direct endpoint.
      ...(databaseErrorCode ? { databaseError: databaseErrorCode } : {}),
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
