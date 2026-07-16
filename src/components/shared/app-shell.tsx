'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, Menu, X, ChevronLeft, Bell, LogOut, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { api } from '@/lib/api'
import { swal } from '@/lib/swal'
import { getInisial, cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ===================================================================
// App Shell — layout bersama Admin & User
// ===================================================================

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  badge?: number
}

interface Props {
  navItems: NavItem[]
  activePage: string
  onPageChange: (key: string) => void
  children: React.ReactNode
  breadcrumb: string[]
}

export function AppShell({ navItems, activePage, onPageChange, children, breadcrumb }: Props) {
  const user = useAuthStore((s) => s.user)
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const [notifOpen, setNotifOpen] = useState(false)

  function isActive(key: string) {
    return activePage === key
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* ===================== Sidebar (desktop) ===================== */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-sidebar border-r border-sidebar-border transition-all duration-300',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <SidebarContent
          navItems={navItems}
          isActive={isActive}
          onPageChange={onPageChange}
          collapsed={sidebarCollapsed}
          user={user}
        />
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* ===================== Sidebar (mobile) ===================== */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent
            navItems={navItems}
            isActive={isActive}
            onPageChange={onPageChange}
            collapsed={false}
            user={user}
          />
        </SheetContent>
      </Sheet>

      {/* ===================== Main ===================== */}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300', sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        {/* Navbar */}
        <header className="sticky top-0 z-20 h-16 glass border-b border-border/50 flex items-center gap-3 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                  {b}
                </span>
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Notif */}
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium">Absensi tercatat</span>
                  <span className="text-xs text-muted-foreground">Karyawan Budi telah absen masuk</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium">Kartu baru dibuat</span>
                  <span className="text-xs text-muted-foreground">EMP-2026-0005 telah dibuat</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center justify-center text-xs text-primary">
                  Lihat semua
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                      {user ? getInisial(user.namaLengkap) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold leading-tight max-w-[120px] truncate">{user?.namaLengkap}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{user?.namaLengkap}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    const ok = await swal.confirm('Logout?', 'Anda akan keluar dari sistem.')
                    if (!ok) return
                    try {
                      await api.post('/api/auth/logout')
                    } catch { /* ignore */ }
                    useAuthStore.getState().setUser(null)
                    swal.success('Logout berhasil')
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// ===================================================================
// Konten sidebar — logo + nav items
// ===================================================================
function SidebarContent({
  navItems,
  isActive,
  onPageChange,
  collapsed,
  user,
}: {
  navItems: NavItem[]
  isActive: (k: string) => boolean
  onPageChange: (k: string) => void
  collapsed: boolean
  user: { namaLengkap: string; role: string } | null
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('h-16 flex items-center border-b border-sidebar-border gap-2.5', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className="h-9 w-9 rounded-xl gradient-primary text-white flex items-center justify-center shrink-0 shadow-glow">
          <Fingerprint className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight gradient-text">Absensi</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Karyawan System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.key)
          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative group',
                active
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge ? (
                <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded-full', active ? 'bg-white/20' : 'bg-primary/10 text-primary')}>
                  {item.badge}
                </span>
              ) : null}
              {collapsed && (
                <span className="absolute left-full ml-2 hidden group-hover:block bg-foreground text-background text-xs px-2 py-1 rounded-md whitespace-nowrap z-50">
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      {!collapsed && user && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-xl bg-sidebar-accent/50 p-2.5 flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                {getInisial(user.namaLengkap)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user.namaLengkap}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
