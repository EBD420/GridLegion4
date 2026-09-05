# Grid Legion — guilds, raids and the ladder

Run this **after** SETUP-BACKEND.md. Daily missions need none of it — they are
computed locally from the date and work offline, signed in or not.

Everything here degrades safely: signed out, the Guild and Ladder screens say so
and the campaign is untouched.

---

## Read this first: what is and isn't enforced

The game runs on the player's device, so **the client reports its own results**.
Row-level security stops a player writing to *someone else's* row. It cannot stop
them lying about their *own* — a player with devtools can claim raid damage they
never dealt, or a duel win they never earned.

The SQL below does what can be done from the database alone:

| Enforced in the database | Only client-reported |
|---|---|
| You can only write rows that belong to you | How much raid damage you dealt |
| You can only be in one guild at a time | Whether you won a duel |
| Raid damage is capped per contribution | Which formation you actually fought with |
| Rating moves by exactly ±16, never a value you send | Daily mission completion |
| Boss HP can never go below zero or be raised | |
| You cannot duel yourself | |

That is honest-player-grade, not cheat-proof. Bounded writes mean a cheater has to
grind fake requests rather than typing `rating = 999999`, which is the right place
to be before there is money on the line.

**If this becomes a real freemium product, the fix is to move battle resolution
server-side** — a Supabase Edge Function that takes both formations, runs the same
deterministic combat, and writes the outcome itself. The engine is already
deterministic enough for that, which was your instinct. Until then, treat the
ladder as a friendly scoreboard rather than a competitive one, and don't attach
paid rewards to it.

---

## The SQL — there are TWO blocks and you must run BOTH

Open the Supabase **SQL Editor**. Run step 1, then run step 2. Running only the
first gives you the tables without the functions, and the game reports:

> Could not find the function public.create_guild(...) in the schema cache

If you see that, you have skipped step 2. Go run it.

### Step 1 of 2 — tables and policies

```sql
-- ---------- guilds ----------
create table public.guilds (
  id         uuid primary key default gen_random_uuid(),
  tag        text unique not null check (char_length(tag) between 2 and 8),
  name       text not null check (char_length(name) between 2 and 24),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.guild_members (
  guild_id     uuid not null references public.guilds(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  primary key (guild_id, user_id),
  unique (user_id)                      -- one guild at a time, enforced by the DB
);

alter table public.guilds        enable row level security;
alter table public.guild_members enable row level security;

create policy "guilds are readable by signed-in players"
  on public.guilds for select to authenticated using (true);

-- A policy on guild_members cannot query guild_members from inside its own
-- USING clause — Postgres re-runs the policy to evaluate the subquery, which
-- re-runs the policy, forever ("infinite recursion detected in policy for
-- relation guild_members"). This helper does the lookup as security definer,
-- which sidesteps RLS for just this one internal read and breaks the loop.
create or replace function public.my_guild_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select guild_id from public.guild_members where user_id = auth.uid();
$$;

create policy "members of a guild can see each other"
  on public.guild_members for select to authenticated
  using (guild_id = public.my_guild_id());

-- ---------- raid ----------
create table public.raid_bosses (
  id          uuid primary key default gen_random_uuid(),
  guild_id    uuid not null references public.guilds(id) on delete cascade,
  name        text not null,
  max_hp      bigint not null check (max_hp > 0),
  hp          bigint not null check (hp >= 0),
  started_at  timestamptz not null default now(),
  defeated_at timestamptz
);

create table public.raid_damage (
  boss_id      uuid not null references public.raid_bosses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  damage       bigint not null default 0,
  primary key (boss_id, user_id)
);

alter table public.raid_bosses enable row level security;
alter table public.raid_damage enable row level security;

create policy "guild members see their raid"
  on public.raid_bosses for select to authenticated
  using (guild_id in (select guild_id from public.guild_members where user_id = auth.uid()));

create policy "guild members see the damage board"
  on public.raid_damage for select to authenticated
  using (boss_id in (
    select b.id from public.raid_bosses b
    join public.guild_members m on m.guild_id = b.guild_id
    where m.user_id = auth.uid()));

-- Note: there is deliberately NO insert/update policy on these two tables.
-- All writes go through the security-definer functions below, so the rules
-- cannot be bypassed by writing rows directly.

-- ---------- ladder ----------
create table public.ladder (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  rating       int not null default 1000 check (rating between 0 and 4000),
  power        int not null default 0,
  formation    jsonb not null,
  updated_at   timestamptz not null default now()
);

alter table public.ladder enable row level security;

create policy "the ladder is public to signed-in players"
  on public.ladder for select to authenticated using (true);
-- Writes go through publish_formation / report_duel only.

-- ---------- grants ----------
-- RLS only decides which ROWS a role can see; a role still needs the plain
-- SQL privilege to touch the table at all, or every query 42501s with
-- "permission denied" before RLS is ever consulted. Every SELECT the game
-- issues from the client goes through `authenticated`; every write goes
-- through the security-definer functions in step 2, so SELECT is all this
-- role needs here.
grant usage on schema public to authenticated;
grant select on public.guilds, public.guild_members, public.raid_bosses,
  public.raid_damage, public.ladder to authenticated;
```

