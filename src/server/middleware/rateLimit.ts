import { NextFunction, Request, RequestHandler, Response } from 'express';
import { store } from '../store/index.js';
import { hasValidAdminToken } from './adminAuth.js';

/**
 * Per-IP caps on the public write and AI endpoints.
 *
 * The Gemini routes are capped because every call costs quota, and anyone who
 * finds the URL could drain the allowance.
 *
 * Price submission is capped for a different reason: the index is the argument
 * a farmer makes to a buyer, so the obvious attack is for a buyer to submit a
 * stream of low sales and drag the published median down. Nothing else stops
 * that — submission is deliberately unauthenticated so contributing stays
 * frictionless.
 *
 * **Limits are sized loosely on purpose.** Nigerian mobile networks put many
 * subscribers behind one public address, and farmers in a co-op may share a
 * connection, so a per-IP cap tight enough to stop a determined flood would
 * also lock out a village. These numbers are set to stop bulk automation
 * without ever being reachable by a group of people logging real sales.
 */

const HOUR_MS = 60 * 60 * 1000;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Chat parsing sends large prompts, so it is capped harder than prediction. */
export const WHATSAPP_PARSE_LIMIT = positiveInt(process.env.RATE_LIMIT_PARSE_PER_HOUR, 15);
export const PREDICT_LIMIT = positiveInt(process.env.RATE_LIMIT_PREDICT_PER_HOUR, 60);

/** A farmer logs a handful of prices a day; 30 an hour is far beyond real use. */
export const PRICE_SUBMIT_LIMIT = positiveInt(process.env.RATE_LIMIT_SUBMIT_PER_HOUR, 30);

/**
 * Bulk is capped far harder because one request carries up to 500 records, so
 * it is the efficient way to flood the index rather than the convenient way to
 * contribute.
 */
export const BULK_SUBMIT_LIMIT = positiveInt(process.env.RATE_LIMIT_BULK_PER_HOUR, 5);

/** Buyer contacts are shared occasionally, not in streams. */
export const OFFTAKER_SUBMIT_LIMIT = positiveInt(process.env.RATE_LIMIT_OFFTAKER_PER_HOUR, 15);

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
    // An admin importing a season of WhatsApp history is doing the work this
    // limit exists to protect, not the abuse it exists to stop.
    if (hasValidAdminToken(req)) {
      next();
      return;
    }

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
          error: `Too many requests. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
        });
      })
      .catch(next);
  };
}
