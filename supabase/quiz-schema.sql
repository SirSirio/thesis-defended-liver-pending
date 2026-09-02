-- ============================================================================
-- COURSE 03102: the live quiz (2026-09-02)
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and run it once. It is
-- safe to run more than once, and it is separate from schema.sql on purpose:
-- the quiz is a one-night feature, and this file is the whole of it. It
-- depends on schema.sql section 13 (admin_ok and the PIN) already being in.
--
-- Three tables and two functions:
--
--   quiz_players   one row per phone that joins. Insert and read are open to
--                  the publishable key, because the names end up projected on
--                  a wall anyway. No update, no delete: a name, once chosen,
--                  is a matter of record, like everything else on this site.
--
--   quiz_answers   one row per player per question, first answer stands. The
--                  primary key IS the lock: a second tap on another option is
--                  refused with a duplicate key error, which the phone shows
--                  as "locked in". Answers are readable with the key before
--                  the reveal, so a guest reading the REST API mid-question
--                  can see what OTHERS picked, though not what is correct,
--                  because the correct letters never touch this database
--                  until the host reveals. Party quiz, not a state secret:
--                  anyone cheating that hard at reading JSON mid-drink has
--                  earned the points.
--
--   quiz_state     one row, the projector's word. What phase the room is in,
--                  which question is up, when it started (server clock, so
--                  the speed bonus cannot be argued with), and which answers
--                  have been revealed so far. Phones poll it every couple of
--                  seconds. Only the PIN can write it, through the functions
--                  below, so a guest with the publishable key can watch the
--                  state but never drive it.
--
--   quiz_set_state(pin, ...)  the host page's only pen. Stamps started_at
--                  with now() itself whenever a question opens, so scoring
--                  time is measured start to answer on the same clock.
--
--   quiz_reset(pin)  wipes players and answers and returns to the lobby.
--                  For dry runs. On the night, run it once before doors.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PLAYERS
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.quiz_players enable row level security;
revoke all on public.quiz_players from anon, authenticated;
grant select, insert on public.quiz_players to anon;

drop policy if exists "anyone may join the quiz" on public.quiz_players;
create policy "anyone may join the quiz"
  on public.quiz_players for insert to anon with check (true);

drop policy if exists "anyone may read the players" on public.quiz_players;
create policy "anyone may read the players"
  on public.quiz_players for select to anon using (true);

-- ----------------------------------------------------------------------------
-- 2. ANSWERS. The primary key is the whole anti-cheat department.
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_answers (
  player_id  uuid not null references public.quiz_players (id) on delete cascade,
  q          int  not null check (q between 1 and 99),
  answer     text not null check (length(btrim(answer)) between 1 and 12),
  created_at timestamptz not null default now(),
  primary key (player_id, q)
);

alter table public.quiz_answers enable row level security;
revoke all on public.quiz_answers from anon, authenticated;
grant select, insert on public.quiz_answers to anon;

drop policy if exists "anyone may answer once" on public.quiz_answers;
create policy "anyone may answer once"
  on public.quiz_answers for insert to anon with check (true);

drop policy if exists "anyone may read the answers" on public.quiz_answers;
create policy "anyone may read the answers"
  on public.quiz_answers for select to anon using (true);

-- ----------------------------------------------------------------------------
-- 3. STATE. One row. Readable by all, writable by the PIN alone.
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_state (
  id         int primary key check (id = 1),
  phase      text not null default 'lobby'
             check (phase in ('lobby', 'question', 'film', 'reveal',
                              'board', 'break', 'tb', 'end')),
  q          int,
  started_at timestamptz,
  revealed   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quiz_state enable row level security;
revoke all on public.quiz_state from anon, authenticated;
grant select on public.quiz_state to anon;

drop policy if exists "anyone may watch the state" on public.quiz_state;
create policy "anyone may watch the state"
  on public.quiz_state for select to anon using (true);

insert into public.quiz_state (id) values (1)
  on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. THE HOST'S PEN. Refused without the PIN, same oracle as admin.html.
--    started_at is stamped HERE, with the database's own now(), whenever a
--    question or the tie breaker opens. The laptop's clock is not consulted,
--    and neither is any phone's, so the speed bonus is beyond appeal.
-- ----------------------------------------------------------------------------
create or replace function public.quiz_set_state(
  p_pin      text,
  p_phase    text,
  p_q        int   default null,
  p_revealed jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_phase not in ('lobby', 'question', 'film', 'reveal',
                     'board', 'break', 'tb', 'end') then
    return false;
  end if;
  if not public.admin_ok(p_pin) then
    return false;
  end if;
  update public.quiz_state set
    phase      = p_phase,
    q          = p_q,
    started_at = case when p_phase in ('question', 'tb') then now()
                      else started_at end,
    revealed   = coalesce(p_revealed, revealed),
    updated_at = now()
  where id = 1;
  return true;
end $$;

revoke all on function public.quiz_set_state(text, text, int, jsonb) from public;
grant execute on function public.quiz_set_state(text, text, int, jsonb) to anon;

-- ----------------------------------------------------------------------------
-- 5. THE SPONGE. Everything back to zero, lobby restored. Dry runs only,
--    plus once before doors on the night. Returns players removed, or -1
--    for a wrong PIN, so the page can tell refusal from an empty room.
-- ----------------------------------------------------------------------------
create or replace function public.quiz_reset(p_pin text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if not public.admin_ok(p_pin) then
    return -1;
  end if;
  delete from public.quiz_answers;
  delete from public.quiz_players;
  get diagnostics removed = row_count;
  update public.quiz_state set
    phase = 'lobby', q = null, started_at = null,
    revealed = '{}'::jsonb, updated_at = now()
  where id = 1;
  return removed;
end $$;

revoke all on function public.quiz_reset(text) from public;
grant execute on function public.quiz_reset(text) to anon;