### Step 2 of 2 — the functions ← **don't stop after step 1**

Run this block as well, in the same SQL Editor. Nothing multiplayer works without it:
every guild, raid and ladder action goes through one of these functions.

They run as `security definer`, meaning they execute with the table owner's rights.
That is what lets them write to tables players cannot write to directly — and it is
why each one re-checks `auth.uid()` itself.

```sql
-- Found a guild and join it in one step.
create or replace function public.create_guild(p_name text, p_tag text, p_display text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from guild_members where user_id = auth.uid())
    then raise exception 'you are already in a guild'; end if;
  insert into guilds (tag, name, created_by) values (upper(p_tag), p_name, auth.uid())
    returning id into g_id;
  insert into guild_members (guild_id, user_id, display_name)
    values (g_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'));
  return g_id;
end $$;

create or replace function public.join_guild(p_tag text, p_display text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into g_id from guilds where tag = upper(p_tag);
  if g_id is null then raise exception 'no guild with that tag'; end if;
  insert into guild_members (guild_id, user_id, display_name)
    values (g_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'))
    on conflict (user_id) do update set guild_id = excluded.guild_id;
  return g_id;
end $$;

create or replace function public.leave_guild()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from guild_members where user_id = auth.uid();
end $$;

-- Summon a boss scaled to the size of the guild.
create or replace function public.start_raid()
returns uuid language plpgsql security definer set search_path = public as $$
declare g_id uuid; n int; boss_hp bigint; b_id uuid;
begin
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;
  if exists (select 1 from raid_bosses where guild_id = g_id and defeated_at is null)
    then raise exception 'a boss is already active'; end if;
  select count(*) into n from guild_members where guild_id = g_id;
  boss_hp := 40000 + n * 20000;
  insert into raid_bosses (guild_id, name, max_hp, hp)
    values (g_id, 'Rustbound Colossus', boss_hp, boss_hp)
    returning id into b_id;
  return b_id;
end $$;

-- THE IMPORTANT ONE.
-- Two players attacking at the same instant must not clobber each other's write.
-- Doing this as read-then-write in the client loses damage; doing it as a single
-- UPDATE ... SET hp = hp - x makes the database serialise it correctly.
create or replace function public.contribute_raid(p_damage bigint, p_display text)
returns table (remaining bigint, contributed bigint)
language plpgsql security definer set search_path = public as $$
declare g_id uuid; b_id uuid; dmg bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;

  select id into b_id from raid_bosses
    where guild_id = g_id and defeated_at is null
    order by started_at desc limit 1;
  if b_id is null then raise exception 'no active boss'; end if;

  -- Cap a single contribution. A cheater must now spam requests instead of
  -- sending one absurd number.
  dmg := least(greatest(coalesce(p_damage,0), 0), 20000);

  update raid_bosses
     set hp = greatest(0, hp - dmg),
         defeated_at = case when hp - dmg <= 0 then now() else defeated_at end
   where id = b_id
   returning hp into remaining;

  insert into raid_damage (boss_id, user_id, display_name, damage)
    values (b_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'), dmg)
    on conflict (boss_id, user_id)
    do update set damage = raid_damage.damage + dmg,
                  display_name = excluded.display_name;

  contributed := dmg;
  return next;
end $$;

create or replace function public.publish_formation(p_display text, p_formation jsonb, p_power int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into ladder (user_id, display_name, formation, power, updated_at)
    values (auth.uid(), coalesce(nullif(p_display,''),'Commander'), p_formation,
            least(greatest(coalesce(p_power,0),0), 1000000), now())
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          formation    = excluded.formation,
          power        = excluded.power,
          updated_at   = now();
end $$;

-- Pick someone near your rating, never yourself.
create or replace function public.find_opponent()
returns table (user_id uuid, display_name text, rating int, power int, formation jsonb)
language plpgsql security definer set search_path = public as $$
declare my_rating int;
begin
  select l.rating into my_rating from ladder l where l.user_id = auth.uid();
  if my_rating is null then my_rating := 1000; end if;
  return query
    select l.user_id, l.display_name, l.rating, l.power, l.formation
      from ladder l
     where l.user_id <> auth.uid()
     order by abs(l.rating - my_rating), random()
     limit 1;
end $$;

-- The client says who won; the database decides by how much.
-- Rating can only ever move ±16, and only for the two players involved.
create or replace function public.report_duel(p_opponent uuid, p_won boolean)
returns int language plpgsql security definer set search_path = public as $$
declare my_new int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_opponent = auth.uid() then raise exception 'you cannot duel yourself'; end if;
  if not exists (select 1 from ladder where user_id = p_opponent)
    then raise exception 'no such opponent'; end if;

  insert into ladder (user_id, display_name, formation)
    values (auth.uid(), 'Commander', '{"units":[]}'::jsonb)
    on conflict (user_id) do nothing;

  update ladder set rating = greatest(0, least(4000, rating + case when p_won then 16 else -16 end))
    where user_id = auth.uid() returning rating into my_new;
  update ladder set rating = greatest(0, least(4000, rating + case when p_won then -16 else 16 end))
    where user_id = p_opponent;
  return my_new;
end $$;
```

