import { withSupabase } from '@supabase/server';
import bcrypt from 'bcryptjs';
import { Writable } from 'node:stream';

import pool from '../../../backend/db/pool.js';
import { authenticateTcmsIntegration } from '../../../backend/middleware/integrationAuth.js';
import { logCreate, logDelete, logReturn, logUpdate } from '../../../backend/middleware/activityLogger.js';

import { loginEvent, logout, me } from '../../../backend/controllers/authController.js';
import { getDashboardData } from '../../../backend/controllers/dashboardController.js';
import {
  getItems, getAllItemsOverview, getItemsByCategory, getItemsByClassification,
  addItem, getItemById, updateItem, deleteItem, restoreItem, validateStock,
  getItemMovementAll,
} from '../../../backend/controllers/itemsController.js';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../../../backend/controllers/suppliersController.js';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../../backend/controllers/categoriesController.js';
import { getClassifications, addClassification } from '../../../backend/controllers/classificationsController.js';
import {
  getAllocations, getAllocationById, addAllocation, updateAllocation,
  deleteAllocation, returnAllocation,
} from '../../../backend/controllers/allocationsController.js';
import {
  getDistributions, getDistributionById, addDistribution, updateDistribution,
  deleteDistribution, returnDistribution,
} from '../../../backend/controllers/distributionsController.js';
import {
  getCombinations, getCombinationById, createCombination,
  updateCombination, deleteCombination,
} from '../../../backend/controllers/combinationsController.js';
import { getUsers } from '../../../backend/controllers/usersController.js';
import {
  getIntegrationMaterials, getIntegrationInspectionRequest,
  upsertIntegrationInspectionRequest, getInspectionRequestCatalog,
  getInspectionRequests, getInspectionRequestById,
  updateInspectionPreparation, releaseInspectionMaterials,
} from '../../../backend/controllers/inspectionRequestsController.js';

type Handler = (req: any, res: any, next: () => Promise<void>) => unknown;
type Route = { method: string; pattern: RegExp; params?: string[]; handlers: Handler[] };

// Report generation pulls in PDFKit and ExcelJS. Loading those modules during
// every inventory request adds noticeable Edge cold-start time, so export/admin
// modules are loaded only when one of their routes is actually requested.
const lazyHandler = (loader: () => Promise<any>, exportName: string): Handler =>
  async (req, res, next) => (await loader())[exportName](req, res, next);
const loadLedgerController = () => import('../../../backend/controllers/ledgerController.js');
const loadAdminController = () => import('../../../backend/controllers/adminController.js');
const loadReportsController = () => import('../../../backend/controllers/reportsController.js');

const getItemLedger = lazyHandler(loadLedgerController, 'getItemLedger');
const exportItemLedger = lazyHandler(loadLedgerController, 'exportItemLedger');
const getActivityLog = lazyHandler(loadAdminController, 'getActivityLog');
const getItemMovement = lazyHandler(loadAdminController, 'getItemMovement');
const exportItemMovement = lazyHandler(loadAdminController, 'exportItemMovement');
const getUserReport = lazyHandler(loadAdminController, 'getUserReport');
const getAdminStats = lazyHandler(loadAdminController, 'getAdminStats');
const distributionsReport = lazyHandler(loadReportsController, 'distributionsReport');
const overallReport = lazyHandler(loadReportsController, 'overallReport');
const departmentReport = lazyHandler(loadReportsController, 'departmentReport');
const allocationsReport = lazyHandler(loadReportsController, 'allocationsReport');
const inventoryReport = lazyHandler(loadReportsController, 'inventoryReport');
const inventoryPreview = lazyHandler(loadReportsController, 'inventoryPreview');
const inspectionRequestsReport = lazyHandler(loadReportsController, 'inspectionRequestsReport');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-integration-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

class EdgeResponse extends Writable {
  statusCode = 200;
  private responseHeaders = new Headers(corsHeaders);
  private chunks: Uint8Array[] = [];
  private complete = false;
  private finishResolve!: () => void;
  readonly finished = new Promise<void>((resolve) => { this.finishResolve = resolve; });

