-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Unit type enum
create type unit_type_enum as enum (
  'lot',
  'poh',
  'rv_lot',
  'storage',
  'lot_rv_accessible',
  'abandoned_home',
  'na'
);

-- Unit status enum
create type unit_status_enum as enum (
  'occupied',
  'vacant'
);

-- Parks: the 20 mobile home parks
create table parks (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- Units: individual lots/units within a park
create table units (
  id             uuid primary key default uuid_generate_v4(),
  park_id        uuid not null references parks(id) on delete cascade,
  lot_number     text not null,
  unit_type      unit_type_enum not null default 'lot',
  current_status unit_status_enum not null default 'occupied',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (park_id, lot_number)
);

create index units_park_id_idx on units(park_id);
create index units_current_status_idx on units(current_status);

-- Weekly reports: one row per uploaded Excel file
create table weekly_reports (
  id           uuid primary key default uuid_generate_v4(),
  week_date    date not null unique,
  file_path    text not null,
  file_name    text not null,
  uploaded_at  timestamptz not null default now(),
  processed    boolean not null default false,
  processed_at timestamptz,
  error        text
);

create index weekly_reports_week_date_idx on weekly_reports(week_date desc);

-- Vacancy snapshots: aggregate per-park counts each week
create table vacancy_snapshots (
  id           uuid primary key default uuid_generate_v4(),
  park_id      uuid not null references parks(id) on delete cascade,
  report_id    uuid not null references weekly_reports(id) on delete cascade,
  week_date    date not null,
  total_units  integer not null default 0,
  vacant_units integer not null default 0,
  unique (park_id, week_date)
);

create index vacancy_snapshots_park_week_idx on vacancy_snapshots(park_id, week_date desc);
create index vacancy_snapshots_week_idx on vacancy_snapshots(week_date desc);

-- Unit history: per-unit status at each report week
create table unit_history (
  id           uuid primary key default uuid_generate_v4(),
  unit_id      uuid not null references units(id) on delete cascade,
  report_id    uuid not null references weekly_reports(id) on delete cascade,
  week_date    date not null,
  status       unit_status_enum not null,
  changed_from unit_status_enum,
  changed_to   unit_status_enum,
  created_at   timestamptz not null default now(),
  unique (unit_id, week_date)
);

create index unit_history_unit_id_idx on unit_history(unit_id, week_date desc);
create index unit_history_report_id_idx on unit_history(report_id);
create index unit_history_changed_idx on unit_history(report_id, changed_to)
  where changed_to is not null;

-- Unit notes
create table unit_notes (
  id         uuid primary key default uuid_generate_v4(),
  unit_id    uuid not null references units(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index unit_notes_unit_id_idx on unit_notes(unit_id, created_at desc);