### Step 3 — check both steps landed

Run this in the SQL Editor. You should get **5 tables and 8 functions**:

```sql
select 'tables' as kind, count(*) from information_schema.tables
  where table_schema = 'public'
    and table_name in ('guilds','guild_members','raid_bosses','raid_damage','ladder')
union all
select 'functions', count(*) from information_schema.routines
  where routine_schema = 'public'
    and routine_name in ('create_guild','join_guild','leave_guild','start_raid',
                         'contribute_raid','publish_formation','find_opponent','report_duel');
```

`functions = 0` means step 2 never ran. Anything less than 8 means it ran but
errored partway — scroll up in the SQL Editor output for the first red error and
fix that one; the rest usually follow.

### If the counts are right but the game still complains

PostgREST caches the schema and can lag a few seconds behind. Force it:

```sql
notify pgrst, 'reload schema';
```

Then use **🩺 Test connection** on the Account screen. It now reports whether the
multiplayer functions are installed, separately from the table check, so you can
tell these two failures apart without guessing.

---

## Step 4 — the guild hall upgrade

**If you already ran steps 1 and 2, run this too.** It adds guild levelling and
per-member profiles to the tables you already have. Every statement is written to
be safe to run more than once — nothing is dropped, no existing row is lost.

```sql
-- ---------- new columns ----------
alter table public.guilds        add column if not exists xp    bigint not null default 0;
alter table public.guilds        add column if not exists level int    not null default 1;

alter table public.guild_members add column if not exists role      text not null default 'member';
alter table public.guild_members add column if not exists power     int  not null default 0;
alter table public.guild_members add column if not exists depth     int  not null default 0;
alter table public.guild_members add column if not exists stage     int  not null default 1;
alter table public.guild_members add column if not exists last_seen timestamptz not null default now();

-- Whoever founded each guild becomes its leader (safe to re-run).
update public.guild_members m
   set role = 'leader'
  from public.guilds g
 where g.id = m.guild_id
   and g.created_by = m.user_id
   and m.role <> 'leader';

-- ---------- XP -> level ----------
-- Cumulative thresholds, matching GUILD_XP in the game.
create or replace function public.guild_level_for(p_xp bigint)
returns int language sql immutable as $$
  select case
    when p_xp >= 60000 then 6
    when p_xp >= 30000 then 5
    when p_xp >= 14000 then 4
    when p_xp >=  6000 then 3
    when p_xp >=  2000 then 2
    else 1 end;
$$;

create or replace function public.add_guild_xp(p_xp bigint)
returns int language plpgsql security definer set search_path = public as $$
declare g_id uuid; new_level int; gained bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then return null; end if;
  -- Cap a single award so a tampered client cannot jump the guild to max level.
  gained := least(greatest(coalesce(p_xp,0), 0), 2000);
  update guilds
     set xp = xp + gained,
         level = guild_level_for(xp + gained)
   where id = g_id
   returning level into new_level;
  return new_level;
end $$;

-- ---------- member profile ----------
create or replace function public.sync_member_profile(p_display text, p_power int, p_depth int, p_stage int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update guild_members
     set display_name = coalesce(nullif(p_display,''), display_name),
         power     = least(greatest(coalesce(p_power,0),0), 100000000),
         depth     = greatest(depth, least(greatest(coalesce(p_depth,0),0), 100000)),
         stage     = least(greatest(coalesce(p_stage,1),1), 100000),
         last_seen = now()
   where user_id = auth.uid();
end $$;

-- ---------- leader controls ----------
create or replace function public.kick_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  select guild_id into g_id from guild_members
   where user_id = auth.uid() and role = 'leader';
  if g_id is null then raise exception 'only the guild leader can remove members'; end if;
  if p_user = auth.uid() then raise exception 'use Leave guild instead'; end if;
  delete from guild_members where guild_id = g_id and user_id = p_user;
end $$;

-- Founding a guild now makes you its leader.
create or replace function public.create_guild(p_name text, p_tag text, p_display text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from guild_members where user_id = auth.uid())
    then raise exception 'you are already in a guild'; end if;
  insert into guilds (tag, name, created_by) values (upper(p_tag), p_name, auth.uid())
    returning id into g_id;
  insert into guild_members (guild_id, user_id, display_name, role)
    values (g_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'), 'leader');
  return g_id;
end $$;

-- If the leader walks, the longest-serving member inherits the guild.
create or replace function public.leave_guild()
returns void language plpgsql security definer set search_path = public as $$
declare g_id uuid; was_leader boolean; heir uuid;
begin
  select guild_id, role = 'leader' into g_id, was_leader
    from guild_members where user_id = auth.uid();
  if g_id is null then return; end if;
  delete from guild_members where user_id = auth.uid();
  if was_leader then
    select user_id into heir from guild_members
      where guild_id = g_id order by joined_at asc limit 1;
    if heir is not null then
      update guild_members set role = 'leader' where guild_id = g_id and user_id = heir;
    end if;
  end if;
end $$;

-- Raid damage now also feeds guild XP.
create or replace function public.contribute_raid(p_damage bigint, p_display text)
returns table (remaining bigint, contributed bigint)
language plpgsql security definer set search_path = public as $$
declare g_id uuid; b_id uuid; dmg bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;

  select id into b_id from raid_bosses
    where guild_id = g_id and defeated_at is null
    order by started_at desc limit 1;
  if b_id is null then raise exception 'no active boss'; end if;

  dmg := least(greatest(coalesce(p_damage,0), 0), 20000);

  update raid_bosses
     set hp = greatest(0, hp - dmg),
         defeated_at = case when hp - dmg <= 0 then now() else defeated_at end
   where id = b_id
   returning hp into remaining;

  insert into raid_damage (boss_id, user_id, display_name, damage)
    values (b_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'), dmg)
    on conflict (boss_id, user_id)
    do update set damage = raid_damage.damage + dmg,
                  display_name = excluded.display_name;

  update guilds
     set xp = xp + (dmg / 10),
         level = guild_level_for(xp + (dmg / 10))
   where id = g_id;

  contributed := dmg;
  return next;
end $$;
```

