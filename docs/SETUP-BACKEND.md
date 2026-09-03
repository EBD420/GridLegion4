# Grid Legion — cloud accounts setup

The game ships with accounts **switched off**. As delivered it is one self-contained
HTML file: three local legion slots per browser, plus transfer codes. Everything below
is optional, takes about five minutes, and is reversible — blank the config and the
game returns to local-only with no other changes.

There is no SDK to install. The game talks to Supabase's REST endpoints with `fetch`,
so the file stays standalone and there is no CDN dependency to rot.

---

## 1. Create the project

1. Sign up at <https://supabase.com> (the free tier is plenty for this).
2. **New project** → give it a name and a database password → wait for it to finish building.
3. Go to **Project Settings → API** and copy two values:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **publishable key** — starts `sb_publishable_...` (older projects show an
     **anon / public** key starting `eyJ...`; either works)

## 2. Create the table

Open **SQL Editor** in the Supabase dashboard, paste this in, and run it:

```sql
create table public.legions (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  slot       smallint    not null check (slot >= 0 and slot < 3),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

-- Without this line every player could read every other player's saves.
alter table public.legions enable row level security;

create policy "players read their own legions"
  on public.legions for select
  using (auth.uid() = user_id);

create policy "players write their own legions"
  on public.legions for insert
  with check (auth.uid() = user_id);

create policy "players update their own legions"
  on public.legions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "players delete their own legions"
  on public.legions for delete
  using (auth.uid() = user_id);
```

The row-level-security policy is what actually protects player data. Do not skip it.

## 3. Turn off email confirmation (recommended for a game)

**Authentication → Sign In / Providers → Email** → turn **Confirm email** off.

With it on, a new player has to go and click a link in their inbox before they can play.
The game handles that case correctly — it tells them to check their email — but for a
browser game it is friction most people won't push through.

## 4. Point the game at your project

Open `gridlegion.html`, find this block near the top of the `<script>`, and fill it in:

```js
const CLOUD = {
  url:     'https://xajawfulezqwqiemfvvb.supabase.co',
  anonKey: 'sb_publishable_VqsfO86J36yx2o5O_WFUMg_SxWJmzfW',
};
```

**This is already filled in with your project.** A **Sign in / Create account** button
now appears on the Legions screen.

### About that key

A publishable key is designed to sit in client-side code where anyone can read it, and
Supabase documents it that way. Your data is protected by the RLS policy above, not by
hiding the key.

**Never** put a secret key here — `sb_secret_...` or the legacy `service_role` key. Those
bypass row-level security entirely, and anyone who viewed source could read and delete
every player's save. The game refuses to run a self-test if it spots one, but do not rely
on that as your safety net.

## 5. Host it

Cloud saves need the page served over `https://`, not opened as a `file://` document.
Any static host works — drag the file onto [Netlify Drop](https://app.netlify.com/drop),
or use Vercel, Cloudflare Pages, or GitHub Pages.

Then in Supabase go to **Authentication → URL Configuration** and add your site's URL to
**Site URL** / **Redirect URLs**.

Local-only play still works fine from a `file://` document — it is just the account half
that needs real hosting.

---

## Checking it works

Open the game → **Legions** → **Sign in / Create account** → **🩺 Test connection**.
It reports, in order:

- whether the project is reachable and the key is accepted;
- whether the `legions` table exists (if not, you skipped step 2);
- whether row-level security is actually protecting that table.

That last check is the one to watch. If a signed-out request can read rows, the test says
so in red — that means the RLS policy did not apply and every player's saves are readable
by anyone. Re-run the SQL from step 2 before letting other people play.

The test is available before signing in, so you can verify the setup without creating an
account first.

## How syncing behaves

- **Local first.** Every save is written to the browser immediately, so play never waits
  on the network. The cloud push happens ~1.5s later in the background.
- **Newest wins.** On sign-in the game pulls your cloud legions and compares each slot's
  timestamp against the local one. The newer save survives; nothing is silently thrown away.
- **Offline is fine.** If the network is down, saves stay local, the status line says so,
  and the queued push retries on the next save.
- **Expired sessions self-heal.** An expired token is refreshed automatically. If the
  refresh itself fails, the player is signed out cleanly rather than being stuck.
- **Corrupt data is rejected**, whether it comes from the cloud, the browser, or a pasted
  transfer code. A bad payload is dropped and the good save is left alone.

## Cost

Supabase's free tier covers roughly 50,000 monthly active users and 500MB of database.
A save is a few kilobytes. You will not get near either limit without a real audience.

## Turning it back off

Blank the two `CLOUD` values. The account UI disappears, no network calls are made, and
local legions carry on exactly as before.
