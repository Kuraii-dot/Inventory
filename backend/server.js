import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/pool.js';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import itemRoutes from './routes/items.js';
import supplierRoutes from './routes/suppliers.js';
import categoryRoutes from './routes/categories.js';
import classificationRoutes from './routes/classifications.js';
import allocationRoutes from './routes/allocations.js';
import distributionRoutes from './routes/distributions.js';
import reportRoutes from './routes/reports.js';
import combinationRoutes from './routes/combinations.js';
import ledgerRoutes from './routes/ledger.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import integrationRoutes from './routes/integrations.js';
import inspectionRequestRoutes from './routes/inspectionRequests.js';

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

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/classifications', classificationRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/distributions', distributionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/combinations', combinationRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/inspection-requests', inspectionRequestRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (_error) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

export default app;