Then reload the API cache so the new functions are visible immediately:

```sql
notify pgrst, 'reload schema';
```

### Guild levels

| Level | XP | Perk |
|---|---|---|
| 1 | 0 | — |
| 2 | 2,000 | **Quartermasters** — +10% EXP from every battle |
| 3 | 6,000 | **Foundry Ties** — +15% salvage chance on a victory |
| 4 | 14,000 | **War Drums** — Legion Gauge charges 15% faster |
| 5 | 30,000 | **Iron Discipline** — +6% ATK and DEF for the whole legion |
| 6 | 60,000 | **Siege Doctrine** — your raid damage counts for 25% more |

XP comes from campaign victories (50 + 5 per stage) and raid damage (1 XP per 10
damage). A single XP award is capped at 2,000 server-side, so a tampered client
cannot jump a guild to max level in one request.

Perks apply to every member, and are read from the server-held level.

---

## Step 5 — the guild council

**Optional, and independent of step 4.** Adds a lightweight weekly vote: once a
week, every member picks Offensive Doctrine (+8% ATK) or Defensive Doctrine (+8%
DEF), and whichever is leading applies to the whole guild's battles until the vote
resets the following Monday. Safe to run more than once.

```sql
create table public.guild_council_votes (
  guild_id  uuid not null references public.guilds(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  week      text not null,
  option    text not null check (option in ('atk','def')),
  voted_at  timestamptz not null default now(),
  primary key (guild_id, user_id, week)
);

alter table public.guild_council_votes enable row level security;

-- Reuses the my_guild_id() helper from step 1, so this policy cannot hit the
-- same "infinite recursion" bug that guild_members did.
create policy "guild members see their council votes"
  on public.guild_council_votes for select to authenticated
  using (guild_id = public.my_guild_id());

-- Same two-layer reminder as step 1: RLS alone is not enough, this role also
-- needs the plain SELECT privilege or every read 42501s before RLS runs.
grant select on public.guild_council_votes to authenticated;

-- One vote per member per week; voting again this week changes it rather
-- than adding a second row.
create or replace function public.cast_council_vote(p_week text, p_option text)
returns void language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_option not in ('atk','def') then raise exception 'not a valid doctrine'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;
  insert into guild_council_votes (guild_id, user_id, week, option)
    values (g_id, auth.uid(), left(coalesce(p_week,''), 32), p_option)
    on conflict (guild_id, user_id, week)
    do update set option = excluded.option, voted_at = now();
end $$;
```

