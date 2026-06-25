import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiKeyAuth } from './auth.js';
import pagesRouter from './routes/pages.js';
import collectionsRouter from './routes/collections.js';
import searchRouter from './routes/search.js';
import tagsRouter from './routes/tags.js';
import attachmentsRouter from './routes/attachments.js';
import usersRouter from './routes/users.js';

const PORT = parseInt(process.env.API_PORT || '3002');
const STDB_HOST = process.env.STDB_HOST || '127.0.0.1:3001';

// Make STDB config available to route modules
export const stdbConfig = {
  host: STDB_HOST,
  dbId: process.env.STDB_DB_ID || 'c20000000000000000000000000000000000000000000000000000000000000000',
};

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check (no auth required)
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'spacetimewiki-api', version: '1.0.0' });
});

// Mount authenticated routes
app.use('/api/v1/pages', apiKeyAuth, pagesRouter);
app.use('/api/v1/collections', apiKeyAuth, collectionsRouter);
app.use('/api/v1/search', apiKeyAuth, searchRouter);
app.use('/api/v1/tags', apiKeyAuth, tagsRouter);
app.use('/api/v1/attachments', apiKeyAuth, attachmentsRouter);
app.use('/api/v1/users', apiKeyAuth, usersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔑 SpacetimeWiki API server running on http://0.0.0.0:${PORT}`);
  console.log(`   STDB backend: http://${STDB_HOST}`);
});
