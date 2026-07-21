-- ============================================================================
-- plugin-conversations 001: omni-channel inbox model (SMS / WhatsApp /
-- Instagram / Email / Web chat). Prefix: plg_conversations / plg_conversation_messages.
--   §1  plg_conversations          — one thread per contact+channel
--   §2  plg_conversation_messages  — inbound/outbound messages within a thread
--   §3  RLS: authenticated tenant-scoped CRUD on both tables + GRANTs
--
-- Column names mirror exactly what supabase.ts's mapConversation / mapMessage
-- read. Real channel connectors (Twilio, WhatsApp Cloud, Meta, IMAP) deliver
-- inbound rows here out-of-band; the provider is the read/compose surface.
-- Idempotent + safe to re-run.
-- ============================================================================

-- §1 — conversations (threads)
CREATE TABLE IF NOT EXISTS public.plg_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_handle text,
  channel text NOT NULL
    CHECK (channel IN ('sms', 'whatsapp', 'instagram', 'email', 'webchat')),
  last_message_preview text,
  last_message_at timestamptz DEFAULT now(),
  unread_count int DEFAULT 0,
  status text DEFAULT 'open'
    CHECK (status IN ('open', 'snoozed', 'closed')),
  assigned_to text,
  accent text,
  tags text[],
  location text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_conversations_tenant ON public.plg_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_conversations_tenant_recent ON public.plg_conversations(tenant_id, last_message_at DESC);

-- §2 — messages
CREATE TABLE IF NOT EXISTS public.plg_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.plg_conversations(id) ON DELETE CASCADE,
  channel text
    CHECK (channel IS NULL OR channel IN ('sms', 'whatsapp', 'instagram', 'email', 'webchat')),
  direction text
    CHECK (direction IN ('inbound', 'outbound')),
  body text NOT NULL,
  author text,
  at timestamptz DEFAULT now()
);
ALTER TABLE public.plg_conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_conversation_messages_thread ON public.plg_conversation_messages(conversation_id, at);

-- §3 — RLS: authenticated tenant CRUD (the inbox reads/writes here)
DROP POLICY IF EXISTS plg_conversations_select ON public.plg_conversations;
DROP POLICY IF EXISTS plg_conversations_insert ON public.plg_conversations;
DROP POLICY IF EXISTS plg_conversations_update ON public.plg_conversations;
DROP POLICY IF EXISTS plg_conversations_delete ON public.plg_conversations;
CREATE POLICY plg_conversations_select ON public.plg_conversations FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_conversations_insert ON public.plg_conversations FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_conversations_update ON public.plg_conversations FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_conversations_delete ON public.plg_conversations FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_conversations TO authenticated;

DROP POLICY IF EXISTS plg_conversation_messages_select ON public.plg_conversation_messages;
DROP POLICY IF EXISTS plg_conversation_messages_insert ON public.plg_conversation_messages;
DROP POLICY IF EXISTS plg_conversation_messages_update ON public.plg_conversation_messages;
DROP POLICY IF EXISTS plg_conversation_messages_delete ON public.plg_conversation_messages;
CREATE POLICY plg_conversation_messages_select ON public.plg_conversation_messages FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_conversation_messages_insert ON public.plg_conversation_messages FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_conversation_messages_update ON public.plg_conversation_messages FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_conversation_messages_delete ON public.plg_conversation_messages FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_conversation_messages TO authenticated;
