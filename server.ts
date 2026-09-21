import http from 'http';
import path from 'path';
import express from 'express';
import app from './api/index';

const PORT = 3000;
const httpServer = http.createServer(app);

export async function startServer() {
  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer,
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ INTELLIGENZ Club Server running on port ${PORT} [http://0.0.0.0:${PORT}]`);
    console.log(`🏛️ Institution: DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY`);
    console.log(`🤖 Department: Department of CSE (AIML) & AI`);
  });
}

export default app;

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
