import React, { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Star,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react'
import {
  Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  Button, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@fayz-ai/ui'
import { useMenuConfig, useMenuStore, formatCurrency } from '../MenuContext'
import { useTranslation } from '@fayz-ai/core'
import { useLimitGuard, invalidateLimit } from '@fayz-ai/saas'
import type { MenuCategory, MenuItem } from '../types'

// ---------------------------------------------------------------------------
// Create forms (category / item) — design-system Modal
// ---------------------------------------------------------------------------

const UNCATEGORIZED = '__none'
const fieldLabel = 'text-sm font-medium text-foreground'

function CategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation()
  const createCategory = useMenuStore((s) => s.createCategory)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createCategory({ name: name.trim() })
      setName('')
      onClose()
    } catch {
      // store surfaces a toast on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>{t('menu.manager.addCategory')}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <label className="block space-y-1.5">
            <span className={fieldLabel}>{t('menu.form.categoryName')}</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>{t('menu.form.cancel')}</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t('menu.form.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function ItemModal({
  open,
  categories,
  defaultCategoryId,
  onClose,
}: {
  open: boolean
  categories: MenuCategory[]
  defaultCategoryId?: string
  onClose: () => void
}) {
  const t = useTranslation()
  const config = useMenuConfig()
  const createMenuItem = useMenuStore((s) => s.createMenuItem)
  const guardMenuItems = useLimitGuard('menu_items')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? UNCATEGORIZED)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    // Client-side plan guard before the store create. (Note: this dialog also
    // has the known board bug B29 — out of scope here, guard only.)
    if ((await guardMenuItems()) === 'blocked') return
    setSaving(true)
    try {
      await createMenuItem({
        name: name.trim(),
        price: Number(price) || 0,
        categoryId: categoryId === UNCATEGORIZED ? undefined : categoryId,
        description: description.trim() || undefined,
      })
      invalidateLimit('menu_items')
      onClose()
    } catch {
      // store surfaces a toast on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>{t('menu.manager.addProduct')}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <label className="block space-y-1.5">
            <span className={fieldLabel}>{t('menu.form.itemName')}</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t('menu.manager.price')} ({config.currency.symbol})</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t('menu.form.category')}</span>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNCATEGORIZED}>{t('menu.form.uncategorized')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>
              {t('menu.form.description')}{' '}
              <span className="text-muted-foreground font-normal">({t('menu.form.optional')})</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>{t('menu.form.cancel')}</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t('menu.form.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Toggle — inline switch component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  size = 'sm',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  size?: 'sm' | 'xs'
}) {
  const h = size === 'xs' ? 'h-4 w-7' : 'h-5 w-9'
  const dot = size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'
  const translate = size === 'xs' ? 'translate-x-[13px]' : 'translate-x-[18px]'
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${h} items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`pointer-events-none block ${dot} rounded-full bg-white shadow-sm transition-transform ${
          checked ? translate : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function CategorySkeleton() {
  return (
    <div className="rounded-lg border bg-card animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted flex-1" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Category section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  items,
  expanded,
  onToggle,
  onAddProduct,
}: {
  category: MenuCategory
  items: MenuItem[]
  expanded: boolean
  onToggle: () => void
  onAddProduct: () => void
}) {
  const t = useTranslation()
  const config = useMenuConfig()
  const toggleAvailability = useMenuStore((s) => s.toggleAvailability)

  const handleToggle = async (
    id: string,
    field: 'availableForPos' | 'availableForDelivery',
    current: boolean,
  ) => {
    await toggleAvailability(id, field, !current)
  }

  const handleFeatureToggle = async (id: string, current: boolean) => {
    await toggleAvailability(id, 'isFeatured' as any, !current)
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
        <button type="button" onClick={onToggle} className="p-0.5">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <h3 className="text-sm font-semibold flex-1">{category.name}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{t('menu.manager.itemsCount', { count: items.length })}</span>
        </div>
        <button className="p-1 text-muted-foreground hover:text-foreground rounded">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <>
          {/* Add product button */}
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={onAddProduct}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors"
            >
              <Plus className="h-3 w-3" />
              {t('menu.manager.addProduct')}
            </button>
          </div>

          {/* Items table */}
          {/* drift-allow: raw-table — interactive cells (drag handles, availability toggles, inline price/feature controls) don't fit DataTable */}
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 pl-4 pr-2 font-medium">
                      {t('menu.manager.item')}
                    </th>
                    <th className="py-2 px-2 font-medium text-center w-16">
                      {t('menu.manager.pos')}
                    </th>
                    <th className="py-2 px-2 font-medium text-center w-16">
                      {t('menu.manager.delivery')}
                    </th>
                    <th className="py-2 px-2 font-medium text-center w-28">
                      {t('menu.manager.price')}
                    </th>
                    {config.modules.deliveryPricing && (
                      <th className="py-2 px-2 font-medium text-center w-28">
                        {t('menu.manager.deliveryPrice')}
                      </th>
                    )}
                    <th className="py-2 px-2 font-medium text-center w-16">
                      {t('menu.manager.featured')}
                    </th>
                    <th className="py-2 pr-4 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 cursor-grab shrink-0" />
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Toggle
                          checked={item.availableForPos}
                          onChange={() =>
                            handleToggle(
                              item.id,
                              'availableForPos',
                              item.availableForPos,
                            )
                          }
                          size="xs"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Toggle
                          checked={item.availableForDelivery}
                          onChange={() =>
                            handleToggle(
                              item.id,
                              'availableForDelivery',
                              item.availableForDelivery,
                            )
                          }
                          size="xs"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-sm font-medium">
                          {formatCurrency(item.price, config.currency)}
                        </span>
                      </td>
                      {config.modules.deliveryPricing && (
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-sm text-muted-foreground">
                            {item.deliveryPrice != null
                              ? formatCurrency(
                                  item.deliveryPrice,
                                  config.currency,
                                )
                              : '\u2014'}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() =>
                            handleFeatureToggle(item.id, item.isFeatured)
                          }
                          className={`p-1 rounded ${
                            item.isFeatured
                              ? 'text-amber-500'
                              : 'text-muted-foreground/30 hover:text-muted-foreground'
                          }`}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              item.isFeatured ? 'fill-current' : ''
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-2.5 pr-4">
                        <button className="p-1 text-muted-foreground hover:text-foreground rounded">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
              {t('menu.manager.noItems')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function MenuManagerView() {
  const t = useTranslation()
  const config = useMenuConfig()

  const categories = useMenuStore((s) => s.categories)
  const categoriesLoading = useMenuStore((s) => s.categoriesLoading)
  const menuItems = useMenuStore((s) => s.menuItems)
  const menuItemsLoading = useMenuStore((s) => s.menuItemsLoading)
  const fetchCategories = useMenuStore((s) => s.fetchCategories)
  const fetchMenuItems = useMenuStore((s) => s.fetchMenuItems)

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  )
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [itemModalCategory, setItemModalCategory] = useState<string | undefined>(undefined)

  const openItemModal = (categoryId?: string) => {
    setItemModalCategory(categoryId)
    setShowItemModal(true)
  }

  // ---- Load data on mount ----
  useEffect(() => {
    fetchCategories()
    fetchMenuItems({})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Expand all once categories load ----
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categories.map((c) => c.id)))
    }
  }, [categories]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Group items by categoryId ----
  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const item of menuItems) {
      const key = item.categoryId ?? '__uncategorized'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [menuItems])

  // ---- Client-side filtering ----
  const filteredCategories = useMemo(() => {
    const lowerSearch = search.toLowerCase()

    return categories.filter((cat) => {
      // Category dropdown filter
      if (categoryFilter !== 'all' && cat.id !== categoryFilter) return false

      // Search filter — match category items by name or description
      if (lowerSearch) {
        const items = grouped.get(cat.id) ?? []
        return items.some(
          (item) =>
            item.name.toLowerCase().includes(lowerSearch) ||
            (item.description?.toLowerCase().includes(lowerSearch) ?? false),
        )
      }
      return true
    })
  }, [categories, categoryFilter, search, grouped])

  // Get filtered items for a category (applying search within it)
  const getFilteredItems = (categoryId: string): MenuItem[] => {
    const items = grouped.get(categoryId) ?? []
    if (!search) return items
    const lowerSearch = search.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        (item.description?.toLowerCase().includes(lowerSearch) ?? false),
    )
  }

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const isLoading = categoriesLoading || menuItemsLoading

  // ---- Loading skeleton ----
  if (isLoading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-40 rounded bg-muted animate-pulse" />
          <div className="h-9 flex-1 max-w-sm rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-3">
          <CategorySkeleton />
          <CategorySkeleton />
          <CategorySkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('menu.manager.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('menu.manager.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('menu.manager.addCategory')}
          </button>
          <button
            type="button"
            onClick={() => openItemModal(undefined)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('menu.manager.addProduct')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">{t('menu.manager.allCategories')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('menu.manager.search')}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {filteredCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            items={getFilteredItems(category.id)}
            expanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            onAddProduct={() => openItemModal(category.id)}
          />
        ))}
      </div>

      {/* Empty state — no results after filtering */}
      {filteredCategories.length === 0 && !isLoading && (
        <div className="text-center py-12">
          {categories.length === 0 ? (
            <>
              <UtensilsCrossed className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">{t('menu.manager.noItems')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('menu.manager.noItemsDesc')}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Plus className="h-4 w-4" />
                  {t('menu.manager.addCategory')}
                </button>
                <button
                  type="button"
                  onClick={() => openItemModal(undefined)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  {t('menu.manager.addProduct')}
                </button>
              </div>
            </>
          ) : (
            <>
              <Search className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">
                {t('menu.manager.noResults')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('menu.manager.noResultsDesc')}
              </p>
            </>
          )}
        </div>
      )}

      {showCategoryModal && (
        <CategoryModal open onClose={() => setShowCategoryModal(false)} />
      )}
      {showItemModal && (
        <ItemModal
          open
          categories={categories}
          defaultCategoryId={itemModalCategory}
          onClose={() => setShowItemModal(false)}
        />
      )}
    </div>
  )
}
