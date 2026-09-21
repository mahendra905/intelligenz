import app from '../server';

export default function handler(req: any, res: any) {
  try {
    // When Vercel rewrites /api/(.*) to /api/index, restore the target request path
    const originalPath =
      req.headers['x-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-original-url'] ||
      req.headers['x-vercel-matched-path'];

    if (originalPath && typeof originalPath === 'string') {
      req.url = originalPath;
    }

    // Ensure req.url starts with /api if it was stripped
    if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && !req.url.startsWith('/club-logo')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Error] Uncaught function execution error:', err?.message || err);
    if (!res.headersSent) {
      if (typeof res.status === 'function' && typeof res.json === 'function') {
        res.status(500).json({
          success: false,
          error: 'Service temporarily unavailable',
          message: 'Service temporarily unavailable',
        });
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Service temporarily unavailable',
          })
        );
      }
    }
  }
}


