import React, { useEffect, useMemo, useState } from 'react'
import { CrudListView } from '@fayz-ai/saas'
import { SegmentedControl } from '@fayz-ai/ui'
import { useMarketingConfig } from '../../MarketingContext'
import { buildBlogPostEntity, buildBlogCategoryEntity } from '../../data/blogEntities'
import { useEntityCrud } from './useEntityCrud'

// ---------------------------------------------------------------------------
// Blog backoffice — an in-page marketing tab with two lenses (Posts /
// Categories), each a generic CrudListView backed by the blog tables. Follows
// the content-planner pattern: this plugin owns the data + routing; create/edit
// deep-link through the marketing module nav (navigate('blog-post:id') etc.).
// ---------------------------------------------------------------------------

function PostsList({ navigate }: { navigate: (view: string) => void }) {
  const entity = useMemo(() => buildBlogPostEntity(), [])
  const { items, total, fetch } = useEntityCrud(entity)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    let active = true
    Promise.resolve(
      fetch({ search: search || undefined, filters: statusFilter ? { status: statusFilter } : undefined }),
    ).finally(() => { if (active) setLoadedOnce(true) })
    return () => { active = false }
  }, [search, statusFilter, fetch])

  const facets = useMemo(() => [{
    field: 'status',
    allLabel: 'All',
    options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }],
  }], [])

  return (
    <CrudListView
      entityDef={entity}
      items={loadedOnce ? items : null}
      total={total}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search posts…"
      facets={facets}
      activeFilters={{ status: statusFilter }}
      onFacetChange={(_field, value) => setStatusFilter(value)}
      onNew={() => navigate('blog-new')}
      addLabel="New post"
      onRowClick={(row) => navigate(`blog-post:${(row as { id: string }).id}`)}
    />
  )
}

function CategoriesList({ navigate }: { navigate: (view: string) => void }) {
  const entity = useMemo(() => buildBlogCategoryEntity(), [])
  const { items, total, fetch } = useEntityCrud(entity)
  const [search, setSearch] = useState('')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    let active = true
    Promise.resolve(fetch({ search: search || undefined })).finally(() => { if (active) setLoadedOnce(true) })
    return () => { active = false }
  }, [search, fetch])

  return (
    <CrudListView
      entityDef={entity}
      items={loadedOnce ? items : null}
      total={total}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search categories…"
      onNew={() => navigate('blog-cat-new')}
      addLabel="New category"
      onRowClick={(row) => navigate(`blog-cat:${(row as { id: string }).id}`)}
    />
  )
}

export function BlogAdminView({ navigate }: { navigate: (view: string) => void }) {
  const { labels } = useMarketingConfig()
  const [lens, setLens] = useState<'posts' | 'categories'>('posts')

  return (
    <div className="space-y-4">
      <SegmentedControl
        aria-label="Blog section"
        options={[
          { value: 'posts', label: labels.blog },
          { value: 'categories', label: labels.blogCategories },
        ]}
        value={lens}
        onChange={(v) => setLens(v as 'posts' | 'categories')}
      />
      {lens === 'posts' ? <PostsList navigate={navigate} /> : <CategoriesList navigate={navigate} />}
    </div>
  )
}
