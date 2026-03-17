// backend/server.js
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

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',           authRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/items',          itemRoutes);
app.use('/api/suppliers',      supplierRoutes);
app.use('/api/categories',     categoryRoutes);
app.use('/api/classifications', classificationRoutes);
app.use('/api/allocations',    allocationRoutes);
app.use('/api/distributions',  distributionRoutes);
app.use('/api/reports',        reportRoutes);
app.use('/api/combinations',   combinationRoutes);
app.use('/api/ledger',         ledgerRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});