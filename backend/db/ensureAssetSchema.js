import pool from './pool.js';

export async function ensureAssetSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS personnel (
      id SERIAL PRIMARY KEY, employee_id VARCHAR(100) UNIQUE NOT NULL, full_name VARCHAR(255) NOT NULL,
      position VARCHAR(255), department VARCHAR(255), email VARCHAR(255), contact_number VARCHAR(100),
      employment_status VARCHAR(30) NOT NULL DEFAULT 'active', notes TEXT, profile_photo TEXT,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE, created_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS serialized_assets (
      id SERIAL PRIMARY KEY, inventory_item_id INTEGER NOT NULL REFERENCES items(id),
      asset_code VARCHAR(150) UNIQUE NOT NULL, qr_token VARCHAR(100) UNIQUE NOT NULL,
      item_type VARCHAR(255) NOT NULL, unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
      procured_at VARCHAR(255), date_ordered DATE, date_procured DATE,
      current_condition VARCHAR(50) NOT NULL DEFAULT 'good', status VARCHAR(50) NOT NULL DEFAULT 'available',
      notes TEXT, created_by INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS asset_assignments (
      id SERIAL PRIMARY KEY, asset_id INTEGER NOT NULL REFERENCES serialized_assets(id),
      personnel_id INTEGER NOT NULL REFERENCES personnel(id), assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
      returned_at DATE, condition_on_assignment VARCHAR(50) NOT NULL DEFAULT 'good', condition_on_return VARCHAR(50),
      notes TEXT, status VARCHAR(30) NOT NULL DEFAULT 'active', assigned_by INTEGER, ended_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_assignment_per_asset ON asset_assignments(asset_id) WHERE status='active';
    CREATE TABLE IF NOT EXISTS asset_maintenance (
      id SERIAL PRIMARY KEY, asset_id INTEGER NOT NULL REFERENCES serialized_assets(id),
      date_reported DATE NOT NULL DEFAULT CURRENT_DATE, reason TEXT NOT NULL, diagnosis TEXT,
      work_performed TEXT NOT NULL, parts_added TEXT, service_provider VARCHAR(255),
      parts_cost NUMERIC(14,2) NOT NULL DEFAULT 0, service_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      condition_after VARCHAR(50), maintenance_status VARCHAR(30) NOT NULL DEFAULT 'completed',
      completion_date DATE, notes TEXT, recorded_by INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE asset_maintenance ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE asset_maintenance ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
    ALTER TABLE asset_maintenance ADD COLUMN IF NOT EXISTS voided_by INTEGER;
    ALTER TABLE asset_maintenance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    CREATE TABLE IF NOT EXISTS asset_phase_outs (
      id SERIAL PRIMARY KEY, asset_id INTEGER NOT NULL REFERENCES serialized_assets(id),
      phase_out_date DATE NOT NULL DEFAULT CURRENT_DATE, reason TEXT NOT NULL, final_condition VARCHAR(50),
      disposal_method VARCHAR(255), approved_by VARCHAR(255), notes TEXT, recorded_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS personnel_name_idx ON personnel(full_name);
    CREATE INDEX IF NOT EXISTS serialized_assets_code_idx ON serialized_assets(asset_code);
    CREATE INDEX IF NOT EXISTS assignments_personnel_idx ON asset_assignments(personnel_id);
  `);
}
