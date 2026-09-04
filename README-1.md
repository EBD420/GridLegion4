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

**Commander Rank.** A permanent progression track that lives outside any one legion —
it survives a full wipe, a fresh start, or prestiging into the Deep. Ten ranks, each
battle you fight (win or lose, on any legion) feeds it, and it unlocks small permanent
perks: a starting salvage part, extra roster slots, a flat EXP and salvage edge.

**Warlord sub-factions.** Beyond the three scripted commander fights, three named
warlords — Ashclaw, Tidewrack, Galevane, each with its own look, element and drone
type — show up at stage 7 and then cyclically every 10th Deep depth (offset from both
elite waves and the Foundry Core, so they never double up). They run through the exact
same boss rig as a scripted commander: shield, pylons, reboot, the works.

**Victory Portrait.** A big win — a commander or warlord kill, or a clean campaign
finale — generates a small themed scene crediting whichever monster carried the fight,
attached to that battle's War Journal entry so it stays part of the run's story.

**Guild council.** Once a week, guild members vote Offensive or Defensive Doctrine;
whichever is leading applies an 8% ATK or DEF buff to every member's battles until the
vote resets the following Monday. Lightweight and asynchronous — a read-and-tally of
everyone's votes, same trust model as the raid damage board.

**Mentor bonds.** Deploy a big level gap between two monsters and they pair up
automatically: the rookie earns 50% bonus EXP, the veteran fights at +5% ATK. A real
reason to rotate weaker monsters through your line instead of always running your
strongest three.

**Codex set bonuses.** Filling in an entire bestiary section — every tribe, every
chassis, every hybrid, every commander and warlord, every battlefield, every salvage
part, every trait — grants a small permanent passive the instant the last entry is
recorded: an extra roster slot, bonus EXP, better salvage odds, a boss-fight ATK/DEF
edge, a Legion Gauge head start, cheaper rust, or legion-wide SPD. The bestiary screen
shows exactly what's locked and what's already paying off.

**Legion Rebirth.** A voluntary prestige reset, once you've reached Stage 5: wipe this
legion's roster, levels and current stage back to the start, on purpose, in exchange
for a small permanent stat edge that stacks with every rebirth and a star mark on your
banner. Everything collected — the bestiary, tribe favour, champions, cleared trials,
the salvage bay, the War Journal — rides through untouched. Only the grind resets.
Deliberately a different axis from Commander Rank, which accrues just from playing and
never costs anything.

**The Forge.** A sink for salvage that's outgrown its usefulness raw: feed 3 of the
same part in and get back one named, upgraded part — a stronger version of the stat it
already had, plus a second stat the raw part never carried. Forged parts install and
purge exactly like any other.

**Raid mutators.** Every raid boss your guild summons draws 1–2 modifiers from a small
pool — enraged past half health, warded against one element, a bonus-salvage
attempt — seeded off that boss's own row so every guild member sees the identical
loadout with no extra setup, and it reshuffles the moment a new boss is summoned.

**Procedural sprites.** Every monster, chassis, hybrid, commander and warlord — all
40 of them — now draws as a small vector creature instead of an emoji: a body shape
(organic / mech / disc / core) plus a handful of accents (ears, horns, wings, a tail,
spikes, an antenna...), colored live from the same six-element palette used
everywhere else, so a two-element hybrid genuinely shows both parent colors on one
body. Nothing is a static image — every sprite is built from a short recipe and drawn
as inline SVG the instant it's needed, in battle, on a roster card, in the bestiary,
and on a boss's Victory Portrait.

**A live battlefield.** Battle moved off one generic stacked block onto two facing
lanes — your legion on the left, the Rustbound on the right, front row of each
nearest the center so there's a real "toward the enemy" direction. Every strike
lunges the attacker in, knocks the defender back, and throws a short burst of
element-colored particles (embers, a splash, a leaf, a rock chip, a spark, a gust)
at the point of impact; idle sprites get a small ambient bob so the field never sits
dead still between turns. A live turn-order strip above the field shows who's acting
now and who's up next, reading straight off the same queue the engine already runs
on. All of it respects a reduced-motion preference the same way the existing hit
flashes and screen shake already did.

**Battle-Forged Bonds.** Two monsters that keep fighting side by side — deployed
together, both still standing when a fight is won, enough times running — quietly
earn a small ATK/DEF edge whenever they're fielded together after that. Tracked by
species pair rather than the individual monster, so it survives either one evolving
into a Prime or an Ascended form and only ever really breaks if one splices into a
hybrid. No progress bar, no counter — just a small badge once a bond actually goes
live, same restraint as the existing Mentor Bond icons. A different axis from Mentor
Bonds: that one rewards a level gap, this one rewards history.

**Rustbound Aces.** A rare, named elite can turn up embedded in an otherwise ordinary
wave — visibly tougher than its squadmates, but not a shielded commander fight. Kill
one and it's guaranteed to leave behind its own part, cosmetically marked as
Ace-Marked and installed, purged and banner-worn exactly like any other salvage.

