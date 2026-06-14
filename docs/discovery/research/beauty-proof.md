# Research — Beauty SaaS Proof Path

Source: Codex lane `proc_a5b271ffafa0`, run from `/Users/fayalabs/dev/fayz-app/beauty-saas`.

Status: completed research. Codex could not write this file directly because its sandbox was rooted at `/Users/fayalabs/dev/fayz-app/beauty-saas`; Hermes captured the findings here.

## Current architecture facts

- Beauty SaaS is a strong first proof app because it exercises real vertical SaaS needs: agenda/bookings, CRM/financial links, permissions, reports, theme, labels, plugins, and tenant-aware data.
- It is not manifest-pure today.
- The current `src/App.tsx` contains configuration that can be serialized, but also direct functions/components/factories that require registry IDs.
- The app uses Supabase/archetype data conventions and existing SDK/plugin packages.

## Files/path areas inspected

Codex reported inspection of:

- `/Users/fayalabs/dev/fayz-app/beauty-saas/src/App.tsx`
- Beauty SaaS Supabase migrations
- agenda plugin usage
- SDK agenda provider at `/Users/fayalabs/dev/fayz-sdk/plugins/plugin-agenda/src/data/supabase.ts`
- entity/archetype SQL around `saas_core.bookings` and `saas_core.orders`

## What can become manifest JSON

Good candidates for pure/mostly pure manifest representation:

- `EntityDef` / entity metadata;
- permissions/grants;
- theme basics;
- billing/plan metadata;
- labels/copy;
- reports metadata;
- page metadata;
- plugin installation/config values;
- navigation/page ordering;
- module enablement.

## What requires registry IDs

Not safe as raw JSON; should become registry references:

- React components;
- plugin factories;
- lookup providers;
- dashboard metric `compute` functions;
- financial bridge code;
- navigation callbacks;
- custom action handlers;
- data provider implementations.

Recommended pattern:

```json
{
  "componentId": "beauty.agenda.CalendarPage",
  "actionId": "beauty.booking.create",
  "providerId": "beauty.supabase"
}
```

Then app/runtime resolves those IDs from a trusted registry.

## Minimum Monday proof

Do **not** convert the full Beauty app.

Minimum proof:

1. Render Beauty shell from a manifest or partial manifest.
2. Show agenda/calendar page.
3. Create a booking.
4. Persist the booking through the chosen data provider.
5. Demonstrate that a manifest-only change affects visible UI/Panel surface.

Success criterion:

> Beauty SaaS agenda/booking is demoable and at least one visible app/surface change is driven by manifest JSON rather than editing React page code.

## Data provider requirements

The proof needs:

- agenda booking list/read;
- create booking;
- update booking stage/status if applicable;
- tenant filtering;
- clear mapping between manifest entity/action and provider operation.

## Important blocker / risk

Codex found a likely data model mismatch:

- checked-in agenda SQL defines `public.v_bookings` from `saas_core.bookings`;
- current SDK agenda provider writes bookings into `saas_core.orders`;
- comments indicate a “unified model” where booking may be treated as the order.

This must be resolved before a reliable demo.

Relevant searched paths/findings:

- `supabase/migrations/20260301000001_plugin_agenda.sql` creates `v_bookings` from `saas_core.bookings` and joins `saas_core.orders`.
- `/Users/fayalabs/dev/fayz-sdk/plugins/plugin-agenda/src/data/supabase.ts` includes logic/comment indicating “booking IS the order”.

Risk:

> If the write path and read/view path disagree, the agenda demo can appear empty or inconsistent even when booking creation succeeds.

## Risks in converting too much too early

- Full app conversion will force registry, migration, data, and design-system decisions all at once.
- React functions/components cannot be shoved into JSON safely.
- Financial/CRM/booking bridges may hide deeper schema assumptions.
- Trying to make Beauty fully manifest-pure before Panel manifest slice works will slow the weekend.

## Recommended minimum implementation path

1. Freeze full Beauty migration.
2. Extract a partial Beauty manifest fixture for shell + agenda only.
3. Add registry IDs for custom agenda component/action/provider pieces.
4. Resolve `v_bookings` vs `orders-as-booking` mismatch.
5. Prove booking persistence.
6. Then gradually move remaining page/plugin config to manifest.

## Tests / build commands needed

In `/Users/fayalabs/dev/fayz-app/beauty-saas` after changes:

```bash
npm run build
npm test
```

If available, run app-specific Supabase/provider tests and manually test agenda booking flow.

## Open questions for Hermes/Vini

No immediate blocker to planning.

Architecture/demo questions:

1. Is agenda booking creation enough for Monday customer-demo proof? Recommended answer: yes.
2. Should booking canonical storage be `saas_core.bookings` or `saas_core.orders` with booking kind? This is a real implementation decision.
3. Should Beauty first render inside Fayz Panel or as standalone generated app proof? Recommended order: Panel manifest slice first, Beauty standalone proof second.
