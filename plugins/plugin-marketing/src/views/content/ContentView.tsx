import React from 'react'
import {
  Plus, NotebookPen, ChevronLeft, ChevronRight,
  Columns3, CalendarDays, List as ListIcon, Trash2, GripVertical, Settings2,
} from 'lucide-react'
import type { SocialAccount } from '../../data/contentTypes'
import {
  Button, Input, Skeleton, cn, ConfirmDialog, SegmentedControl,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useOrganizationStore } from '@fayz-ai/saas'
import { PlanBriefSheet } from './PlanBriefView'
import type { ContentPost } from '../../data/contentTypes'
import { useContentPlannerStore } from './ContentPlannerContext'
import { FormatBadge, PostStatusBadge, PlatformBadges, PlatformPicker } from './contentBits'
import type { BoardViewMode } from './contentStore'

// ---------------------------------------------------------------------------
// Content board — the spreadsheet, productized. Three lenses on the same plan
// (content-planning best practice: plan by cadence, schedule by date, audit by
// status): Board (weeks as columns), Calendar (posts on real dates) and List
// (flat audit table). The page never blanks out: with no account or plan the
// calendar renders as an empty ghost grid and the account selector carries an
// inline add-account flow with platform connections.
// ---------------------------------------------------------------------------

const DEFAULT_WEEKS = 8
const ADD_ACCOUNT_VALUE = '__add-account__'
// Custom MIME so week columns only react to post-card drags
const POST_DRAG_MIME = 'application/x-mkt-post'

function PostCard({ post, onOpen, onDelete }: {
  post: ContentPost
  onOpen: () => void
  onDelete?: () => void
}) {
  const t = useTranslation()
  const [dragging, setDragging] = React.useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(POST_DRAG_MIME, post.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        'group/post relative w-full cursor-pointer rounded-card border border-border bg-card p-3 pl-7 text-left transition-colors hover:bg-muted/40',
        dragging && 'opacity-50',
      )}
    >
      <GripVertical
        className="absolute left-1.5 top-3 h-4 w-4 cursor-grab text-muted-foreground/50 opacity-0 transition-opacity group-hover/post:opacity-100"
        aria-hidden
      />
      {onDelete && (
        <button
          type="button"
          aria-label={t('marketing.content.deletePost')}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute right-1.5 top-2 rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/post:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <p className="pr-5 text-sm font-medium text-foreground">
        {post.title || t('marketing.content.untitled')}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <FormatBadge format={post.format} />
        <PostStatusBadge status={post.status} />
        {post.scheduledDate && (
          <span className="text-xs text-muted-foreground">{post.scheduledDate}</span>
        )}
        <PlatformBadges platforms={post.platforms} />
      </div>
    </div>
  )
}

