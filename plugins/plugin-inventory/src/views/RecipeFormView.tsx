import React, { useState } from 'react'
import { Save, Plus, Trash2, X, GripVertical } from 'lucide-react'
import { useInventoryStore, useInventoryProvider } from '../InventoryContext'
import { toast } from '@fayz/ui'
import { SubpageHeader } from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import { SearchSelect } from '@fayz/ui'
import type { CreateRecipeIngredientInput } from '../types'

interface FormIngredient {
  _id: string
  productId: string
  productName: string
  quantity: number
  unitId: string
  unitName: string
  notes: string
}

let fid = 1
function nextId() { return `ri${fid++}` }

export function RecipeFormView({ onSaved }: { onSaved?: (id?: string) => void }) {
  const t = useTranslation()
  const provider = useInventoryProvider()
  const createRecipe = useInventoryStore((s) => s.createRecipe)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [yieldQuantity, setYieldQuantity] = useState(1)
  const [prepTime, setPrepTime] = useState('')
  const [instructions, setInstructions] = useState('')
  const [ingredients, setIngredients] = useState<FormIngredient[]>([])
  const [saving, setSaving] = useState(false)

  function addIngredient() {
    setIngredients([...ingredients, { _id: nextId(), productId: '', productName: '', quantity: 1, unitId: '', unitName: '', notes: '' }])
  }

  function updateIngredient(id: string, data: Partial<FormIngredient>) {
    setIngredients(ingredients.map((ing) => ing._id === id ? { ...ing, ...data } : ing))
  }

  function removeIngredient(id: string) {
    setIngredients(ingredients.filter((ing) => ing._id !== id))
  }

  async function handleSave() {
    if (!name.trim() || !productId || ingredients.length === 0) return
    setSaving(true)
    try {
      const recipe = await createRecipe({
        name,
        description: description || undefined,
        productId,
        yieldQuantity,
        preparationTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
        instructions: instructions || undefined,
        ingredients: ingredients.filter((i) => i.productId).map((i, idx) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitId: i.unitId || undefined,
          displayOrder: idx,
          notes: i.notes || undefined,
        })),
      })
      onSaved?.(recipe.id)
    } finally { setSaving(false) }
  }

  async function searchProducts(query: string) {
    const result = await provider.getProducts({ search: query, pageSize: 10 })
    return result.data.map((p) => ({ id: p.id, label: p.name, subtitle: p.sku ?? p.productType, data: p }))
  }

  async function quickCreateProduct(name: string, type: 'ingredient' | 'sale' = 'ingredient') {
    try {
      const product = await provider.createProduct({ name, productType: type })
      toast.success(`Product "${name}" created`)
      return product
    } catch {
      toast.error('Failed to create product')
      return null
    }
  }

  return (
    <div className="space-y-5">
      <SubpageHeader
        title={t('inventory.recipeForm.newRecipe')}
        subtitle={t('inventory.recipeForm.subtitle')}
        onBack={() => onSaved?.()}
        parentLabel={t('inventory.nav.recipes')}
        actions={
          <div className="flex items-center gap-2">
            {onSaved && (
              <button onClick={() => onSaved()} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
                <X className="h-3 w-3" /> {t('inventory.recipeForm.cancel')}
              </button>
            )}
            <button onClick={handleSave} disabled={!name.trim() || !productId || ingredients.length === 0 || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50">
              <Save className="h-3 w-3" /> {saving ? t('inventory.recipeForm.saving') : t('inventory.recipeForm.saveRecipe')}
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Recipe details */}
        <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold">{t('inventory.recipeForm.recipeDetails')}</h3>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.recipeForm.recipeName')} *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('inventory.recipeForm.recipeNamePlaceholder')} autoFocus className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.recipeForm.description')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t('inventory.recipeForm.descriptionPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <SearchSelect
            label={`${t('inventory.recipeForm.produces')} *`}
            value={productId}
            displayValue={productName}
            onChange={(id, opt) => { setProductId(id); setProductName(opt?.label ?? '') }}
            onSearch={searchProducts}
            placeholder={t('inventory.recipeForm.searchProduct')}
            allowCreate
            createLabel={t('inventory.recipeForm.createProduct')}
            onCreate={async (q) => {
              const p = await quickCreateProduct(q, 'sale')
              if (p) { setProductId(p.id); setProductName(p.name) }
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('inventory.recipeForm.yieldQuantity')}</label>
              <input type="number" min={0.01} step={0.01} value={yieldQuantity} onChange={(e) => setYieldQuantity(Number(e.target.value) || 1)} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('inventory.recipeForm.prepTime')}</label>
              <input type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="—" className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('inventory.recipeForm.instructions')}</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} placeholder={t('inventory.recipeForm.instructionsPlaceholder')} className="w-full mt-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>

        {/* Right: Ingredients */}
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">{t('inventory.recipeForm.ingredients')}</h3>
            <button onClick={addIngredient} className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors">
              <Plus className="h-3 w-3" /> {t('inventory.recipeForm.addIngredient')}
            </button>
          </div>

          <div className="flex-1">
            {ingredients.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">{t('inventory.recipeForm.noIngredients')}</p>
                <button onClick={addIngredient} className="text-xs text-primary hover:underline mt-1">{t('inventory.recipeForm.addFirstIngredient')}</button>
              </div>
            ) : (
              <div className="divide-y">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <div className="col-span-5">{t('inventory.recipeForm.ingredient')}</div>
                  <div className="col-span-2">{t('inventory.recipeForm.quantity')}</div>
                  <div className="col-span-4">{t('inventory.recipeForm.notes')}</div>
                  <div className="col-span-1" />
                </div>
                {ingredients.map((ing, idx) => (
                  <div key={ing._id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center group">
                    <div className="col-span-5">
                      <SearchSelect
                        value={ing.productId}
                        displayValue={ing.productName}
                        onChange={(id, opt) => updateIngredient(ing._id, { productId: id, productName: opt?.label ?? '' })}
                        onSearch={searchProducts}
                        placeholder={t('inventory.recipeForm.searchIngredient')}
                        allowCreate
                        createLabel={t('inventory.recipeForm.createIngredient')}
                        onCreate={async (q) => {
                          const p = await quickCreateProduct(q, 'ingredient')
                          if (p) updateIngredient(ing._id, { productId: p.id, productName: p.name })
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(ing._id, { quantity: Number(e.target.value) || 0 })}
                        className="w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={ing.notes}
                        onChange={(e) => updateIngredient(ing._id, { notes: e.target.value })}
                        placeholder={t('inventory.recipeForm.notesPlaceholder')}
                        className="w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => removeIngredient(ing._id)} className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {ingredients.length > 0 && (
            <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              {t('inventory.recipeForm.ingredientsConfigured', { configured: String(ingredients.filter((i) => i.productId).length), total: String(ingredients.length) })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
