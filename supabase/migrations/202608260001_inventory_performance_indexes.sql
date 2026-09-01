-- Indexes used by the cloud Inventory list, search, filtering, and overview queries.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS items_name_trgm_idx
  ON public.items USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS items_active_recent_idx
  ON public.items (is_active, date_procured DESC, id DESC);

CREATE INDEX IF NOT EXISTS items_category_active_idx
  ON public.items (category_id, is_active);

CREATE INDEX IF NOT EXISTS items_classification_active_idx
  ON public.items (classification_id, is_active);

CREATE INDEX IF NOT EXISTS classifications_category_idx
  ON public.classifications (category_id);

CREATE INDEX IF NOT EXISTS distributions_item_idx
  ON public.distributions (item_id);

CREATE INDEX IF NOT EXISTS allocations_item_status_idx
  ON public.allocations (item_id, status);

