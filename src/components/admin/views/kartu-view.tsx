'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Plus, Pencil, Trash2, RefreshCw,
  Radio, Nfc, QrCode, Barcode,
  type LucideIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ActiveBadge } from '@/components/shared/status-badge'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import { cn, formatTanggalPendek, getInisial } from '@/lib/utils'
import type { KartuKaryawan, KaryawanWithRelations, JenisKartu } from '@/types'

// ===================================================================
// Tipe data lokal
// ===================================================================

/** Kartu dengan relasi karyawan (hasil dari GET /api/kartu) */
interface KartuRow extends KartuKaryawan {
  karyawan: {
    nama: string
    nik: string
    jabatan: string
    divisi: string
    foto: string | null
  }
}

interface ListResponse {
  items: KartuRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Metadata jenis kartu — ikon & warna badge
const JENIS_META: Record<JenisKartu, { label: string; icon: LucideIcon; color: string }> = {
  rfid:    { label: 'RFID',     icon: Radio,   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  nfc:     { label: 'NFC',      icon: Nfc,     color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
  qrcode:  { label: 'QR Code',  icon: QrCode,  color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  barcode: { label: 'Barcode',  icon: Barcode, color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
}

const STATUS_KARTU: KartuKaryawan['status'][] = ['aktif', 'nonaktif', 'hilang']
const JENIS_KARTU: JenisKartu[] = ['rfid', 'nfc', 'barcode', 'qrcode']

/** Konversi tanggal (ISO string) → yyyy-mm-dd untuk input type=date */
function toDateInput(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ===================================================================
// KartuView — CRUD data kartu karyawan (RFID/NFC/QR/Barcode)
// ===================================================================
export function KartuView() {
  // ---- state data ----
  const [rows, setRows] = useState<KartuRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // ---- state pencarian (dengan debounce) ----
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // ---- state dialog ----
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<KartuRow | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<KartuRow | null>(null)

  // ---- state daftar karyawan (untuk dropdown) ----
  const [karyawanList, setKaryawanList] = useState<KaryawanWithRelations[]>([])
  const [loadingKaryawan, setLoadingKaryawan] = useState(false)

  // ---- state form tambah ----
  const [addForm, setAddForm] = useState({
    karyawanId: '',
    uid: '',
    jenis: 'rfid' as JenisKartu,
    masaBerlaku: '',
    status: 'aktif' as KartuKaryawan['status'],
  })

  // ---- state form edit ----
  const [editForm, setEditForm] = useState({
    uid: '',
    jenis: 'rfid' as JenisKartu,
    status: 'aktif' as KartuKaryawan['status'],
    masaBerlaku: '',
  })

  const [submitting, setSubmitting] = useState(false)

  // ---- debounce pencarian: update debouncedQ 400ms setelah user berhenti mengetik ----
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [q])

  // ---- fetch data kartu ----
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await api.get<ListResponse>(`/api/kartu?${params.toString()}`)
      const d = res.data!
      setRows(d.items)
      setTotal(d.total)
      setTotalPages(Math.max(1, d.totalPages))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat data kartu'
      swal.error('Gagal memuat', msg)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- fetch daftar karyawan (untuk dropdown pemilik kartu) ----
  async function loadKaryawan() {
    setLoadingKaryawan(true)
    try {
      const res = await api.get<{ items: KaryawanWithRelations[] }>('/api/karyawan?limit=100')
      setKaryawanList(res.data!.items)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat daftar karyawan'
      swal.error('Gagal memuat', msg)
    } finally {
      setLoadingKaryawan(false)
    }
  }

  // ---- buka dialog tambah ----
  function openAdd() {
    setAddForm({
      karyawanId: '',
      uid: '',
      jenis: 'rfid',
      masaBerlaku: '',
      status: 'aktif',
    })
    setAddOpen(true)
    if (karyawanList.length === 0) loadKaryawan()
  }

  // ---- buka dialog edit ----
  function openEdit(row: KartuRow) {
    setEditing(row)
    setEditForm({
      uid: row.uid,
      jenis: row.jenis,
      status: row.status,
      masaBerlaku: toDateInput(row.masaBerlaku),
    })
    setEditOpen(true)
  }

  // ---- buka dialog hapus ----
  function openDelete(row: KartuRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  // ---- submit tambah kartu ----
  async function handleSubmitAdd() {
    if (!addForm.karyawanId) {
      swal.warning('Pilih karyawan', 'Karyawan pemilik kartu wajib dipilih')
      return
    }
    if (!addForm.uid.trim()) {
      swal.warning('UID kosong', 'UID kartu wajib diisi')
      return
    }
    setSubmitting(true)
    swal.loading('Menyimpan kartu...')
    try {
      await api.post('/api/kartu', {
        uid: addForm.uid.trim(),
        jenis: addForm.jenis,
        karyawanId: addForm.karyawanId,
        masaBerlaku: addForm.masaBerlaku || undefined,
        status: addForm.status,
      })
      swal.close()
      swal.success('Kartu dibuat', `UID ${addForm.uid.trim()} berhasil ditambahkan`)
      setAddOpen(false)
      fetchData()
    } catch (err) {
      swal.close()
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan kartu'
      swal.error('Gagal menyimpan', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- submit edit kartu ----
  async function handleSubmitEdit() {
    if (!editing) return
    if (!editForm.uid.trim()) {
      swal.warning('UID kosong', 'UID kartu wajib diisi')
      return
    }
    setSubmitting(true)
    swal.loading('Memperbarui kartu...')
    try {
      await api.put(`/api/kartu/${editing.id}`, {
        uid: editForm.uid.trim(),
        jenis: editForm.jenis,
        status: editForm.status,
        masaBerlaku: editForm.masaBerlaku || undefined,
      })
      swal.close()
      swal.success('Kartu diperbarui')
      setEditOpen(false)
      fetchData()
    } catch (err) {
      swal.close()
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui kartu'
      swal.error('Gagal memperbarui', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- submit hapus kartu ----
  async function handleDelete() {
    if (!deleting) return
    try {
      await api.del(`/api/kartu/${deleting.id}`)
      swal.success('Kartu dihapus', `${deleting.idKartu} berhasil dihapus`)
      setDeleting(null)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus kartu'
      swal.error('Gagal menghapus', msg)
      throw err
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Kartu Karyawan"
        description="Kelola kartu identifikasi (RFID / NFC / QR / Barcode) untuk absensi"
      >
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button onClick={openAdd} className="gradient-primary text-white hover:opacity-90">
          <Plus className="h-4 w-4" />
          Tambah Kartu
        </Button>
      </PageHeader>

      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4 space-y-3">
          {/* Pencarian */}
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari ID Kartu, UID, nama, atau NIK..."
          />

          {/* Konten utama */}
          {loading ? (
            <KartuSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Belum ada kartu"
              description={debouncedQ ? 'Tidak ada kartu yang cocok dengan pencarian.' : 'Tambahkan kartu pertama untuk karyawan Anda.'}
              action={
                !debouncedQ ? (
                  <Button onClick={openAdd} className="gradient-primary text-white hover:opacity-90">
                    <Plus className="h-4 w-4" /> Tambah Kartu
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Karyawan</TableHead>
                    <TableHead>ID Kartu</TableHead>
                    <TableHead>UID</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Masa Berlaku</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const meta = JENIS_META[row.jenis] ?? JENIS_META.rfid
                    const Icon = meta.icon
                    return (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        {/* Kolom Karyawan */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-9 w-9 shrink-0">
                              {row.karyawan.foto ? (
                                <AvatarImage src={row.karyawan.foto} alt={row.karyawan.nama} />
                              ) : null}
                              <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                                {getInisial(row.karyawan.nama)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[180px]">{row.karyawan.nama}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.karyawan.nik} · {row.karyawan.jabatan}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Kolom ID Kartu */}
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {row.idKartu}
                          </Badge>
                        </TableCell>

                        {/* Kolom UID */}
                        <TableCell>
                          <span className="font-mono text-xs">{row.uid}</span>
                        </TableCell>

                        {/* Kolom Jenis */}
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.color)}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </TableCell>

                        {/* Kolom Masa Berlaku */}
                        <TableCell>
                          {row.masaBerlaku ? (
                            <span className="text-xs tabular-nums">{formatTanggalPendek(row.masaBerlaku)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">∞</span>
                          )}
                        </TableCell>

                        {/* Kolom Status */}
                        <TableCell>
                          {row.status === 'hilang' ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-500/10">
                              Hilang
                            </Badge>
                          ) : (
                            <ActiveBadge status={row.status} />
                          )}
                        </TableCell>

                        {/* Kolom Aksi */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(row)}
                              title="Edit kartu"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDelete(row)}
                              title="Hapus kartu"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ===================== Dialog Tambah Kartu ===================== */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Kartu Karyawan</DialogTitle>
            <DialogDescription>
              Daftarkan kartu baru untuk absensi karyawan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Pilih karyawan */}
            <div className="grid gap-1.5">
              <Label htmlFor="k-karyawan">Karyawan</Label>
              <Select
                value={addForm.karyawanId}
                onValueChange={(v) => setAddForm((f) => ({ ...f, karyawanId: v }))}
              >
                <SelectTrigger id="k-karyawan" className="w-full">
                  <SelectValue placeholder={loadingKaryawan ? 'Memuat karyawan...' : 'Pilih karyawan'} />
                </SelectTrigger>
                <SelectContent>
                  {karyawanList.length === 0 ? (
                    <SelectItem value="_empty" disabled>Tidak ada karyawan</SelectItem>
                  ) : (
                    karyawanList.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.nama} — {k.nik}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* UID + Jenis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="k-uid">UID Kartu</Label>
                <Input
                  id="k-uid"
                  value={addForm.uid}
                  onChange={(e) => setAddForm((f) => ({ ...f, uid: e.target.value }))}
                  placeholder="cth: 04A9B2..."
                  className="font-mono"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="k-jenis">Jenis Kartu</Label>
                <Select
                  value={addForm.jenis}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, jenis: v as JenisKartu }))}
                >
                  <SelectTrigger id="k-jenis" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_KARTU.map((j) => {
                      const m = JENIS_META[j]
                      const I = m.icon
                      return (
                        <SelectItem key={j} value={j}>
                          <span className="flex items-center gap-2"><I className="h-3.5 w-3.5" /> {m.label}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Masa berlaku + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="k-masa">Masa Berlaku</Label>
                <Input
                  id="k-masa"
                  type="date"
                  value={addForm.masaBerlaku}
                  onChange={(e) => setAddForm((f) => ({ ...f, masaBerlaku: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">Kosongkan untuk default 1 tahun.</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="k-status">Status</Label>
                <Select
                  value={addForm.status}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, status: v as KartuKaryawan['status'] }))}
                >
                  <SelectTrigger id="k-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_KARTU.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={submitting}
              className="gradient-primary text-white hover:opacity-90"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Kartu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== Dialog Edit Kartu ===================== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Kartu</DialogTitle>
            <DialogDescription>
              {editing ? (
                <span>
                  ID Kartu: <span className="font-mono font-semibold">{editing.idKartu}</span>
                  {' · '}Pemilik: <span className="font-semibold">{editing.karyawan.nama}</span>
                </span>
              ) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* UID + Jenis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="e-uid">UID Kartu</Label>
                <Input
                  id="e-uid"
                  value={editForm.uid}
                  onChange={(e) => setEditForm((f) => ({ ...f, uid: e.target.value }))}
                  className="font-mono"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-jenis">Jenis Kartu</Label>
                <Select
                  value={editForm.jenis}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, jenis: v as JenisKartu }))}
                >
                  <SelectTrigger id="e-jenis" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_KARTU.map((j) => {
                      const m = JENIS_META[j]
                      const I = m.icon
                      return (
                        <SelectItem key={j} value={j}>
                          <span className="flex items-center gap-2"><I className="h-3.5 w-3.5" /> {m.label}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Masa berlaku + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="e-masa">Masa Berlaku</Label>
                <Input
                  id="e-masa"
                  type="date"
                  value={editForm.masaBerlaku}
                  onChange={(e) => setEditForm((f) => ({ ...f, masaBerlaku: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as KartuKaryawan['status'] }))}
                >
                  <SelectTrigger id="e-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_KARTU.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={submitting}
              className="gradient-primary text-white hover:opacity-90"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== Dialog Konfirmasi Hapus ===================== */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Kartu?"
        description={
          deleting ? (
            <span>
              Kartu <span className="font-mono font-semibold">{deleting.idKartu}</span>{' '}
              (UID: <span className="font-mono">{deleting.uid}</span>) milik{' '}
              <span className="font-semibold">{deleting.karyawan.nama}</span> akan dihapus permanen.
              Aksi ini tidak dapat dibatalkan.
            </span>
          ) : ''
        }
        confirmText="Ya, hapus"
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ===================================================================
// Skeleton loading untuk tabel kartu
// ===================================================================
function KartuSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  )
}
