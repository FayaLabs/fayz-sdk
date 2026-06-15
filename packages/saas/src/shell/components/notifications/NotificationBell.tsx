import * as React from 'react'
import { Bell } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '@fayz-ai/ui'

interface NotificationBellProps {
  unreadCount: number
  onClick?: () => void
  className?: string
}

export function NotificationBell({
  unreadCount,
  onClick,
  className,
}: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : 'Notifications'
      }
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground',
            unreadCount > 9
              ? 'h-5 min-w-5 px-1 text-[10px]'
              : 'h-4 w-4 text-[10px]'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  )
}
