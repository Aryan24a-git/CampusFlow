import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { detectBestProvider } from './ai/provider';
import { testDatabaseConnection } from './db/client';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes (to be added per level) ───────────────────────────────────────
// Level 1: app.use('/api/auth', authRoutes);
// Level 3: app.use('/api/issues', issuesRoutes);
// Level 4: app.use('/api/chat', chatRoutes);
// etc.

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Startup ───────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  logger.info('🚀 CampusFlow Backend starting...');

  // Test database connection
  logger.info('Testing Supabase connection...');
  const dbOk = await testDatabaseConnection();
  if (dbOk) {
    logger.info('✅ Supabase connected');
  } else {
    logger.warn('⚠️  Supabase connection check failed — tables may not exist yet (run migrations first)');
  }

  // Auto-detect best AI provider
  await detectBestProvider();

  // Start server
  app.listen(PORT, () => {
    logger.info(`✅ Backend running at http://localhost:${PORT}`);
    logger.info(`   Health: http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
