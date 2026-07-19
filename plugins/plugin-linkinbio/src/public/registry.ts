import type { ComponentType } from 'react';
import type { BioBlock, BioPage } from '../types';

// ---------------------------------------------------------------------------
// Block registry — the extensibility seam.
//
// The 11 built-in blocks are rendered by BioPageRenderer's switch. Hosts that
// need a niche block type (e.g. a DJ tour map, a course catalog) register it
// here; BioPageRenderer consults the registry BEFORE its built-in switch, so a
// registered type wins and unknown types render nothing. This keeps the plugin
// komi-generic while letting each app extend it without forking.
//
//   import { registerBlock } from '@fayz-ai/plugin-linkinbio/public'
//   registerBlock('tour-map', ({ block }) => <TourMap stops={block.stops} />)
// ---------------------------------------------------------------------------

/** Uniform props every registered block component receives. */
export interface BlockRenderProps<B = BioBlock> {
  block: B;
  page: BioPage;
}

export type BlockComponent<B = BioBlock> = ComponentType<BlockRenderProps<B>>;

const registry = new Map<string, BlockComponent<never>>();

/** Register a custom block renderer for a `type` string not covered by the built-ins. */
export function registerBlock<B extends { type: string }>(type: B['type'], component: BlockComponent<B>): void {
  registry.set(type, component as unknown as BlockComponent<never>);
}

/** Look up a host-registered block renderer, or undefined for built-in/unknown types. */
export function getBlock(type: string): BlockComponent<never> | undefined {
  return registry.get(type);
}

/** Whether a host has registered a renderer for this type (built-ins are not in the registry). */
export function hasBlock(type: string): boolean {
  return registry.has(type);
}
