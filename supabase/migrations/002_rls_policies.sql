-- Enable RLS on all tables
alter table parks             enable row level security;
alter table units             enable row level security;
alter table weekly_reports    enable row level security;
alter table vacancy_snapshots enable row level security;
alter table unit_history      enable row level security;
alter table unit_notes        enable row level security;

-- Public read access (dashboard is not auth-gated)
create policy "public read parks"             on parks             for select using (true);
create policy "public read units"             on units             for select using (true);
create policy "public read weekly_reports"    on weekly_reports    for select using (true);
create policy "public read snapshots"         on vacancy_snapshots for select using (true);
create policy "public read unit_history"      on unit_history      for select using (true);
create policy "public read unit_notes"        on unit_notes        for select using (true);

-- All writes go through API routes using the service role key (bypasses RLS)
-- No anon insert/update/delete policies needed
