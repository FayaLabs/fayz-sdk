-- ============================================================================
-- 018_global_search.sql — ONE indexed lookup for "find me anything".
-- ----------------------------------------------------------------------------
-- The command palette and the agent's findAnything both answered the same
-- question — "which record is this text?" — by asking every entity separately:
-- N round-trips of `column ILIKE '%term%'`, accent-sensitive, single-word only,
-- and unindexable (every one of them a sequential scan). It is correct at
-- fixture size and unusable at ten thousand clients.
--
-- This replaces the fan-out with a spine primitive:
--
--   public.fayz_norm(text)          fold: strip accents, lowercase, collapse
--                                   punctuation. IMMUTABLE, so it can be
--                                   INDEXED. Mirrors foldText() in
--                                   @fayz-ai/core/src/search/text.ts — the two
--                                   must agree or server and client disagree
--                                   about what matched.
--   public.fayz_digits(text)        digits only — phones, CPF/CNPJ, SKUs.
--   public.fayz_search_sources      WHAT is searchable. A registry row per
--                                   source, the SQL mirror of the client's
--                                   entity registry. Plugins and apps add their
--                                   own rows from their own migrations; nothing
--                                   here is hard-coded into the function.
--   public.fayz_search_reindex()    builds the GIN trigram index for every
--                                   registered source FROM THE REGISTRY, so the
--                                   index expression is the query expression by
--                                   construction (an index built by hand from a
--                                   retyped expression is an index the planner
--                                   silently refuses to use).
--   public.fayz_global_search(...)  one call, all sources, ranked, capped.
--
-- Why trigram GIN and not tsvector full-text: people search a CRM for fragments
-- and typos ("bigodin", "jose", "1198"), not for stemmed words. `%term%` under
-- a gin_trgm_ops index is an index scan; under FTS it is not expressible at all.
--
-- SECURITY INVOKER on purpose: the search runs as the caller, so RLS decides
-- which rows exist. `p_tenant_id` narrows, it does not authorize.
--
-- Replay safety: every statement is CREATE OR REPLACE / IF NOT EXISTS /
-- ON CONFLICT DO UPDATE. Re-running is a no-op. Degrades cleanly on a pool
-- without pg_trgm — the function still answers, just without index support and
-- without typo tolerance.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions (best effort — a managed pool usually has them already)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_schema text := CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions')
                        THEN 'extensions' ELSE 'public' END;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    BEGIN
      EXECUTE format('CREATE EXTENSION pg_trgm WITH SCHEMA %I', v_schema);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'fayz search: pg_trgm unavailable (%), falling back to unindexed LIKE', SQLERRM;
    END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gin') THEN
    BEGIN
      EXECUTE format('CREATE EXTENSION btree_gin WITH SCHEMA %I', v_schema);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'fayz search: btree_gin unavailable (%), tenant filter stays a recheck', SQLERRM;
    END;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Folding — the one definition of "same text"
-- ----------------------------------------------------------------------------
-- translate() rather than unaccent(): unaccent is STABLE (it depends on a
-- dictionary), so it cannot appear in an index expression without an IMMUTABLE
-- wrapper whose correctness depends on nobody ever editing the dictionary.
-- A fixed character map is IMMUTABLE by construction and covers every accent
-- the fleet's Latin-script locales actually produce.
CREATE OR REPLACE FUNCTION public.fayz_norm(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(
      coalesce(p_text, ''),
      'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿŠšŽžØøÆæŒœÐðÞþıŁł',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyySsZzOoAaOoDdTtiLl'
    )),
    '[^a-z0-9]+', ' ', 'g'))
$$;

COMMENT ON FUNCTION public.fayz_norm(text) IS
  'Search folding: strip diacritics, lowercase, collapse non-alphanumerics to single spaces. IMMUTABLE so it can be indexed. Mirrored by foldText() in @fayz-ai/core.';

