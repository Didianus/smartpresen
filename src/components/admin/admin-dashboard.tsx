'use client'

import { LayoutDashboard, Users, CalendarCheck, CreditCard, UserCog, Printer, FileBarChart, History } from 'lucide-react'
import { AppShell, type NavItem } from '@/components/shared/app-shell'
import { useUIStore } from '@/store/ui-store'
import { AdminHomeView } from '@/components/admin/views/admin-home-view'
import { KaryawanView } from '@/components/admin/views/karyawan-view'
import { UsersView } from '@/components/admin/views/users-view'
import { KartuView } from '@/components/admin/views/kartu-view'
import { AbsensiView } from '@/components/admin/views/absensi-view'
import { LogView } from '@/components/admin/views/log-view'
import { LaporanView } from '@/components/admin/views/laporan-view'
import { KartuCetakView } from '@/components/admin/views/kartu-cetak-view'
import type { AdminPage } from '@/types'

// ===================================================================
// Admin Dashboard — shell + navigasi + render view aktif
// ===================================================================

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'karyawan', label: 'Data Karyawan', icon: Users },
  { key: 'absensi', label: 'Data Absensi', icon: CalendarCheck },
  { key: 'kartu', label: 'Kartu Karyawan', icon: CreditCard },
  { key: 'users', label: 'Manajemen User', icon: UserCog },
  { key: 'kartu-cetak', label: 'Cetak Kartu', icon: Printer },
  { key: 'laporan', label: 'Laporan', icon: FileBarChart },
  { key: 'log', label: 'Log Aktivitas', icon: History },
]

const PAGE_LABELS: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  karyawan: 'Data Karyawan',
  absensi: 'Data Absensi',
  kartu: 'Kartu Karyawan',
  users: 'Manajemen User',
  'kartu-cetak': 'Cetak Kartu',
  laporan: 'Laporan',
  log: 'Log Aktivitas',
}

export function AdminDashboard() {
  const adminPage = useUIStore((s) => s.adminPage)
  const setAdminPage = useUIStore((s) => s.setAdminPage)

  const breadcrumb = ['Admin', PAGE_LABELS[adminPage]]

  return (
    <AppShell
      navItems={NAV_ITEMS}
      activePage={adminPage}
      onPageChange={(k) => setAdminPage(k as AdminPage)}
      breadcrumb={breadcrumb}
    >
      {adminPage === 'dashboard' && <AdminHomeView />}
      {adminPage === 'karyawan' && <KaryawanView />}
      {adminPage === 'absensi' && <AbsensiView />}
      {adminPage === 'kartu' && <KartuView />}
      {adminPage === 'users' && <UsersView />}
      {adminPage === 'kartu-cetak' && <KartuCetakView />}
      {adminPage === 'laporan' && <LaporanView />}
      {adminPage === 'log' && <LogView />}
    </AppShell>
  )
}
