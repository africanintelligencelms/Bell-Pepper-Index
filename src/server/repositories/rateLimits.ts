import { query } from '../db/client.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix ms at which the current window rolls over. */
  resetAt: number;
  limit: number;
}

/**
 * Fixed-window counter. The window is derived from the clock rather than stored
 * per caller, so two lambdas handling the same IP land on the same row and the
 * limit holds across instances.
 *
 * A fixed window permits a burst across a boundary (up to 2x the limit in a
 * short span). That is an acceptable trade for the Gemini endpoints: the goal
 * is to stop sustained quota drain, not to police exact pacing.
 */
export async function consumeRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const resetAt = windowStart.getTime() + windowMs;

  const { rows } = await query<{ hits: number }>(
    `INSERT INTO ai_rate_limits (bucket_key, window_start, hits)
     VALUES ($1, $2, 1)
     ON CONFLICT (bucket_key, window_start)
     DO UPDATE SET hits = ai_rate_limits.hits + 1
     RETURNING hits`,
    [bucketKey, windowStart],
  );

  const hits = rows[0]?.hits ?? 1;

  return {
    allowed: hits <= limit,
    remaining: Math.max(limit - hits, 0),
    resetAt,
    limit,
  };
}

/**
 * Drops counters from windows that can no longer be consulted. Called
 * opportunistically rather than on a schedule — there is no cron in a
 * serverless deployment, and the table would otherwise grow unbounded.
 */
export async function pruneRateLimits(windowMs: number): Promise<void> {
  const cutoff = new Date(Date.now() - windowMs * 3);
  await query('DELETE FROM ai_rate_limits WHERE window_start < $1', [cutoff]);
}
