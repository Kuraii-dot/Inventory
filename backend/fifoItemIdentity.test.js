import assert from 'node:assert/strict';
import test from 'node:test';

import pool from './db/pool.js';
import { addDistribution, returnDistribution } from './controllers/distributionsController.js';
import { addAllocation, returnAllocation } from './controllers/allocationsController.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('FIFO transactions record and return stock to the exact consumed item id', { concurrency: false }, async () => {
  const originalConnect = pool.connect;
  try {
    const distributionInserts = [];
    const distributionStockUpdates = [];
    pool.connect = async () => ({
      async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
        if (text.includes('SELECT id, name, category_id, classification_id, unit') && text.includes('FROM items')) {
          return { rows: [{ id: 348, name: 'Duplicate valve', category_id: 4, classification_id: 9, unit: 'Pcs' }] };
        }
        if (text.includes('SELECT id, category_id, quantity, unit_price, date_procured')) {
          return { rows: [{ id: 347, category_id: 4, quantity: 1, unit_price: 25, date_procured: '2026-01-01' }] };
        }
        if (text.startsWith('UPDATE items SET quantity = quantity -')) {
          distributionStockUpdates.push(params);
          return { rows: [] };
        }
        if (text.startsWith('INSERT INTO distributions')) {
          distributionInserts.push(params);
          return { rows: [] };
        }
        throw new Error(`Unexpected distribution query: ${text}`);
      },
      release() {},
    });

    const distributionResponse = responseRecorder();
    await addDistribution({
      body: {
        recipient: 'Test', department: 'Engineering', approved_by: 'Admin', purpose: 'FIFO test',
        date: '2026-08-27', time: '10:00:00', items: [{ item_id: 348, quantity: 1 }],
      },
    }, distributionResponse);

    assert.equal(distributionResponse.body.status, 'success');
    assert.equal(distributionStockUpdates[0][1], 347, 'stock must be deducted from FIFO Item #347');
    assert.equal(distributionInserts[0][0], 347, 'distribution must record FIFO Item #347, not selected Item #348');

    const distributionReturnUpdates = [];
    pool.connect = async () => ({
      async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK' || text.startsWith('DELETE FROM distributions')) return { rows: [] };
        if (text.startsWith('SELECT id, item_id, quantity, total_value FROM distributions')) {
          return { rows: [{ id: 50, item_id: 347, quantity: 1, total_value: 25 }] };
        }
        if (text.startsWith('UPDATE items SET quantity = quantity +')) {
          distributionReturnUpdates.push(params);
          return { rows: [] };
        }
        throw new Error(`Unexpected distribution return query: ${text}`);
      },
      release() {},
    });
    const distributionReturnResponse = responseRecorder();
    await returnDistribution({ params: { id: 50 }, body: { return_quantity: 1 } }, distributionReturnResponse);
    assert.equal(distributionReturnUpdates[0][1], 347, 'distribution return must restore Item #347');

    const allocationInserts = [];
    pool.connect = async () => ({
      async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
        if (text.includes('SELECT id, name, category_id, classification_id, unit') && text.includes('FROM items')) {
          return { rows: [{ id: 348, name: 'Duplicate valve', category_id: 4, classification_id: 9, unit: 'Pcs' }] };
        }
        if (text.startsWith('SELECT SUM(quantity) AS total_stock')) return { rows: [{ total_stock: 2 }] };
        if (text.includes('SELECT id, category_id, quantity') && text.includes('FOR UPDATE')) {
          return { rows: [{ id: 347, category_id: 4, quantity: 1 }] };
        }
        if (text.startsWith('UPDATE items SET quantity = quantity -')) return { rows: [] };
        if (text.startsWith('INSERT INTO allocations')) {
          allocationInserts.push(params);
          return { rows: [] };
        }
        throw new Error(`Unexpected allocation query: ${text}`);
      },
      release() {},
    });
    const allocationResponse = responseRecorder();
    await addAllocation({
      body: {
        department: 'Engineering', allocated_by: 'Test', purpose: 'FIFO test',
        items: [{ item_id: 348, quantity: 1 }],
      },
    }, allocationResponse);
    assert.equal(allocationResponse.body.status, 'success');
    assert.equal(allocationInserts[0][0], 347, 'allocation must record FIFO Item #347');

    const allocationReturnUpdates = [];
    pool.connect = async () => ({
      async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK' || text.startsWith('UPDATE allocations SET')) return { rows: [] };
        if (text.startsWith('SELECT item_id, quantity FROM allocations')) {
          return { rows: [{ item_id: 347, quantity: 1 }] };
        }
        if (text.startsWith('UPDATE items SET quantity = quantity +')) {
          allocationReturnUpdates.push(params);
          return { rows: [] };
        }
        throw new Error(`Unexpected allocation return query: ${text}`);
      },
      release() {},
    });
    const allocationReturnResponse = responseRecorder();
    await returnAllocation({ params: { id: 75 }, body: { return_quantity: 1, return_reason: 'Test' } }, allocationReturnResponse);
    assert.equal(allocationReturnUpdates[0][1], 347, 'allocation return must restore Item #347');
  } finally {
    pool.connect = originalConnect;
  }
});
