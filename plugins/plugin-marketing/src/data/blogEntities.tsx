import type { EntityDef, FieldDef } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Blog backoffice entities — the single source of truth that drives BOTH the
// generic list (CrudListView columns + facets) and the create/edit form
// (CrudFormPage fields, incl. the markdown body + category relation).
//
// Persistence is the generic Supabase provider resolved from `data.table`
// (plg_blog_posts / plg_blog_categories, owned by @fayz-ai/plugin-blog's
// migrations). camelCase field keys map to snake_case columns automatically.
// The website reads the same rows through the anon v_public_blog_posts view.
// ---------------------------------------------------------------------------

export const BLOG_POSTS_TABLE = 'plg_blog_posts'
export const BLOG_CATEGORIES_TABLE = 'plg_blog_categories'

export interface BlogPostRow {
  id: string
  title: string
  slug: string
  excerpt: string
  body: string
  categoryId?: string
  coverImage?: string
  authorName?: string
  authorRole?: string
  authorAvatarUrl?: string
  authorBio?: string
  status: 'draft' | 'published'
  readTime?: string
  publishedAt?: string
}

export interface BlogCategoryRow {
  id: string
  name: string
  slug: string
  description?: string
}

export function buildBlogPostEntity(): EntityDef<BlogPostRow> {
  const fields: FieldDef[] = [
    { key: 'title', label: 'Title', type: 'text', required: true, searchable: true, showInTable: true, sortable: true },
    { key: 'slug', label: 'Slug', type: 'text', required: true, searchable: true, showInTable: false, hint: 'URL identifier, e.g. "cannabis-and-oral-health"' },
    { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published'], showInTable: true, defaultValue: 'draft' },
    { key: 'categoryId', label: 'Category', type: 'relation', relation: { table: BLOG_CATEGORIES_TABLE, valueField: 'id', labelField: 'name', tenantScoped: true }, showInTable: false },
    { key: 'excerpt', label: 'Excerpt', type: 'textarea', span: 2, showInTable: false, placeholder: 'Short summary shown on cards' },
    { key: 'body', label: 'Body', type: 'markdown', span: 2, showInTable: false },
    { key: 'coverImage', label: 'Cover image', type: 'image', showInTable: false, placeholder: 'https://…' },
    { key: 'readTime', label: 'Read time', type: 'text', showInTable: false, placeholder: '5 min' },
    { key: 'publishedAt', label: 'Published at', type: 'date', showInTable: true, sortable: true },
    { key: 'authorName', label: 'Author name', type: 'text', showInTable: false },
    { key: 'authorRole', label: 'Author role', type: 'text', showInTable: false, placeholder: 'e.g. Cirurgião-Dentista' },
    { key: 'authorAvatarUrl', label: 'Author avatar', type: 'image', showInTable: false, placeholder: 'https://…' },
    { key: 'authorBio', label: 'Author bio', type: 'textarea', span: 2, showInTable: false },
  ]
  return {
    name: 'Post',
    namePlural: 'Posts',
    icon: 'Newspaper',
    fields,
    displayField: 'title',
    subtitleField: 'slug',
    facets: [{ field: 'status', allLabel: 'All' }],
    data: {
      table: BLOG_POSTS_TABLE,
      tenantScoped: true,
      searchColumns: ['title', 'slug', 'excerpt'],
    },
  }
}

export function buildBlogCategoryEntity(): EntityDef<BlogCategoryRow> {
  const fields: FieldDef[] = [
    { key: 'name', label: 'Name', type: 'text', required: true, searchable: true, showInTable: true, sortable: true },
    { key: 'slug', label: 'Slug', type: 'text', required: true, searchable: true, showInTable: true, hint: 'URL identifier' },
    { key: 'description', label: 'Description', type: 'textarea', span: 2, showInTable: false },
  ]
  return {
    name: 'Category',
    namePlural: 'Categories',
    icon: 'Tags',
    fields,
    displayField: 'name',
    data: {
      table: BLOG_CATEGORIES_TABLE,
      tenantScoped: true,
      searchColumns: ['name', 'slug'],
    },
  }
}
