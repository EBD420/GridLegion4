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

**Redeployment.** Trials trade a handicap for salvage-only pay and skip EXP, recruits and
every long-lived tally on purpose — they're a side activity. Redeployment is the other
kind of "go back": any stage already cleared stays reachable at its own honest
difficulty, for its own honest EXP, recruit odds and salvage — no handicap, no inflated
haul. It's a real fight in every sense that matters: Doctrine, tribe favour,
Battle-Forged Bonds, the War Journal and Commander Rank all still apply. The point is
to send a legion's newest, lowest-level recruits back to secured ground to actually
catch up instead of getting thrown straight at the frontier, and it costs nothing to do
it — your place in the campaign is exactly where you left it the moment you're done.

**Field Promotions.** A bench monster that sat out a battle has a small, independent
chance to pick something up anyway — a trait reroll, a sliver of EXP, or occasionally a
full level, one roll per monster, learning from the sideline. It only applies to real
fights (duels, Raid runs and Trials each already have their own progression layer and
are excluded), and it never touches anyone actually deployed. The bench stops being pure
storage, and always fielding your strongest six stops being the only reasonable move.

**Reinforcement Wave.** A fight that drags past round six risks a second, smaller
Rustbound squad rushing in from the enemy's back row — weaker than a same-stage unit
built the normal way, but a real combatant that has to be fainted like anyone else
before the battle ends. It re-rolls every round past the threshold until it either fires
or the fight ends, and it's excluded from duels, Raid runs, Trials and any fight with a
shielded Commander, so it never piles onto a boss gauntlet that's already hard enough.
It's a mechanical consequence for taking too long, which a "set your formation and watch
it resolve" format otherwise has no room for.

**Campaign Map.** The surface campaign gets an actual node map instead of a bare "Stage
N / 10" counter — the ten-stage spine, plus three optional detours branching off ordinary
(non-boss) stages you've already cleared. A detour fights a tougher version of that same
wave for a specific, guaranteed prize the normal drop roll never hands out: a chunk of
tribe favor, a named part, or a one-off field report for the War Journal. Doesn't touch
battle math for the main line at all, costs nothing to skip, and each detour pays out
once — permanently, the same way cleared stages and the Archive already survive a
Rebirth. Every stage on the spine is tappable too: pick any stage you've already cleared
and jump straight into Redeployment there — same fight, same ordinary rewards, your
actual place in the campaign untouched — without a separate trip to the Redeployment
screen.

**The Camp.** Continuing an existing legion lands on a "welcome back" screen instead
of a blank Hub. If real time has actually passed since the last save — at least half
an hour, scaling up to a full day — the legion quietly earns one small, capped
grant while you were away: a scrap of tribe favor, some EXP for the whole roster, or
a piece of salvage, never enough to substitute for actually playing a stage. Around
it, the tribes camped at the banner comment on how the war's really going, built
entirely from data the game already tracks: Rustbound Doctrine once it's locked onto
an element, a win/loss streak read off real recent stage results, and who's leading
the Ladder this week if that's already loaded. A fresh legion skips straight to the
Hub — there's nothing to welcome it back from — and the Camp stays visitable anytime
afterward from its own Hub button, commentary only, no bonus to re-roll.

**Win Streaks.** Consecutive stage wins quietly speed up how fast the Legion Gauge
charges and nudge the ordinary salvage-roll odds upward — a small, capped bonus (tops
out at five wins running) that reads straight off the same win/loss counter The Camp
already keeps for its own commentary, so the two can never disagree about how a run is
actually going. A single loss resets the bonus to nothing, same as it resets the
streak itself; nothing here swings a fight on its own, it's just real momentum for the
back half of a clean run.

**Draft Augments.** Three times across the surface campaign — entering Stage 3, 6 and
8 — the legion pauses to draft one permanent, legion-shaping perk from a pool of five:
a guaranteed critical on every unit's opening hit, skills that come off cooldown a
turn sooner all battle, a wider roster cap, a flat DEF bump, or a flat crit-chance
bump. Distinct on purpose from the two other "pick something" systems already in the
game — Loadout Gambit is blind and lasts one battle, Commander Rank is automatic and
account-wide forever — this is a seen, deliberate, per-legion choice that compounds
for the rest of the run, and like the roster and formation it's chosen alongside, it
does not survive a Rebirth.

**Set Bonuses.** Equip two salvage parts pulled from the same chassis — a raw one, a
Forged one, an Ace-marked one and a Vanguard trophy all count together — and the beast
wearing them gets a small extra push on top of what each part already grants alone;
three from the same chassis pushes it further still (the two rates don't stack — the
better one simply takes over). No new data and no new screen: it reads the same part
catalog the Salvage Bay already shows, so the Bay itself just started rewarding a real
loadout decision instead of "whichever single part has the biggest number."

**Scavenger Caravan.** A traveling trader who shows up at the Hub on her own clock —
real elapsed time, not the calendar day Daily Orders resets on — with one short-lived
offer: salvage for a tribe's favor, favor for salvage, or a guaranteed recruit for a
chunk of salvage. Take it before she moves on or the offer's gone, no second chance
and no decline button to fuss with. Built on the same idea as The Camp's away-time
bonus rather than a live timer: her clock is only ever checked at the moments a battle
already returns the legion to the Hub, so she can spawn or expire between one login
and the next, but never mid-fight.

