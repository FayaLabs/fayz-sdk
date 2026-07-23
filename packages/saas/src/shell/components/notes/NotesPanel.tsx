import * as React from 'react'
import { ArrowLeft, CheckSquare2, Eye, Pencil, Pin, PinOff, Plus, Search, Sparkles, Square, StickyNote, Trash2 } from 'lucide-react'
import { Input, cn } from '@fayz-ai/ui'
import { create as createStore } from 'zustand'
import { useAuthStore } from '@fayz-ai/auth'
import { useTranslation } from '../../hooks/useTranslation'
import { useOrganizationStore } from '../../stores/organization.store'
import { useRightRailPanel } from '../../right-rail'
import { useDelegateToAssistant } from '../../assistant-delegation'
import { useNotesTasksBridge, type NoteTodo } from '../../notes-tasks-bridge'
import { ChatMarkdown } from '../chat/markdown'

// ---------------------------------------------------------------------------
// NotesPanel — the rail's "Notas" tab. Apple Notes-inspired: a searchable list
// (pinned first), and a plain-markdown editor where the first line is the
// title. Local-first: notes persist per tenant+user in localStorage — the seam
// to graduate to a DB-backed provider later without changing the UI.
// ---------------------------------------------------------------------------

export interface Note {
  id: string
  content: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

function storageKey(orgId: string, userId: string): string {
  return `fayz.notes.${orgId}.${userId}`
}

// Note count shared between the panel (which mutates) and the tab badge
// (registered elsewhere) — module-level so both see the same number live.
const useNotesCount = createStore<{ count: number; setCount: (count: number) => void }>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}))

function loadNotes(key: string): Note[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Note[]) : []
  } catch {
    return []
  }
}

function saveNotes(key: string, notes: Note[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(notes))
  } catch {
    /* quota/private mode — notes stay in-memory for the session */
  }
}

function titleOf(note: Note): string {
  return note.content.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').trim() ?? ''
}

function snippetOf(note: Note): string {
  const lines = note.content.split('\n').filter((l) => l.trim())
  return lines.slice(1).join(' · ').slice(0, 120)
}

