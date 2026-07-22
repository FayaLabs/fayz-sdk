-- ============================================================================
-- A quote must be re-derivable on the client for any subtotal
-- ----------------------------------------------------------------------------
-- 0021's shop_quote_shipping returns the rate already resolved against the
-- subtotal it was asked about. That is right for display, but it makes the
-- answer valid for exactly one cart: add an item and the quote is stale.
--
-- The storefront's response to a stale quote was to fall back to the store-wide
-- flat rate — and that is a real defect, not a cosmetic one. Artorius charges
-- R$ 8 in the capital and R$ 18 in the Baixada; a shopper who quoted 18 and
-- then added a product saw the cart say 8, because the fallback is the flat
-- rate, which happens to be 8. Shown 8, charged 18. That is exactly the
-- cart-vs-order divergence 0017 was written to end, in a new disguise.
--
-- Returning the zone's own base_rate and free_above lets the client apply the
-- same CASE the server applies, for whatever the subtotal currently is. There
-- is no staleness left to handle, because there is nothing subtotal-specific
-- being cached.
--
-- Nothing here is sensitive: free_above is the delivery policy printed on the
-- site, and the rate is what the shopper is about to be charged.
-- ============================================================================

DROP FUNCTION IF EXISTS public.shop_quote_shipping(uuid, text, numeric);

CREATE FUNCTION public.shop_quote_shipping(
  p_tenant_id   uuid,
  p_postal_code text,
  p_subtotal    numeric DEFAULT 0
)
RETURNS TABLE (
  zone_id      uuid,
  name         text,
  carrier      text,
  rate         numeric,
  base_rate    numeric,
  free_above   numeric,
  eta_min_days int,
  eta_max_days int,
  free         boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cep AS (
    SELECT lpad(regexp_replace(COALESCE(p_postal_code, ''), '\D', '', 'g'), 8, '0') AS code,
           length(regexp_replace(COALESCE(p_postal_code, ''), '\D', '', 'g')) = 8 AS valid
  )
  SELECT z.id,
         z.name,
         z.carrier,
         -- Resolved for the subtotal asked about…
         CASE WHEN z.free_above IS NOT NULL AND p_subtotal >= z.free_above
              THEN 0::numeric ELSE z.rate END AS rate,
         -- …and the inputs, so the caller can resolve it again for another one
         -- without a round trip, using the same rule.
         z.rate       AS base_rate,
         z.free_above,
         z.eta_min_days,
         z.eta_max_days,
         (z.free_above IS NOT NULL AND p_subtotal >= z.free_above) AS free
    FROM public.shipping_zones z, cep
   WHERE z.tenant_id = p_tenant_id
     AND z.active
     AND cep.valid
     AND cep.code BETWEEN z.postal_from AND z.postal_to
   ORDER BY 4 ASC, z.sort_order ASC, z.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.shop_quote_shipping(uuid, text, numeric)
  TO anon, authenticated, service_role;
