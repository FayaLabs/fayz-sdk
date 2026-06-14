import { create } from 'zustand'
import type { Notification, NotificationState } from '../types'

interface NotificationStore extends NotificationState {
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  ...initialState,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      }
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}))
