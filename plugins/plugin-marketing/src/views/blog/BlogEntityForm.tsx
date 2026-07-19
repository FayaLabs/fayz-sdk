import React from 'react'
import { SubpageHeader, Button, toast } from '@fayz-ai/ui'
import { CrudFormPage } from '@fayz-ai/saas'
import type { EntityDef } from '@fayz-ai/core'
import { useEntityCrud } from './useEntityCrud'

// ---------------------------------------------------------------------------
// Generic create/edit for a blog entity (post or category), rendered through
// the shared CrudFormPage (declarative EntityDef → fields, incl. the markdown
// body + category relation). Persistence flows through the generic Supabase
// provider; this only wires load / save / delete + the back link.
// ---------------------------------------------------------------------------

export function BlogEntityForm<T extends { id: string }>({
  entity,
  editId,
  parentLabel,
  onDone,
}: {
  entity: EntityDef<T>
  editId?: string
  parentLabel: string
  onDone: () => void
}) {
  const { getById, create, update, remove } = useEntityCrud(entity)
  const isEdit = !!editId
  const namePlural = entity.namePlural ?? entity.name + 's'
  const [initialData, setInitialData] = React.useState<Record<string, any> | null>(isEdit ? null : {})

  React.useEffect(() => {
    if (!editId) return
    let cancelled = false
    ;(async () => {
      const item = await getById(editId)
      if (!cancelled) setInitialData((item as Record<string, any>) ?? {})
    })()
    return () => { cancelled = true }
  }, [editId, getById])

  async function save(values: Record<string, any>) {
    try {
      if (isEdit) await update(editId!, values)
      else await create(values)
      toast.success(isEdit ? `${entity.name} updated` : `${entity.name} created`)
      onDone()
    } catch (err) {
      toast.error(`Failed to save ${entity.name.toLowerCase()}`)
      throw err
    }
  }

  async function del() {
    if (!editId) return
    try {
      await remove(editId)
      toast.success(`${entity.name} deleted`)
      onDone()
    } catch {
      toast.error(`Failed to delete ${entity.name.toLowerCase()}`)
    }
  }

  const title = isEdit
    ? (initialData?.[entity.displayField ?? 'name'] ?? entity.name)
    : `New ${entity.name.toLowerCase()}`

  return (
    <div className="space-y-4">
      <SubpageHeader
        title={String(title)}
        onBack={onDone}
        parentLabel={parentLabel}
        actions={isEdit ? (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={del}>
            Delete
          </Button>
        ) : undefined}
      />
      {initialData !== null && (
        <CrudFormPage
          entityDef={entity}
          mode={isEdit ? 'edit' : 'create'}
          initialData={initialData}
          namePlural={namePlural}
          onCancel={onDone}
          onSubmit={save}
          hideBreadcrumb
        />
      )}
    </div>
  )
}
