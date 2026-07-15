-- payment_method_type_id existed on pre-pool installs (added out-of-band on
-- the salon/beauty DB) but was never captured in the file series; 008 requires
-- it on plg_financial_movements. No-op where the column already exists.

ALTER TABLE public.plg_financial_movements
  ADD COLUMN IF NOT EXISTS payment_method_type_id uuid REFERENCES public.plg_financial_payment_method_types(id);
