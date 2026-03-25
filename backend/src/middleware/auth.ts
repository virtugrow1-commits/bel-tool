import type { Request, Response, NextFunction } from 'express';

/**
 * API key middleware — beschermt alle /api routes.
 * Verwacht: Authorization: Bearer <BACKEND_API_KEY>
 * of: X-API-Key: <BACKEND_API_KEY>
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env.BACKEND_API_KEY;

  if (!expectedKey) {
    console.error('[Auth] BACKEND_API_KEY not configured — all requests blocked');
    res.status(500).json({ error: 'Server misconfigured: API key not set' });
    return;
  }

  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === expectedKey) { next(); return; }
  }

  // Check X-API-Key header
  const xApiKey = req.headers['x-api-key'];
  if (xApiKey === expectedKey) { next(); return; }

  res.status(401).json({
    error:   'Unauthorized',
    message: 'Provide Authorization: Bearer <key> or X-API-Key: <key>',
  });
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms  = Date.now() - start;
    const ok  = res.statusCode < 400 ? '✅' : '❌';
    console.log(`${ok} ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[ErrorHandler]', err.message);
  res.status(500).json({
    error:   'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
}
