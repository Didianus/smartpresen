'use client'

import { useEffect, useState } from 'react'
import { Calendar, Filter } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { formatJam, formatTanggal } from '@/lib/utils'
import type { Absensi } from '@/types'

export function UserRiwayatView() {
  const [items, setItems] = useState<Absensi[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: '10' })
    if (q) params.set('q', q)
    if (status !== 'all') params.set('status', status)
    api.get<{ items: Absensi[]; total: number; totalPages: number }>(`/api/absensi?${params}`)
      .then((r) => {
        if (!active) return
        setItems(r.data!.items)
        setTotal(r.data!.total)
        setTotalPages(r.data!.totalPages)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, q, status])

  return (
    <div className="space-y-5">
      <PageHeader title="Riwayat Absensi" description="Histori kehadiran Anda" />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Cari tanggal, status..." className="flex-1" />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="hadir">Hadir</SelectItem>
                <SelectItem value="terlambat">Terlambat</SelectItem>
                <SelectItem value="izin">Izin</SelectItem>
                <SelectItem value="sakit">Sakit</SelectItem>
                <SelectItem value="alpha">Alpha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState icon={Calendar} title="Belum ada riwayat" description="Riwayat absensi Anda akan tampil di sini." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{formatTanggal(a.tanggal)}</TableCell>
                      <TableCell className="tabular-nums">{formatJam(a.jamMasuk)}</TableCell>
                      <TableCell className="tabular-nums">{formatJam(a.jamPulang)}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{a.lokasi}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.keterangan || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