**Trophy Case.** A pure-fluff Hub screen that lays out the legion's best moments side
by side — deepest Reach, longest win streak, the toughest Ace and Vanguard ever felled,
and a per-theory tally of Archive findings. Deepest Reach and the Archive already kept
a permanent record of their own; the win streak and the two named-elite kills didn't
(a streak resets on a single loss, and a trophy part is an ordinary, purgeable salvage
item with no memory of its own), so those three get one small high-water mark apiece,
updated at the exact spot the ordinary version of the event already fires. Nothing
here changes how anyone plays — it's just one place for a run's history to be looked
at and admired.

**Monster Nicknames.** Rename any monster in the roster, and the game quietly keeps a
few milestones for it — kills, times fielded, a near-death survival — as a line or two
of flavor on its Salvage Bay card. The same move War Journal made for a run as a
whole, brought down to the level of one beast carried since Stage 1: nothing
mechanical changes, and every counter lives on the monster itself, so fusing it away
or a Rebirth resets its history exactly the way levels and parts already do.

**Online Now.** A shared list of every commander active in the last few minutes —
a plain poll, not a live feed, pinged by signing in, opening the screen, or
finishing a stage battle. Registering a fresh account also generates it a
themed username on the spot instead of leaving it as the default "Legion", so
it shows up here — and on the guild roster, the raid board and the ladder,
which already share that one name — as something worth reading.

**Attendance Streak.** A calendar-day counter, separate from the battle win streak —
this one only tracks whether the legion was opened on consecutive UTC days. Checked
the moment the Hub renders, so it advances on its own with no extra step. A permanent
best mark survives resets and Legion Rebirth, the same as the Trophy Case's other
high-water marks.

**Legion Banners.** A second, achievement-gated glyph shown alongside the existing
salvage-part emblem, worn from the Legion Identity screen and carried through
`legionBanner()` into every surface that already shows it — the guild roster, the
raid board, the ladder and Online Now. Earned permanently by hitting login-streak
milestones, a 10-win battle streak, felling both a Rustbound Ace and a Vanguard, or
ever cracking the Ladder's top 10 — no new network surface, since it rides the exact
same display-name field everything else already sends.

**Battle Replays.** A win worth remembering — felling a boss, hitting a new best win
streak, or reaching a new Deep record — quietly captures itself: the formation
fielded, the power score, and a highlight line pulled straight from that battle's own
War Journal entry. Up to ten are kept locally, oldest dropped first, and any of them
can be shared to a small public feed the rest of the server can browse — one-way and
opt-in, nothing is shared automatically.

**Replay Playback.** Any replay recorded since this feature shipped — yours or
someone else's off the shared feed — can be watched turn by turn instead of read as a
highlight line. A structured action log rides alongside the usual prose log during
battle, and a snapshot of both full rosters at full HP is captured with it, so
pressing **Watch** on a replay card rebuilds the fight in the same unit cards and
attack animations the live battle uses — Play, Pause, single-Step, Restart, and a
1×/2× speed toggle, no rewind. Older replays captured before this shipped, or a
shared row a future update tampers with, are recognized and degrade honestly (the
card just says no full playback was recorded) rather than crashing.

**World Boss.** A single shared monster, server-wide rather than per-guild, with a
big HP pool that scales up each time one falls. Any signed-in commander can summon
one when none is active and take a normal battle against it; the damage that fight
would have dealt gets logged to the boss's HP instead of ending the campaign fight,
capped per hit so one report can't finish it alone. A public damage board credits
who's actually been landing hits, and whoever lands the killing blow gets named on
the victory screen.

**Guild Wars.** A timed, guild-versus-guild score race, layered on top of the guild
system rather than replacing the raid boss or council vote. Declaring war queues a
guild for an opponent; the next guild to queue is matched against it immediately,
nobody waits twice. Every battle fought while a war is active reports its score to
your guild's side instead of the campaign — a win worth more than a loss, but a loss
still counts for something — and once the clock runs out, the higher score wins,
visible to both sides with an honest draw if it's ever exactly tied.

**Hub.** With this many systems, the home screen is grouped into five tabs — Legion,
Records, Campaign, Online, Settings — instead of one long wall of buttons. The
banners above the tabs (story text, terrain, Intel, Doctrine, the Caravan, augment
picks, login streak) and the Deploy-to-Battle panel below them stay put regardless of
which tab is open; only the button grid switches.

**Optional online.** Accounts and cloud saves, guilds with levels, perks and a weekly
council vote, a shared raid boss and a server-wide World Boss, an asynchronous PvP
ladder, timed guild-vs-guild Wars, a shareable Battle Replay feed, and a shared list
of who's active right now. All of it is off until configured, and the single-player
game never depends on it.

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

2660 assertions, no dependencies beyond `node`. The suites extract the script out of
`gridlegion.html` and run it against stub harnesses — a fake DOM, a fake
`localStorage`, and a fake Supabase that models RLS, token expiry, capped writes and
network failure. Nothing touches a real network.

Run it after any change to the game file; both runners exit non-zero on failure, so
either works as a pre-commit hook or in CI.
