import React from 'react'

/**
 * parseViewId — the ONE canonical way to split a module view string into its base
 * and optional `:id` param. Replaces the per-plugin mix of `.slice('x-detail:'.length)`,
 * `.split(':')[1]`, and regex. `'leads-detail:42'` → `{ base: 'leads-detail', id: '42' }`,
 * `'channels'` → `{ base: 'channels' }`.
 */
export function parseViewId(view: string): { base: string; id?: string } {
  const i = view.indexOf(':')
  return i === -1 ? { base: view } : { base: view.slice(0, i), id: view.slice(i + 1) }
}

export interface ViewRoute {
  /** view base id, e.g. 'channels' (exact) or 'channel-detail' (matches 'channel-detail:<id>') */
  id: string
  /** render the view; `id` is the parsed `:id` param for detail/edit routes */
  render: (params: { id?: string }) => React.ReactNode
}

/**
 * createViewRouter — declarative replacement for the hand-written `renderView()`
 * switch every plugin repeated. Maps a view's base id to a renderer and falls back
 * to `fallbackId` for unknown views. Define routes inside the component so their
 * `render` closures can capture `navigate`/handlers:
 *
 *   const renderView = createViewRouter([
 *     { id: 'channels',        render: () => <ChannelsView onOpen={(id) => navigate(`channel-detail:${id}`)} /> },
 *     { id: 'channel-detail',  render: ({ id }) => <ChannelDetailView channelId={id!} onBack={() => navigate('channels')} /> },
 *     { id: 'overview',        render: () => <OverviewView /> },
 *   ], 'overview')
 *   ...
 *   {renderView(view)}
 *
 * Not a fit for plugins that collapse detail/edit into a parent view + mode
 * (e.g. financial's `parseIntent`) — those should still use `parseViewId` directly.
 */
export function createViewRouter(routes: ViewRoute[], fallbackId: string): (view: string) => React.ReactNode {
  const map = new Map(routes.map((r) => [r.id, r]))
  return (view: string) => {
    const { base, id } = parseViewId(view)
    const route = map.get(base) ?? map.get(fallbackId)
    return route ? route.render({ id }) : null
  }
}
