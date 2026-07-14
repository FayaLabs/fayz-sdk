-- Split bill (obligation) vs payment (cash event).
-- Each payment is now its own movement_kind='payment' row (one per cash event), so
-- two payments on one installment show as two extract rows instead of one summed row.
-- Bills stay pure obligations; v_invoice_balances already filters movement_kind='bill',
-- so the new payment rows don't affect invoice balances. Backfill is idempotent.
-- Requires fee_amount (006b_extract_fee_amount.sql).

INSERT INTO public.plg_financial_movements
  (tenant_id, invoice_id, direction, movement_kind, amount, paid_amount, fee_amount, status,
   due_date, payment_date, installment_number, payment_method_id, payment_method_type_id,
   bank_account_id, cash_session_id, card_brand, card_installments, notes, metadata)
SELECT
  b.tenant_id, b.invoice_id, b.direction, 'payment', b.paid_amount, b.paid_amount,
  COALESCE(b.fee_amount, 0), 'paid',
  b.due_date, COALESCE(b.payment_date, b.updated_at::date, CURRENT_DATE), b.installment_number,
  b.payment_method_id, b.payment_method_type_id, b.bank_account_id, b.cash_session_id,
  b.card_brand, b.card_installments, b.notes,
  jsonb_build_object('backfilledFromBill', b.id)
FROM public.plg_financial_movements b
WHERE b.movement_kind = 'bill' AND b.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.plg_financial_movements p
    WHERE p.movement_kind = 'payment' AND p.metadata->>'backfilledFromBill' = b.id::text
  );

UPDATE public.plg_financial_movements
SET payment_date = NULL, bank_account_id = NULL, payment_method_id = NULL,
    payment_method_type_id = NULL, cash_session_id = NULL, card_brand = NULL, card_installments = NULL
WHERE movement_kind = 'bill';