  status(code: number) { this.statusCode = code; return this; }
  setHeader(name: string, value: string) { this.responseHeaders.set(name, String(value)); return this; }
  getHeader(name: string) { return this.responseHeaders.get(name); }

  json(value: unknown) {
    if (this.complete) return this;
    this.responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
    this.chunks.push(new TextEncoder().encode(JSON.stringify(value)));
    this.markComplete();
    return this;
  }

  send(value: unknown) {
    if (typeof value === 'object' && value !== null && !(value instanceof Uint8Array)) return this.json(value);
    if (!this.responseHeaders.has('Content-Type')) this.responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
    this.chunks.push(value instanceof Uint8Array ? value : new TextEncoder().encode(String(value ?? '')));
    this.markComplete();
    return this;
  }

  private markComplete() {
    if (this.complete) return;
    this.complete = true;
    this.finishResolve();
  }

  override _write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
    this.chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
    callback();
  }

  override _final(callback: (error?: Error | null) => void) { this.markComplete(); callback(); }
  get isComplete() { return this.complete; }

  toResponse() {
    const size = this.chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of this.chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(body, { status: this.statusCode, headers: this.responseHeaders });
  }
}

const auth: Handler = (req, res, next) => req.user
  ? next()
  : res.status(401).json({ message: 'Inventory account is not linked to Supabase Auth.' });
const master: Handler = (req, res, next) => req.user?.role === 'master_admin'
  ? next()
  : res.status(403).json({ message: 'Access denied.' });
const integrationRole: Handler = (req, res, next) => req.user?.role === 'integration'
  ? next()
  : res.status(403).json({ message: 'This account is not authorized for TCMS integration.' });
const integrationKey = authenticateTcmsIntegration as Handler;

const itemCreateLog = logCreate('items', (req: any) => `Added item: ${req.body.name} (qty: ${req.body.quantity})`) as Handler;
const itemUpdateLog = logUpdate('items', (req: any) => `Updated item ID: ${req.params.id}`) as Handler;
const itemRestoreLog = logUpdate('items', (req: any) => `Restored item ID: ${req.params.id}`) as Handler;
const itemDeleteLog = logDelete('items', (req: any) => `Deleted item ID: ${req.params.id}`) as Handler;
const allocationCreateLog = logCreate('allocations', (req: any) => `New allocation for ${req.body.department} by ${req.body.allocated_by}`) as Handler;
const allocationUpdateLog = logUpdate('allocations', (req: any) => `Updated allocation ID: ${req.params.id}`) as Handler;
const allocationDeleteLog = logDelete('allocations', (req: any) => `Deleted allocation ID: ${req.params.id}`) as Handler;
const distributionCreateLog = logCreate('distributions', (req: any) => `New distribution to ${req.body.recipient} - ${req.body.department}`) as Handler;
const distributionUpdateLog = logUpdate('distributions', (req: any) => `Updated distribution ID: ${req.params.id}`) as Handler;
const distributionDeleteLog = logDelete('distributions', (req: any) => `Deleted distribution ID: ${req.params.id}`) as Handler;
const inspectionUpdateLog = logUpdate('inspection_requests', (req: any) => `Updated prepared materials for inspection request ${req.params.id}`) as Handler;
const inspectionReleaseLog = logUpdate('inspection_requests', (req: any) => `Released materials for inspection request ${req.params.id}`) as Handler;
const supplierCreateLog = logCreate('suppliers', (req: any) => `Added supplier: ${req.body.name}`) as Handler;
const supplierUpdateLog = logUpdate('suppliers', (req: any) => `Updated supplier ID: ${req.params.id}`) as Handler;
const supplierDeleteLog = logDelete('suppliers', (req: any) => `Deleted supplier ID: ${req.params.id}`) as Handler;
const categoryCreateLog = logCreate('categories', (req: any) => `Added category: ${req.body.name}`) as Handler;
const categoryUpdateLog = logUpdate('categories', (req: any) => `Updated category ID: ${req.params.id}`) as Handler;
const categoryDeleteLog = logDelete('categories', (req: any) => `Deleted category ID: ${req.params.id}`) as Handler;
const classificationCreateLog = logCreate('classifications', (req: any) => `Added classification: ${req.body.classification_name}`) as Handler;
const classificationUpdateLog = logUpdate('classifications', (req: any) => `Updated classification ID: ${req.params.id}`) as Handler;
const classificationDeleteLog = logDelete('classifications', (req: any) => `Deleted classification ID: ${req.params.id}`) as Handler;
const allocationReturnLog = logReturn('allocations', (req: any) => `Returned stock from allocation ID: ${req.params.id}`) as Handler;
const distributionReturnLog = logReturn('distributions', (req: any) => `Returned stock from distribution ID: ${req.params.id}`) as Handler;
const combinationCreateLog = logCreate('combinations', (req: any) => `Created combination: ${req.body.combination_name}`) as Handler;
const combinationUpdateLog = logUpdate('combinations', (req: any) => `Updated combination ID: ${req.params.id}`) as Handler;
const combinationDeleteLog = logDelete('combinations', (req: any) => `Deactivated combination ID: ${req.params.id}`) as Handler;
const userCreateLog = logCreate('users', (req: any) => `Created user: ${req.body.username}`,
  (_req: any, data: any) => data?.user?.id || data?.id || null) as Handler;
