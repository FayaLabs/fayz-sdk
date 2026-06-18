-- ---------------------------------------------------------------------------
-- Financial extract (extrato): net card settlement + transfers
-- ---------------------------------------------------------------------------
-- Adds the processing/MDR fee column used by the bank/cash account statement so
-- the running balance reflects the NET cash that actually lands in the account.
--   gross    = paid_amount (settles the receivable/payable)
--   net cash = paid_amount - fee_amount  (credits only; v1 has no fee on debits)
ALTER TABLE public.financial_movements
  ADD COLUMN IF NOT EXISTS fee_amount numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.financial_movements.fee_amount IS
  'Processing/MDR fee deducted at settlement. Net cash impact = paid_amount - fee_amount (credit). v1: same-day net, no D+N settlement-date modeling.';

CREATE INDEX IF NOT EXISTS idx_financial_movements_statement
  ON public.financial_movements (bank_account_id, payment_date)
  WHERE status IN ('paid', 'partial');

-- Transfers between accounts = a debit row (source) + credit row (destination),
-- both status='paid', movement_kind='transfer', correlated via metadata jsonb:
--   metadata->>'transferId' | 'transferRole' ('out'|'in') | 'counterAccountId'
