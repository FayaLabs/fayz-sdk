#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# loop.sh — the 12-hour dogfood sprint driver (the local routine).
#
# Runs one iteration (run-once.sh) every 15 min, keeps the Mac awake, never
# overlaps iterations, and stops after HOURS. Safe to Ctrl-C at any time.
#
#   START:   bash docs/dogfood-sprint/loop.sh
#   BACKGND: nohup bash docs/dogfood-sprint/loop.sh >/dev/null 2>&1 &
#   WATCH:   tail -f docs/dogfood-sprint/runs/loop.log
#   STOP:    Ctrl-C  (or: pkill -f dogfood-sprint/loop.sh)
#
# Env overrides:  HOURS=12  INTERVAL=900  MODEL=claude-opus-4-8
# ---------------------------------------------------------------------------
set -uo pipefail

SPRINT_DIR="/Users/fayalabs/dev/fayz-sdk/docs/dogfood-sprint"
RUNS_DIR="$SPRINT_DIR/runs"
LOCK="$SPRINT_DIR/.loop.lock"
INTERVAL="${INTERVAL:-900}"   # 15 min between iterations
HOURS="${HOURS:-12}"          # total run length

mkdir -p "$RUNS_DIR"
END=$(( $(date +%s) + HOURS*3600 ))
log() { echo "[loop] $*" | tee -a "$RUNS_DIR/loop.log"; }

log "start $(date '+%F %T') · every ${INTERVAL}s · model=${MODEL:-claude-sonnet-4-6} · until $(date -r "$END" '+%F %T')"

caffeinate -i -w $$ &   # prevent idle sleep for the life of this loop
trap 'log "stopped by signal $(date '"'"'+%F %T'"'"')"; rm -f "$LOCK"; exit 0' INT TERM

n=0
while [ "$(date +%s)" -lt "$END" ]; do
  if [ -f "$LOCK" ]; then
    log "previous iteration still running — skipping this tick"
  else
    n=$((n+1)); touch "$LOCK"
    ITER_LOG="$RUNS_DIR/iter-$(date '+%Y%m%d-%H%M%S').log"
    log "iteration #$n → $ITER_LOG"
    bash "$SPRINT_DIR/run-once.sh" >"$ITER_LOG" 2>&1
    log "iteration #$n done (exit $?)"
    rm -f "$LOCK"
  fi
  sleep "$INTERVAL"
done
log "finished $(date '+%F %T') after $n iterations"
