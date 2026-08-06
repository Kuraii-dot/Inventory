-- Smart Inventory — fresh Supabase installation
-- Safe to run more than once. Creates the complete schema used by the API.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100) NOT NULL DEFAULT 'system',
  action VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id BIGINT,
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classifications (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  classification_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, classification_name)
);

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  classification_id BIGINT REFERENCES classifications(id) ON DELETE SET NULL,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price NUMERIC(14,2),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  unit VARCHAR(50) NOT NULL DEFAULT 'Pcs',
  date_ordered DATE NOT NULL,
  date_procured DATE NOT NULL,
  procured_at VARCHAR(255),
  sku VARCHAR(150) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocations (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  department VARCHAR(255) NOT NULL,
  allocated_by VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purpose TEXT NOT NULL,
  remarks TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distributions (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  recipient VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  debit_to VARCHAR(255),
  approved_by VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purpose TEXT NOT NULL,
  date DATE,
  time TIME,
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS combinations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS combination_items (
  id BIGSERIAL PRIMARY KEY,
  combination_id BIGINT NOT NULL REFERENCES combinations(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id),
  quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (combination_id, item_id)
);

CREATE TABLE IF NOT EXISTS personnel (
  id BIGSERIAL PRIMARY KEY,
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  department VARCHAR(255),
  email VARCHAR(255),
  contact_number VARCHAR(100),
  employment_status VARCHAR(30) NOT NULL DEFAULT 'active',
  notes TEXT,
  profile_photo TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS serialized_assets (
  id BIGSERIAL PRIMARY KEY,
  inventory_item_id BIGINT NOT NULL REFERENCES items(id),
  asset_code VARCHAR(150) UNIQUE NOT NULL,
  qr_token VARCHAR(100) UNIQUE NOT NULL,
  item_type VARCHAR(255) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  procured_at VARCHAR(255),
  date_ordered DATE,
  date_procured DATE,
  current_condition VARCHAR(50) NOT NULL DEFAULT 'good',
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES serialized_assets(id),
  personnel_id BIGINT NOT NULL REFERENCES personnel(id),
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_at DATE,
  condition_on_assignment VARCHAR(50) NOT NULL DEFAULT 'good',
  condition_on_return VARCHAR(50),
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ended_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_maintenance (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES serialized_assets(id),
  date_reported DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  work_performed TEXT NOT NULL,
  parts_added TEXT,
  service_provider VARCHAR(255),
  parts_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  condition_after VARCHAR(50),
  maintenance_status VARCHAR(30) NOT NULL DEFAULT 'completed',
  completion_date DATE,
  notes TEXT,
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  voided_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_phase_outs (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES serialized_assets(id),
  phase_out_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  final_condition VARCHAR(50),
  disposal_method VARCHAR(255),
  approved_by VARCHAR(255),
  notes TEXT,
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_assignment_per_asset ON asset_assignments(asset_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS items_name_idx ON items(name);
CREATE INDEX IF NOT EXISTS items_category_idx ON items(category_id);
CREATE INDEX IF NOT EXISTS allocations_date_idx ON allocations(allocated_at DESC);
CREATE INDEX IF NOT EXISTS distributions_date_idx ON distributions(distributed_at DESC);
CREATE INDEX IF NOT EXISTS personnel_name_idx ON personnel(full_name);
CREATE INDEX IF NOT EXISTS serialized_assets_code_idx ON serialized_assets(asset_code);
CREATE INDEX IF NOT EXISTS assignments_personnel_idx ON asset_assignments(personnel_id);
CREATE INDEX IF NOT EXISTS maintenance_asset_idx ON asset_maintenance(asset_id, date_reported DESC);

-- Compatibility additions for databases created by earlier Smart Inventory versions.
-- These are intentionally idempotent so the migration can be rerun before import.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS price NUMERIC(14,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS procured_at VARCHAR(255);
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- The Express API is the only database access path. Keep these application
-- tables inaccessible through Supabase's public Data API.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE serialized_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_phase_outs ENABLE ROW LEVEL SECURITY;
