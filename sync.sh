#!/usr/bin/env bash
# Refresh the repo from the working copy, verify, commit and push.
# Refuses to push if the tests fail — a broken game should never reach main.
set -uo pipefail
cd "$(dirname "$0")"
SRC="${SRC:-/root}"
MSG="${1:-Update Grid Legion}"

# This script exists to refresh the repo from Claude's working copy before
# publishing. If that copy isn't here (e.g. you're running it on your own
# machine after unzipping), say so loudly rather than committing nothing.
if [ ! -f "$SRC/gridlegion.html" ]; then
  echo "No source build found at $SRC/gridlegion.html."
  echo
  echo "If you just want to test and push what is already in this repo, use:"
  echo "    bash tests/run.sh && git push"
  echo "Set SRC=/path/to/working/copy to refresh from somewhere else."
  exit 1
fi

cp "$SRC/gridlegion.html" ./gridlegion.html
cp "$SRC/SETUP-BACKEND.md" "$SRC/SETUP-MULTIPLAYER.md" ./docs/ 2>/dev/null

if ! ./tests/run.sh; then
  echo
  echo "REFUSING TO PUSH: tests are failing."
  exit 1
fi

if git diff --quiet && git diff --cached --quiet; then
  echo "no changes to publish"
  exit 0
fi

git add -A
git -c commit.gpgsign=false commit -q -m "$MSG

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CgkU9C6pGtj3S6DsFWYtGn"
echo "committed: $MSG"

if git remote get-url origin >/dev/null 2>&1; then
  git push -q origin HEAD && echo "pushed to $(git remote get-url origin | sed 's#//[^@]*@#//#')"
else
  echo "no remote configured yet — commit is local only"
fi
