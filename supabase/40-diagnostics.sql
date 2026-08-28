-- Phase 04.2. A refusal the owner can see.
--
-- Every refusal the uploader makes is decided on the phone and never touches
-- the wire. That is right for the guest and blind for the owner: on 2026-08-28
-- three sessions guessed at Android refusals that no log could show, while the
-- edge logs proved every upload that DID reach the wire had landed. So a
-- refused or failed row now files one small record here, and check.html can
-- file its whole report with one tap instead of a copy and paste from a phone.
--
-- WRITE ONLY FOR THE PUBLIC KEY. anon may insert and may not read, update or
-- delete, so nobody holding the key can read anybody else's record, and the
-- table is read from the dashboard alone. No file name, no guest id and no
-- bytes of any picture are ever written here; see reportRefusal() in app.js
-- for exactly what is.
--
-- Every column is bounded, because anyone holding the public key can insert.
create table if not exists public.diagnostics (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  page       text not null check (page in ('uploader', 'check')),
  version    text check (char_length(version) <= 16),
  ua         text check (char_length(ua) <= 400),
  reason     text check (char_length(reason) <= 80),
  detail     jsonb check (pg_column_size(detail) <= 8000),
  report     text check (char_length(report) <= 20000)
);

alter table public.diagnostics enable row level security;

drop policy if exists "anon can file a diagnostic" on public.diagnostics;
create policy "anon can file a diagnostic"
  on public.diagnostics for insert to anon with check (true);

-- Supabase grants anon and authenticated every privilege on a new public
-- table through default privileges. Take back everything but the one needed.
revoke all on public.diagnostics from anon, authenticated;
grant insert on public.diagnostics to anon;
