import * as React from 'react'
import {
  Home,
  Users,
  Settings,
  CreditCard,
  Bell,
  Calendar,
  Package,
  BarChart3,
  FileText,
  Mail,
  MessageCircle,
  DollarSign,
  Megaphone,
  ShoppingCart,
  Target,
  Wrench,
  ClipboardList,
  Briefcase,
  UserCog,
  BookOpen,
  Globe,
  Percent,
  Tag,
  Camera,
  UtensilsCrossed,
  Search,
  PartyPopper,
  Radio,
  CalendarDays,
  Banknote,
  Layers,
  Music,
  Eye,
  ListMusic,
  Disc3,
  UsersRound,
  Mic,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useChatStore } from '../../stores/chat.store'
import { useTranslation } from '../../hooks/useTranslation'

interface NavigationItem {
  id: string
  label: string
  icon: string
  route: string
  section: 'main' | 'secondary' | 'settings'
  badge?: string | number
}

interface BottomNavProps {
  navigation: NavigationItem[]
  activeRoute: string
  onNavigate: (route: string) => void
  showChat?: boolean
  /** Custom items override — when provided, uses these instead of auto-picking from navigation */
  customItems?: Array<{ label: string; icon: string; route: string }>
}

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Users, Settings, CreditCard, Bell, Calendar, Package, BarChart3,
  FileText, Mail, MessageCircle, DollarSign, Megaphone, ShoppingCart,
  Target, Wrench, ClipboardList, Briefcase, UserCog, BookOpen, Globe,
  Percent, Tag, Camera, UtensilsCrossed, Search,
  PartyPopper, Radio, CalendarDays, Banknote, Layers, Music, Eye, ListMusic, Disc3, UsersRound, Mic,
}

export function BottomNav({ navigation, activeRoute, onNavigate, showChat = true, customItems }: BottomNavProps) {
  const { t } = useTranslation()
  const { isOpen, setOpen, toggleOpen } = useChatStore()

  const handleNavigate = (route: string) => {
    if (isOpen) setOpen(false)
    onNavigate(route)
  }

  // Use custom items if provided, otherwise auto-pick from navigation
  const maxItems = showChat ? 4 : 5
  const items: Array<{ id: string; label: string; icon: string; route: string; badge?: string | number }> = customItems
    ? customItems.slice(0, maxItems).map((ci) => ({ id: ci.route, label: ci.label, icon: ci.icon, route: ci.route }))
    : navigation.filter((n) => n.section === 'main').slice(0, maxItems)

  return (
    <nav data-print="hide" className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background px-2 md:hidden">
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? Home
        const isActive =
          activeRoute === item.route || activeRoute.startsWith(item.route + '/')

        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.route)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="absolute -top-0.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
      {showChat && (
        <button
          onClick={toggleOpen}
          className={cn(
            'relative flex flex-1 flex-col items-center gap-1 py-1 text-xs font-medium transition-colors',
            isOpen
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span>{t('layout.bottomNav.chat')}</span>
        </button>
      )}
    </nav>
  )
}
