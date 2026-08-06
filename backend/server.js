import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes           from './routes/auth.js';
import dashboardRoutes      from './routes/dashboard.js';
import itemRoutes           from './routes/items.js';
import supplierRoutes       from './routes/suppliers.js';
import categoryRoutes       from './routes/categories.js';
import classificationRoutes from './routes/classifications.js';
import allocationRoutes     from './routes/allocations.js';
import distributionRoutes   from './routes/distributions.js';
import reportRoutes         from './routes/reports.js';
import combinationRoutes    from './routes/combinations.js';
import ledgerRoutes         from './routes/ledger.js';
import userRoutes           from './routes/users.js';
import adminRoutes          from './routes/admin.js';
import personnelAssetsRoutes from './routes/personnelAssets.js';
import { ensureAssetSchema } from './db/ensureAssetSchema.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.up.railway.app') ||
      origin.endsWith('.vercel.app') ||
      origin === 'http://tauri.localhost' ||
      origin === 'https://tauri.localhost' ||
      origin.includes('localhost') ||
      origin === process.env.CLIENT_ORIGIN ||
      origin === process.env.TAURI_ORIGIN
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const schemaReady = ensureAssetSchema();

app.use(async (_req, res, next) => {
  try {
    await schemaReady;
    next();
  } catch (err) {
    console.error('Failed to prepare personnel asset tables:', err);
    res.status(503).json({ message: 'Database schema is not ready.' });
  }
});

app.use('/api/auth',            authRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/items',           itemRoutes);
app.use('/api/suppliers',       supplierRoutes);
app.use('/api/categories',      categoryRoutes);
app.use('/api/classifications',  classificationRoutes);
app.use('/api/allocations',     allocationRoutes);
app.use('/api/distributions',   distributionRoutes);
app.use('/api/reports',         reportRoutes);
app.use('/api/combinations',    combinationRoutes);
app.use('/api/ledger',          ledgerRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/personnel-assets', personnelAssetsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  schemaReady
    .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`)))
    .catch((err) => {
      console.error('Failed to prepare personnel asset tables:', err);
      process.exit(1);
    });
}

export default app;
