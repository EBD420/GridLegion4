#!/usr/bin/env bash
# Runs every suite against gridlegion.html. No dependencies beyond node.
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# The game is a single HTML file; extract its script so node can load it.
node -e '
const fs=require("fs"), m=fs.readFileSync("gridlegion.html","utf8").match(/<script>([\s\S]*)<\/script>/);
if(!m){ console.error("could not find the script block"); process.exit(1); }
fs.writeFileSync(process.argv[1], m[1]);
' "$TMP/game.js" || exit 1

node --check "$TMP/game.js" || { echo "SYNTAX ERROR in gridlegion.html"; exit 1; }
echo "syntax ok"

H="$ROOT/tests/harness"
S="$ROOT/tests/suites"
pass_total=0; fail_total=0; failed_suites=()

# Each entry: "label | harness | suite files (in order)"
run () {
  local label="$1" harness="$2"; shift 2
  local out file="$TMP/$label.js"
  cat "$H/$harness" "$TMP/game.js" "$@" > "$file"
  out="$(node "$file" 2>&1)"
  local line; line="$(echo "$out" | tail -1)"
  local p f
  p="$(echo "$line" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)"
  f="$(echo "$line" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)"
  pass_total=$((pass_total+p)); fail_total=$((fail_total+f))
  if [ "$f" != "0" ] || [ "$p" = "0" ]; then
    failed_suites+=("$label")
    printf '  %-26s %s\n' "$label" "FAILED"
    echo "$out" | grep -E 'FAIL|HARNESS ERROR' | sed 's/^/      /'
  else
    printf '  %-26s %s passed\n' "$label" "$p"
  fi
}

echo "running suites..."
run gameplay        dom-storage-server.js "$S/01-core.js" "$S/02-gauge-exp.js" "$S/03-hybrids.js" "$S/04-traits-ascension.js" "$S/05-deep-run.js" "$S/06-persistence.js" "$S/07-auth-sync.js"
run config-selftest dom-storage-server.js "$H/assert.js" "$S/08-config-selftest.js"
run bosses-tribes   dom-storage-server.js "$H/assert.js" "$S/09-bosses-trials-tribes.js"
run social          dom-storage-server.js "$H/assert.js" "$S/10-social.js"
run setup-diagnosis dom-storage-server.js "$H/assert.js" "$S/11-setup-diagnosis.js"
run guild-hall      dom-storage-server.js "$H/assert.js" "$S/12-guild-hall.js"
run ai-audio-coach  dom-storage-server.js "$H/assert.js" "$S/13-ai-audio-tutorial.js"
run harvest-codex   dom-storage-server.js "$H/assert.js" "$S/14-harvest-codex-tactical.js"
run legion-identity dom-storage-server.js "$H/assert.js" "$S/15-legion-identity.js"
run war-journal     dom-storage-server.js "$H/assert.js" "$S/16-war-journal.js"
run commander-victory dom-storage-server.js "$H/assert.js" "$S/17-commander-victory.js"
run warlord-factions  dom-storage-server.js "$H/assert.js" "$S/18-warlord-factions.js"
run guild-council      dom-storage-server.js "$H/assert.js" "$S/19-guild-council.js"
run mentor-bonds       dom-storage-server.js "$H/assert.js" "$S/20-mentor-bonds.js"
run codex-bonuses      dom-storage-server.js "$H/assert.js" "$S/21-codex-bonuses.js"
run legion-rebirth     dom-storage-server.js "$H/assert.js" "$S/22-legion-rebirth.js"
run the-forge          dom-storage-server.js "$H/assert.js" "$S/23-the-forge.js"
run raid-mutators      dom-storage-server.js "$H/assert.js" "$S/24-raid-mutators.js"
run sprites            dom-storage-server.js "$H/assert.js" "$S/25-sprites.js"
run battle-ui          dom-storage-server.js "$H/assert.js" "$S/26-battle-ui.js"
run battle-forged-bonds dom-storage-server.js "$H/assert.js" "$S/27-battle-forged-bonds.js"
run rustbound-aces      dom-storage-server.js "$H/assert.js" "$S/28-rustbound-aces.js"
run split-phase-boss    dom-storage-server.js "$H/assert.js" "$S/29-split-phase-boss.js"
run rustbound-doctrine  dom-storage-server.js "$H/assert.js" "$S/30-rustbound-doctrine.js"
run archive-fragments   dom-storage-server.js "$H/assert.js" "$S/31-archive-fragments.js"
run depth-chart         dom-storage-server.js "$H/assert.js" "$S/32-depth-chart.js"
run cascade-overkill    dom-storage-server.js "$H/assert.js" "$S/33-cascade-overkill.js"
run vanguard-bounty     dom-storage-server.js "$H/assert.js" "$S/34-vanguard-bounty.js"
run loadout-gambit      dom-storage-server.js "$H/assert.js" "$S/35-loadout-gambit.js"
run threat-preview      dom-storage-server.js "$H/assert.js" "$S/36-threat-preview.js"
run redeployment        dom-storage-server.js "$H/assert.js" "$S/37-redeployment.js"
run field-promotions    dom-storage-server.js "$H/assert.js" "$S/38-field-promotions.js"
run reinforcement-wave  dom-storage-server.js "$H/assert.js" "$S/39-reinforcement-wave.js"
run campaign-map        dom-storage-server.js "$H/assert.js" "$S/40-campaign-map.js"
run the-camp            dom-storage-server.js "$H/assert.js" "$S/41-the-camp.js"
run win-streaks         dom-storage-server.js "$H/assert.js" "$S/42-win-streaks.js"
run draft-augments      dom-storage-server.js "$H/assert.js" "$S/43-draft-augments.js"
run set-bonuses         dom-storage-server.js "$H/assert.js" "$S/44-set-bonuses.js"
run scavenger-caravan   dom-storage-server.js "$H/assert.js" "$S/45-scavenger-caravan.js"
run trophy-case         dom-storage-server.js "$H/assert.js" "$S/46-trophy-case.js"
run monster-nicknames   dom-storage-server.js "$H/assert.js" "$S/47-monster-nicknames.js"
run online-now          dom-storage-server.js "$H/assert.js" "$S/48-online-now.js"
run attendance-banners  dom-storage-server.js "$H/assert.js" "$S/49-attendance-banners.js"
run battle-replays      dom-storage-server.js "$H/assert.js" "$S/50-battle-replays.js"
run world-boss          dom-storage-server.js "$H/assert.js" "$S/51-world-boss.js"
run guild-wars          dom-storage-server.js "$H/assert.js" "$S/52-guild-wars.js"

echo
echo "================ $pass_total passed, $fail_total failed ================"
if [ ${#failed_suites[@]} -gt 0 ]; then
  echo "failing suites: ${failed_suites[*]}"
  exit 1
fi