**Split-Phase bosses.** The Deep now cycles a second kind of milestone alongside the
Foundry Core: a Fracture Engine, with two independently targetable, independently
elemented halves — an armored Anchor Core and a fast, burning Cleaver Rig — live from
the first turn, no shield or pylons at all. Which one you focus first is the entire
fight.

**Rustbound Doctrine.** The Rustbound Intel banner already reads the last few fights;
Doctrine is the same idea stretched across the whole save file instead of the last five
wins. It quietly tallies which element you've actually leaned on, which row carries the
formation, and which monster has racked up the most kills — for as long as this legion
has existed, Rebirth included, the same way Battle-Forged Bonds already survive it. Once
there's enough history to draw a real conclusion, the enemy roster permanently skews a
little harder toward whatever counters your lifetime-favourite element, on top of (and
independent from) Intel's own short-term read, and the War Journal writes a line when
the case file actually escalates. A save with real history behind it fights a subtly
different, slower war than a fresh one at the same stage.

**Rustbound Archive.** Deep-only, rare, and not a checklist: winning a fight down there
has a small chance to turn up a fragment of ambiguous Rustbound origin lore instead of
loot. Twelve fragments exist, three apiece behind four unproven theories, and which ones
a given legion happens to find decides which theory (if any) reads as "leading" for that
save — two players can walk away with genuinely different beliefs about what the
Rustbound actually are. Survives Rebirth, same as everything else that counts as
knowledge rather than gear.

**The Depth Chart.** War Journal tells the story of a run in prose; this shows its
shape at a glance instead. A generated vertical timeline plots every milestone this
legion has ever cleared at its real depth — Foundry Core, a named Warlord, the Fracture
Engine, an elite wave — with a live "you are here" marker on the depth currently being
fought. It draws straight off the same `cleared`/`bestDepth` history the Bestiary and
Rebirth already keep, so it needed no new save data of its own, and like the Archive and
Doctrine, nothing on it resets when the legion is reborn.

**Cascade Overkill.** A killing blow that does more than it needed to doesn't just waste
the excess: the overflow splashes into the next living unit in that same row, on either
side of the fight. A big crit stops being a single kill and starts being a potential
two-for-one, which changes how a formation actually gets built — stacking fragile units
in one row turns them into cascade bait, and fielding a tough unit in front of a fragile
ally can turn that ally's own protection into a liability the moment the front one falls
hard enough. One splash per kill, never a chain reaction down the whole row.

**The Vanguard Bounty.** Elite Waves can carry a named Vanguard among their escort —
visibly tougher, clearly marked from the moment the fight starts. Unlike a Rustbound Ace,
its reward is never guaranteed: killing it first, while its escort still stands, gets
nothing at all. Only clearing the rest of the wave and leaving the Vanguard for last pays
out — a real part with a genuine (if modest) stat edge, not just a cosmetic marker. It
rewards reading the whole enemy formation instead of reflexively focusing the scariest
thing on the field.

**Loadout Gambit.** Before a real fight — a Warlord, a Foundry Core, the Fracture Engine,
an Elite Wave — three blind, one-battle modifiers are offered and exactly one can be
picked: a guaranteed opening crit, a faster Legion Gauge at the cost of raw damage, extra
DEF at the cost of gauge speed, extra SPD at the cost of being easier to crit, or a
lean into finishing off already-wounded targets at the cost of chip damage against full-
health ones. Every option cuts both ways, it never lasts past that one battle, and it
stays out of duels, raids and Trials entirely — each of those already has its own
difficulty layer, and stacking a fourth on top would just be noise.

**Threat Preview.** The Formation screen now carries a deliberately partial pre-battle
tell: which of the deployed monsters the enemy's fastest fielded unit would most likely
open on, and with what element — computed by actually running the real `getValidTargets`/
`scoreTarget` logic the battle engine itself uses for its opening move, against one
sampled enemy team. It's a scouting read on a likely draw, not a guarantee of the exact
fight ahead, but it turns formation-building into a real puzzle instead of a guess while
leaving the fight itself to still play out as a surprise.

**Optional online.** Accounts and cloud saves, guilds with levels, perks and a weekly
council vote, a shared raid boss, and an asynchronous PvP ladder. All of it is off
until configured, and the single-player game never depends on it.

## Optional backend

Accounts are disabled out of the box. To enable them:

1. [`docs/SETUP-BACKEND.md`](docs/SETUP-BACKEND.md) — Supabase project, saves table, RLS.
2. [`docs/SETUP-MULTIPLAYER.md`](docs/SETUP-MULTIPLAYER.md) — guilds, raids, ladder, the
   guild-hall migration, and the (optional) weekly guild council vote.

Both documents include an honest account of what is enforced server-side and what is
merely client-reported. Read the trust-model table before attaching anything of value
to the ladder.

## Tests

```bash
node tests/run.js      # any platform, needs only node
./tests/run.sh         # same thing, if you prefer bash
```

1803 assertions, no dependencies beyond `node`. The suites extract the script out of
`gridlegion.html` and run it against stub harnesses — a fake DOM, a fake
`localStorage`, and a fake Supabase that models RLS, token expiry, capped writes and
network failure. Nothing touches a real network.

Run it after any change to the game file; both runners exit non-zero on failure, so
either works as a pre-commit hook or in CI.
