'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SafeUser } from '@/types'

// ===================================================================
// Auth store (client-side) — menyimpan info user + view aktif
// Sesi sebenarnya divalidasi via httpOnly cookie JWT di /api/auth/me
// ===================================================================

interface AuthState {
  user: SafeUser | null
  loading: boolean // sedang cek sesi awal
  hydrated: boolean
  setUser: (u: SafeUser | null) => void
  setLoading: (b: boolean) => void
  logout: () => void
  fetchMe: () => Promise<SafeUser | null>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      hydrated: false,
      setUser: (u) => set({ user: u }),
      setLoading: (b) => set({ loading: b }),
      logout: () => set({ user: null }),
      fetchMe: async () => {
        try {
          const res = await fetch('/api/auth/me', { cache: 'no-store' })
          if (!res.ok) {
            set({ user: null, loading: false, hydrated: true })
            return null
          }
          const json = await res.json()
          if (json.success && json.data) {
            const { karyawan: _k, ...safe } = json.data as SafeUser & { karyawan?: unknown }
            set({ user: safe, loading: false, hydrated: true })
            return safe
          }
          set({ user: null, loading: false, hydrated: true })
          return null
        } catch {
          set({ user: null, loading: false, hydrated: true })
          return null
        }
      },
    }),
    {
      name: 'absensi-auth',
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)
