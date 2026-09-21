import app from '../server';

export default function handler(req: any, res: any) {
  try {
    // When Vercel rewrites /api/(.*) to /api/index, restore the target request path
    if (req.url === '/api/index' || req.url?.startsWith('/api/index?')) {
      const originalPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-original-url'];
      if (originalPath && typeof originalPath === 'string') {
        req.url = originalPath;
      }
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

