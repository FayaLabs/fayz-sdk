// ---------------------------------------------------------------------------
// Timezone-aware date helpers — the São Paulo (or configurable) calendar math
// every agenda/site-booking suite repeats. The availability RPC computes slots
// in the tenant timezone, so the browser + these helpers must agree on it.
//
// Deduped from school/fixtures/backend.ts (spToday/spDatePlus/businessDatePlus/
// ddmm/fmtTimeSP/weekdayOf).
// ---------------------------------------------------------------------------
export const DEFAULT_TZ = 'America/Sao_Paulo'

/** Format a timestamp as "HH:mm" in `tz` — same rendering the agenda grid uses. */
export function fmtTimeSP(iso: string, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: tz,
  }).format(new Date(iso))
}

/** Calendar date ('YYYY-MM-DD') of a timestamp in `tz`. */
export function dateInTz(iso: string, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}

/** Today's calendar date in `tz`, as {y,m,d}. */
function today(tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/** `tz` calendar date + n days, as 'YYYY-MM-DD' (matches a site's week strip). */
export function datePlus(n: number, tz: string = DEFAULT_TZ): string {
  const { y, m, d } = today(tz)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Weekday (0=Sun..6=Sat) for a 'YYYY-MM-DD' date. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay()
}

/**
 * First OPEN business day at least `minAhead` days out, as 'YYYY-MM-DD',
 * skipping `closedWeekdays` (default [0] = closed Sunday). Keeps ~"D+n"
 * semantics while never landing on a closed day.
 */
export function businessDatePlus(
  minAhead: number,
  closedWeekdays: number[] = [0],
  tz: string = DEFAULT_TZ,
): string {
  let n = minAhead
  let iso = datePlus(n, tz)
  while (closedWeekdays.includes(weekdayOf(iso))) iso = datePlus(++n, tz)
  return iso
}

/** "DD/MM" label a week-strip day button renders for a date. */
export function ddmm(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
