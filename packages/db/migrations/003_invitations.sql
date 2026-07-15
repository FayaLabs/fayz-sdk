-- Add missing columns to invitations table
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS location_ids uuid[] DEFAULT '{}';

-- Add UPDATE and DELETE policies for invite management
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invites_update' AND tablename = 'invitations') THEN
    CREATE POLICY "invites_update" ON public.invitations FOR UPDATE
      USING (public.is_tenant_admin(tenant_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invites_delete' AND tablename = 'invitations') THEN
    CREATE POLICY "invites_delete" ON public.invitations FOR DELETE
      USING (public.is_tenant_admin(tenant_id));
  END IF;
END $$;
