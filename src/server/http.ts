import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ValidationError } from './validation';

/**
 * Express 4 does not catch rejections from async handlers, so an awaited
 * database call that throws would hang the request until the client times out.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function notFound(res: Response, message: string): void {
  res.status(404).json({ success: false, error: message });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';
  console.error('API error:', message);

  // Internal failures (connection strings, SQL text) must not reach the client.
  res.status(500).json({ success: false, error: 'Internal server error' });
}
