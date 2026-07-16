'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Eye, IdCard, Building2, BadgeCheck, Search,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { EmployeeCardDialog } from '@/components/card/employee-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import { cn, getInisial } from '@/lib/utils'
import type { KaryawanWithRelations } from '@/types'

// ===================================================================
// KartuCetakView — daftar karyawan + dialog preview/cetak kartu CR80
// ===================================================================

interface KaryawanListResponse {
  items: KaryawanWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const LIMIT = 12

const DIVISI_OPTIONS = [
  { value: 'all', label: 'Semua Divisi' },
  { value: 'IT', label: 'IT' },
  { value: 'Human Resource', label: 'Human Resource' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Umum', label: 'Umum' },
]

export function KartuCetakView() {
  const [items, setItems] = useState<KaryawanWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [divisi, setDivisi] = useState('all')
  const [loading, setLoading] = useState(true)

  // Karyawan yang dipilih untuk preview dialog
  const [selected, setSelected] = useState<KaryawanWithRelations | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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

  const fetchKaryawan = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        status: 'aktif',
      })
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim())
      if (divisi !== 'all') params.set('divisi', divisi)
      const res = await api.get<KaryawanListResponse>(`/api/karyawan?${params.toString()}`)
      const data = res.data!
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat daftar karyawan'
      swal.error('Gagal Memuat', msg)
      setItems([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ, divisi])

  useEffect(() => {
    fetchKaryawan()
  }, [fetchKaryawan])

  function handlePreview(k: KaryawanWithRelations) {
    setSelected(k)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cetak Kartu Karyawan"
        description="Preview & cetak kartu ID ukuran CR80"
      />

      {/* Bar filter & pencarian */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Cari nama, NIK, atau email karyawan..."
              className="flex-1"
            />
            <div className="w-full sm:w-52">
              <Select value={divisi} onValueChange={(v) => { setDivisi(v); setPage(1) }}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Pilih divisi" />
                </SelectTrigger>
                <SelectContent>
                  {DIVISI_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid kartu karyawan */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-0">
            <EmptyState
              icon={IdCard}
              title="Tidak ada karyawan"
              description={
                debouncedQ.trim() || divisi !== 'all'
                  ? 'Tidak ada karyawan yang cocok dengan filter Anda.'
                  : 'Data karyawan akan muncul di sini.'
              }
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQ('')
                    setDivisi('all')
                  }}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" /> Reset Filter
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((k, idx) => (
            <KaryawanKartuTile
              key={k.id}
              karyawan={k}
              delay={Math.min(idx * 0.04, 0.3)}
              onPreview={() => handlePreview(k)}
            />
          ))}
        </div>
      )}

      {/* Paginasi */}
      {!loading && items.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Dialog preview & cetak kartu */}
      {selected && (
        <EmployeeCardDialog
          karyawan={selected}
          kartu={selected.kartu ?? null}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  )
}

// ===================================================================
// Satu kartu tile karyawan di grid
// ===================================================================
interface TileProps {
  karyawan: KaryawanWithRelations
  delay: number
  onPreview: () => void
}

function KaryawanKartuTile({ karyawan, delay, onPreview }: TileProps) {
  const kartu = karyawan.kartu ?? null
  const kartuAktif = kartu?.status === 'aktif'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="rounded-2xl shadow-card overflow-hidden h-full flex flex-col group">
        {/* Header foto */}
        <div className="relative gradient-primary p-4 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/95 flex items-center justify-center overflow-hidden ring-4 ring-white/30 shadow-lg">
            {karyawan.foto ? (
              <img
                src={karyawan.foto}
                alt={karyawan.nama}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-violet-700">
                {getInisial(karyawan.nama)}
              </span>
            )}
          </div>
          <h3 className="mt-2.5 text-sm font-semibold text-white leading-tight line-clamp-2">
            {karyawan.nama}
          </h3>
          <p className="text-[11px] text-white/80 font-mono">{karyawan.nik}</p>
          {/* Badge status kartu */}
          <div className="absolute top-2 right-2">
            {kartu ? (
              <Badge
                className={cn(
                  'border-0 text-[10px] gap-1',
                  kartuAktif
                    ? 'bg-emerald-500/90 text-white'
                    : kartu.status === 'hilang'
                      ? 'bg-rose-500/90 text-white'
                      : 'bg-slate-500/90 text-white',
                )}
              >
                <BadgeCheck className="h-3 w-3" />
                {kartu.status}
              </Badge>
            ) : (
              <Badge className="bg-white/20 text-white border-0 text-[10px]">
                Belum ada kartu
              </Badge>
            )}
          </div>
        </div>

        {/* Body info */}
        <CardContent className="p-4 flex-1 flex flex-col gap-2.5">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <IdCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Jabatan:</span>
              <span className="font-medium truncate">{karyawan.jabatan}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Divisi:</span>
              <span className="font-medium truncate">{karyawan.divisi}</span>
            </div>
          </div>

          {/* ID Kartu */}
          <div className="rounded-lg bg-muted/60 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              No. Kartu
            </span>
            <span className="font-mono text-xs font-semibold text-violet-700 dark:text-violet-400">
              {kartu?.idKartu ?? '-'}
            </span>
          </div>

          <Button
            onClick={onPreview}
            size="sm"
            className="mt-auto w-full gap-2 gradient-primary text-white border-0"
          >
            <Eye className="h-4 w-4" />
            Preview & Cetak
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
