import React from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import {
  Button, Input, MarkdownEditor, SubpageHeader, ConfirmDialog, Skeleton,
  ContentSplit, ContentSplitTrigger,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { canUploadMedia, uploadPostMedia } from '../../data/contentMedia'
import { RecordingChecklist } from './RecordingChecklist'
import { PostSocialPreview } from './PostSocialPreview'
import type { ContentPost, PostFormat, PostStatus } from '../../data/contentTypes'
import { useContentPlannerProvider, useContentPlannerStore } from './ContentPlannerContext'
import { POST_FORMATS, POST_STATUS_ORDER, PlatformPicker, StatusDot } from './contentBits'
import { POST_TEMPLATES } from './templates'

// ---------------------------------------------------------------------------
// Post page — the Notion-style page behind each board card: title, a compact
// meta row (format / status / date / hook / CTA) and the markdown script body.
// ---------------------------------------------------------------------------

function MediaAsset({ post, onChanged }: {
  post: ContentPost
  onChanged: (mediaUrl: string | null) => void
}) {
  const t = useTranslation()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const isVideo = post.mediaUrl ? /\.(mp4|webm|mov)($|\?)/i.test(post.mediaUrl) : false

  const pick = () => inputRef.current?.click()

  const upload = async (file: File) => {
    setBusy(true)
    try {
      const url = await uploadPostMedia(post.id, file)
      onChanged(url)
    } finally {
      setBusy(false)
    }
  }

  if (!canUploadMedia()) {
    return <p className="text-xs text-muted-foreground">{t('marketing.content.mediaUnavailable')}</p>
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      {post.mediaUrl ? (
        <div className="relative overflow-hidden rounded-card border border-border bg-muted/20">
          {isVideo ? (
            <video src={post.mediaUrl} controls className="max-h-72 w-full object-contain" />
          ) : (
            <img src={post.mediaUrl} alt="" className="max-h-72 w-full object-contain" />
          )}
          <div className="flex items-center justify-end gap-2 border-t border-border p-2">
            <Button variant="outline" size="sm" onClick={pick} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
              {t('marketing.content.mediaReplace')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChanged(null)} disabled={busy}>
              <X className="mr-1 h-3.5 w-3.5" />
              {t('marketing.content.mediaRemove')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border p-6 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-sm font-medium">{t('marketing.content.mediaUpload')}</span>
          <span className="text-xs">{t('marketing.content.mediaHint')}</span>
        </button>
      )}
    </div>
  )
}

interface Draft {
  title: string
  format: PostFormat
  status: PostStatus
  scheduledDate: string
  platforms: string[]
  hook: string
  cta: string
  contentMd: string
}

function toDraft(post: ContentPost): Draft {
  return {
    title: post.title,
    format: post.format,
    status: post.status,
    scheduledDate: post.scheduledDate ?? '',
    platforms: post.platforms,
    hook: post.hook ?? '',
    cta: post.cta ?? '',
    contentMd: post.contentMd,
  }
}

export function PostPage({ postId, onBack }: { postId: string; onBack: () => void }) {
  const t = useTranslation()
  const provider = useContentPlannerProvider()
  const storePost = useContentPlannerStore((s) => s.posts.find((p) => p.id === postId))
  const savePost = useContentPlannerStore((s) => s.savePost)
  const deletePost = useContentPlannerStore((s) => s.deletePost)
  const accounts = useContentPlannerStore((s) => s.accounts)
  const activeAccountId = useContentPlannerStore((s) => s.activeAccountId)

  const [post, setPost] = React.useState<ContentPost | null>(storePost ?? null)
  const [draft, setDraft] = React.useState<Draft | null>(storePost ? toDraft(storePost) : null)
  const [saving, setSaving] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  // Deep links land here before the board loaded the plan — fetch directly.
  React.useEffect(() => {
    if (post?.id === postId) return
    if (storePost) {
      setPost(storePost)
      setDraft(toDraft(storePost))
      return
    }
    void provider.getPost(postId).then((fetched) => {
      if (fetched) {
        setPost(fetched)
        setDraft(toDraft(fetched))
      }
    })
  }, [postId, storePost, post?.id, provider])

  if (!post || !draft) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const dirty =
    draft.title !== post.title ||
    draft.format !== post.format ||
    draft.status !== post.status ||
    draft.scheduledDate !== (post.scheduledDate ?? '') ||
    draft.platforms.join(',') !== post.platforms.join(',') ||
    draft.hook !== (post.hook ?? '') ||
    draft.cta !== (post.cta ?? '') ||
    draft.contentMd !== post.contentMd

  const patch = (partial: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...partial } : d))

  const save = async () => {
    setSaving(true)
    try {
      const updated = await savePost({
        id: post.id,
        title: draft.title,
        format: draft.format,
        status: draft.status,
        scheduledDate: draft.scheduledDate || null,
        platforms: draft.platforms,
        hook: draft.hook,
        cta: draft.cta,
        contentMd: draft.contentMd,
      })
      setPost(updated)
      setDraft(toDraft(updated))
    } finally {
      setSaving(false)
    }
  }

  const insertTemplate = () => {
    patch({ contentMd: POST_TEMPLATES[draft.format](draft.title || t('marketing.content.untitled')) })
  }

  const isStatic = draft.format === 'static'
  const account = accounts.find((a) => a.id === activeAccountId) ?? null

  // Recording day: the checklist panel starts expanded only when today IS the
  // post's scheduled date — otherwise it waits collapsed in the rail.
  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isReleaseDay = !!post.scheduledDate && post.scheduledDate === todayISO

  const handleMediaChanged = (mediaUrl: string | null) => {
    void savePost({ id: post.id, mediaUrl }).then((updated) => {
      setPost(updated)
      setDraft((d) => (d ? { ...d } : d))
    })
  }

  return (
    <ContentSplit
      key={post.id}
      className="mx-auto max-w-5xl"
      aside={<RecordingChecklist post={post} />}
      asideTitle={t('marketing.content.checklistTitle')}
      asideDescription={t('marketing.content.checklistDescription')}
      collapsible
      defaultCollapsed={!isReleaseDay}
    >
    <div className="space-y-5">
      <SubpageHeader
        title={draft.title || t('marketing.content.untitled')}
        parentLabel={t('marketing.content.title')}
        onBack={onBack}
        actions={
          <div className="flex items-center gap-2">
            <ContentSplitTrigger label={t('marketing.content.checklistOpen')} />
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              {t('marketing.content.deletePost')}
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
              {t('marketing.content.save')}
            </Button>
          </div>
        }
      />

      <Input
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder={t('marketing.content.titlePlaceholder')}
        className="text-base font-medium"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('marketing.content.formatLabel')}</label>
          <Select value={draft.format} onValueChange={(v) => patch({ format: v as PostFormat })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POST_FORMATS.map((f) => (
                <SelectItem key={f} value={f}>{t(`marketing.content.format.${f}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('marketing.content.statusLabel')}</label>
          <Select value={draft.status} onValueChange={(v) => patch({ status: v as PostStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POST_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <StatusDot status={s} />
                    {t(`marketing.content.status.${s}`)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('marketing.content.scheduledDate')}</label>
          <Input
            type="date"
            value={draft.scheduledDate}
            onChange={(e) => patch({ scheduledDate: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">{t('marketing.content.hook')}</label>
          <Input
            value={draft.hook}
            onChange={(e) => patch({ hook: e.target.value })}
            placeholder={t('marketing.content.hookPlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('marketing.content.cta')}</label>
          <Input
            value={draft.cta}
            onChange={(e) => patch({ cta: e.target.value })}
            placeholder={t('marketing.content.ctaPlaceholder')}
          />
        </div>
        <div className="space-y-1 sm:col-span-3">
          <label className="text-xs font-medium text-muted-foreground">{t('marketing.content.platformsLabel')}</label>
          <PlatformPicker value={draft.platforms} onChange={(platforms) => patch({ platforms })} />
        </div>
      </div>

      {isStatic && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t('marketing.content.mediaLabel')}
          </label>
          <MediaAsset post={post} onChanged={handleMediaChanged} />
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {isStatic ? t('marketing.content.captionLabel') : t('marketing.content.scriptLabel')}
          </label>
          {draft.contentMd.trim() === '' && (
            <Button variant="outline" size="sm" onClick={insertTemplate}>
              {t('marketing.content.insertTemplate')}
            </Button>
          )}
        </div>
        <MarkdownEditor
          value={draft.contentMd}
          onChange={(contentMd) => patch({ contentMd })}
          placeholder={isStatic ? t('marketing.content.captionPlaceholder') : t('marketing.content.bodyPlaceholder')}
          editLabel={t('marketing.content.edit')}
          previewLabel={t('marketing.content.preview')}
          renderPreview={
            isStatic
              ? (value) => (
                  <PostSocialPreview
                    caption={value}
                    mediaUrl={post.mediaUrl}
                    accountName={account?.name ?? '@conta'}
                    accountHandle={account?.handle}
                    platforms={
                      draft.platforms.length > 0 ? draft.platforms : account?.platforms ?? []
                    }
                  />
                )
              : undefined
          }
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        variant="destructive"
        title={t('marketing.content.deletePost')}
        description={t('marketing.content.deletePostConfirm')}
        confirmLabel={t('marketing.content.deletePost')}
        cancelLabel={t('marketing.content.cancel')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void deletePost(post.id).then(onBack)
        }}
      />
    </div>
    </ContentSplit>
  )
}
