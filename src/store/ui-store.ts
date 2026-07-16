'use client'

import { create } from 'zustand'
import type { AdminPage, UserPage } from '@/types'

// ===================================================================
// UI store — navigasi client-side (sidebar collapse, page aktif)
// ===================================================================

interface UIState {
  sidebarCollapsed: boolean
  adminPage: AdminPage
  userPage: UserPage
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (b: boolean) => void
  setAdminPage: (p: AdminPage) => void
  setUserPage: (p: UserPage) => void
  setMobileSidebarOpen: (b: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  adminPage: 'dashboard',
  userPage: 'home',
  mobileSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (b) => set({ sidebarCollapsed: b }),
  setAdminPage: (p) => set({ adminPage: p, mobileSidebarOpen: false }),
  setUserPage: (p) => set({ userPage: p, mobileSidebarOpen: false }),
  setMobileSidebarOpen: (b) => set({ mobileSidebarOpen: b }),
}))
