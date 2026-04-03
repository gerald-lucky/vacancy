-- Create the storage bucket for vacancy reports
-- Run this in Supabase SQL editor or via the dashboard
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vacancy-reports',
  'vacancy-reports',
  false,
  52428800, -- 50MB
  array[
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;

-- Storage policy: allow public uploads (service role handles actual writes via API)
create policy "allow authenticated uploads"
  on storage.objects for insert
  with check (bucket_id = 'vacancy-reports');

create policy "allow authenticated downloads"
  on storage.objects for select
  using (bucket_id = 'vacancy-reports');
