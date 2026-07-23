import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Notes ↔ Tasks bridge. The rail's Notes tab always offers a "tarefas" input
// per note; when a tasks backend registers here (plugin-tasks does on setup),
// those todos are REAL tasks — created, listed and toggled through the tasks
// provider, linked back by a `note:<id>` label. One source of truth: the
// Tarefas tab shows everything, the note shows its own slice. No adapter
// registered → the section hides and notes fall back to `- [ ]` checklists.
// ---------------------------------------------------------------------------

export interface NoteTodo {
  id: string
  title: string
  done: boolean
}

export interface NotesTasksAdapter {
  /** Create a task linked to the note (label `note:<noteId>`). */
  createTodo(input: { title: string; noteId: string; noteTitle: string }): Promise<NoteTodo>
  /** Tasks linked to the note, open first. */
  listTodos(noteId: string): Promise<NoteTodo[]>
  /** Flip the underlying task between done and todo. */
  toggleTodo(id: string, done: boolean): Promise<void>
  removeTodo(id: string): Promise<void>
}

interface NotesTasksBridgeState {
  adapter: NotesTasksAdapter | null
  setAdapter: (adapter: NotesTasksAdapter | null) => void
}

export const useNotesTasksBridge = create<NotesTasksBridgeState>((set) => ({
  adapter: null,
  setAdapter: (adapter) => set({ adapter }),
}))

/** Called by the tasks plugin (or any tasks backend) at setup time. */
export function registerNotesTasksAdapter(adapter: NotesTasksAdapter): void {
  useNotesTasksBridge.getState().setAdapter(adapter)
}

export const NOTE_LABEL_PREFIX = 'note:'
