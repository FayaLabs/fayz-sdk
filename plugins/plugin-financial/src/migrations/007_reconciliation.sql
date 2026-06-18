-- ---------------------------------------------------------------------------
-- Reconciliation (conciliação): bank-statement lines ↔ internal movements
-- ---------------------------------------------------------------------------
-- An integration (e.g. open banking) imports bank-statement lines as
-- financial_movements tagged with (external_source, external_id). The matching
-- UI then links each imported line to the internal movement it settles, or
-- accepts it standalone. These columns make a movement carry its bank-line
-- identity and its reconciliation state.
--   external_source / external_id : the bank line's provider + unique id
--   reconciled_at                 : when the line was matched/accepted (NULL = pending)
--   matched_movement_id           : the internal movement this line reconciles (NULL = standalone)
ALTER TABLE public.financial_movements
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS matched_movement_id uuid
    REFERENCES public.financial_movements(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.financial_movements.external_source IS
  'Provider of an imported bank-statement line (e.g. plugbank, inter). NULL for app-native movements.';
COMMENT ON COLUMN public.financial_movements.external_id IS
  'Provider-unique id of the imported bank line. Forms the import idempotency key with external_source.';

-- Idempotency: a given bank line imports at most once per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_movements_external
  ON public.financial_movements (tenant_id, external_source, external_id)
  WHERE external_id IS NOT NULL AND external_source IS NOT NULL;

-- Fast lookup of imported-but-unreconciled lines for the matching screen.
CREATE INDEX IF NOT EXISTS idx_financial_movements_unreconciled
  ON public.financial_movements (tenant_id, payment_date)
  WHERE external_source IS NOT NULL AND reconciled_at IS NULL;