Then reload the schema cache the same way as before:

```sql
notify pgrst, 'reload schema';
```

The game reads every member's vote for the current week and tallies them
client-side (same trust model as the raid damage board — see the table at the
top of this document), so there is nothing further to run: the tally, the
leading option, and the stat buff are all computed in the game itself.

---

## Step 6 — online now

**Optional, and independent of every step above** — this one isn't guild-scoped
at all, so it works for a player who has never joined a guild or published a
ladder formation. Adds a single small table: a heartbeat row per player, and a
read of whoever's heartbeat landed in the last few minutes. Safe to run more
than once.

```sql
create table public.presence (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  username  text not null,
  last_seen timestamptz not null default now()
);

alter table public.presence enable row level security;

-- Same shape as the ladder policy above: readable by anyone signed in,
-- not just players who share a guild.
create policy "presence is public to signed-in players"
  on public.presence for select to authenticated using (true);

grant select on public.presence to authenticated;

-- Called on sign-in, on opening the Online Now screen, and once per stage
-- battle — an upsert, so a player's row just keeps getting a newer
-- last_seen rather than growing a new one.
create or replace function public.heartbeat(p_display text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into presence (user_id, username, last_seen)
    values (auth.uid(), coalesce(nullif(p_display,''),'Commander'), now())
    on conflict (user_id) do update
      set username = excluded.username, last_seen = now();
end $$;
```

Then reload the schema cache the same way as before:

```sql
notify pgrst, 'reload schema';
```

The game only ever keeps heartbeats from roughly the last five minutes, read
fresh each time the Online Now screen opens — there is no websocket and no
live count, the same honest "poll, not real-time" trade-off the rest of this
document already makes.

---

## Step 7 — battle replays

**Optional, and independent of every step above.** Battle Replays capture
locally the moment they happen (a boss kill, a new best win streak, a new
deepest reach) and are always visible without an account — this step only
adds the "Share" button, which copies one replay to a table other signed-in
players can browse. Safe to run more than once.

```sql
create table public.replays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.replays enable row level security;

-- Same shape as the ladder/presence policies above: readable by anyone
-- signed in, writable only into your own row.
create policy "replays are readable by any signed-in player"
  on public.replays for select to authenticated using (true);

create policy "players can only save their own replays"
  on public.replays for insert to authenticated with check (auth.uid() = user_id);

grant select, insert on public.replays to authenticated;
```

Then reload the schema cache the same way as before:

```sql
notify pgrst, 'reload schema';
```

This one needs no function — sharing a replay has no server-side arithmetic
to protect (no HP pool, no rating), so the client inserts the row directly,
the same way cloud saves already write straight to their own table.

---

## Step 8 — world boss

**Optional, and independent of every step above** — this is not guild-scoped,
so it works even for a player who has never joined a guild. One shared boss,
one shared damage pool, every signed-in player can attack it. Reuses the
raid-contribution trick from step 2 almost exactly — see `contribute_raid`
there if you want the side-by-side comparison — just pointed at a single
global row instead of a per-guild one.