function noteDate(iso: string, locale?: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function NotesPanel() {
  const { t, locale } = useTranslation()
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return v && v !== key ? v : fallback
  }

  const user = useAuthStore((s) => s.user)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const key = storageKey(currentOrg?.id ?? 'local', user?.id ?? 'anon')

  const [notes, setNotes] = React.useState<Note[]>(() => loadNotes(key))
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [preview, setPreview] = React.useState(false)
  const [confirmingDelete, setConfirmingDelete] = React.useState<string | null>(null)

  // Workspace switch swaps the whole notebook.
  React.useEffect(() => {
    setNotes(loadNotes(key))
    setOpenId(null)
  }, [key])

  const update = (next: Note[]) => {
    setNotes(next)
    saveNotes(key, next)
    useNotesCount.getState().setCount(next.length)
  }

  const createNote = () => {
    const now = new Date().toISOString()
    const note: Note = {
      id: `n_${now}_${Math.random().toString(36).slice(2, 8)}`,
      content: '',
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    update([note, ...notes])
    setPreview(false)
    setOpenId(note.id)
  }

  const patchNote = (id: string, patch: Partial<Note>) =>
    update(notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)))

  const deleteNote = (id: string) => {
    update(notes.filter((n) => n.id !== id))
    setConfirmingDelete(null)
    if (openId === id) setOpenId(null)
  }

  const open = openId ? notes.find((n) => n.id === openId) : null

  // -------------------------------------------------------------------------
  // Editor
  // -------------------------------------------------------------------------
  if (open) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tr('notes.back', 'Notas')}
          </button>
          <span className="flex-1" />
          <IconButton
            label={open.pinned ? tr('notes.unpin', 'Desafixar') : tr('notes.pin', 'Fixar')}
            onClick={() => patchNote(open.id, { pinned: !open.pinned })}
            active={open.pinned}
          >
            {open.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton
            label={preview ? tr('notes.edit', 'Editar') : tr('notes.preview', 'Visualizar')}
            onClick={() => setPreview(!preview)}
            active={preview}
          >
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton label={tr('notes.delete', 'Excluir')} onClick={() => deleteNote(open.id)} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        {preview ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
            {open.content.trim() ? (
              <NoteBody
                content={open.content}
                onToggleLine={(lineIdx) => patchNote(open.id, { content: toggleChecklistLine(open.content, lineIdx) })}
              />
            ) : (
              <p className="text-muted-foreground">{tr('notes.emptyNote', 'Nota vazia')}</p>
            )}
          </div>
        ) : (
          <textarea
            autoFocus
            value={open.content}
            onChange={(e) => patchNote(open.id, { content: e.target.value })}
            placeholder={tr('notes.placeholder', 'Escreva algo… (markdown funciona: # título, - [ ] checklist, **negrito**)')}
            className={cn(
              'min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground',
              'placeholder:text-muted-foreground/60 focus:outline-none',
            )}
          />
        )}
        <DelegateCta note={open} tr={tr} />

        <NoteTodosSection noteId={open.id} noteTitle={titleOf(open)} tr={tr} />

        <p className="border-t border-border/40 px-4 py-1.5 text-[10px] text-muted-foreground/60">
          {tr('notes.created', 'Criada')} {noteDate(open.createdAt, locale)} · {tr('notes.edited', 'Editada')} {noteDate(open.updatedAt, locale)}
        </p>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // List
  // -------------------------------------------------------------------------
  const q = search.trim().toLowerCase()
  const visible = notes
    .filter((n) => !q || n.content.toLowerCase().includes(q))
    .sort((a, b) =>
      a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.updatedAt.localeCompare(a.updatedAt),
    )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr('notes.search', 'Buscar notas…')}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={createNote}
          aria-label={tr('notes.new', 'Nova nota')}
          title={tr('notes.new', 'Nova nota')}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <StickyNote className="h-6 w-6" />
            <p className="text-sm font-medium text-foreground">
              {q ? tr('notes.noResults', 'Nada encontrado') : tr('notes.empty', 'Nenhuma nota ainda')}
            </p>
            {!q && (
              <p className="text-xs">{tr('notes.emptyHint', 'Crie sua primeira nota com o botão +')}</p>
            )}
          </div>
        )}
        {visible.map((n) => {
          const title = titleOf(n) || tr('notes.untitled', 'Nova nota')
          const snippet = snippetOf(n)
          const confirming = confirmingDelete === n.id
          return (
            <div
              key={n.id}
              className="group relative border-b border-border/40 transition-colors hover:bg-muted/50"
            >
              <button
                type="button"
                onClick={() => { setPreview(false); setOpenId(n.id) }}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left"
              >
                <span className="flex w-full items-center gap-1.5">
                  {n.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                    {title}
                  </span>
                </span>
                <span className="flex w-full items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 tabular-nums">{noteDate(n.updatedAt, locale)}</span>
                  <span className="min-w-0 truncate">
                    {snippet || tr('notes.emptyNote', 'Nota vazia')}
                  </span>
                </span>
              </button>
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {confirming ? (
                  <span className="flex items-center gap-1 rounded-lg bg-card px-1 py-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                    >
                      {tr('notes.confirmDelete', 'Excluir?')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(null)}
                      className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      {tr('common.cancel', 'Cancelar')}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(n.id)}
                    aria-label={tr('notes.delete', 'Excluir')}
                    className="rounded-lg p-1.5 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// "Resolver com IA" — the agentic hand-off. The user doesn't work the note;
// they delegate it. Queues an explicit prompt (auto-sends, unlike a draft) and
// flips the rail to the Chat tab where the agent picks it up with its tools.
// ---------------------------------------------------------------------------

function DelegateCta({ note, tr }: { note: Note; tr: (key: string, fallback: string) => string }) {
  const delegate = useDelegateToAssistant()
  if (!note.content.trim()) return null

  const handleClick = () =>
    delegate(
      `${tr(
        'notes.delegateNote.prompt',
        'Assuma esta nota e resolva: analise o conteúdo, execute o que for acionável com suas ferramentas e me devolva o que fez e o que ficou pendente.',
      )}\n\n---\n${note.content}`,
    )

  return (
    <div className="px-4 pb-2">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'group flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold',
          'bg-gradient-to-r from-primary via-primary/80 to-primary text-primary-foreground',
          'bg-[length:200%_100%] bg-left shadow-sm transition-all duration-500',
          'hover:bg-right hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        {tr('notes.delegateNote', 'Conversar com IA')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Note todos — always-available input that creates REAL tasks (plugin-tasks)
// linked to this note via the notes-tasks bridge. The Tarefas tab remains the
// single source of truth; here the note sees and toggles its own slice. In an
// app without a tasks backend the section hides (inline `- [ ]` checklists
// still cover light lists).
// ---------------------------------------------------------------------------

function NoteTodosSection({ noteId, noteTitle, tr }: {
  noteId: string
  noteTitle: string
  tr: (key: string, fallback: string) => string
}) {
  const adapter = useNotesTasksBridge((s) => s.adapter)
  const delegate = useDelegateToAssistant()
  const [todos, setTodos] = React.useState<NoteTodo[]>([])
  const [draft, setDraft] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!adapter) return
    let alive = true
    adapter.listTodos(noteId).then((rows) => { if (alive) setTodos(rows) }).catch(() => {})
    return () => { alive = false }
  }, [adapter, noteId])

  if (!adapter) return null

  const addTodo = async () => {
    const title = draft.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      const todo = await adapter.createTodo({ title, noteId, noteTitle })
      setTodos((prev) => [...prev, todo])
      setDraft('')
    } catch {
      /* provider offline — keep the draft so nothing is lost */
    } finally {
      setBusy(false)
    }
  }

  const toggle = (todo: NoteTodo) => {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)))
    adapter.toggleTodo(todo.id, !todo.done).catch(() => {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: todo.done } : t)))
    })
  }

  const remove = (todo: NoteTodo) => {
    setTodos((prev) => prev.filter((t) => t.id !== todo.id))
    adapter.removeTodo(todo.id).catch(() => {
      setTodos((prev) => [...prev, todo])
    })
  }

  return (
    <div className="border-t border-border/40 px-4 py-2.5">
      <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {tr('notes.todos', 'Tarefas')}{todos.length > 0 ? ` · ${todos.filter((t) => !t.done).length}/${todos.length}` : ''}
      </p>
      <ul className="space-y-0.5">
        {todos.map((todo) => (
          <li key={todo.id} className="group flex items-start gap-2">
            <button
              type="button"
              onClick={() => toggle(todo)}
              className="mt-0.5 shrink-0 text-muted-foreground/60 transition-colors hover:text-primary"
              aria-label={todo.title}
            >
              {todo.done ? <CheckSquare2 className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
            </button>
            <span className={cn('min-w-0 flex-1 text-[13px]', todo.done && 'text-muted-foreground line-through')}>
              {todo.title}
            </span>
            {!todo.done && (
              <button
                type="button"
                onClick={() =>
                  delegate(
                    `${tr(
                      'notes.delegateTodo.prompt',
                      'Assuma esta tarefa e resolva agora, usando suas ferramentas quando precisar. Me devolva o resultado:',
                    )}\n\n"${todo.title}"${noteTitle ? ` — ${tr('notes.delegateTodo.from', 'da nota')} "${noteTitle}"` : ''}`,
                  )
                }
                aria-label={tr('notes.delegateTodo', 'Conversar com IA')}
                title={tr('notes.delegateTodo', 'Conversar com IA')}
                className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(todo)}
              aria-label={tr('notes.delete', 'Excluir')}
              className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void addTodo() }}
          placeholder={tr('notes.addTodo', 'Adicionar tarefa…')}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checklist-aware preview. `- [ ]`/`- [x]` lines render as toggleable
// checkboxes (the light-task use case notes absorb so it never needs a real
// Task); everything else renders as markdown.
// ---------------------------------------------------------------------------

const CHECKLIST_RE = /^\s*[-*] \[( |x|X)\] (.*)$/

function toggleChecklistLine(content: string, lineIdx: number): string {
  const lines = content.split('\n')
  const line = lines[lineIdx]
  if (!line) return content
  lines[lineIdx] = CHECKLIST_RE.test(line)
    ? line.replace(/\[( |x|X)\]/, (m) => (m === '[ ]' ? '[x]' : '[ ]'))
    : line
  return lines.join('\n')
}

type NoteBlock =
  | { type: 'md'; text: string }
  | { type: 'check'; items: Array<{ line: number; done: boolean; text: string }> }

function segment(content: string): NoteBlock[] {
  const blocks: NoteBlock[] = []
  content.split('\n').forEach((line, i) => {
    const m = line.match(CHECKLIST_RE)
    const last = blocks[blocks.length - 1]
    if (m) {
      const item = { line: i, done: m[1].toLowerCase() === 'x', text: m[2] }
      if (last?.type === 'check') last.items.push(item)
      else blocks.push({ type: 'check', items: [item] })
    } else if (last?.type === 'md') {
      last.text += `\n${line}`
    } else {
      blocks.push({ type: 'md', text: line })
    }
  })
  return blocks
}

function NoteBody({ content, onToggleLine }: { content: string; onToggleLine: (line: number) => void }) {
  return (
    <div className="space-y-2">
      {segment(content).map((block, i) =>
        block.type === 'md' ? (
          block.text.trim() ? <ChatMarkdown key={i} content={block.text} /> : null
        ) : (
          <ul key={i} className="space-y-1">
            {block.items.map((item) => (
              <li key={item.line}>
                <button
                  type="button"
                  onClick={() => onToggleLine(item.line)}
                  className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/50"
                >
                  {item.done ? (
                    <CheckSquare2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                  )}
                  <span className={cn('min-w-0 flex-1', item.done && 'text-muted-foreground line-through')}>
                    {item.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}

/** Registers Notas as a rail tab (after Chat 10 and Tarefas 20). Renders
 *  nothing itself — mounted by the admin provider stack. */
export function NotesRailPanel() {
  const { t } = useTranslation()
  const raw = t('notes.title')
  const label = raw && raw !== 'notes.title' ? raw : 'Notas'

  // Seed the count before the panel is ever opened; the panel keeps it live.
  const user = useAuthStore((s) => s.user)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const key = storageKey(currentOrg?.id ?? 'local', user?.id ?? 'anon')
  const count = useNotesCount((s) => s.count)
  React.useEffect(() => {
    useNotesCount.getState().setCount(loadNotes(key).length)
  }, [key])

  useRightRailPanel(
    React.useMemo(
      () => ({ id: 'notes', label, icon: StickyNote, order: 30, badge: { count }, Component: NotesPanel }),
      [label, count],
    ),
  )
  return null
}

function IconButton({ children, label, onClick, active, danger }: {
  children: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        danger && 'hover:text-destructive',
      )}
    >
      {children}
    </button>
  )
}
