'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Fingerprint } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { AuthPages } from '@/components/auth/auth-pages'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { UserDashboard } from '@/components/user/user-dashboard'

// ===================================================================
// Root page — SPA entry point
// Cek sesi → arahkan ke Auth / Admin / User
// ===================================================================

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 menit
const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 menit idle → auto logout

export default function Page() {
  const { user, loading, fetchMe, logout, setUser } = useAuthStore()
  const [booting, setBooting] = useState(true)
  const lastActivity = useRef<number>(Date.now())

  // --- Inisial: cek sesi ---
  useEffect(() => {
    fetchMe().finally(() => setBooting(false))
  }, [fetchMe])

  // --- Idle timeout + periodic session check ---
  useEffect(() => {
    if (!user) return

    function updateActivity() {
      lastActivity.current = Date.now()
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }))

    const interval = setInterval(async () => {
      // cek idle
      if (Date.now() - lastActivity.current > IDLE_TIMEOUT) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        setUser(null)
        import('@/lib/swal').then(({ swal }) => swal.warning('Sesi Berakhir', 'Anda telah logout karena tidak ada aktivitas (30 menit).'))
        return
      }
      // validasi sesi masih aktif
      const me = await useAuthStore.getState().fetchMe()
      if (!me) {
        import('@/lib/swal').then(({ swal }) => swal.warning('Sesi Berakhir', 'Sesi login Anda telah berakhir. Silakan login kembali.'))
      }
    }, SESSION_CHECK_INTERVAL)

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity))
      clearInterval(interval)
    }
  }, [user, fetchMe, setUser])

  // --- Booting / loading screen ---
  if (booting || loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <AuthPages />
  }

  return user.role === 'admin' ? <AdminDashboard /> : <UserDashboard />
}

// ===================================================================
// Loading screen dengan animasi
// ===================================================================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="h-20 w-20 rounded-3xl gradient-primary text-white flex items-center justify-center shadow-glow mb-5"
      >
        <Fingerprint className="h-10 w-10" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-muted-foreground"
      >
        Memuat Absensi Karyawan...
      </motion.p>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 120 }}
        transition={{ delay: 0.3, duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        className="h-1 rounded-full gradient-primary mt-4"
      />
    </div>
  )
}
