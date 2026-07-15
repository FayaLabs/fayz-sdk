import React from 'react'
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2,
  Repeat2, BarChart2, Image as ImageIcon, Globe,
} from 'lucide-react'
import { cn } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { PlatformIcon } from '../../components/icons'

// ---------------------------------------------------------------------------
// Social post preview — the caption "Visualizar" mode renders the post the way
// the platform will show it (asset + caption + action row). One tab per
// selected platform; Instagram is the frame for look-alikes (TikTok/Threads/
// Pinterest/YouTube get their own frames in a later pass).
// ---------------------------------------------------------------------------

interface PreviewProps {
  caption: string
  mediaUrl?: string
  accountName: string
  accountHandle?: string
  platforms: string[]
}

/** Captions are plain text on every network — strip the markdown skeleton. */
function toCaption(md: string): string {
  return md
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^[-*]\s+/gm, '')
    .trim()
}

function isVideo(url?: string): boolean {
  return !!url && /\.(mp4|webm|mov)($|\?)/i.test(url)
}

function Media({ mediaUrl, className }: { mediaUrl?: string; className?: string }) {
  if (!mediaUrl) {
    return (
      <div className={cn('flex aspect-square w-full items-center justify-center bg-muted/40', className)}>
        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
      </div>
    )
  }
  return isVideo(mediaUrl) ? (
    <video src={mediaUrl} controls className={cn('w-full bg-black object-contain', className)} />
  ) : (
    <img src={mediaUrl} alt="" className={cn('w-full object-cover', className)} />
  )
}

function Avatar({ name, ring }: { name: string; ring?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground',
        ring && 'ring-2 ring-offset-2 ring-pink-500/60',
      )}
    >
      {(name.replace(/^@/, '')[0] ?? '?').toUpperCase()}
    </span>
  )
}

function InstagramFrame({ caption, mediaUrl, accountName, accountHandle }: PreviewProps) {
  const t = useTranslation()
  const handle = (accountHandle || accountName).replace(/^@/, '')
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={handle} ring />
        <span className="flex-1 truncate text-sm font-semibold text-foreground">{handle}</span>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <Media mediaUrl={mediaUrl} />
      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-center gap-4 text-foreground">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
          <Bookmark className="ml-auto h-6 w-6" />
        </div>
        <p className="whitespace-pre-wrap text-sm leading-snug text-foreground">
          <span className="mr-1.5 font-semibold">{handle}</span>
          {toCaption(caption)}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t('marketing.content.previewNow')}
        </p>
      </div>
    </div>
  )
}

function FacebookFrame({ caption, mediaUrl, accountName }: PreviewProps) {
  const t = useTranslation()
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={accountName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{accountName.replace(/^@/, '')}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {t('marketing.content.previewNow')} · <Globe className="h-3 w-3" />
          </p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="whitespace-pre-wrap px-3 pb-2.5 text-sm leading-snug text-foreground">{toCaption(caption)}</p>
      <Media mediaUrl={mediaUrl} className="aspect-auto" />
      <div className="flex items-center justify-around border-t border-border px-3 py-2 text-muted-foreground">
        <span className="flex items-center gap-1.5 text-xs font-medium"><ThumbsUp className="h-4 w-4" /> {t('marketing.content.previewLike')}</span>
        <span className="flex items-center gap-1.5 text-xs font-medium"><MessageCircle className="h-4 w-4" /> {t('marketing.content.previewComment')}</span>
        <span className="flex items-center gap-1.5 text-xs font-medium"><Share2 className="h-4 w-4" /> {t('marketing.content.previewShare')}</span>
      </div>
    </div>
  )
}

function LinkedinFrame({ caption, mediaUrl, accountName }: PreviewProps) {
  const t = useTranslation()
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={accountName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{accountName.replace(/^@/, '')}</p>
          <p className="text-xs text-muted-foreground">{t('marketing.content.previewNow')}</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap px-3 pb-2.5 text-sm leading-snug text-foreground">{toCaption(caption)}</p>
      <Media mediaUrl={mediaUrl} className="aspect-auto" />
      <div className="flex items-center justify-around border-t border-border px-3 py-2 text-muted-foreground">
        <ThumbsUp className="h-4 w-4" />
        <MessageCircle className="h-4 w-4" />
        <Repeat2 className="h-4 w-4" />
        <Send className="h-4 w-4" />
      </div>
    </div>
  )
}

function XFrame({ caption, mediaUrl, accountName, accountHandle }: PreviewProps) {
  const t = useTranslation()
  const handle = (accountHandle || accountName).replace(/^@/, '')
  return (
    <div className="mx-auto w-full max-w-sm rounded-card border border-border bg-card p-3">
      <div className="flex gap-2.5">
        <Avatar name={handle} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            <span className="font-semibold">{accountName.replace(/^@/, '')}</span>
            <span className="text-muted-foreground"> @{handle} · {t('marketing.content.previewNow')}</span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-foreground">{toCaption(caption)}</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            <Media mediaUrl={mediaUrl} className="aspect-auto" />
          </div>
          <div className="mt-2 flex items-center justify-between pr-6 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <Repeat2 className="h-4 w-4" />
            <Heart className="h-4 w-4" />
            <BarChart2 className="h-4 w-4" />
            <Share2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}

const FRAMES: Record<string, React.ComponentType<PreviewProps>> = {
  instagram: InstagramFrame,
  facebook: FacebookFrame,
  linkedin: LinkedinFrame,
  x: XFrame,
}

export function PostSocialPreview(props: PreviewProps) {
  const platforms = props.platforms.length > 0 ? props.platforms : ['instagram']
  const [selected, setSelected] = React.useState(platforms[0])
  const active = platforms.includes(selected) ? selected : platforms[0]
  const Frame = FRAMES[active] ?? InstagramFrame

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
      {platforms.length > 1 && (
        <div className="flex items-center justify-center gap-1">
          {platforms.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => setSelected(platform)}
              aria-pressed={active === platform}
              className={cn(
                'flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-medium capitalize transition-colors',
                active === platform
                  ? 'bg-card text-foreground shadow-button'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
              {platform}
            </button>
          ))}
        </div>
      )}
      <Frame {...props} />
    </div>
  )
}
