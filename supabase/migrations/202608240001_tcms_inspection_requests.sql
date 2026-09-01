-- TCMS field-inspection integration for Smart Inventory.
-- Safe to run more than once in Supabase SQL Editor.

begin;

create table if not exists inspection_requests
(
  id bigserial primary key,
  source_submission_id uuid not null unique,
  tcms_application_id bigint not null,
  application_no varchar(100) not null,
  applicant_name varchar(255) not null,
  address text,
  barangay varchar(255),
  inspector_name varchar(255),
  date_inspected date,
  recommendation varchar(100),
  inspection_remarks text,
  source_submitted_at timestamptz,
  status varchar(30) not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'released', 'cancelled')),
  warehouse_remarks text,
  warehouse_modified_at timestamptz,
  released_at timestamptz,
  released_by_user_id bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inspection_request_items
(
  id bigserial primary key,
  request_id bigint not null references inspection_requests(id) on delete cascade,
  source_material_code integer,
  source_active boolean not null default true,
  inspector_description varchar(255),
  inspector_quantity integer not null default 1 check (inspector_quantity >= 0),
  inspector_category varchar(255),
  inspector_classification varchar(255),
  prepared_item_id bigint references items(id) on delete set null,
  prepared_description varchar(255) not null,
  prepared_quantity integer not null default 1 check (prepared_quantity >= 0),
  is_inventory_added boolean not null default false,
  warehouse_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table inspection_request_items
  add column if not exists inspector_category varchar(255);

alter table inspection_request_items
  add column if not exists inspector_classification varchar(255);

create unique index if not exists inspection_request_source_material_unique
  on inspection_request_items(request_id, source_material_code)
  where source_material_code is not null;

create index if not exists inspection_requests_status_created_idx
  on inspection_requests(status, created_at desc);

create index if not exists inspection_requests_application_idx
  on inspection_requests(application_no);

create index if not exists inspection_request_items_request_idx
  on inspection_request_items(request_id);

alter table distributions
  add column if not exists inspection_request_id bigint
    references inspection_requests(id) on delete set null;

create index if not exists distributions_inspection_request_idx
  on distributions(inspection_request_id);

alter table inspection_requests enable row level security;
alter table inspection_request_items enable row level security;

commit;
