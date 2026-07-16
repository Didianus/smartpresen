'use client'

import { Home, ScanLine, History, CreditCard, User, KeyRound } from 'lucide-react'
import { AppShell, type NavItem } from '@/components/shared/app-shell'
import { useUIStore } from '@/store/ui-store'
import { UserHomeView } from '@/components/user/views/user-home-view'
import { UserAbsensiView } from '@/components/user/views/user-absensi-view'
import { UserRiwayatView } from '@/components/user/views/user-riwayat-view'
import { UserKartuView } from '@/components/user/views/user-kartu-view'
import { UserProfilView } from '@/components/user/views/user-profil-view'
import { UserPasswordView } from '@/components/user/views/user-password-view'
import type { UserPage } from '@/types'

// ===================================================================
// User Dashboard — shell + navigasi + render view aktif
// ===================================================================

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Beranda', icon: Home },
  { key: 'absensi', label: 'Absensi', icon: ScanLine },
  { key: 'riwayat', label: 'Riwayat', icon: History },
  { key: 'kartu', label: 'Kartu Saya', icon: CreditCard },
  { key: 'profil', label: 'Edit Profil', icon: User },
  { key: 'password', label: 'Ubah Password', icon: KeyRound },
]

const PAGE_LABELS: Record<UserPage, string> = {
  home: 'Beranda',
  absensi: 'Absensi',
  riwayat: 'Riwayat',
  kartu: 'Kartu Saya',
  profil: 'Edit Profil',
  password: 'Ubah Password',
}

export function UserDashboard() {
  const userPage = useUIStore((s) => s.userPage)
  const setUserPage = useUIStore((s) => s.setUserPage)

  const breadcrumb = ['User', PAGE_LABELS[userPage]]

  return (
    <AppShell
      navItems={NAV_ITEMS}
      activePage={userPage}
      onPageChange={(k) => setUserPage(k as UserPage)}
      breadcrumb={breadcrumb}
    >
      {userPage === 'home' && <UserHomeView />}
      {userPage === 'absensi' && <UserAbsensiView />}
      {userPage === 'riwayat' && <UserRiwayatView />}
      {userPage === 'kartu' && <UserKartuView />}
      {userPage === 'profil' && <UserProfilView />}
      {userPage === 'password' && <UserPasswordView />}
    </AppShell>
  )
}
