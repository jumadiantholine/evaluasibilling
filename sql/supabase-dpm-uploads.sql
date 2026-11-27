-- ============================================================
-- SQL UNTUK CEK DPM EVALUASI BILLING (jalankan di Supabase)
-- Tempat: Supabase > SQL Editor > New query > paste semua > Run
-- ============================================================

create table if not exists public.dpm_uploads (
  id          bigint generated always as identity primary key,
  ulp         text not null check (ulp in ('51670','51671','51672','51673','51675')),
  blth        text not null,
  jenis       text not null check (jenis in ('MCR','PEC','SOREK')),
  filename    text,
  row_count   integer,
  data        jsonb,
  uploaded_at timestamptz not null default now()
);

alter table public.dpm_uploads enable row level security;

-- kebijakan agar API bisa menulis & membaca
create policy "dpm_uploads_insert" on public.dpm_uploads
  for insert to anon, authenticated with check (true);

create policy "dpm_uploads_select" on public.dpm_uploads
  for select to anon, authenticated using (true);

-- CATATAN:
-- * Pesan "policy already exists" boleh diabaikan (sudah pernah dibuat).
-- * Kalau muncul "must be owner": jalankan lewat SQL Editor biasa (bukan
--   table milik schema lain).
