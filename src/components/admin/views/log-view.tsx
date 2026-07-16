'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LogIn, LogOut, UserPlus, Plus, Pencil, Trash2, ShieldCheck, Network,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import { cn, formatTanggal } from '@/lib/utils'
import type { LogAktivitas } from '@/types'

// ===================================================================
// LogView — Audit trail seluruh aktivitas sistem (timeline)
// ===================================================================

interface LogListResponse {
  items: LogAktivitas[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Pemetaan aksi -> warna dot & ikon
interface AksiMeta {
  icon: LucideIcon
  dot: string // warna background dot
  ring: string // warna ring/border di sekitar dot
  badge: string // kelas badge aksi
  label: string
}

function getAksiMeta(aksi: string): AksiMeta {
  const map: Record<string, AksiMeta> = {
    login: { icon: LogIn, dot: 'bg-emerald-500', ring: 'ring-emerald-500/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', label: 'Login' },
    logout: { icon: LogOut, dot: 'bg-slate-500', ring: 'ring-slate-500/20', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', label: 'Logout' },
    registrasi: { icon: UserPlus, dot: 'bg-sky-500', ring: 'ring-sky-500/20', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400', label: 'Registrasi' },
    create: { icon: Plus, dot: 'bg-violet-500', ring: 'ring-violet-500/20', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400', label: 'Tambah' },
    update: { icon: Pencil, dot: 'bg-amber-500', ring: 'ring-amber-500/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', label: 'Ubah' },
    delete: { icon: Trash2, dot: 'bg-rose-500', ring: 'ring-rose-500/20', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400', label: 'Hapus' },
    absen_masuk: { icon: LogIn, dot: 'bg-emerald-500', ring: 'ring-emerald-500/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', label: 'Absen Masuk' },
    absen_pulang: { icon: LogOut, dot: 'bg-sky-500', ring: 'ring-sky-500/20', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400', label: 'Absen Pulang' },
  }
  return (
    map[aksi] ?? {
      icon: ShieldCheck,
      dot: 'bg-primary',
      ring: 'ring-primary/20',
      badge: 'bg-primary/10 text-primary',
      label: aksi || 'Aksi',
    }
  )
}

const LIMIT = 15

export function LogView() {
  const [items, setItems] = useState<LogAktivitas[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  // Debounce pencarian
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q)
      setPage(1)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      })
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim())
      const res = await api.get<LogListResponse>(`/api/log?${params.toString()}`)
      const data = res.data!
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat log aktivitas'
      swal.error('Gagal Memuat', msg)
      setItems([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Log Aktivitas"
        description="Audit trail seluruh aktivitas sistem"
      />

      {/* Bar pencarian */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari nama user, aksi, modul, atau detail..."
            className="max-w-xl"
          />
        </CardContent>
      </Card>

      {/* Daftar log / timeline */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <SkeletonList />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Belum ada log aktivitas"
              description={
                debouncedQ.trim()
                  ? 'Tidak ditemukan log yang cocok dengan pencarian Anda.'
                  : 'Aktivitas sistem akan tercatat otomatis di sini.'
              }
            />
          ) : (
            <div className="relative">
              {/* Garis vertikal penghubung timeline */}
              <div
                aria-hidden
                className="absolute left-4 sm:left-5 top-1 bottom-1 w-px bg-gradient-to-b from-border via-border to-transparent"
              />
              <ul className="space-y-3">
                {items.map((log, idx) => (
                  <LogTimelineItem key={log.id} log={log} index={idx} />
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginasi */}
      {!loading && items.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ===================================================================
// Satu item timeline log
// ===================================================================
function LogTimelineItem({ log, index }: { log: LogAktivitas; index: number }) {
  const meta = getAksiMeta(log.aksi)
  const Icon = meta.icon

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="relative pl-12 sm:pl-14"
    >
      {/* Dot */}
      <div
        className={cn(
          'absolute left-0 top-1.5 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white shadow-sm ring-4',
          meta.dot,
          meta.ring,
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>

      {/* Kartu isi */}
      <div className="rounded-xl border border-border bg-card hover:shadow-card transition-shadow p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-sm font-semibold text-foreground">
            {log.namaUser || 'Sistem'}
          </span>
          <Badge variant="outline" className={cn('border-0', meta.badge)}>
            {meta.label}
          </Badge>
          {log.modul && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {log.modul}
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {formatTanggal(log.createdAt, true)}
          </span>
        </div>

        {log.detail && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed break-words">
            {log.detail}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Network className="h-3.5 w-3.5" />
          <span className="font-mono">{log.ip || '-'}</span>
          {log.userId && (
            <>
              <span className="opacity-40">·</span>
              <span className="font-mono text-[10px] truncate max-w-[180px]">
                {log.userId}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.li>
  )
}

// ===================================================================
// Skeleton loading untuk daftar log
// ===================================================================
function SkeletonList() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute left-4 sm:left-5 top-1 bottom-1 w-px bg-border"
      />
      <ul className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="relative pl-12 sm:pl-14">
            <Skeleton className="absolute left-0 top-1.5 h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
            <div className="rounded-xl border border-border p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-3 w-28" />
              </div>
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
