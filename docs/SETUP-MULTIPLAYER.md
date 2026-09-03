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

create policy "members of a guild can see each other"
  on public.guild_members for select to authenticated
  using (guild_id in (select guild_id from public.guild_members where user_id = auth.uid()));

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

## Cost

All of this is well inside Supabase's free tier. The heaviest table is `ladder`,
at one row per player.
