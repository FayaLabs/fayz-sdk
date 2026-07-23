#!/usr/bin/env bash
# Migration bench: applies packages/shop/migrations to a throwaway Postgres and
# runs the behaviour regressions against it. Nothing here touches a real project.
#
#   ./run-migrations.sh              # apply everything, then run the regressions
#   ./run-migrations.sh --baseline   # stop before 0008, to see the defects it fixes
#
# Requires docker. The container is recreated on every run, so state never leaks
# between runs.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
FINANCIAL="$HERE/../../../plugins/plugin-financial/src/migrations"
CONTAINER=fayz-shop-migration-bench
BASELINE_ONLY=false
[[ "${1:-}" == "--baseline" ]] && BASELINE_ONLY=true

# Applied in order. 0006 is intentionally skipped: it references a metadata
# column that never existed and 0006b is its correction (see 0006b's header).
BASELINE=(
  0001_shop_tables
  0002_shop_storefront_rls
  0003_shop_place_order
  0004_shop_get_order
  0005_storefront_anon_grants
  0006b_confirm_payment_no_metadata
)
HARDENING=(
  0008_shop_place_order_hardening
  0009_products_canonical
  0010_addresses_and_payments
  0011_place_order_address_payment
  0012_core_addresses_and_payments
  0013_core_orders_customers_categories
  0014_link_payments_to_core_order
  0015_server_side_shipping
  0016_close_integration_gaps
  0017_shipping_matches_cart
  0018_core_fulfillments
  0019_payment_authority_and_catalog_scope
  0020_catalog_requires_store_header
  0021_shipping_zones
  0022_quote_exposes_free_above
  0023_order_to_cash_bridge
  0024_retire_shop_transactions
  0025_repair_backfilled_receipts
)

psql_run() { docker exec "$CONTAINER" psql -U postgres -d shop -v ON_ERROR_STOP=1 -q "$@"; }

echo "→ starting throwaway postgres"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop postgres:16-alpine >/dev/null
# pg_isready reports ready during init while the server is still restarting, so
# wait on an actual query instead.
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" psql -U postgres -d shop -c 'select 1' >/dev/null 2>&1 && break
  sleep 1
done

docker cp "$HERE/prelude.sql" "$CONTAINER:/tmp/prelude.sql" >/dev/null
docker cp "$MIGRATIONS" "$CONTAINER:/tmp/migrations" >/dev/null
docker cp "$FINANCIAL" "$CONTAINER:/tmp/financial" >/dev/null
docker cp "$HERE/order-rpc.regression.sql" "$CONTAINER:/tmp/regression.sql" >/dev/null
docker cp "$HERE/products-canonical.regression.sql" "$CONTAINER:/tmp/regression2.sql" >/dev/null
docker cp "$HERE/addresses.regression.sql" "$CONTAINER:/tmp/regression3.sql" >/dev/null
docker cp "$HERE/core-consolidation.regression.sql" "$CONTAINER:/tmp/regression4.sql" >/dev/null
docker cp "$HERE/fulfillment.regression.sql" "$CONTAINER:/tmp/regression5.sql" >/dev/null
docker cp "$HERE/security.regression.sql" "$CONTAINER:/tmp/regression6.sql" >/dev/null
docker cp "$HERE/shipping-zones.regression.sql" "$CONTAINER:/tmp/regression7.sql" >/dev/null
docker cp "$HERE/order-to-cash.regression.sql" "$CONTAINER:/tmp/regression8.sql" >/dev/null

echo "→ supabase stubs (auth.uid, user_tenant_ids, storage)"
psql_run -f /tmp/prelude.sql

# The financial plugin's own schema. The shop's order-to-cash bridge writes
# receivables into plg_financial_movements and calls fn_invoice_from_order, so
# the bench has to carry the real thing rather than a stub of it — a stub would
# let the bridge pass here and fail against the actual module.
echo "→ plugin-financial schema"
for f in 000_plg_rename 001_financial_base 002_chart_of_accounts 003_card_brands \
         004_order_to_cash 005_seed_defaults 006_rls_policies 006b_extract_fee_amount \
         007_reconciliation 007b_movement_payment_method_type 008_split_payment_movements \
         009_agent_rpcs 010_invoice_internal; do
  printf '   %s ... ' "$f"
  # `cmd && echo ok` is a CONDITION, so `set -e` does not fire on failure: a
  # migration that errored printed its ERROR, skipped the "ok", and the bench
  # carried on to grade a half-provisioned database. 0024's receipt backfill was
  # dead for exactly this reason and the run still said "all regressions passed".
  psql_run -f "/tmp/financial/$f.sql" || { echo "FAILED"; exit 1; }
  echo ok
done

