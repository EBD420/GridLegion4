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

echo
echo "================ $pass_total passed, $fail_total failed ================"
if [ ${#failed_suites[@]} -gt 0 ]; then
  echo "failing suites: ${failed_suites[*]}"
  exit 1
fi
