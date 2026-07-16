'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Users, CalendarCheck, UserCheck, Clock, FileText, HeartPulse, UserX, TrendingUp, Activity } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatJam, formatTanggal } from '@/lib/utils'
import type { DashboardStats, Absensi } from '@/types'

interface DashboardData {
  stats: DashboardStats
  chartData: { tanggal: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }[]
  divisiData: { name: string; value: number }[]
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#14b8a6']

export function AdminHomeView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [todayList, setTodayList] = useState<Absensi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>('/api/dashboard'),
      api.get<{ items: Absensi[] }>('/api/absensi?limit=8'),
    ])
      .then(([d, a]) => {
        setData(d.data!)
        setTodayList(a.data!.items)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const { stats, chartData, divisiData } = data

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description="Ringkasan kehadiran & statistik karyawan hari ini" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Karyawan" value={stats.totalKaryawan} icon={Users} color="violet" hint={`${stats.totalUser} akun terdaftar`} delay={0} />
        <StatCard label="Absensi Hari Ini" value={stats.totalAbsensiHariIni} icon={CalendarCheck} color="sky" hint="Total tercatat" delay={0.05} />
        <StatCard label="Hadir" value={stats.hadirHariIni} icon={UserCheck} color="emerald" hint="Tepat waktu" delay={0.1} />
        <StatCard label="Terlambat" value={stats.terlambatHariIni} icon={Clock} color="amber" hint="Masuk > 09:00" delay={0.15} />
        <StatCard label="Izin" value={stats.izinHariIni} icon={FileText} color="sky" delay={0.2} />
        <StatCard label="Sakit" value={stats.sakitHariIni} icon={HeartPulse} color="rose" delay={0.25} />
        <StatCard label="Alpha" value={stats.alphaHariIni} icon={UserX} color="slate" delay={0.3} />
        <StatCard label="Rasio Kehadiran" value={stats.totalAbsensiHariIni ? `${Math.round((stats.hadirHariIni / stats.totalAbsensiHariIni) * 100)}%` : '0%'} icon={TrendingUp} color="violet" delay={0.35} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Grafik Kehadiran 7 Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="hadir" stackId="a" fill="#10b981" />
                <Bar dataKey="terlambat" stackId="a" fill="#f59e0b" />
                <Bar dataKey="izin" stackId="a" fill="#0ea5e9" />
                <Bar dataKey="sakit" stackId="a" fill="#ef4444" />
                <Bar dataKey="alpha" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Distribusi Divisi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={divisiData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {divisiData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Absensi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {todayList.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Belum ada absensi hari ini</p>
              ) : (
                <div className="divide-y divide-border">
                  {todayList.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
                      <div className="h-9 w-9 rounded-full gradient-primary text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {a.nama.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          Masuk {formatJam(a.jamMasuk)} · Pulang {formatJam(a.jamPulang)}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Status Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Hadir Tepat Waktu', value: stats.hadirHariIni, color: 'bg-emerald-500' },
              { label: 'Terlambat', value: stats.terlambatHariIni, color: 'bg-amber-500' },
              { label: 'Izin', value: stats.izinHariIni, color: 'bg-sky-500' },
              { label: 'Sakit', value: stats.sakitHariIni, color: 'bg-rose-500' },
              { label: 'Alpha', value: stats.alphaHariIni, color: 'bg-slate-400' },
            ].map((s) => {
              const max = Math.max(stats.totalAbsensiHariIni, 1)
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.value / max) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${s.color}`}
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-2 mt-3 border-t border-border text-xs text-muted-foreground">
              Hari ini: {formatTanggal(new Date(), true)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
