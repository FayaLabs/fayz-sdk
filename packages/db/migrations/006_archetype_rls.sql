-- Fix archetype RLS policies to use SECURITY DEFINER function
-- The raw subquery on tenant_members fails due to recursive RLS

-- Ensure the SECURITY DEFINER helper exists (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

-- Drop and recreate all archetype table policies using the SECURITY DEFINER function
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'people', 'categories', 'products', 'services',
    'orders', 'transactions', 'appointments', 'schedules'
  ]
  LOOP
    -- Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

    -- Create new policies using SECURITY DEFINER function
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Fix child table policies too
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete" ON public.order_items;

CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));
CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));
CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));

DROP POLICY IF EXISTS "appointment_items_select" ON public.appointment_items;
DROP POLICY IF EXISTS "appointment_items_insert" ON public.appointment_items;
DROP POLICY IF EXISTS "appointment_items_update" ON public.appointment_items;
DROP POLICY IF EXISTS "appointment_items_delete" ON public.appointment_items;

CREATE POLICY "appointment_items_select" ON public.appointment_items FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
CREATE POLICY "appointment_items_insert" ON public.appointment_items FOR INSERT TO authenticated
  WITH CHECK (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
CREATE POLICY "appointment_items_update" ON public.appointment_items FOR UPDATE TO authenticated
  USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
CREATE POLICY "appointment_items_delete" ON public.appointment_items FOR DELETE TO authenticated
  USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
