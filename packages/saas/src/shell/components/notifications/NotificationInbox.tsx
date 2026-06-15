import * as React from 'react'
import { CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '@fayz-ai/ui'
import { ChangelogFeed } from './ChangelogFeed'
import type { Notification } from '../../types'

interface NotificationInboxProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onNotificationClick?: (notification: Notification) => void
  changelogUrl?: string
  className?: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const TYPE_COLORS: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function NotificationInbox({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
  changelogUrl,
  className,
}: NotificationInboxProps) {
  const [activeTab, setActiveTab] = React.useState<'inbox' | 'whats-new'>('inbox')
  const unreadCount = notifications.filter((n) => !n.read).length
  const inboxNotifications = notifications.filter((n) => n.category !== 'changelog')

  return (
    <div className={cn('flex w-80 flex-col', className)}>
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('inbox')}
          className={cn(
            'flex-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'inbox'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('whats-new')}
          className={cn(
            'flex-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'whats-new'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          What's New
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inbox' ? (
        <>
          {unreadCount > 0 && (
            <div className="flex items-center justify-end px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={onMarkAllRead}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {inboxNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              inboxNotifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Info
                const colorClass = TYPE_COLORS[notification.type] ?? TYPE_COLORS.info

                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'flex cursor-pointer gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50',
                      !notification.read && 'bg-muted/30'
                    )}
                    onClick={() => {
                      if (!notification.read) onMarkRead(notification.id)
                      onNotificationClick?.(notification)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (!notification.read) onMarkRead(notification.id)
                        onNotificationClick?.(notification)
                      }
                    }}
                  >
                    <div className={cn('mt-0.5 shrink-0', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            !notification.read && 'font-medium'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      ) : (
        <ChangelogFeed changelogUrl={changelogUrl} />
      )}
    </div>
  )
}
