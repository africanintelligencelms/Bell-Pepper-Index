import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';

export const ADMIN_TOKEN_HEADER = 'x-admin-token';

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on length mismatch, so compare lengths first — the
  // length of the configured token is not itself a useful secret.
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Non-throwing variant, for endpoints that serve everyone but reveal more to
 * an admin. Returns false rather than responding, so a public caller gets the
 * public shape instead of a 401.
 */
export function hasValidAdminToken(req: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.trim().length === 0) return false;

  const header = req.get(ADMIN_TOKEN_HEADER);
  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = header ?? bearer ?? '';

  return provided.length > 0 && safeEquals(provided, expected);
}

/**
 * Gates destructive and configuration-changing endpoints. Submitting a price is
 * deliberately left open — the index depends on low-friction community
 * contribution — but deleting records, resetting the dataset and rewriting the
 * agreed price bands are admin-only.
 *
 * With ADMIN_TOKEN unset the gate fails closed: an unconfigured deployment
 * refuses destructive calls rather than accepting all of them.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected || expected.trim().length === 0) {
    res.status(503).json({
      success: false,
      error: 'Admin actions are disabled because ADMIN_TOKEN is not configured on the server.',
    });
    return;
  }

  const header = req.get(ADMIN_TOKEN_HEADER);
  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = header ?? bearer ?? '';

  if (!provided || !safeEquals(provided, expected)) {
    res.status(401).json({ success: false, error: 'Valid admin token required.' });
    return;
  }

  next();
}
