-- Marketing Plugin: recording-day ops on posts.
-- checklist: shooting checklist items [{ id, text, done }] — the on-set
-- companion for recording day. media_url: uploaded asset (static posts get a
-- caption + final art instead of a script).

ALTER TABLE public.plg_marketing_content_posts
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]';

ALTER TABLE public.plg_marketing_content_posts
  ADD COLUMN IF NOT EXISTS media_url text;

-- Public media bucket for content assets (mirrors the avatars-bucket pattern:
-- public read, authenticated write). Path convention: content/{tenantId}/{postId}-{ts}.{ext}
INSERT INTO storage.buckets (id, name, public)
  VALUES ('mkt-media', 'mkt-media', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS plg_marketing_media_read ON storage.objects;
DROP POLICY IF EXISTS plg_marketing_media_insert ON storage.objects;
DROP POLICY IF EXISTS plg_marketing_media_update ON storage.objects;
DROP POLICY IF EXISTS plg_marketing_media_delete ON storage.objects;
CREATE POLICY plg_marketing_media_read ON storage.objects FOR SELECT TO public USING (bucket_id = 'mkt-media');
CREATE POLICY plg_marketing_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mkt-media');
CREATE POLICY plg_marketing_media_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mkt-media');
CREATE POLICY plg_marketing_media_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mkt-media');
