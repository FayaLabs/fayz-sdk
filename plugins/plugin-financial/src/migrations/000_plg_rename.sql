-- 000_plg_rename.sql — rename legacy financial tables to plg_financial_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when the legacy
-- name exists and the target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.financial_movements') IS NOT NULL AND to_regclass('public.plg_financial_movements') IS NULL THEN
    ALTER TABLE public.financial_movements RENAME TO plg_financial_movements;
  END IF;
  IF to_regclass('public.chart_of_accounts') IS NOT NULL AND to_regclass('public.plg_financial_chart_of_accounts') IS NULL THEN
    ALTER TABLE public.chart_of_accounts RENAME TO plg_financial_chart_of_accounts;
  END IF;
  IF to_regclass('public.bank_accounts') IS NOT NULL AND to_regclass('public.plg_financial_bank_accounts') IS NULL THEN
    ALTER TABLE public.bank_accounts RENAME TO plg_financial_bank_accounts;
  END IF;
  IF to_regclass('public.card_brands') IS NOT NULL AND to_regclass('public.plg_financial_card_brands') IS NULL THEN
    ALTER TABLE public.card_brands RENAME TO plg_financial_card_brands;
  END IF;
  IF to_regclass('public.cost_centers') IS NOT NULL AND to_regclass('public.plg_financial_cost_centers') IS NULL THEN
    ALTER TABLE public.cost_centers RENAME TO plg_financial_cost_centers;
  END IF;
  IF to_regclass('public.cash_register_sessions') IS NOT NULL AND to_regclass('public.plg_financial_cash_register_sessions') IS NULL THEN
    ALTER TABLE public.cash_register_sessions RENAME TO plg_financial_cash_register_sessions;
  END IF;
  IF to_regclass('public.payment_methods') IS NOT NULL AND to_regclass('public.plg_financial_payment_methods') IS NULL THEN
    ALTER TABLE public.payment_methods RENAME TO plg_financial_payment_methods;
  END IF;
  IF to_regclass('public.payment_method_types') IS NOT NULL AND to_regclass('public.plg_financial_payment_method_types') IS NULL THEN
    ALTER TABLE public.payment_method_types RENAME TO plg_financial_payment_method_types;
  END IF;
END $$;
