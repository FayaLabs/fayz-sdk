import * as React from 'react'
import { useEffect } from 'react'
import { useOrganizationStore } from '../../stores/organization.store'

// ---------------------------------------------------------------------------
// Runtime-injected print styles — bypasses Tailwind/PostCSS processing.
// Uses #id selectors for maximum specificity over Tailwind utilities.
// ---------------------------------------------------------------------------

const PRINT_STYLE_ID = 'saas-print-styles'

const PRINT_CSS = /* css */ `
@media print {
  /* ── Hide chrome ── */
  [data-print="hide"],
  .no-print {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* ── Show print-only elements ── */
  .print-only {
    display: flex !important;
    visibility: visible !important;
  }

  /* ── Page setup ── */
  @page { margin: 1cm 1cm 1.5cm 1cm; }

  html, body {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
    color: #000 !important;
  }

  /* ── Layout reset: keep flex but remove height/overflow constraints ── */
  #saas-shell,
  .print-root {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
  }

  #saas-shell *,
  .print-root * {
    overflow: visible !important;
    max-height: none !important;
  }

  #saas-content-wrap,
  #saas-content-inner,
  #saas-main {
    height: auto !important;
    flex-shrink: 0 !important;
    overflow: visible !important;
    border-radius: 0 !important;
  }

  #saas-main {
    padding: 0 !important;
  }

  /* ── Print header ── */
  .print-header {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 8px 0;
    margin-bottom: 12px;
    border-bottom: 1px solid #ccc;
    font-size: 10px;
    color: #666;
  }
  .print-header-logo {
    font-size: 14px;
    font-weight: 700;
    color: #000;
  }
  .print-header-sub {
    font-size: 10px;
    color: #999;
  }

  /* ── Print footer (fixed to bottom of each page) ── */
  .print-footer {
    display: flex !important;
    position: fixed !important;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0 0 0;
    border-top: 1px solid #ccc;
    font-size: 8px;
    color: #999;
    bottom: 0;
    left: 1cm;
    right: 1cm;
  }

  /* ── Cards: don't break across pages ── */
  .rounded-xl, .rounded-lg, [class*="border bg-card"] {
    break-inside: avoid;
  }
  table { break-inside: auto; }
  tr { break-inside: avoid; }

  /* ── Kill animations — they start at opacity:0 and never run in print ── */
  .saas-nav-forward,
  .saas-nav-back,
  .saas-page-enter,
  .animate-in,
  .animate-out,
  [class*="saas-nav-"],
  [class*="saas-page-"] {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  /* ── Force visible text + backgrounds in print ── */
  :root, html, body, .dark {
    color-scheme: light !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Nuclear: force ALL text to be dark, all backgrounds white */
  #saas-shell *, .print-root *, #saas-main * {
    color: #1a1a1a !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Keep colored badges/pills visible */
  [class*="bg-emerald"], [class*="bg-blue"], [class*="bg-red"],
  [class*="bg-amber"], [class*="bg-violet"], [class*="bg-yellow"],
  [class*="bg-primary"] {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color: inherit !important;
  }

  /* Muted text slightly lighter */
  .text-muted-foreground { color: #666 !important; }
  [class*="text-muted"] { color: #666 !important; }
  [class*="text-xs"][class*="text-muted"] { color: #888 !important; }

  /* Backgrounds */
  .bg-card, .bg-content, .bg-background, .bg-muted { background: #fff !important; }
  .bg-card { border: 1px solid #ddd !important; }
}
`

function injectPrintStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(PRINT_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = PRINT_STYLE_ID
  style.textContent = PRINT_CSS
  document.head.appendChild(style)
}

/**
 * Print header — hidden on screen, visible only in print.
 */
export function PrintHeader() {
  const orgName = useOrganizationStore((s) => s.currentOrg?.name) ?? ''
  const orgDesc = useOrganizationStore((s) => (s.currentOrg as any)?.description) ?? ''

  useEffect(() => { injectPrintStyles() }, [])

  return (
    <div className="print-only print-header hidden">
      <div>
        <span className="print-header-logo">{orgName}</span>
        {orgDesc && <span className="print-header-sub"> — {orgDesc}</span>}
      </div>
      <span>{new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
    </div>
  )
}

/**
 * Print footer — hidden on screen, fixed to bottom of each printed page.
 */
export function PrintFooter() {
  const orgName = useOrganizationStore((s) => s.currentOrg?.name) ?? ''
  const now = new Date()
  const dateTime = `${now.toLocaleDateString()} ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className="print-only print-footer hidden">
      <span>{orgName}</span>
      <span>{dateTime}</span>
    </div>
  )
}
