import React, { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useTasksStore, useTasksConfig } from '../TasksContext'
import { useTranslation } from '@fayz/core'
import type { TaskPriority } from '../types'

export function TaskQuickAdd({ parentId }: { parentId?: string | null }) {
  const t = useTranslation()
  const createTask = useTasksStore((s) => s.createTask)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      await createTask({
        title: trimmed,
        parentId: parentId ?? null,
      })
      setTitle('')
    } finally {
      setLoading(false)
    }
  }, [title, loading, createTask, parentId])

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-b">
      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={parentId ? t('tasks.detail.addSubtask') : t('tasks.quickAdd.placeholder')}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        disabled={loading}
      />
    </form>
  )
}
