import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './src/server/app';
import { dbManager } from './src/server/db/dbManager';
import { runAllCalculationTests } from './src/server/tests/calculations.test';

const PORT = 3000;

async function startServer() {
  // Initialize Database Manager and run calculation engine test verification
  try {
    await dbManager.initialize();
    runAllCalculationTests();
  } catch (err) {
    console.error('Initialization warning:', err);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Indian Stock Portfolio Tracker Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
