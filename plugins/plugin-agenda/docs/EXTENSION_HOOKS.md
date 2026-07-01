# Agenda extension hooks

## Boundary

`plugin-agenda` owns booking commands and domain events. Extensions such as
Google Calendar subscribe to those events, but Agenda must not import or invoke
provider-specific code.

## Event catalog

- `booking.created`
- `booking.updated`
- `booking.status_changed`
- `booking.cancelled`
- `booking.deleted`

Every payload must include event ID, tenant ID, booking ID, aggregate version,
timestamp, origin and correlation ID. Payload versions are append-only contracts.

## Delivery semantics

The in-memory `eventBus` is useful for UI reactions, but it is not a durable
integration transport. Production extensions require a transactional domain
event/outbox record written with the booking mutation. Consumers are at-least-
once and therefore must be idempotent.

## Extension contract

An extension declares subscribed event names. Runtime routing must verify that
the extension is installed and enabled for the tenant before creating work.
Handlers enqueue provider operations; they do not perform remote calls inline.

Inbound provider changes call public Agenda commands with `origin` metadata.
Agenda then emits normal events; subscribers must ignore or coalesce events that
originated from themselves to prevent feedback loops.

## Deletion

Capture the provider link in a tombstone/outbox before deleting the booking.
Deleting the aggregate first loses the external ID and makes remote cleanup
impossible.

## Production readiness

Required: durable outbox, retries, dead-letter, versioned payloads, idempotency,
tenant isolation, observability and contract tests. Polling may exist only as a
reconciliation fallback.
