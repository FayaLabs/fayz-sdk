import React, { useEffect, useState } from 'react'
import { BookOpen, Clock, Layers, Package } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useInventoryProvider } from '../InventoryContext'
import { useTranslation } from '@fayz-ai/core'
import { Breadcrumb, DataTable } from '@fayz-ai/ui'
import type { Recipe, RecipeIngredient } from '../types'

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted/40 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 rounded bg-muted/40 animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
      <div className="rounded-xl border divide-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
            <div className="flex-1" />
            <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-4 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3.5 w-6 rounded bg-muted/30 animate-pulse" />
            <div className="h-3.5 flex-1 rounded bg-muted/30 animate-pulse" />
            <div className="h-3.5 w-12 rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecipeDetailView({ recipeId, onBack }: { recipeId: string; onBack: () => void }) {
  const t = useTranslation()
  const provider = useInventoryProvider()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      provider.getRecipeById(recipeId),
      provider.getRecipeIngredients(recipeId),
    ]).then(([r, ings]) => {
      setRecipe(r)
      setIngredients(ings.sort((a, b) => a.displayOrder - b.displayOrder))
      setLoading(false)
    })
  }, [recipeId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb parent={t('inventory.nav.recipes')} current={t('inventory.recipeDetail.loading')} onBack={onBack} />
        <DetailSkeleton />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="space-y-6">
        <Breadcrumb parent={t('inventory.nav.recipes')} onBack={onBack} />
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border-2 border-dashed border-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{t('inventory.recipeDetail.notFound')}</p>
          <button onClick={onBack} className="text-xs text-primary hover:underline mt-1">{t('inventory.recipeDetail.backToList')}</button>
        </div>
      </div>
    )
  }

  const ingredientColumns: ColumnDef<RecipeIngredient, any>[] = [
    {
      id: 'index', header: '#',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.index + 1}</span>,
    },
    {
      accessorKey: 'productName', header: t('inventory.recipeDetail.ingredient'),
      cell: ({ getValue }) => <span className="font-medium">{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'quantity', header: () => <span className="block text-right">{t('inventory.recipeDetail.quantity')}</span>,
      cell: ({ getValue }) => <span className="block text-right tabular-nums">{getValue() as number}</span>,
    },
    {
      accessorKey: 'unitName', header: t('inventory.recipeDetail.unit'),
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'notes', header: t('inventory.recipeDetail.notes'),
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{(getValue() as string) || '—'}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb parent={t('inventory.nav.recipes')} current={recipe.name} onBack={onBack} />

      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{recipe.name}</h1>
          {recipe.description && <p className="text-muted-foreground mt-0.5 text-sm">{recipe.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            {recipe.isActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> {t('inventory.recipeDetail.active')}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" /> {t('inventory.recipeDetail.inactive')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Info */}
        <div className="space-y-4">
          {/* Metrics */}
          <div className="rounded-xl border divide-y">
            {recipe.productName && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">{t('inventory.recipeDetail.produces')}</span>
                <span className="text-sm font-medium">{recipe.productName}</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">{t('inventory.recipeDetail.yield')}</span>
              <span className="text-sm font-medium">{recipe.yieldQuantity}{recipe.yieldUnitName ? ` ${recipe.yieldUnitName}` : ''}</span>
            </div>
            {recipe.preparationTimeMinutes != null && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">{t('inventory.recipeDetail.prepTime')}</span>
                <span className="text-sm font-medium">{recipe.preparationTimeMinutes} min</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">{t('inventory.recipeDetail.ingredientCount')}</span>
              <span className="text-sm font-medium">{ingredients.length}</span>
            </div>
          </div>

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{t('inventory.recipeDetail.instructions')}</h3>
              <div className="rounded-xl border bg-card shadow-sm px-4 py-3">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{recipe.instructions}</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50">
            <span>{t('inventory.recipeDetail.created')} {recipe.createdAt?.slice(0, 10)}</span>
            <span>{t('inventory.recipeDetail.updated')} {recipe.updatedAt?.slice(0, 10)}</span>
          </div>
        </div>

        {/* Right: Ingredients table */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('inventory.recipeDetail.ingredientsTitle')}</h3>
          {ingredients.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              <p className="text-xs text-muted-foreground">{t('inventory.recipeDetail.noIngredients')}</p>
            </div>
          ) : (
            <DataTable columns={ingredientColumns} data={ingredients} variant="card" />
          )}
        </div>
      </div>
    </div>
  )
}