function WeekColumn({ week, rangeLabel, posts, onOpenPost, onNewPost, onDeletePost, onDropPost, disabled }: {
  week: number
  /** Real date range of the week (e.g. "6 – 12 out"). */
  rangeLabel: string
  posts: ContentPost[]
  onOpenPost: (id: string) => void
  onNewPost: (week: number) => void
  onDeletePost?: (id: string) => void
  onDropPost?: (postId: string, week: number) => void
  disabled?: boolean
}) {
  const t = useTranslation()
  const [isDropTarget, setIsDropTarget] = React.useState(false)
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-card border border-border bg-muted/20 p-2.5 transition-colors',
        isDropTarget && 'border-primary bg-primary/5 ring-1 ring-primary/40',
      )}
      onDragOver={(e) => {
        if (!onDropPost || !e.dataTransfer.types.includes(POST_DRAG_MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDropTarget(true)
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        if (!onDropPost) return
        e.preventDefault()
        setIsDropTarget(false)
        const postId = e.dataTransfer.getData(POST_DRAG_MIME)
        if (postId) onDropPost(postId, week)
      }}
    >
      <div className="flex items-baseline justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('marketing.content.week')} {week}
        </p>
        <p className="text-xs text-muted-foreground/80">{rangeLabel}</p>
      </div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onOpen={() => onOpenPost(post.id)}
          onDelete={onDeletePost ? () => onDeletePost(post.id) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={() => onNewPost(week)}
        disabled={disabled}
        className="flex items-center justify-center gap-1 rounded-card border border-dashed border-border p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('marketing.content.newPost')}
      </button>
    </div>
  )
}

/** Account modal — create ("+" option) or settings (cog on an account):
 *  name, handle, platform connections, and delete on the edit variant. */
function AccountModal({ open, account, onClose }: {
  open: boolean
  account?: SocialAccount | null
  onClose: () => void
}) {
  const t = useTranslation()
  const saveAccount = useContentPlannerStore((s) => s.saveAccount)
  const deleteAccount = useContentPlannerStore((s) => s.deleteAccount)
  const isEdit = !!account
  const [name, setName] = React.useState('')
  const [handle, setHandle] = React.useState('')
  const [platforms, setPlatforms] = React.useState<string[]>(['instagram'])
  const [saving, setSaving] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  // Prefill per open (edit) / reset (create) so drafts don't leak between uses
  React.useEffect(() => {
    if (open) {
      setName(account?.name ?? '')
      setHandle(account?.handle ?? '')
      setPlatforms(account?.platforms?.length ? account.platforms : ['instagram'])
      setSaving(false)
      setConfirmDelete(false)
    }
  }, [open, account])

  const create = async () => {
    if (!name.trim() || platforms.length === 0 || saving) return
    setSaving(true)
    try {
      await saveAccount({
        ...(isEdit ? { id: account.id } : {}),
        name: name.trim(),
        handle: handle.trim() || undefined,
        platforms,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!account || saving) return
    setSaving(true)
    try {
      await deleteAccount(account.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>
            {isEdit ? t('marketing.content.editAccountTitle') : t('marketing.content.addAccountTitle')}
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t('marketing.content.nameLabel')}
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('marketing.content.accountNamePlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t('marketing.content.handleLabel')}
            </label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t('marketing.content.handlePlaceholder')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t('marketing.content.platformsLabel')}
            </label>
            <PlatformPicker value={platforms} onChange={setPlatforms} />
          </div>
        </ModalBody>
        <ModalFooter>
          {/* Delete is a two-step INLINE confirm — never a dialog stacked on a
              modal (no modal-over-modal, house rule). */}
          {confirmDelete && isEdit ? (
            <div className="flex w-full items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 p-3">
              <p className="flex-1 text-xs text-destructive">
                {t('marketing.content.deleteAccountConfirm')}
              </p>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={saving}>
                {t('marketing.content.cancel')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void remove()} disabled={saving}>
                {t('marketing.content.deleteAccount')}
              </Button>
            </div>
          ) : (
            <>
              {isEdit && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="mr-auto text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t('marketing.content.deleteAccount')}
                </Button>
              )}
              <Button variant="outline" onClick={onClose} disabled={saving}>
                {t('marketing.content.cancel')}
              </Button>
              <Button onClick={() => void create()} disabled={saving || !name.trim() || platforms.length === 0}>
                {isEdit ? t('marketing.content.save') : t('marketing.content.createAccount')}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

/** Master account dropdown — always visible at the top. Each account carries
 *  a cog that opens its settings (edit / delete); the last option creates. */
function AccountSelector() {
  const t = useTranslation()
  const loaded = useContentPlannerStore((s) => s.loaded)
  const accounts = useContentPlannerStore((s) => s.accounts)
  const activeAccountId = useContentPlannerStore((s) => s.activeAccountId)
  const setAccount = useContentPlannerStore((s) => s.setAccount)
  const [open, setOpen] = React.useState(false)
  const [modal, setModal] = React.useState<{ mode: 'create' } | { mode: 'edit'; account: SocialAccount } | null>(null)

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null

  if (!loaded) {
    return (
      <div className="flex items-center gap-1">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-9" />
      </div>
    )
  }

  const openSettings = (account: SocialAccount) => {
    setOpen(false)
    setModal({ mode: 'edit', account })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Select
          open={open}
          onOpenChange={setOpen}
          value={activeAccountId ?? undefined}
          onValueChange={(id) => {
            if (id === ADD_ACCOUNT_VALUE) {
              setModal({ mode: 'create' })
              return
            }
            void setAccount(id)
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t('marketing.content.account')} />
          </SelectTrigger>
          <SelectContent>
            {accounts.length === 0 ? (
              <SelectItem value="__none__" disabled>
                {t('marketing.content.noAccountsAvailable')}
              </SelectItem>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="relative">
                  <SelectItem value={acc.id} className="pr-9">
                    <span className="flex items-center gap-2">
                      {acc.name}
                      <PlatformBadges platforms={acc.platforms} />
                    </span>
                  </SelectItem>
                  {/* Sits on top of the item — pointer events stop here so the
                      cog opens settings instead of selecting the account. */}
                  <button
                    type="button"
                    aria-label={t('marketing.content.accountSettings')}
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                    onPointerUp={(e) => { e.stopPropagation(); e.preventDefault() }}
                    onClick={(e) => {
                      e.stopPropagation()
                      openSettings(acc)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
            <SelectSeparator />
            <SelectItem value={ADD_ACCOUNT_VALUE}>
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t('marketing.content.addAccount')}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {activeAccount && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground"
            aria-label={t('marketing.content.accountSettings')}
            onClick={() => setModal({ mode: 'edit', account: activeAccount })}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <AccountModal
        open={!!modal}
        account={modal?.mode === 'edit' ? modal.account : null}
        onClose={() => setModal(null)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// View switcher
// ---------------------------------------------------------------------------

function ViewSwitcher({ mode, onChange }: { mode: BoardViewMode; onChange: (m: BoardViewMode) => void }) {
  const t = useTranslation()
  return (
    <SegmentedControl<BoardViewMode>
      size="md"
      aria-label={t('marketing.content.viewBoard')}
      value={mode}
      onChange={onChange}
      options={[
        { value: 'board', label: <span className="flex items-center gap-1.5"><Columns3 className="h-3.5 w-3.5" />{t('marketing.content.viewBoard')}</span> },
        { value: 'calendar', label: <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{t('marketing.content.viewCalendar')}</span> },
        { value: 'list', label: <span className="flex items-center gap-1.5"><ListIcon className="h-3.5 w-3.5" />{t('marketing.content.viewList')}</span> },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// Board view — weeks as columns grouped by month blocks (cadence planning)
// ---------------------------------------------------------------------------

interface BoardWeek {
  week: number
  rangeLabel: string
  monthLabel: string
}

function shortDay(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Anchor each plan week to real dates (same reference the calendar view
 *  uses): week N starts at startDate + (N-1) weeks; month sections group by
 *  the month the week starts in. */
function buildBoardWeeks(startDate: Date, weeksCount: number): BoardWeek[] {
  return Array.from({ length: weeksCount }, (_, i) => {
    const start = new Date(startDate)
    start.setDate(start.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      week: i + 1,
      rangeLabel: `${shortDay(start)} – ${shortDay(end)}`,
      monthLabel: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    }
  })
}

function BoardView({ startDate, weeksCount, postsByWeek, onOpenPost, onNewPost, onDeletePost, onDropPost, disabled }: {
  startDate: Date
  weeksCount: number
  postsByWeek: Map<number, ContentPost[]>
  onOpenPost: (id: string) => void
  onNewPost: (week: number) => void
  onDeletePost: (id: string) => void
  onDropPost: (postId: string, week: number) => void
  disabled: boolean
}) {
  const months: Array<{ label: string; weeks: BoardWeek[] }> = []
  for (const bw of buildBoardWeeks(startDate, weeksCount)) {
    const current = months[months.length - 1]
    if (current && current.label === bw.monthLabel) current.weeks.push(bw)
    else months.push({ label: bw.monthLabel, weeks: [bw] })
  }
  return (
    <div className="space-y-8">
      {months.map(({ label, weeks }) => (
        <section key={label} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {weeks.map(({ week, rangeLabel }) => (
              <WeekColumn
                key={week}
                week={week}
                rangeLabel={rangeLabel}
                posts={postsByWeek.get(week) ?? []}
                onOpenPost={onOpenPost}
                onNewPost={onNewPost}
                onDeletePost={onDeletePost}
                onDropPost={onDropPost}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendar view — posts pinned to real dates, month by month
// ---------------------------------------------------------------------------

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayOfCurrentWeek(): Date {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

function CalendarView({ posts, onOpenPost, onNewPostAt, disabled }: {
  posts: ContentPost[]
  onOpenPost: (id: string) => void
  onNewPostAt: (isoDate: string) => void
  disabled: boolean
}) {
  const t = useTranslation()
  const [cursor, setCursor] = React.useState(() => {
    const first = posts.find((p) => p.scheduledDate)?.scheduledDate
    const base = first ? new Date(`${first}T00:00:00`) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  // Days showing their full list when they hold more posts than the cap
  const [expandedDay, setExpandedDay] = React.useState<string | null>(null)
  const MAX_VISIBLE = 3

  const postsByDate = React.useMemo(() => {
    const map = new Map<string, ContentPost[]>()
    for (const post of posts) {
      if (!post.scheduledDate) continue
      const list = map.get(post.scheduledDate) ?? []
      list.push(post)
      map.set(post.scheduledDate, list)
    }
    return map
  }, [posts])

  const unscheduled = posts.filter((p) => !p.scheduledDate)

  // Monday-first grid covering the whole displayed month.
  const days = React.useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(firstOfMonth)
    start.setDate(start.getDate() - ((firstOfMonth.getDay() + 6) % 7))
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      cells.push(d)
    }
    // Trim trailing full weeks outside the month
    while (cells.length > 7 && cells[cells.length - 7].getMonth() !== cursor.getMonth()) {
      cells.splice(cells.length - 7, 7)
    }
    return cells
  }, [cursor])

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const weekdayLabels = days.slice(0, 7).map((d) =>
    d.toLocaleDateString(undefined, { weekday: 'short' }),
  )
  const todayISO = toISODate(new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-foreground">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-border bg-muted/20 p-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('marketing.content.unscheduled')}
          </span>
          {unscheduled.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => onOpenPost(post.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              {post.title || t('marketing.content.untitled')}
              <FormatBadge format={post.format} />
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {weekdayLabels.map((label, i) => (
            <div key={i} className="px-2 py-1.5 text-center text-xs font-medium capitalize text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const iso = toISODate(day)
            const inMonth = day.getMonth() === cursor.getMonth()
            const dayPosts = postsByDate.get(iso) ?? []
            return (
              <div
                key={i}
                className={cn(
                  'group min-h-24 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0',
                  !inMonth && 'bg-muted/20',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs',
                      inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                      iso === todayISO && 'flex h-5 w-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => onNewPostAt(iso)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
                      aria-label={t('marketing.content.newPost')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {(expandedDay === iso ? dayPosts : dayPosts.slice(0, MAX_VISIBLE)).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => onOpenPost(post.id)}
                      className="block w-full truncate rounded border border-border bg-card px-1.5 py-1 text-left text-xs text-foreground transition-colors hover:bg-muted/40"
                    >
                      {post.title || t('marketing.content.untitled')}
                    </button>
                  ))}
                  {dayPosts.length > MAX_VISIBLE && (
                    <button
                      type="button"
                      onClick={() => setExpandedDay(expandedDay === iso ? null : iso)}
                      className="block w-full px-1.5 py-0.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {expandedDay === iso
                        ? t('marketing.content.showLess')
                        : `+${dayPosts.length - MAX_VISIBLE}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List view — flat audit table (sorted by week, then position)
// ---------------------------------------------------------------------------

function ListView({ posts, onOpenPost }: { posts: ContentPost[]; onOpenPost: (id: string) => void }) {
  const t = useTranslation()
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('marketing.content.noPosts')}</p>
  }
  return (
    <div className="overflow-hidden rounded-card border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">{t('marketing.content.listWeek')}</th>
            <th className="px-3 py-2">{t('marketing.content.listTitle')}</th>
            <th className="px-3 py-2">{t('marketing.content.listFormat')}</th>
            <th className="px-3 py-2">{t('marketing.content.listStatus')}</th>
            <th className="px-3 py-2">{t('marketing.content.listDate')}</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              onClick={() => onOpenPost(post.id)}
              className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
            >
              <td className="px-3 py-2 text-muted-foreground">{post.weekNumber}</td>
              <td className="px-3 py-2 font-medium text-foreground">
                <span className="flex items-center gap-2">
                  {post.title || t('marketing.content.untitled')}
                  <PlatformBadges platforms={post.platforms} />
                </span>
              </td>
              <td className="px-3 py-2"><FormatBadge format={post.format} /></td>
              <td className="px-3 py-2"><PostStatusBadge status={post.status} /></td>
              <td className="px-3 py-2 text-muted-foreground">{post.scheduledDate ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ContentView({ onOpenPost }: {
  onOpenPost: (id: string) => void
}) {
  const t = useTranslation()
  const loaded = useContentPlannerStore((s) => s.loaded)
  const loading = useContentPlannerStore((s) => s.loading)
  const accounts = useContentPlannerStore((s) => s.accounts)
  const activeAccountId = useContentPlannerStore((s) => s.activeAccountId)
  const plan = useContentPlannerStore((s) => s.activePlan)
  const posts = useContentPlannerStore((s) => s.posts)
  const load = useContentPlannerStore((s) => s.load)
  const savePlan = useContentPlannerStore((s) => s.savePlan)
  const savePost = useContentPlannerStore((s) => s.savePost)
  const deletePost = useContentPlannerStore((s) => s.deletePost)
  const viewMode = useContentPlannerStore((s) => s.viewMode)
  const setViewMode = useContentPlannerStore((s) => s.setViewMode)
  const loadedTenantId = useContentPlannerStore((s) => s.loadedTenantId)

  const [briefOpen, setBriefOpen] = React.useState(false)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

  // The tenant hydrates async after login/refresh — (re)load whenever the
  // active tenant diverges from the one the current data belongs to. Also
  // covers org switching.
  const tenantId = useOrganizationStore((state) => state.currentOrg?.id)
  React.useEffect(() => {
    if (!loading && (!loaded || (tenantId && tenantId !== loadedTenantId))) void load()
  }, [tenantId, loadedTenantId, loaded, loading, load])

  const postsByWeek = React.useMemo(() => {
    const map = new Map<number, ContentPost[]>()
    for (const post of posts) {
      const list = map.get(post.weekNumber) ?? []
      list.push(post)
      map.set(post.weekNumber, list)
    }
    return map
  }, [posts])

  const ensurePlan = async () => {
    if (plan) return plan
    if (!activeAccountId) return null
    return savePlan({
      accountId: activeAccountId,
      name: t('marketing.content.defaultPlanName'),
      status: 'active',
      weeksCount: DEFAULT_WEEKS,
      startDate: toISODate(mondayOfCurrentWeek()),
    })
  }

  // With an account but no plan yet, the first "new post" click bootstraps the
  // default plan and drops the post straight into it. The scheduled date
  // prefills with the first day of the selected week so the post lands dated.
  const createPost = async (week: number) => {
    const targetPlan = await ensurePlan()
    if (!targetPlan) return
    const start = targetPlan.startDate
      ? new Date(`${targetPlan.startDate}T00:00:00`)
      : mondayOfCurrentWeek()
    start.setDate(start.getDate() + (week - 1) * 7)
    const post = await savePost({
      planId: targetPlan.id,
      weekNumber: week,
      title: '',
      format: 'reel',
      status: 'idea',
      scheduledDate: toISODate(start),
    })
    onOpenPost(post.id)
  }

  const movePost = async (postId: string, week: number) => {
    const post = posts.find((p) => p.id === postId)
    if (!post || post.weekNumber === week) return
    await savePost({ id: postId, weekNumber: week })
  }

  // Calendar day click → derive the plan week from startDate when available.
  const createPostAt = async (isoDate: string) => {
    const targetPlan = await ensurePlan()
    if (!targetPlan) return
    let week = 1
    if (targetPlan.startDate) {
      const start = new Date(`${targetPlan.startDate}T00:00:00`)
      const day = new Date(`${isoDate}T00:00:00`)
      const diff = Math.floor((day.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000)) + 1
      week = Math.min(Math.max(diff, 1), targetPlan.weeksCount)
    }
    const post = await savePost({
      planId: targetPlan.id,
      weekNumber: week,
      title: '',
      format: 'reel',
      status: 'idea',
      scheduledDate: isoDate,
    })
    onOpenPost(post.id)
  }

  // Initial load, tenant hydration and account switches all re-skeleton the
  // board so stale posts never flash under the new selection.
  const busy = !loaded || loading

  const hasAccount = accounts.length > 0
  const weeksCount = plan?.weeksCount ?? DEFAULT_WEEKS
  // Same date anchor the calendar view uses. Plans without a start date
  // (legacy rows) display against the current week.
  const boardStart = plan?.startDate
    ? new Date(`${plan.startDate}T00:00:00`)
    : mondayOfCurrentWeek()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <AccountSelector />
          {plan && <span className="text-sm text-muted-foreground">{plan.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitcher mode={viewMode} onChange={setViewMode} />
          {plan && (
            <Button variant="outline" size="sm" onClick={() => setBriefOpen(true)}>
              <NotebookPen className="mr-1.5 h-4 w-4" />
              {t('marketing.content.brief')}
            </Button>
          )}
        </div>
      </div>

      {!busy && !hasAccount && (
        <p className="text-sm text-muted-foreground">
          {t('marketing.content.noAccountsHint')}
        </p>
      )}

      {busy && viewMode === 'board' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      )}
      {busy && viewMode === 'calendar' && <Skeleton className="h-96 w-full" />}
      {busy && viewMode === 'list' && (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!busy && viewMode === 'board' && (
        <BoardView
          startDate={boardStart}
          weeksCount={weeksCount}
          postsByWeek={postsByWeek}
          onOpenPost={onOpenPost}
          onNewPost={(w) => void createPost(w)}
          onDeletePost={setPendingDeleteId}
          onDropPost={(id, w) => void movePost(id, w)}
          disabled={!hasAccount}
        />
      )}
      {!busy && viewMode === 'calendar' && (
        <CalendarView
          posts={posts}
          onOpenPost={onOpenPost}
          onNewPostAt={(iso) => void createPostAt(iso)}
          disabled={!hasAccount}
        />
      )}
      {!busy && viewMode === 'list' && <ListView posts={posts} onOpenPost={onOpenPost} />}

      <PlanBriefSheet open={briefOpen} onClose={() => setBriefOpen(false)} />

      <ConfirmDialog
        open={!!pendingDeleteId}
        variant="destructive"
        title={t('marketing.content.deletePost')}
        description={t('marketing.content.deletePostConfirm')}
        confirmLabel={t('marketing.content.deletePost')}
        cancelLabel={t('marketing.content.cancel')}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          const id = pendingDeleteId
          setPendingDeleteId(null)
          if (id) void deletePost(id)
        }}
      />
    </div>
  )
}