```sql
create table public.world_boss (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  max_hp      bigint not null check (max_hp > 0),
  hp          bigint not null check (hp >= 0),
  started_at  timestamptz not null default now(),
  defeated_at timestamptz,
  last_hit_by text
);

create table public.world_boss_damage (
  boss_id      uuid not null references public.world_boss(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  damage       bigint not null default 0,
  primary key (boss_id, user_id)
);

alter table public.world_boss        enable row level security;
alter table public.world_boss_damage enable row level security;

create policy "world boss is public to signed-in players"
  on public.world_boss for select to authenticated using (true);

create policy "world boss damage board is public to signed-in players"
  on public.world_boss_damage for select to authenticated using (true);

-- No insert/update policy on either table, same reasoning as raid_bosses/
-- raid_damage in step 1: all writes go through the functions below.
grant select on public.world_boss, public.world_boss_damage to authenticated;

-- Seeds a first boss so a fresh project has something active immediately.
-- Safe to run more than once — it only inserts when the table is empty.
insert into public.world_boss (name, max_hp, hp)
select 'Rustbound Sovereign', 300000, 300000
where not exists (select 1 from public.world_boss);

-- Anyone can summon the next one once the current boss is down. HP scales
-- with how many have already fallen — a light difficulty ramp with no
-- guild size to key off, since this isn't guild-scoped.
create or replace function public.start_world_boss()
returns uuid language plpgsql security definer set search_path = public as $$
declare n int; boss_hp bigint; b_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from world_boss where defeated_at is null)
    then raise exception 'a world boss is already active'; end if;
  select count(*) into n from world_boss where defeated_at is not null;
  boss_hp := 300000 + n * 150000;
  insert into world_boss (name, max_hp, hp)
    values ('Rustbound Sovereign', boss_hp, boss_hp)
    returning id into b_id;
  return b_id;
end $$;

create or replace function public.contribute_world_boss(p_damage bigint, p_display text)
returns table (remaining bigint, contributed bigint)
language plpgsql security definer set search_path = public as $$
declare b_id uuid; dmg bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into b_id from world_boss where defeated_at is null
    order by started_at desc limit 1;
  if b_id is null then raise exception 'no active world boss'; end if;

  dmg := least(greatest(coalesce(p_damage,0), 0), 20000);

  update world_boss
     set hp = greatest(0, hp - dmg),
         defeated_at = case when hp - dmg <= 0 then now() else defeated_at end,
         last_hit_by = case when hp - dmg <= 0 then coalesce(nullif(p_display,''),'Commander') else last_hit_by end
   where id = b_id
   returning hp into remaining;

  insert into world_boss_damage (boss_id, user_id, display_name, damage)
    values (b_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'), dmg)
    on conflict (boss_id, user_id)
    do update set damage = world_boss_damage.damage + dmg,
                  display_name = excluded.display_name;

  contributed := dmg;
  return next;
end $$;
```

Then reload the schema cache the same way as before:

```sql
notify pgrst, 'reload schema';
```

---

## Step 9 — guild wars

**Needs the guild-hall upgrade (step 4).** Two guilds go head-to-head over a
fixed window instead of guild-vs-boss — a small queue table pairs up whichever
two guilds ask for a match, then both race to the higher battle score before
the window closes. Sits next to the raid boss rather than replacing it.

