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
integration transport. Migration `packages/db/migrations/009_booking_domain_events.sql`
installs `saas_core.domain_events` and the transactional booking trigger.
Consumers copy relevant events into their own outbox. Delivery is at-least-once,
so provider operations must be idempotent.

## Extension contract

An extension declares subscribed event names. Runtime routing must verify that
the extension is installed and enabled for the tenant before creating work.
Handlers enqueue provider operations; they do not perform remote calls inline.

Inbound provider changes call the public commands below with `origin` and a
correlation ID:

- `saas_core.command_update_booking`;
- `saas_core.command_import_external_block`;
- `saas_core.command_delete_external_booking`;
- `saas_core.command_link_external_event`.

Agenda emits normal events; subscribers ignore events originated from themselves
to prevent feedback loops.

## Deletion

The `booking.deleted` snapshot contains the metadata that existed before delete.
Extension routers copy that snapshot into their outbox before retention removes
the domain event.

## Production readiness

The SDK provides the durable producer and commands. Each extension remains
responsible for workers, retry, dead-letter, idempotency, observability and
contract tests. Polling may exist only as reconciliation.
