import * as React from 'react'
import { getBlock } from '../registry'

// ---------------------------------------------------------------------------
// Block tree — the universal page primitive. A page (admin or storefront) is an
// ordered tree of typed blocks. Block `type`s are resolved against the block
// registry, so a page is pure data: `{ type, props, children }`. This
// generalizes the storefront's HomeSection switch to every surface.
// ---------------------------------------------------------------------------

export interface BlockNode {
  /** Registered block id, e.g. 'hero', 'products', 'kpi-grid', 'custom:foo'. */
  type: string
  /** Stable id for keys / editing; optional. */
  id?: string
  props?: Record<string, unknown>
  children?: BlockNode[]
}

/** A block component receives its declared props plus the raw node (so a block
 *  can render its own children via <BlockChildren>). */
export type BlockComponentProps = Record<string, unknown> & {
  node?: BlockNode
  children?: React.ReactNode
}

// Rendered in place of an unresolved block type. Unknown blocks are caught
// ahead of production by `fayz doctor` / the conformance kit, so this visible
// marker is a development aid rather than a production concern.
function UnknownBlock({ type }: { type: string }): React.ReactElement | null {
  return React.createElement(
    'div',
    {
      style: {
        border: '1px dashed #c026d3',
        color: '#a21caf',
        padding: '8px 12px',
        font: '12px ui-monospace, monospace',
        borderRadius: 6,
      },
    },
    `Unknown block: "${type}"`,
  )
}

export function BlockRenderer({ node }: { node: BlockNode }): React.ReactElement | null {
  const Comp = getBlock(node.type)
  const childEls = node.children?.length
    ? node.children.map((child, i) =>
        React.createElement(BlockRenderer, { key: child.id ?? `${child.type}-${i}`, node: child }),
      )
    : null
  if (!Comp) return React.createElement(UnknownBlock, { type: node.type })
  return React.createElement(Comp, { ...(node.props ?? {}), node }, childEls)
}

/** Render an ordered list of blocks (a page body). */
export function renderBlocks(nodes: BlockNode[]): React.ReactNode {
  return nodes.map((node, i) =>
    React.createElement(BlockRenderer, { key: node.id ?? `${node.type}-${i}`, node }),
  )
}

/** Convenience for block components that render their own children. */
export function BlockChildren({ node }: { node?: BlockNode }): React.ReactNode {
  if (!node?.children?.length) return null
  return renderBlocks(node.children)
}
