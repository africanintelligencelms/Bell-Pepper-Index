import { NextFunction, Request, RequestHandler, Response } from 'express';
import { store } from '../store';

/**
 * The Gemini endpoints are public and every call costs quota. Without a limit,
 * anyone who finds the URL can drain the project's entire allowance — a larger
 * practical risk than key leakage, since the key itself never leaves the server.
 */

const HOUR_MS = 60 * 60 * 1000;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Chat parsing sends large prompts, so it is capped harder than prediction. */
export const WHATSAPP_PARSE_LIMIT = positiveInt(process.env.RATE_LIMIT_PARSE_PER_HOUR, 15);
export const PREDICT_LIMIT = positiveInt(process.env.RATE_LIMIT_PREDICT_PER_HOUR, 60);

/**
 * Resolving the caller behind a proxy.
 *
 * `x-forwarded-for` is client-settable when the app is reached directly, so it
 * cannot be trusted on its own — a spoofed value would let one caller occupy
 * unlimited buckets. Vercel's own `x-vercel-forwarded-for` is overwritten by the
 * platform and is preferred where present; otherwise we take the left-most
 * forwarded entry, falling back to the socket address.
 */
function clientKey(req: Request): string {
  const vercelIp = req.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return req.socket.remoteAddress ?? 'unknown';
}

export function rateLimit(name: string, limit: number, windowMs: number = HOUR_MS): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void store
      .consumeRateLimit(`${name}:${clientKey(req)}`, limit, windowMs)
      .then((result) => {
        res.setHeader('X-RateLimit-Limit', String(result.limit));
        res.setHeader('X-RateLimit-Remaining', String(result.remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

        if (result.allowed) {
          next();
          return;
        }

        const retryAfterSeconds = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          success: false,
          error: `Too many AI requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
        });
      })
      .catch(next);
  };
}
