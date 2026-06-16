#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run-once.sh — ONE dogfood-sprint iteration via headless Claude Code.
#
# Reads the prompt from iteration-prompt.txt, runs exactly one CADENCE task
# (read ledger -> do one small task -> verify -> commit on a sprint branch),
# then exits. Called by loop.sh every 15 min, or by launchd, or by hand.
#
# Env overrides:
#   MODEL=claude-opus-4-8   harder tasks (default: sonnet — cheaper for the grind)
#   MAXSECS=900             hard per-iteration timeout in seconds
# ---------------------------------------------------------------------------
set -uo pipefail

# launchd/cron start with a minimal PATH — make the tools resolvable.
export PATH="/Users/fayalabs/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SDK_DIR="/Users/fayalabs/dev/fayz-sdk"
APP_DIR="/Users/fayalabs/dev/fayz-app"
SPRINT_DIR="$SDK_DIR/docs/dogfood-sprint"
MODEL="${MODEL:-claude-sonnet-4-6}"
MAXSECS="${MAXSECS:-900}"

cd "$SDK_DIR" || exit 1
PROMPT="$(cat "$SPRINT_DIR/iteration-prompt.txt")"

# Scoped permissions: edits auto-accepted; only these command families allowed;
# push and recursive-delete explicitly denied. Nothing leaves the machine.
ALLOW=(
  Edit Write Read Glob Grep TodoWrite
  "Bash(git:*)" "Bash(pnpm:*)" "Bash(node:*)" "Bash(npx:*)"
  "Bash(ls:*)" "Bash(cat:*)" "Bash(find:*)" "Bash(mkdir:*)" "Bash(grep:*)" "Bash(echo:*)" "Bash(sed:*)" "Bash(awk:*)"
)
DENY=( "Bash(git push:*)" "Bash(git push)" "Bash(rm -rf:*)" )

echo "=== iteration start $(date '+%F %T')  model=$MODEL  timeout=${MAXSECS}s ==="
claude -p "$PROMPT" \
  --add-dir "$APP_DIR" \
  --permission-mode acceptEdits \
  --model "$MODEL" \
  --output-format text \
  --disallowedTools "${DENY[@]}" \
  --allowedTools "${ALLOW[@]}" &
CPID=$!
( sleep "$MAXSECS"; kill -TERM "$CPID" 2>/dev/null ) & WPID=$!
wait "$CPID"; STATUS=$?
kill "$WPID" 2>/dev/null
echo "=== iteration end $(date '+%F %T')  status=$STATUS ==="
exit "$STATUS"
