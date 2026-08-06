-- Run this separately after the initial schema migration.
-- IMPORTANT: replace BOTH placeholder values before running.
-- The password is stored as a bcrypt hash generated inside PostgreSQL.

INSERT INTO users (username, password, role)
VALUES (
  'REPLACE_WITH_ADMIN_USERNAME',
  crypt('REPLACE_WITH_A_STRONG_PASSWORD', gen_salt('bf', 12)),
  'master_admin'
)
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password,
    role = 'master_admin';
