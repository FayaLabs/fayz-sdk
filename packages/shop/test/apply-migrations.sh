#!/usr/bin/env bash
# Applies shop migrations to a REAL Supabase project. Dry-run by default.
#
#   ./apply-migrations.sh                      # show what would run, touch nothing
#   ./apply-migrations.sh --apply 0008_...     # actually run one migration
#   ./apply-migrations.sh --apply --all        # run the whole pending set, in order
#
# Connection comes from SUPABASE_DB_URL, read from the environment or from
# fayz-sdk/.env.pool.local (already covered by .gitignore's `.env.*`). The URL is
# never echoed. psql runs inside a throwaway container so no local install is
# needed — the same image the bench uses.
#
# Run ./run-migrations.sh first: it proves the same SQL against a disposable
# Postgres. Do not point this at a project before that passes.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
ENV_FILE="$HERE/../../../.env.pool.local"

APPLY=false
ALL=false
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --all)   ALL=true ;;
    *)       TARGETS+=("$arg") ;;
  esac
done

if [[ -z "${SUPABASE_DB_URL:-}" && -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

if [[ -z "${SUPABASE_DB_URL:-}" && -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  cat >&2 <<'MSG'
No way to reach the database. Pick either, in fayz-sdk/.env.pool.local:

  A) Personal access token — dashboard → account → Access Tokens.
     Revocable, and not the database password:

       SUPABASE_ACCESS_TOKEN=sbp_...
       SUPABASE_PROJECT_REF=yfxutrkyhydgltakbqle

  B) Database connection string — Project Settings → Database → URI:

       SUPABASE_DB_URL=postgresql://postgres:<password>@<host>:5432/postgres

  Or skip both and paste the .sql files into the dashboard SQL Editor by hand.
  That file matches .gitignore's `.env.*`, so nothing is committed either way.
MSG
  exit 1
fi

# Management API: same endpoint the dashboard SQL Editor calls. Preferred over
# the connection string because the token is scoped and revocable.
run_sql_via_api() {
  local file="$1" ref="${SUPABASE_PROJECT_REF:-}"
  [[ -z "$ref" ]] && { echo "SUPABASE_PROJECT_REF is required with SUPABASE_ACCESS_TOKEN" >&2; return 1; }
  local payload
  payload="$(node -e 'process.stdout.write(JSON.stringify({query:require("fs").readFileSync(process.argv[1],"utf8")}))' "$file")"
  local out
  out="$(curl -sS -w '\n%{http_code}' -X POST \
    "https://api.supabase.com/v1/projects/$ref/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$payload")"
  local code="${out##*$'\n'}"
  [[ "$code" == 2* ]] && return 0
  echo "${out%$'\n'*}" >&2
  return 1
}

# Everything after the baseline that shipped with 0.8.0.
PENDING=(0008_shop_place_order_hardening 0009_products_canonical)
$ALL && TARGETS=("${PENDING[@]}")
[[ ${#TARGETS[@]} -eq 0 ]] && TARGETS=("${PENDING[@]}")

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "target: project ${SUPABASE_PROJECT_REF:-?} via Management API"
else
  echo "target: $(sed -E 's#.*@([^:/]+).*#\1#' <<<"$SUPABASE_DB_URL") via psql"
fi
echo "migrations: ${TARGETS[*]}"
echo

if ! $APPLY; then
  echo "DRY RUN — nothing was executed. Re-run with --apply to execute."
  for m in "${TARGETS[@]}"; do
    echo
    echo "--- $m.sql (first 25 lines) ---"
    head -25 "$MIGRATIONS/$m.sql"
  done
  exit 0
fi

for m in "${TARGETS[@]}"; do
  file="$MIGRATIONS/$m.sql"
  [[ -f "$file" ]] || { echo "missing: $file" >&2; exit 1; }
  printf '→ applying %s ... ' "$m"
  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    run_sql_via_api "$file"
  else
    docker run --rm -i -e PGURL="$SUPABASE_DB_URL" -v "$MIGRATIONS:/migrations:ro" \
      postgres:16-alpine \
      psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "/migrations/$m.sql" >/dev/null
  fi
  echo ok
done

echo
echo "done. Re-run the storefront security spec to confirm the invariants flipped:"
echo "  cd ../../../fayz-app/artorious-shop && npx playwright test e2e/security.spec.ts"