const userUpdateLog = logUpdate('users', (req: any) => `Updated user ID: ${req.params.id}`) as Handler;
const userDeleteLog = logDelete('users', (req: any) => `Deleted user ID: ${req.params.id}`) as Handler;

function authEmail(username: string) {
  const slug = username.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return `${slug || 'inventory-user'}@inventory.ccwd.invalid`;
}

async function createCloudUser(req: any, res: any) {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || 'admin');
  if (!username || !password.trim()) return res.status(400).json({ message: 'Username and password are required.' });
  if (!['user', 'admin', 'master_admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
  const email = authEmail(username);
  try {
    const exists = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
    if (exists.rows[0]) return res.status(400).json({ message: 'Username already exists.' });
    const { data, error } = await req.supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { inventory_username: username },
    });
    if (error) throw error;
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO users (username, password, role, auth_user_id, auth_email)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, username, role, created_at`,
        [username, hash, role, data.user.id, email]
      );
      return res.json({ message: `User "${username}" created successfully!`, user: result.rows[0] });
    } catch (dbError) {
      await req.supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw dbError;
    }
  } catch (error: any) { return res.status(500).json({ message: error.message }); }
}

async function updateCloudUser(req: any, res: any) {
  const id = Number(req.params.id);
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const role = req.body?.role ? String(req.body.role) : null;
  try {
    const currentResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ message: 'User not found.' });
    if (role && !['user', 'admin', 'master_admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    const nextUsername = username || current.username;
    const nextEmail = authEmail(nextUsername);
    let authUserId = current.auth_user_id;
    if (!authUserId) {
      if (!password.trim()) return res.status(400).json({ message: 'Enter a new password to activate this account for cloud login.' });
      const { data, error } = await req.supabaseAdmin.auth.admin.createUser({
        email: nextEmail, password, email_confirm: true,
        user_metadata: { inventory_username: nextUsername },
      });
      if (error) throw error;
      authUserId = data.user.id;
    } else {
      const attributes: any = { email: nextEmail, email_confirm: true, user_metadata: { inventory_username: nextUsername } };
      if (password.trim()) attributes.password = password;
      const { error } = await req.supabaseAdmin.auth.admin.updateUserById(authUserId, attributes);
      if (error) throw error;
    }
    const fields = ['username = $1', 'auth_user_id = $2', 'auth_email = $3'];
    const values: any[] = [nextUsername, authUserId, nextEmail];
    if (password.trim()) { values.push(await bcrypt.hash(password, 10)); fields.push(`password = $${values.length}`); }
    if (role) { values.push(role); fields.push(`role = $${values.length}`); }
    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    return res.json({ message: `User "${current.username}" updated successfully!` });
  } catch (error: any) { return res.status(500).json({ message: error.message }); }
}

async function deleteCloudUser(req: any, res: any) {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account.' });
  try {
    const result = await pool.query('SELECT username, auth_user_id FROM users WHERE id = $1', [id]);
    const current = result.rows[0];
    if (!current) return res.status(404).json({ message: 'User not found.' });
    if (current.auth_user_id) {
      const { error } = await req.supabaseAdmin.auth.admin.deleteUser(current.auth_user_id);
      if (error) throw error;
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ message: `User "${current.username}" deleted.` });
  } catch (error: any) { return res.status(500).json({ message: error.message }); }
}

async function updateClassification(req: any, res: any) {
  const name = String(req.body?.classification_name || '').trim();
  if (!name) return res.status(400).json({ status: 'error', message: 'Name is required.' });
  try {
    await pool.query('UPDATE classifications SET classification_name = $1 WHERE id = $2', [name, req.params.id]);
    return res.json({ status: 'success', message: 'Classification updated.' });
  } catch (error: any) { return res.status(500).json({ status: 'error', message: error.message }); }
}

async function removeClassification(req: any, res: any) {
  try {
    await pool.query('DELETE FROM classifications WHERE id = $1', [req.params.id]);
    return res.json({ status: 'success', message: 'Classification deleted.' });
  } catch { return res.status(500).json({ status: 'error', message: 'Cannot delete: may be in use by items.' }); }
}

const route = (method: string, pattern: RegExp, handlers: Handler[], params: string[] = []): Route => ({ method, pattern, handlers, params });
const routes: Route[] = [
  route('GET', /^\/api\/auth\/me$/, [auth, me as Handler]),
  route('POST', /^\/api\/auth\/login-event$/, [auth, loginEvent as Handler]),
  route('POST', /^\/api\/auth\/logout-event$/, [auth, logout as Handler]),
  route('GET', /^\/api\/health$/, [auth, async (_req, res) => {
    try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected', hosting: 'supabase-edge' }); }
    catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
  }]),
  route('GET', /^\/api\/dashboard$/, [auth, getDashboardData as Handler]),
  route('GET', /^\/api\/items\/validate-stock$/, [auth, validateStock as Handler]),
  route('GET', /^\/api\/items\/by-category$/, [auth, getItemsByCategory as Handler]),
  route('GET', /^\/api\/items\/by-classification$/, [auth, getItemsByClassification as Handler]),
  route('GET', /^\/api\/items\/all-overview$/, [auth, getAllItemsOverview as Handler]),
  route('GET', /^\/api\/items\/movement\/all$/, [auth, getItemMovementAll as Handler]),
  route('GET', /^\/api\/items$/, [auth, getItems as Handler]),
  route('POST', /^\/api\/items$/, [auth, itemCreateLog, addItem as Handler]),
  route('GET', /^\/api\/items\/(\d+)$/, [auth, getItemById as Handler], ['id']),
  route('PUT', /^\/api\/items\/(\d+)\/restore$/, [auth, itemRestoreLog, restoreItem as Handler], ['id']),
  route('PUT', /^\/api\/items\/(\d+)$/, [auth, itemUpdateLog, updateItem as Handler], ['id']),
  route('DELETE', /^\/api\/items\/(\d+)$/, [auth, itemDeleteLog, deleteItem as Handler], ['id']),
  route('GET', /^\/api\/suppliers$/, [auth, getSuppliers as Handler]),
  route('POST', /^\/api\/suppliers$/, [auth, supplierCreateLog, addSupplier as Handler]),
  route('PUT', /^\/api\/suppliers\/(\d+)$/, [auth, supplierUpdateLog, updateSupplier as Handler], ['id']),
  route('DELETE', /^\/api\/suppliers\/(\d+)$/, [auth, supplierDeleteLog, deleteSupplier as Handler], ['id']),
  route('GET', /^\/api\/categories$/, [auth, getCategories as Handler]),
  route('POST', /^\/api\/categories$/, [auth, categoryCreateLog, addCategory as Handler]),
  route('PUT', /^\/api\/categories\/(\d+)$/, [auth, categoryUpdateLog, updateCategory as Handler], ['id']),
  route('DELETE', /^\/api\/categories\/(\d+)$/, [auth, categoryDeleteLog, deleteCategory as Handler], ['id']),
  route('GET', /^\/api\/classifications$/, [auth, getClassifications as Handler]),
  route('POST', /^\/api\/classifications$/, [auth, classificationCreateLog, addClassification as Handler]),
  route('PUT', /^\/api\/classifications\/(\d+)$/, [auth, classificationUpdateLog, updateClassification as Handler], ['id']),
  route('DELETE', /^\/api\/classifications\/(\d+)$/, [auth, classificationDeleteLog, removeClassification as Handler], ['id']),
  route('GET', /^\/api\/allocations$/, [auth, getAllocations as Handler]),
  route('POST', /^\/api\/allocations$/, [auth, allocationCreateLog, addAllocation as Handler]),
  route('GET', /^\/api\/allocations\/(\d+)$/, [auth, getAllocationById as Handler], ['id']),
  route('PUT', /^\/api\/allocations\/(\d+)$/, [auth, allocationUpdateLog, updateAllocation as Handler], ['id']),
  route('DELETE', /^\/api\/allocations\/(\d+)$/, [auth, allocationDeleteLog, deleteAllocation as Handler], ['id']),
  route('POST', /^\/api\/allocations\/(\d+)\/return$/, [auth, allocationReturnLog, returnAllocation as Handler], ['id']),
  route('GET', /^\/api\/distributions$/, [auth, getDistributions as Handler]),
  route('POST', /^\/api\/distributions$/, [auth, distributionCreateLog, addDistribution as Handler]),
  route('GET', /^\/api\/distributions\/(\d+)$/, [auth, getDistributionById as Handler], ['id']),
  route('PUT', /^\/api\/distributions\/(\d+)$/, [auth, distributionUpdateLog, updateDistribution as Handler], ['id']),
  route('DELETE', /^\/api\/distributions\/(\d+)$/, [auth, distributionDeleteLog, deleteDistribution as Handler], ['id']),
  route('POST', /^\/api\/distributions\/(\d+)\/return$/, [auth, distributionReturnLog, returnDistribution as Handler], ['id']),
  route('GET', /^\/api\/combinations$/, [auth, getCombinations as Handler]),
  route('POST', /^\/api\/combinations$/, [auth, combinationCreateLog, createCombination as Handler]),
  route('GET', /^\/api\/combinations\/(\d+)$/, [auth, getCombinationById as Handler], ['id']),
  route('PUT', /^\/api\/combinations\/(\d+)$/, [auth, combinationUpdateLog, updateCombination as Handler], ['id']),
  route('DELETE', /^\/api\/combinations\/(\d+)$/, [auth, combinationDeleteLog, deleteCombination as Handler], ['id']),
  route('GET', /^\/api\/ledger\/(\d+)$/, [auth, getItemLedger as Handler], ['item_id']),
  route('GET', /^\/api\/ledger\/(\d+)\/export$/, [auth, exportItemLedger as Handler], ['item_id']),
  route('GET', /^\/api\/users$/, [auth, master, getUsers as Handler]),
  route('POST', /^\/api\/users$/, [auth, master, userCreateLog, createCloudUser as Handler]),
  route('PUT', /^\/api\/users\/(\d+)$/, [auth, master, userUpdateLog, updateCloudUser as Handler], ['id']),
  route('DELETE', /^\/api\/users\/(\d+)$/, [auth, master, userDeleteLog, deleteCloudUser as Handler], ['id']),
  route('GET', /^\/api\/admin\/stats$/, [auth, master, getAdminStats as Handler]),
  route('GET', /^\/api\/admin\/activity$/, [auth, master, getActivityLog as Handler]),
  route('GET', /^\/api\/admin\/item-movement$/, [auth, master, getItemMovement as Handler]),
  route('GET', /^\/api\/admin\/item-movement\/export$/, [auth, master, exportItemMovement as Handler]),
  route('GET', /^\/api\/admin\/user-report\/(\d+)$/, [auth, master, getUserReport as Handler], ['user_id']),
  route('POST', /^\/api\/reports\/distributions$/, [auth, distributionsReport as Handler]),
  route('POST', /^\/api\/reports\/overall$/, [auth, overallReport as Handler]),
  route('POST', /^\/api\/reports\/department$/, [auth, departmentReport as Handler]),
  route('POST', /^\/api\/reports\/allocations$/, [auth, allocationsReport as Handler]),
  route('GET', /^\/api\/reports\/inventory$/, [auth, inventoryReport as Handler]),
  route('GET', /^\/api\/reports\/inventory-preview$/, [auth, inventoryPreview as Handler]),
  route('POST', /^\/api\/reports\/inspections$/, [auth, inspectionRequestsReport as Handler]),
  route('GET', /^\/api\/inspection-requests\/catalog\/materials$/, [auth, getInspectionRequestCatalog as Handler]),
  route('GET', /^\/api\/inspection-requests$/, [auth, getInspectionRequests as Handler]),
  route('GET', /^\/api\/inspection-requests\/(\d+)$/, [auth, getInspectionRequestById as Handler], ['id']),
  route('PUT', /^\/api\/inspection-requests\/(\d+)\/preparation$/, [auth, inspectionUpdateLog, updateInspectionPreparation as Handler], ['id']),
  route('POST', /^\/api\/inspection-requests\/(\d+)\/release$/, [auth, inspectionReleaseLog, releaseInspectionMaterials as Handler], ['id']),
  route('GET', /^\/api\/integrations\/tcms\/materials$/, [auth, integrationRole, integrationKey, getIntegrationMaterials as Handler]),
  route('GET', /^\/api\/integrations\/tcms\/inspection-requests\/([0-9a-f-]+)$/i, [auth, integrationRole, integrationKey, getIntegrationInspectionRequest as Handler], ['submissionId']),
  route('PUT', /^\/api\/integrations\/tcms\/inspection-requests\/([0-9a-f-]+)$/i, [auth, integrationRole, integrationKey, upsertIntegrationInspectionRequest as Handler], ['submissionId']),
];

async function runHandlers(handlers: Handler[], req: any, res: EdgeResponse) {
  const invoke = async (index: number): Promise<void> => {
    if (index >= handlers.length || res.isComplete) return;
    let nextPromise: Promise<void> | undefined;
    const next = () => { nextPromise ??= invoke(index + 1); return nextPromise; };
    await handlers[index](req, res, next);
    if (nextPromise) await nextPromise;
  };
  await invoke(0);
}

const handler = withSupabase({ auth: 'user' }, async (request: Request, context: any) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const url = new URL(request.url);
  const marker = '/inventory-api';
  const markerIndex = url.pathname.indexOf(marker);
  const path = markerIndex >= 0 ? url.pathname.slice(markerIndex + marker.length) || '/' : url.pathname;
  const matchingRoute = routes.find((candidate) => candidate.method === request.method && candidate.pattern.test(path));
  if (!matchingRoute) return Response.json({ message: `Route not found: ${request.method} ${path}` }, { status: 404, headers: corsHeaders });

  const match = path.match(matchingRoute.pattern)!;
  const params = Object.fromEntries((matchingRoute.params || []).map((name, index) => [name, match[index + 1]]));
  // @supabase/server exposes the normalized user identifier as userClaims.id.
  // Keep jwtClaims.sub as a defensive fallback for compatible SDK versions.
  const subject = context.userClaims?.id || context.jwtClaims?.sub;
  const profileResult = subject
    ? await pool.query('SELECT id, username, role FROM users WHERE auth_user_id = $1 LIMIT 1', [subject])
    : { rows: [] };
  let body: any = {};
  if (!['GET', 'HEAD'].includes(request.method) && (request.headers.get('content-type') || '').includes('application/json')) {
    body = await request.json().catch(() => ({}));
  }
  const req = {
    method: request.method,
    body,
    params,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: Object.fromEntries([...request.headers.entries()].map(([key, value]) => [key.toLowerCase(), value])),
    socket: { remoteAddress: request.headers.get('x-forwarded-for') || 'supabase-edge' },
    user: profileResult.rows[0],
    supabaseAdmin: context.supabaseAdmin,
  };
  const res = new EdgeResponse();
  try {
    await runHandlers(matchingRoute.handlers, req, res);
    if (!res.isComplete) await Promise.race([
      res.finished,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Response generation timed out.')), 45_000)),
    ]);
    return res.toResponse();
  } catch (error: any) {
    console.error('Inventory Edge API error:', error);
    return Response.json({ message: error?.message || 'Unexpected server error.' }, { status: 500, headers: corsHeaders });
  }
});

export default { fetch: handler };
