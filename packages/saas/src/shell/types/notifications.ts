export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationChannel = 'in_app' | 'email' | 'push'
export type NotificationCategory = 'inbox' | 'changelog'

export interface Notification {
  id: string
  tenantId: string
  userId: string
  type: NotificationType
  category?: NotificationCategory
  title: string
  body: string
  channel: NotificationChannel
  read: boolean
  actionUrl?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ChangelogEntry {
  id: string
  title: string
  body: string
  version?: string
  date: string
  type: 'feature' | 'improvement' | 'fix'
}

export interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
}
