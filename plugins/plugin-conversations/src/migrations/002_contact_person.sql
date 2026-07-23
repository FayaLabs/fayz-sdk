-- ============================================================================
-- plugin-conversations 002: link a thread to a REAL person record.
--
-- The compose modal used to take a free-text name + handle, so a conversation
-- with "Maria" had nothing to do with the Maria in the agenda, the CRM or the
-- financial module. The shared ContactPicker (find-or-create over
-- public.people) now resolves a person, and this column stores that link.
--
-- Nullable on purpose, in both directions of time:
--   • rows created before this migration keep working (name/handle only);
--   • an inbound message from an unknown number still opens a thread with no
--     person attached — the contact panel can offer "create contact" later.
-- ON DELETE SET NULL: deleting a person must never take their history with it.
-- Idempotent + safe to re-run.
-- ============================================================================

ALTER TABLE public.plg_conversations
  ADD COLUMN IF NOT EXISTS contact_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plg_conversations_person
  ON public.plg_conversations(tenant_id, contact_person_id)
  WHERE contact_person_id IS NOT NULL;
