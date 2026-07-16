'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, CalendarCheck, Clock, LogIn, LogOut, QrCode, IdCard, TrendingUp, CalendarDays, MapPin } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { useUIStore } from '@/store/ui-store'
import { formatJam, formatTanggal, getInisial, cn } from '@/lib/utils'
import type { Absensi, KaryawanWithRelations, KartuKaryawan } from '@/types'

interface UserData {
  karyawan: KaryawanWithRelations
  kartu: KartuKaryawan | null
  myToday: Absensi | null
  personalStats: { totalBulanIni: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }
  recent: Absensi[]
}

export function UserHomeView() {
  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const setUserPage = useUIStore((s) => s.setUserPage)

  useEffect(() => {
    api.get<UserData>('/api/dashboard')
      .then((r) => setData(r.data!))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>
  }

  if (!data) return <p className="text-center text-muted-foreground py-10">Gagal memuat data</p>

  const { karyawan, kartu, myToday, personalStats, recent } = data

  return (
    <div className="space-y-5">
      <PageHeader title={`Halo, ${karyawan.nama.split(' ')[0]}!`} description="Ringkasan kehadiran & aktivitas Anda" />

      {/* Profile + Today status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="h-20 gradient-primary" />
          <CardContent className="pt-0 -mt-10">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                <AvatarFallback className="gradient-primary text-white text-xl font-bold">
                  {getInisial(karyawan.nama)}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold mt-3">{karyawan.nama}</p>
              <p className="text-xs text-muted-foreground">{karyawan.jabatan}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{karyawan.divisi}</span>
                <span className="text-xs font-mono text-muted-foreground">{karyawan.nik}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Email" value={karyawan.email || '-'} />
              <Row label="Telepon" value={karyawan.noTelepon || '-'} />
              <Row label="No. Kartu" value={kartu?.idKartu ?? '-'} mono />
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setUserPage('profil')}>
              <User className="h-4 w-4" /> Edit Profil
            </Button>
          </CardContent>
        </Card>

        {/* Today status + quick absen */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Status Absensi Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <LogIn className="h-4 w-4 text-emerald-500" /> Jam Masuk
                </div>
                <p className="text-2xl font-bold tabular-nums">{formatJam(myToday?.jamMasuk)}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <LogOut className="h-4 w-4 text-sky-500" /> Jam Pulang
                </div>
                <p className="text-2xl font-bold tabular-nums">{formatJam(myToday?.jamPulang)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{myToday?.lokasi ?? 'Kantor Pusat'}</span>
              </div>
              {myToday && <StatusBadge status={myToday.status} />}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button className="gradient-primary text-white border-0 h-12" onClick={() => setUserPage('absensi')}>
                <LogIn className="h-5 w-5" /> Absen Masuk
              </Button>
              <Button variant="outline" className="h-12" onClick={() => setUserPage('absensi')}>
                <LogOut className="h-5 w-5" /> Absen Pulang
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats bulan ini */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Statistik Kehadiran Bulan Ini</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={personalStats.totalBulanIni} icon={CalendarCheck} color="violet" />
          <StatCard label="Hadir" value={personalStats.hadir} icon={TrendingUp} color="emerald" delay={0.05} />
          <StatCard label="Terlambat" value={personalStats.terlambat} icon={Clock} color="amber" delay={0.1} />
          <StatCard label="Izin/Sakit" value={personalStats.izin + personalStats.sakit} icon={User} color="sky" delay={0.15} />
        </div>
      </div>

      {/* Recent + card info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Riwayat Absensi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {recent.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Belum ada riwayat</p>
              ) : (
                recent.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatTanggal(a.tanggal)}</p>
                      <p className="text-xs text-muted-foreground">Masuk {formatJam(a.jamMasuk)} · Pulang {formatJam(a.jamPulang)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Button variant="ghost" className="w-full" onClick={() => setUserPage('riwayat')}>Lihat Semua Riwayat</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><IdCard className="h-4 w-4 text-primary" /> Kartu Saya</CardTitle>
          </CardHeader>
          <CardContent>
            {kartu ? (
              <div className="space-y-3">
                <div className="rounded-xl gradient-primary text-white p-4">
                  <p className="text-xs opacity-80">ID Kartu</p>
                  <p className="font-mono font-bold text-lg">{kartu.idKartu}</p>
                  <div className="flex items-center justify-between mt-3 text-xs opacity-90">
                    <span>UID: {kartu.uid}</span>
                    <span className="uppercase">{kartu.jenis}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Status" value={kartu.status} />
                  <Row label="Dibuat" value={formatTanggal(kartu.tanggalBuat)} />
                  <Row label="Berlaku" value={kartu.masaBerlaku ? formatTanggal(kartu.masaBerlaku) : '∞'} />
                </div>
                <Button variant="outline" className="w-full" onClick={() => setUserPage('kartu')}>
                  <QrCode className="h-4 w-4" /> Lihat & Cetak Kartu
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <IdCard className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada kartu terdaftar</p>
                <p className="text-xs text-muted-foreground mt-1">Hubungi admin untuk pembuatan kartu</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium truncate', mono && 'font-mono')}>{value}</span>
    </div>
  )
}
