import React, { useEffect } from 'react'
import { BookOpen, Plus, Clock, Layers } from 'lucide-react'
import { useInventoryStore } from '../InventoryContext'
import { useTranslation } from '@fayz-ai/core'
import { SubpageHeader } from '@fayz-ai/ui'
import { PermissionGate } from '@fayz-ai/saas'

function RecipeSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-lg border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted/40 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecipesView({ onNew, onView }: { onNew?: () => void; onView?: (id: string) => void }) {
  const t = useTranslation()
  const recipes = useInventoryStore((s) => s.recipes)
  const recipesLoading = useInventoryStore((s) => s.recipesLoading)
  const fetchRecipes = useInventoryStore((s) => s.fetchRecipes)

  useEffect(() => { fetchRecipes() }, [])

  return (
    <div className="space-y-4">
      <SubpageHeader
        title={t('inventory.recipes.title')}
        subtitle={t('inventory.recipes.productionFormulas', { count: String(recipes.length) })}
        actions={onNew && (
          <PermissionGate feature="inventory" action="create">
            <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors">
              <Plus className="h-3.5 w-3.5" /> {t('inventory.recipes.newRecipe')}
            </button>
          </PermissionGate>
        )}
      />

      {recipesLoading ? (
        <RecipeSkeleton />
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border-2 border-dashed border-muted">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 mb-3">
            <BookOpen className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">{t('inventory.recipes.noRecipes')}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('inventory.recipes.recipesDesc')}</p>
          {onNew && <button onClick={onNew} className="text-xs text-primary hover:underline mt-2">{t('inventory.recipes.createFirst')}</button>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <div
              key={r.id}
              onClick={() => onView?.(r.id)}
              className="rounded-lg border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{r.name}</h3>
                  {r.productName && <p className="text-[10px] text-muted-foreground truncate">{t('inventory.recipes.produces')} {r.productName}</p>}
                </div>
              </div>
              {r.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 pt-2.5 border-t">
                {r.ingredientCount != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Layers className="h-3 w-3" /> {t('inventory.recipes.ingredients', { count: String(r.ingredientCount) })}
                  </span>
                )}
                {r.preparationTimeMinutes != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {r.preparationTimeMinutes} min
                  </span>
                )}
                {r.yieldQuantity > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {t('inventory.recipes.yield')} {r.yieldQuantity}{r.yieldUnitName ? ` ${r.yieldUnitName}` : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