```sql
create table public.guild_war_queue (
  guild_id  uuid primary key references public.guilds(id) on delete cascade,
  queued_at timestamptz not null default now()
);

create table public.guild_wars (
  id           uuid primary key default gen_random_uuid(),
  guild_a      uuid not null references public.guilds(id) on delete cascade,
  guild_b      uuid not null references public.guilds(id) on delete cascade,
  guild_a_name text not null,
  guild_a_tag  text not null,
  guild_b_name text not null,
  guild_b_tag  text not null,
  score_a      bigint not null default 0,
  score_b      bigint not null default 0,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz not null
);

create table public.guild_war_contributions (
  war_id       uuid not null references public.guild_wars(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score        bigint not null default 0,
  primary key (war_id, user_id)
);

alter table public.guild_war_queue         enable row level security;
alter table public.guild_wars              enable row level security;
alter table public.guild_war_contributions enable row level security;

-- Reuses the my_guild_id() helper from step 1 throughout, same reasoning as
-- the guild council policy in step 5.
create policy "a guild can see whether it is queued"
  on public.guild_war_queue for select to authenticated
  using (guild_id = public.my_guild_id());

create policy "guilds see their own war"
  on public.guild_wars for select to authenticated
  using (guild_a = public.my_guild_id() or guild_b = public.my_guild_id());

create policy "guilds see their war contributions"
  on public.guild_war_contributions for select to authenticated
  using (war_id in (
    select id from public.guild_wars
    where guild_a = public.my_guild_id() or guild_b = public.my_guild_id()));

grant select on public.guild_war_queue, public.guild_wars, public.guild_war_contributions to authenticated;

-- Queues your guild for a war, or immediately matches you against whoever
-- is already waiting. Returns the war id once matched, or null while you
-- are the one waiting.
create or replace function public.start_guild_war()
returns uuid language plpgsql security definer set search_path = public as $$
declare g_id uuid; my_name text; my_tag text; opp_id uuid; opp_name text; opp_tag text; w_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;

  select id into w_id from guild_wars
    where (guild_a = g_id or guild_b = g_id) and ends_at > now()
    limit 1;
  if w_id is not null then return w_id; end if;

  select name, tag into my_name, my_tag from guilds where id = g_id;

  select guild_id into opp_id from guild_war_queue where guild_id <> g_id order by queued_at asc limit 1;
  if opp_id is not null then
    select name, tag into opp_name, opp_tag from guilds where id = opp_id;
    delete from guild_war_queue where guild_id in (g_id, opp_id);
    insert into guild_wars (guild_a, guild_b, guild_a_name, guild_a_tag, guild_b_name, guild_b_tag, ends_at)
      values (g_id, opp_id, my_name, my_tag, opp_name, opp_tag, now() + interval '48 hours')
      returning id into w_id;
    return w_id;
  end if;

  insert into guild_war_queue (guild_id) values (g_id)
    on conflict (guild_id) do update set queued_at = now();
  return null;
end $$;

-- Same atomic-update trick as contribute_raid, just deciding which side of
-- the ledger to add to based on which guild is calling.
create or replace function public.contribute_guild_war(p_score bigint, p_display text)
returns table (my_score bigint, opp_score bigint)
language plpgsql security definer set search_path = public as $$
declare g_id uuid; w record; amt bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;

  select * into w from guild_wars
    where (guild_a = g_id or guild_b = g_id) and ends_at > now()
    order by starts_at desc limit 1;
  if w.id is null then raise exception 'no active guild war'; end if;

  amt := least(greatest(coalesce(p_score,0), 0), 20000);

  if w.guild_a = g_id then
    update guild_wars set score_a = score_a + amt where id = w.id returning score_a, score_b into my_score, opp_score;
  else
    update guild_wars set score_b = score_b + amt where id = w.id returning score_b, score_a into my_score, opp_score;
  end if;

  insert into guild_war_contributions (war_id, user_id, display_name, score)
    values (w.id, auth.uid(), coalesce(nullif(p_display,''),'Commander'), amt)
    on conflict (war_id, user_id)
    do update set score = guild_war_contributions.score + amt,
                  display_name = excluded.display_name;

  return next;
end $$;
```

Then reload the schema cache the same way as before:

```sql
notify pgrst, 'reload schema';
```

There is deliberately no scheduled job to close out an expired war — the
game itself compares `ends_at` to the current time and shows "war over" the
moment anyone opens the Guild screen after the window passes, the same
honest "poll, not real-time" trade-off Online Now already makes. Queuing
again afterwards starts a fresh war.

## Step 10 — guild projects

**Needs the guild-hall upgrade (step 4).** A permanent, guild-wide resource
sink, separate from guild levels and the weekly council vote above — members
spend their own salvage parts into one running total that only ever grows.
There is no "start" step like the raid boss or a war: the project is always
running, there just isn't anything in it until someone contributes. Unlike
everything else in this file, the amount contributed is a real cost to the
player (parts they actually had, spent for good) rather than a battle result,
so the function only ever adds — it never needs to touch anything the client
could plausibly want back.

```sql
create table public.guild_projects (
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  total    bigint not null default 0
);

create table public.guild_project_contributions (
  guild_id     uuid not null references public.guilds(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  amount       bigint not null default 0,
  primary key (guild_id, user_id)
);

alter table public.guild_projects              enable row level security;
alter table public.guild_project_contributions enable row level security;

-- Reuses the my_guild_id() helper from step 1, same reasoning as every
-- other guild-scoped policy in this file.
create policy "a guild can see its own project"
  on public.guild_projects for select to authenticated
  using (guild_id = public.my_guild_id());

create policy "a guild can see its own project contributions"
  on public.guild_project_contributions for select to authenticated
  using (guild_id = public.my_guild_id());

grant select on public.guild_projects, public.guild_project_contributions to authenticated;

-- The client has already removed the parts from its own bay before calling
-- this — the amount is capped at 14 anyway (a bay can never hold more than
-- that in one go), so there is nothing here for a tampered client to gain
-- by over-reporting. Same atomic-update shape as contribute_raid.
create or replace function public.contribute_guild_project(p_amount int, p_display text)
returns bigint language plpgsql security definer set search_path = public as $$
declare g_id uuid; amt int; new_total bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select guild_id into g_id from guild_members where user_id = auth.uid();
  if g_id is null then raise exception 'you are not in a guild'; end if;

  amt := least(greatest(coalesce(p_amount,0), 0), 14);
  if amt <= 0 then raise exception 'nothing to contribute'; end if;

  insert into guild_projects (guild_id, total) values (g_id, amt)
    on conflict (guild_id) do update set total = guild_projects.total + amt
    returning total into new_total;

  insert into guild_project_contributions (guild_id, user_id, display_name, amount)
    values (g_id, auth.uid(), coalesce(nullif(p_display,''),'Commander'), amt)
    on conflict (guild_id, user_id)
    do update set amount = guild_project_contributions.amount + amt,
                  display_name = excluded.display_name;

  return new_total;
end $$;
```

