# Grid Legion: Rise of the Rustbound

A turn-based monster-tactics game in a single HTML file. Command elemental
beast-tribes against a robotic horde that learns from how you fight.

Open `gridlegion.html` in a browser. That's it — no build step, no dependencies.

## What's in it

**Combat.** A six-element wheel, 3×2 front/back formation, per-stage terrain, and a
Legion Gauge spent in tiers (Purge / Rally / Overdrive). Formation is live: a unit can
**Shift** rows mid-battle, and row synergies recompute instantly — including when a
death breaks one.

**The Rustbound adapt.** They log which element hurt them and counter it: spawn tables
weight toward hard-counters and units wear counter-plating. Lead with a different
element and you get an **Ambush** bonus.

**Salvage & corruption.** Strip parts off defeated enemies and bolt them onto your
beasts for stats and a second (defensive) element — at the cost of rust, which makes
units seize up or turn on their own line.

**Collection.** Identical monsters fuse into Primes; three Primes ascend. Different
elements splice into one of 15 named hybrids, each with its own skill, which count
toward **both** element lines in a row. Every monster rolls one of nine traits.

**Campaign and Deep.** Ten stages with commander fights at 5, 9 and 10 — a shielded
boss behind destructible pylons that it reboots if you're slow. Past stage 10 the Deep
runs endlessly with elite waves every fifth depth.

**Meta.** Six tribes whose favour unlocks champions and blessings; Trials that replay
cleared stages under stackable handicaps; daily scavenger orders drawn from a date seed.
A **Legion Identity** screen lets you rename your legion and assemble a banner from
salvage parts you've actually fielded — it's what shows up for you in the guild roster,
the raid board and the ladder. A **War Journal** writes a short recap after every stage
and boss fight — built from what actually happened in it (who carried the fight, who
landed the finishing blow, the closest call) rather than a fixed template — so your
save file doubles as a readable story of the run so far.

**Optional online.** Accounts and cloud saves, guilds with levels and perks, a shared
raid boss, and an asynchronous PvP ladder. All of it is off until configured, and the
single-player game never depends on it.

## Optional backend

Accounts are disabled out of the box. To enable them:

1. [`docs/SETUP-BACKEND.md`](docs/SETUP-BACKEND.md) — Supabase project, saves table, RLS.
2. [`docs/SETUP-MULTIPLAYER.md`](docs/SETUP-MULTIPLAYER.md) — guilds, raids, ladder, and
   the guild-hall migration.

Both documents include an honest account of what is enforced server-side and what is
merely client-reported. Read the trust-model table before attaching anything of value
to the ladder.

## Tests

```bash
node tests/run.js      # any platform, needs only node
./tests/run.sh         # same thing, if you prefer bash
```

680 assertions, no dependencies beyond `node`. The suites extract the script out of
`gridlegion.html` and run it against stub harnesses — a fake DOM, a fake
`localStorage`, and a fake Supabase that models RLS, token expiry, capped writes and
network failure. Nothing touches a real network.

Run it after any change to the game file; both runners exit non-zero on failure, so
either works as a pre-commit hook or in CI.
