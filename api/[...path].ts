import app from '../server';

export default function handler(req: any, res: any) {
  try {
    const originalPath =
      req.headers['x-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-original-url'] ||
      req.headers['x-vercel-matched-path'];

    if (originalPath && typeof originalPath === 'string') {
      req.url = originalPath;
    }

    if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && !req.url.startsWith('/club-logo')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Error] Uncaught function execution error:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Authentication service temporarily unavailable',
        message: 'Authentication service temporarily unavailable',
      });
    }
  }
}
