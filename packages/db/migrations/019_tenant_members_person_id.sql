-- 019: Person-first team model — link a membership (login + RBAC role) to the
-- person record it represents.
--
-- A "team member" is a PERSON (public.people, kind in the app's team.personKinds).
-- public.tenant_members is the OPTIONAL access overlay: a row exists only when a
-- person is granted login + role. person_id ties the two. Nullable both ways:
--   * login-only account (e.g. the owner who signed up)  -> tenant_members with person_id NULL
--   * team person without access (e.g. a teacher who never logs in) -> people row, NO tenant_members row
-- Idempotent + additive (safe to re-apply).

ALTER TABLE public.tenant_members
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

-- A person maps to at most one membership per tenant (partial: many NULLs allowed).
CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_tenant_person_uidx
  ON public.tenant_members (tenant_id, person_id)
  WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_members_person_idx
  ON public.tenant_members (person_id);