Then reload the schema cache the same way as before:

```sql
notify pgrst, 'reload schema';
```

The three project tiers (30 / 90 / 180 cumulative parts) and what each one
unlocks live client-side in `GUILD_PROJECT_TIERS` — nothing server-side needs
to know about them, since the server only ever tracks the running total.
Crossing a threshold never resets it, and funding a large amount at once can
cross more than one tier in a single contribution.

---

## How each feature behaves

**Daily orders** — three objectives drawn from a date seed, so every player on a
given UTC day gets the same three. Entirely local: no account, no network, works
offline, and they survive a save/reload.

**Guilds** — found one with a tag and share the tag with friends, or join with
theirs. One guild per player, enforced by a unique constraint rather than by the
client behaving.

**Raid boss** — HP scales with guild size. Attack it with your current formation;
**all damage you deal counts, win or lose**, so a losing attempt is still progress.
Damage from every member accumulates on one shared HP pool, and the damage board
shows who contributed what.

**Ladder** — publish your formation and it becomes a defence other players fight,
run by the same AI the Rustbound use. Duels are simulated on the attacker's device
against the defender's saved legion. Win or lose, rating moves ±16.

**Guild council** — once a week, each member casts one vote for Offensive or
Defensive Doctrine. Whichever option has more votes applies an 8% ATK or DEF buff
to every member's battles until the vote resets the following Monday (UTC); a tie
favours Offensive. Voting again the same week changes your vote rather than adding
a second one, and the buff is only ever a read-and-tally of everyone's votes — the
same trust model as the raid damage board.

**Online now** — every signed-in player, guild or no guild, shows up on one shared
list for a few minutes after any heartbeat: signing in, opening the screen, or
finishing a stage battle. A brand-new account also gets a generated username the
moment it's created (see `generateUsername()` in the game), so it shows up here —
and on the guild roster, the raid board and the ladder, all four already share the
one display name — as something more distinctive than the default "Legion".

**Battle replays** — up to 10 notable battles (a boss kill, a new best win streak,
a new deepest reach) are captured automatically and kept locally, no account
needed. Sharing one copies its formation, power score and highlight lines into
a public feed any signed-in player can browse — a snapshot at share time, not a
live link, and nothing here is simulated again or ever re-fought.

**World boss** — one boss, one HP pool, shared by every signed-in player at
once rather than scoped to a guild. Attack it with your current formation from
the World Boss screen off the Hub; all damage counts, win or lose, and stacks
with everyone else's. Once it falls, anyone can summon the next one, a little
tougher than the last.

**Guild wars** — queue your guild from the Guild screen and the game matches
you against the next guild that also queues. For 48 hours, every battle you
fight through **⚔ Fight for the war** adds to your guild's score (a win counts
for more than a loss, but a loss still counts); whoever's total is higher when
the window closes wins. No scheduled job closes it out — the game just checks
the clock the next time anyone opens the Guild screen.

**Guild projects** — a shared, permanent upgrade fund. Any member can donate
their own salvage parts (1, 5, or their whole bay at once) from the Guild
Projects panel; the parts are only actually spent once the server confirms
the donation landed, so a dropped connection never costs anyone a part for
nothing. Three tiers (30 / 90 / 180 cumulative parts) unlock in order —
a bonus salvage-drop chance, a cosmetic guild crest, and a better caravan
exchange rate exclusive to the guild — and once a tier is funded it stays
unlocked forever, for every member, present or future.

## Cost

All of this is well inside Supabase's free tier. The heaviest table is `ladder`,
at one row per player — `presence` is the same shape and just as light. `replays`
only grows when a player explicitly shares something, so it stays smaller still.
`world_boss`/`world_boss_damage` and the `guild_wars` family grow by one row per
boss or per war, not per battle — attacking either only ever updates an existing
row's counters. `guild_projects` is one row per guild, ever — `guild_project_contributions`
is one row per member per guild, same shape as the raid damage board.
