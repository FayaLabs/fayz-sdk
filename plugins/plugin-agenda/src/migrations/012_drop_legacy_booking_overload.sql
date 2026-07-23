-- plugin-agenda 012: retire the pre-assignee create_public_booking overload.
--
-- ⚠️  DO NOT APPLY UNTIL @fayz-ai/plugin-agenda IS REPUBLISHED *AND* EVERY LIVE
--     SITE HAS BEEN REDEPLOYED. Applying early breaks public booking on any
--     site still serving a bundle that calls the 7-argument signature — the
--     call stops resolving and every submission fails.
--
-- Some pools carry two overloads side by side:
--     create_public_booking(uuid,uuid,timestamptz,text,text,text,text)
--     create_public_booking(uuid,uuid,timestamptz,text,text,text,text,uuid)
--
-- Nothing errors when both exist, which is exactly the problem: a stale client
-- silently resolves to the 7-arg one, which cannot know which professional the
-- visitor was shown and falls back to "lowest assignee UUID". The site confirms
-- one name, the agenda records another, and no one finds out until someone
-- compares the two screens.
--
-- 011 makes that fallback survivable (tenant default). This makes it
-- impossible — but only once no caller needs the old signature.
--
-- Verify before running:
--   1. npm view @fayz-ai/plugin-agenda version   → the republished version
--   2. every deployed bundle greps for p_assignee_id:
--        curl -s https://<site>/assets/index-*.js | grep -c p_assignee_id
--      Each must be ≥ 2 (slots + booking). Zero means that site still needs it.

DROP FUNCTION IF EXISTS public.create_public_booking(
  uuid, uuid, timestamptz, text, text, text, text
);
