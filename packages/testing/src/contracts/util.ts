// ---------------------------------------------------------------------------
// Shared contract plumbing — the `@module:<id>` + `@app:<name>` tagging every
// generated test carries. The Checkup reporter (../reporter) aggregates by
// these tags, so they are the contract between the factories and the report.
// ---------------------------------------------------------------------------
import type { TestingAppConfig } from '../config'

export interface TestTagOptions {
  tag: string[]
}

/** Tag options for a contract-generated (SDK) test in a given module. */
export function sdkTags(cfg: TestingAppConfig, module: string): TestTagOptions {
  return { tag: [`@module:${module}`, `@app:${cfg.app}`, '@contract'] }
}

/** The module id a config block resolves to (block.module ?? fallback). */
export function moduleId(explicit: string | undefined, fallback: string): string {
  return explicit ?? fallback
}