CREATE OR REPLACE FUNCTION public.fayz_digits(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT regexp_replace(coalesce(p_text, ''), '[^0-9]+', '', 'g') $$;

COMMENT ON FUNCTION public.fayz_digits(text) IS
  'Digits only — lets "(11) 98765-4321", "11987654321" and "98765" all find the same phone.';

-- concat_ws(), concat() and array_to_string() are all STABLE (they route through
-- type output functions), which bars them from an index expression — Postgres
-- rejects the CREATE INDEX outright. A haystack has to be assembled from
-- something IMMUTABLE, and for text arguments with a fixed separator the
-- assembly genuinely is: same input, same output, forever.
CREATE OR REPLACE FUNCTION public.fayz_cat(VARIADIC p_parts text[])
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT coalesce(array_to_string(p_parts, ' '), '') $$;

COMMENT ON FUNCTION public.fayz_cat(text[]) IS
  'IMMUTABLE space-join of text values, NULLs skipped. The only concatenation allowed inside a fayz_search_sources haystack_expr — concat_ws is STABLE and cannot be indexed.';

-- ----------------------------------------------------------------------------
-- 2. The source registry — what global search is allowed to look at
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fayz_search_sources (
  -- Matches the client's deriveEntityKey(). Sources with a `kind_column` emit
  -- `<entity_key>:<kind>` per row, which is exactly how archetype entities are
  -- keyed on the client ('person' + kind 'customer' → 'person:customer').
  entity_key     text PRIMARY KEY,
  relation       text NOT NULL,                        -- 'public.people'
  id_column      text NOT NULL DEFAULT 'id',
  tenant_column  text NOT NULL DEFAULT 'tenant_id',
  kind_column    text,
  title_expr     text NOT NULL,                        -- what the row is CALLED
  subtitle_expr  text,                                 -- the disambiguating line
  haystack_expr  text NOT NULL,                        -- everything matchable
  digits_expr    text,                                 -- phone/document columns
  filter_expr    text,                                 -- extra SQL predicate
  icon           text,
  weight         numeric NOT NULL DEFAULT 1,           -- multiplies the rank
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fayz_search_sources IS
  'Registry of searchable relations for public.fayz_global_search. Readable by any member, writable only by the migration role — the expressions are executed as SQL.';

ALTER TABLE public.fayz_search_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fayz_search_sources'
      AND policyname = 'fayz_search_sources_read'
  ) THEN
    -- Not tenant-scoped: the catalog describes SHAPES, never rows. Row access
    -- is decided by each source relation's own RLS when the search runs.
    CREATE POLICY "fayz_search_sources_read" ON public.fayz_search_sources
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

REVOKE ALL ON public.fayz_search_sources FROM anon;
GRANT SELECT ON public.fayz_search_sources TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Spine sources
-- ----------------------------------------------------------------------------
-- `weight` is the editorial call about what a business means when it types a
-- name: a person first, then what it sells, then where and when. Ledger rows
-- are found by number, so they sit lower.
INSERT INTO public.fayz_search_sources
  (entity_key, relation, kind_column, title_expr, subtitle_expr, haystack_expr, digits_expr, filter_expr, icon, weight)
VALUES
  ('person', 'public.people', 'kind',
   'name',
   $sub$nullif(concat_ws(' · ', nullif(email,''), nullif(phone,'')), '')$sub$,
   $hay$public.fayz_cat(name, email, phone, document_number, notes, public.fayz_cat(VARIADIC tags))$hay$,
   $dig$concat_ws(' ', phone, document_number)$dig$,
   NULL, 'User', 1.00),

  ('product', 'public.products', NULL,
   'name',
   $sub$nullif(concat_ws(' · ', nullif(sku,''), nullif(description,'')), '')$sub$,
   $hay$public.fayz_cat(name, sku, description, public.fayz_cat(VARIADIC tags))$hay$,
   $dig$sku$dig$,
   NULL, 'Box', 0.95),

  ('service', 'public.services', NULL,
   'name',
   $sub$nullif(description, '')$sub$,
   $hay$public.fayz_cat(name, description, public.fayz_cat(VARIADIC tags))$hay$,
   NULL,
   NULL, 'Sparkles', 0.95),

  ('location', 'public.locations', 'kind',
   'name',
   $sub$nullif(concat_ws(' · ', nullif(city,''), nullif(state,'')), '')$sub$,
   $hay$public.fayz_cat(name, email, phone, address, city, state, postal_code)$hay$,
   $dig$concat_ws(' ', phone, postal_code)$dig$,
   NULL, 'MapPin', 0.80),

  ('category', 'public.categories', 'kind',
   'name',
   $sub$nullif(slug, '')$sub$,
   $hay$public.fayz_cat(name, slug)$hay$,
   NULL,
   NULL, 'Tag', 0.60),

  ('address', 'public.addresses', NULL,
   $tit$concat_ws(', ', nullif(street,''), nullif(number,''))$tit$,
   $sub$nullif(concat_ws(' · ', nullif(district,''), nullif(city,''), nullif(postal_code,'')), '')$sub$,
   $hay$public.fayz_cat(label, recipient, street, number, complement, district, city, state, postal_code)$hay$,
   $dig$concat_ws(' ', postal_code, phone)$dig$,
   NULL, 'MapPin', 0.55)
ON CONFLICT (entity_key) DO UPDATE SET
  relation      = EXCLUDED.relation,
  kind_column   = EXCLUDED.kind_column,
  title_expr    = EXCLUDED.title_expr,
  subtitle_expr = EXCLUDED.subtitle_expr,
  haystack_expr = EXCLUDED.haystack_expr,
  digits_expr   = EXCLUDED.digits_expr,
  filter_expr   = EXCLUDED.filter_expr,
  icon          = EXCLUDED.icon,
  weight        = EXCLUDED.weight;

-- Order/transaction sources only make sense once those tables carry a human
-- reference; they are registered by the plugins that own that shape.

-- ----------------------------------------------------------------------------
-- 4. Index builder — derived from the registry, never retyped
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fayz_search_reindex()
RETURNS integer
LANGUAGE plpgsql VOLATILE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_src      record;
  v_rel      text;
  v_name     text;
  v_built    integer := 0;
  v_has_trgm boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm');
  v_has_gin  boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gin');
BEGIN
  IF NOT v_has_trgm THEN
    RAISE NOTICE 'fayz search: pg_trgm missing — no index built, search falls back to sequential LIKE';
    RETURN 0;
  END IF;

  FOR v_src IN
    SELECT * FROM public.fayz_search_sources WHERE enabled ORDER BY entity_key
  LOOP
    v_rel := to_regclass(v_src.relation)::text;
    CONTINUE WHEN v_rel IS NULL;
    -- A view cannot be indexed; only its base tables can.
    CONTINUE WHEN (SELECT c.relkind FROM pg_class c WHERE c.oid = to_regclass(v_src.relation))
                  NOT IN ('r', 'p');

    -- Name derived from (relation, expression): two sources over the same
    -- columns share one index instead of building it twice.
    v_name := 'fayz_search_' || substr(md5(v_rel || '|' || v_src.haystack_expr), 1, 20);

    BEGIN
      IF v_has_gin THEN
        -- Composite: the tenant equality is resolved INSIDE the index, so a
        -- 500-tenant pool does not trigram-scan its neighbours' rows.
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %s USING gin (%I, public.fayz_norm(%s) gin_trgm_ops)',
          v_name, v_rel, v_src.tenant_column, v_src.haystack_expr);
      ELSE
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %s USING gin (public.fayz_norm(%s) gin_trgm_ops)',
          v_name, v_rel, v_src.haystack_expr);
      END IF;
      v_built := v_built + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Most likely cause: btree_gin present but with no GIN opclass for the
      -- tenant column's type. A trigram-only index still serves every query;
      -- the tenant equality just becomes a recheck.
      BEGIN
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %s USING gin (public.fayz_norm(%s) gin_trgm_ops)',
          v_name, v_rel, v_src.haystack_expr);
        v_built := v_built + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'fayz search: could not index % (%): %', v_src.entity_key, v_rel, SQLERRM;
      END;
    END;
  END LOOP;

  RETURN v_built;