to_apply=("${BASELINE[@]}")
$BASELINE_ONLY || to_apply+=("${HARDENING[@]}")
for m in "${to_apply[@]}"; do
  printf '→ %s ... ' "$m"
  psql_run -f "/tmp/migrations/$m.sql" || { echo "FAILED"; exit 1; }
  echo ok
done

echo
echo "→ regressions"
# Each file runs EXACTLY once: these regressions mutate state, so a second
# pass would grade a different database than the one that was printed.
failed=false
for f in /tmp/regression.sql /tmp/regression2.sql /tmp/regression3.sql /tmp/regression4.sql /tmp/regression5.sql /tmp/regression6.sql /tmp/regression7.sql /tmp/regression8.sql; do
  $BASELINE_ONLY && [ "$f" != /tmp/regression.sql ] && continue
  out="$(docker exec "$CONTAINER" psql -U postgres -d shop -q -f "$f" 2>&1)"
  echo "$out" | grep -E '^===|PASS|FAIL|ERROR' || true
  # ERROR counts too: a statement that blew up is not a passing regression,
  # and grepping only for FAIL once reported a green run with four errors on screen.
  echo "$out" | grep -qE 'FAIL|^ERROR|: ERROR' && failed=true
done

# ---------------------------------------------------------------------------
# Replay pass — the guarantee that matters for an ALREADY-PROVISIONED pool.
#
# Every live app (resto-saas, beauty-saas, the storefronts) runs against a pool
# where these files have already been applied once. `fayz db apply` re-runs a
# file whenever its checksum moves, so a form that only works on an empty
# database is a production break waiting for the next edit. The static checker
# (scripts/check-idempotent-migrations.mjs) catches the DDL shapes; only this
# proves the DO-blocks, backfills and repairs are no-ops the second time.
#
# Run AFTER the regressions: they leave real orders, receivables and receipts
# behind, so the replay executes against populated tables rather than empty
# ones — which is the case that actually breaks.
#
# The chain runs TWICE and the assertion compares the two replays, not the
# regressions to the first replay. The first replay legitimately writes: the
# regressions just placed orders, and 0024's backfill exists precisely to raise
# the receivable for an order that has none. Grading that pass as "must not
# write" flags correct convergence as a defect. What must hold is that a chain
# applied to a database it has ALREADY converged is inert — so pass two is the
# one that must move nothing.
# ---------------------------------------------------------------------------
counts() {
  docker exec "$CONTAINER" psql -U postgres -d shop -At -c \
    "select (select count(*) from public.orders)
         || '/' || (select count(*) from public.plg_financial_movements)
         || '/' || (select count(*) from public.addresses)"
}

replay_once() {
  local label="$1" f m
  for f in 000_plg_rename 001_financial_base 002_chart_of_accounts 003_card_brands \
           004_order_to_cash 005_seed_defaults 006_rls_policies 006b_extract_fee_amount \
           007_reconciliation 007b_movement_payment_method_type 008_split_payment_movements \
           009_agent_rpcs 010_invoice_internal; do
    psql_run -f "/tmp/financial/$f.sql" >/dev/null \
      || { echo "   REPLAY $label FAILED at financial/$f"; return 1; }
  done
  # 0001 is frozen: it reached live pools before the replay rule existed, so its
  # bytes can never change (editing an applied file moves its ledger checksum and
  # hard-stops `db apply` with MigrationDriftError). Its checksum therefore never
  # moves and it is never re-applied in practice — the same carve-out
  # scripts/check-idempotent-migrations.mjs makes in LEGACY_APPLIED_ALLOWLIST.
  for m in "${to_apply[@]}"; do
    [ "$m" = 0001_shop_tables ] && continue
    psql_run -f "/tmp/migrations/$m.sql" >/dev/null \
      || { echo "   REPLAY $label FAILED at $m"; return 1; }
  done
}

if ! $BASELINE_ONLY && ! $failed; then
  echo "→ replay (idempotency on an already-provisioned database)"
  if ! replay_once 1; then
    failed=true
  else
    settled="$(counts)"
    if ! replay_once 2; then
      failed=true
    else
      final="$(counts)"
      # A backfill that re-inserts is as broken as one that throws — it doubles a
      # pool's history silently, and nothing downstream would notice.
      if [ "$settled" != "$final" ]; then
        echo "   REPLAY CHANGED DATA — orders/movements/addresses went $settled → $final"
        failed=true
      else
        echo "   ok — chain replays clean and converges (orders/movements/addresses = $final)"
      fi
    fi
  fi
fi

echo
if $BASELINE_ONLY; then
  echo "(baseline run — T1/T3/T4 are EXPECTED to fail; that is the bug 0008 fixes)"
else
  $failed && { echo "REGRESSIONS FAILED"; exit 1; }
  echo "all regressions passed"
fi

docker rm -f "$CONTAINER" >/dev/null
