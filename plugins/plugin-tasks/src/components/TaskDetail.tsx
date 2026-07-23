import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Trash2, Calendar, ChevronDown, Sparkles } from 'lucide-react'
import { useTasksStore } from '../TasksContext'
import { useTranslation } from '@fayz-ai/core'
import { useDelegateToAssistant } from '@fayz-ai/saas'
import { TaskPriorityBadge } from './TaskPriorityBadge'
import { TaskLabelBadges } from './TaskLabelBadge'
import { TaskQuickAdd } from './TaskQuickAdd'
import { TaskCard } from './TaskCard'
import type { Task, TaskStatus, TaskPriority } from '../types'
import { TASK_STATUSES, TASK_PRIORITIES } from '../types'

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground',
  in_progress: 'bg-info',
  done: 'bg-success',
  cancelled: 'bg-muted-foreground/60',
}

/** Same footer format as the Notes tab: time when today, short date otherwise. */
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const t = useTranslation()
  const tasks = useTasksStore((s) => s.tasks)
  const selectTask = useTasksStore((s) => s.selectTask)
  const updateTask = useTasksStore((s) => s.updateTask)
  const deleteTask = useTasksStore((s) => s.deleteTask)

  const task = tasks.find((tt) => tt.id === taskId)
  const delegate = useDelegateToAssistant()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subtasks, setSubtasks] = useState<Task[]>([])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
    }
  }, [task])

  useEffect(() => { setSubtasks([]) }, [taskId])

  const handleTitleBlur = useCallback(() => {
    if (task && title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() })
    }
  }, [task, title, updateTask])

  const handleDescriptionBlur = useCallback(() => {
    if (task && description !== (task.description ?? '')) {
      updateTask(task.id, { description: description || null })
    }
  }, [task, description, updateTask])

  const handleDelete = useCallback(() => {
    if (task && confirm(t('tasks.detail.deleteConfirm'))) {
      deleteTask(task.id)
    }
  }, [task, deleteTask, t])

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">Task not found</p>
        <button type="button" onClick={() => selectTask(null)} className="mt-2 text-xs text-primary hover:underline">
          {t('tasks.detail.back')}
        </button>
      </div>
    )
  }

  return (
    // Same frame as the Notes editor: header row with back + icon actions,
    // full-bleed px-4 content, sectioned by hairlines, thin timestamp footer.
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
        <button
          type="button"
          onClick={() => selectTask(null)}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('tasks.drawer.title')}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={handleDelete}
          aria-label={t('tasks.detail.delete')}
          title={t('tasks.detail.delete')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="bg-transparent px-4 pt-3 text-sm font-semibold text-foreground outline-none"
      />

      {/* Inline property chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2">
        {/* Status chip */}
        <div className="relative">
          <select
            value={task.status}
            onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
            className="appearance-none rounded-full border bg-background pl-5 pr-6 py-1 text-xs font-medium cursor-pointer hover:border-primary/40 transition-colors"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`tasks.status.${s}`)}</option>
            ))}
          </select>
          <span className={`absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${STATUS_DOT[task.status]}`} />
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Priority chip */}
        <div className="relative">
          <select
            value={task.priority}
            onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
            className="appearance-none rounded-full border bg-background pl-2 pr-6 py-1 text-xs font-medium cursor-pointer hover:border-primary/40 transition-colors"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Due date chip */}
        <div className="relative">
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
            className="appearance-none rounded-full border bg-background pl-6 pr-2 py-1 text-xs font-medium cursor-pointer hover:border-primary/40 transition-colors w-[120px]"
          />
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Labels */}
        {task.labels.length > 0 && <TaskLabelBadges labelIds={task.labels} max={3} />}
      </div>

      {/* Description — borderless, fills the middle like the note body */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        placeholder={t('tasks.detail.descriptionPlaceholder')}
        className="min-h-[72px] flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
      />

      {/* Agentic hand-off — same CTA pattern as the Notes tab */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() =>
            delegate(
              `${t('tasks.detail.chatWithAi.prompt')}\n\n"${task.title}"${task.description ? `\n${task.description}` : ''}${task.dueDate ? `\n(${t('tasks.detail.dueDate')}: ${task.dueDate})` : ''}`,
            )
          }
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary/80 to-primary bg-[length:200%_100%] bg-left px-3 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all duration-500 hover:bg-right hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
          {t('tasks.detail.chatWithAi')}
        </button>
      </div>

      {/* Subtasks — same section pattern as the note's todos */}
      <div className="border-t border-border/40 px-4 py-2.5">
        <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {t('tasks.detail.subtasks')}{subtasks.length > 0 ? ` · ${subtasks.length}` : ''}
        </p>
        <div className="-mx-3">
          <TaskQuickAdd parentId={task.id} />
        </div>
        {subtasks.length > 0 && (
          <div className="divide-y divide-border/40">
            {subtasks.map((st) => (
              <TaskCard key={st.id} task={st} />
            ))}
          </div>
        )}
      </div>

      {/* Footer: timestamps only — delete lives in the header, like a note */}
      <p className="border-t border-border/40 px-4 py-1.5 text-[10px] text-muted-foreground/60">
        {t('tasks.detail.created')} {formatDateTime(task.createdAt)} · {t('tasks.detail.updated')} {formatDateTime(task.updatedAt)}
      </p>
    </div>
  )
}