END $$;

COMMENT ON FUNCTION public.fayz_search_reindex() IS
  'Builds/refreshes the GIN trigram index for every enabled row of fayz_search_sources. Call it after inserting your own source row.';

SELECT public.fayz_search_reindex();

-- ----------------------------------------------------------------------------
-- 5. The search itself
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fayz_search_hit'
                   AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.fayz_search_hit AS (
      entity_key text,
      record_id  text,
      title      text,
      subtitle   text,
      score      real
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fayz_global_search(
  p_query       text,
  p_tenant_id   uuid,
  p_entity_keys text[] DEFAULT NULL,
  p_limit       integer DEFAULT 30,
  p_per_source  integer DEFAULT 8
)
RETURNS TABLE (entity_key text, record_id text, title text, subtitle text, score real)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_q        text := public.fayz_norm(p_query);
  v_digits   text := public.fayz_digits(p_query);
  v_tokens   text[];
  v_token    text;
  v_src      record;
  v_acc      public.fayz_search_hit[] := '{}';
  v_rows     public.fayz_search_hit[];
  v_title    text;
  v_hay      text;
  v_match    text;
  v_where    text;
  v_key      text;
  v_kinds    text[];
  v_sql      text;
  v_phase    integer;
  v_has_trgm boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm');
BEGIN
  -- One character matches every row; two is where a lookup starts to mean
  -- something. The client enforces the same floor before it even calls.
  IF v_q IS NULL OR length(v_q) < 2 THEN RETURN; END IF;
  IF p_tenant_id IS NULL THEN RETURN; END IF;

  v_tokens   := array_remove(string_to_array(v_q, ' '), '');
  p_limit      := least(greatest(coalesce(p_limit, 30), 1), 200);
  p_per_source := least(greatest(coalesce(p_per_source, 8), 1), 50);
  IF length(v_digits) < 4 THEN v_digits := ''; END IF;

  IF v_has_trgm THEN
    BEGIN
      -- Touching a pg_trgm function loads the library, which is what registers
      -- its GUCs; before that they are unrecognized placeholders only a
      -- superuser may set. pg_trgm ships word_similarity_threshold at 0.6,
      -- which forgives a wrong letter but not the transposition people
      -- actually type ("bigdoinho"). LOCAL, so nothing outside this call
      -- inherits a looser notion of "close" — and best-effort, because a pool
      -- that refuses the setting should still search, just less forgivingly.
      PERFORM similarity('a', 'a');
      PERFORM set_config('pg_trgm.word_similarity_threshold', '0.40', true);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- Two phases. Phase 1 is literal: every token must appear, which is exactly
  -- what the trigram index answers, and it is what the user meant 99 times out
  -- of 100. Phase 2 only runs when phase 1 found NOTHING, and only then pays
  -- for fuzzy matching. ORing the two would have made every ordinary query
  -- carry the cost — and would have let near-misses dilute exact answers.
  <<phases>>
  FOR v_phase IN 1..2 LOOP
    EXIT WHEN v_phase = 2 AND (
      coalesce(array_length(v_acc, 1), 0) > 0 OR NOT v_has_trgm OR length(v_q) < 4
    );

  FOR v_src IN
    SELECT s.* FROM public.fayz_search_sources s
    WHERE s.enabled
      AND to_regclass(s.relation) IS NOT NULL
      AND (
        p_entity_keys IS NULL
        OR s.entity_key = ANY (p_entity_keys)
        OR (s.kind_column IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(p_entity_keys) k WHERE k LIKE s.entity_key || ':%'))
      )
    ORDER BY s.weight DESC, s.entity_key
  LOOP
    v_title := 'public.fayz_norm(' || v_src.title_expr || ')';
    v_hay   := 'public.fayz_norm(' || v_src.haystack_expr || ')';

    IF v_phase = 1 THEN
      -- Every token must land somewhere. Emitted as separate literal LIKEs (not
      -- `LIKE ALL (array)`) because that is the only form the planner can push
      -- into the trigram index. The tokens came out of fayz_norm, so they are
      -- already [a-z0-9 ] — quote_literal is belt and braces.
      v_where := '';
      FOREACH v_token IN ARRAY v_tokens LOOP
        IF v_where <> '' THEN v_where := v_where || ' AND '; END IF;
        v_where := v_where || v_hay || ' LIKE ' || quote_literal('%' || v_token || '%');
      END LOOP;
      v_match := '(' || v_where || ')';

      IF v_digits <> '' AND v_src.digits_expr IS NOT NULL THEN
        v_match := v_match || ' OR public.fayz_digits(' || v_src.digits_expr || ') LIKE '
                   || quote_literal('%' || v_digits || '%');
      END IF;
    ELSE
      -- `<%` (word_similarity) rather than `%` (similarity): the right-hand
      -- side is a whole haystack, and plain similarity of a 7-letter query
      -- against a 200-character row is always below any usable threshold.
      -- Measured against the INDEXED expression so phase 2 is an index scan too.
      v_match := quote_literal(v_q) || ' <% ' || v_hay;
    END IF;

    -- Archetype sources emit one key per kind. When the caller asked for a
    -- subset of kinds, push that INTO the source query: filtering after a
    -- per-source LIMIT would let a populous kind starve the one being asked for.
    v_key := quote_literal(v_src.entity_key);
    IF v_src.kind_column IS NOT NULL THEN
      v_key := v_key || ' || '':'' || ' || quote_ident(v_src.kind_column);
      IF p_entity_keys IS NOT NULL AND NOT (v_src.entity_key = ANY (p_entity_keys)) THEN
        SELECT array_agg(substr(k, length(v_src.entity_key) + 2))
          INTO v_kinds
          FROM unnest(p_entity_keys) k
         WHERE k LIKE v_src.entity_key || ':%';
        IF v_kinds IS NOT NULL THEN
          v_match := '(' || v_match || ') AND ' || quote_ident(v_src.kind_column)
                     || ' = ANY (' || quote_literal(v_kinds::text) || '::text[])';
        END IF;
      END IF;
    END IF;

    v_sql :=
      'SELECT ' || v_key || '::text AS entity_key, '
        || quote_ident(v_src.id_column) || '::text AS record_id, '
        || '(' || v_src.title_expr || ')::text AS title, '
        || '(' || coalesce(v_src.subtitle_expr, 'NULL') || ')::text AS subtitle, '
        -- Rank ladder, mirrored by scoreCandidate() on the client. The client
        -- re-scores what it receives; this ordering decides what survives the
        -- per-source LIMIT, which is the decision the client cannot make.
        || '(GREATEST('
        || '  CASE WHEN ' || v_title || ' = ' || quote_literal(v_q) || ' THEN 1.00'
        || '       WHEN ' || v_title || ' LIKE ' || quote_literal(v_q || '%') || ' THEN 0.94'
        || '       WHEN ' || v_title || ' LIKE ' || quote_literal('% ' || v_q || '%') || ' THEN 0.88'
        || '       WHEN ' || v_title || ' LIKE ' || quote_literal('%' || v_q || '%') || ' THEN 0.76'
        || '       WHEN ' || v_hay   || ' LIKE ' || quote_literal('%' || v_q || '%') || ' THEN 0.62'
        || '       ELSE 0.40 END'
        || CASE WHEN v_has_trgm
                THEN ', word_similarity(' || quote_literal(v_q) || ', ' || v_title || ')::numeric * 0.60'
                ELSE '' END
        || ') * ' || v_src.weight || ')::real AS score'
      || ' FROM ' || to_regclass(v_src.relation)::text
      || ' WHERE ' || quote_ident(v_src.tenant_column) || ' = $1'
      || CASE WHEN v_src.filter_expr IS NULL THEN '' ELSE ' AND (' || v_src.filter_expr || ')' END
      || ' AND (' || v_match || ')'
      || ' ORDER BY 5 DESC LIMIT ' || p_per_source;

    BEGIN
      EXECUTE 'SELECT coalesce(array_agg(x::public.fayz_search_hit), ''{}''::public.fayz_search_hit[]) FROM ('
              || v_sql || ') x'
        INTO v_rows USING p_tenant_id;
      v_acc := v_acc || v_rows;
    EXCEPTION WHEN OTHERS THEN
      -- One misconfigured source must never blank the whole search box.
      RAISE NOTICE 'fayz search: source % failed: %', v_src.entity_key, SQLERRM;
    END;
  END LOOP;
  END LOOP phases;

  RETURN QUERY
    SELECT h.entity_key, h.record_id, h.title, h.subtitle, h.score
      FROM unnest(v_acc) h
     ORDER BY h.score DESC, length(coalesce(h.title, '')) ASC, h.title
     LIMIT p_limit;
END $$;

COMMENT ON FUNCTION public.fayz_global_search(text, uuid, text[], integer, integer) IS
  'Global search across every registered source in one round-trip. SECURITY INVOKER — RLS decides visibility; p_tenant_id only narrows. p_entity_keys restricts to the keys the caller is allowed to see.';

REVOKE ALL ON FUNCTION public.fayz_global_search(text, uuid, text[], integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fayz_global_search(text, uuid, text[], integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.fayz_global_search(text, uuid, text[], integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fayz_norm(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fayz_digits(text) TO authenticated, anon;
