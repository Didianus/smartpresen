'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, Plus, Pencil, Trash2, RefreshCw, CalendarRange, X, Filter,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { cn, formatJam, formatTanggal, getInisial } from '@/lib/utils'
import type { Absensi, KaryawanWithRelations, StatusKehadiran } from '@/types'

// ===================================================================
// Tipe data lokal
// ===================================================================

interface ListResponse {
  items: Absensi[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_LIST: StatusKehadiran[] = ['hadir', 'terlambat', 'izin', 'sakit', 'alpha']

const STATUS_LABEL: Record<StatusKehadiran, string> = {
  hadir: 'Hadir',
  terlambat: 'Terlambat',
  izin: 'Izin',
  sakit: 'Sakit',
  alpha: 'Alpha',
}

/** Tanggal hari ini dalam format yyyy-mm-dd */
function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Konversi ISO string → yyyy-mm-dd (untuk input type=date) */
function toDateInput(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Konversi ISO string → HH:MM (untuk input type=time) */
function toTimeInput(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** Gabungkan tanggal (yyyy-mm-dd) & jam (HH:MM) → ISO datetime string */
function combineDateTime(tanggal: string, jam: string): string {
  if (!tanggal || !jam) return ''
  return `${tanggal}T${jam}:00`
}

// ===================================================================
// AbsensiView — CRUD data absensi karyawan (admin)
// ===================================================================
export function AbsensiView() {
  // ---- state data ----
  const [rows, setRows] = useState<Absensi[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // ---- state filter ----
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')

  // ---- state dialog ----
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Absensi | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Absensi | null>(null)

  // ---- state daftar karyawan (untuk dropdown) ----
  const [karyawanList, setKaryawanList] = useState<KaryawanWithRelations[]>([])
  const [loadingKaryawan, setLoadingKaryawan] = useState(false)

  // ---- state form tambah manual ----
  const [addForm, setAddForm] = useState({
    karyawanId: '',
    nik: '',
    nama: '',
    tanggal: todayStr(),
    jamMasuk: '08:00',
    jamPulang: '17:00',
    status: 'hadir' as StatusKehadiran,
    lokasi: 'Kantor Pusat',
    keterangan: '',
  })

  // ---- state form edit ----
  const [editForm, setEditForm] = useState({
    tanggal: '',
    jamMasuk: '',
    jamPulang: '',
    status: 'hadir' as StatusKehadiran,
    lokasi: '',
    keterangan: '',
  })

  const [submitting, setSubmitting] = useState(false)

  // ---- debounce pencarian ----
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [q])

  // ---- reset ke halaman 1 saat filter berubah ----
  useEffect(() => {
    setPage(1)
  }, [statusFilter, dari, sampai])

  // ---- fetch data absensi ----
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (debouncedQ) params.set('q', debouncedQ)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dari) params.set('dari', dari)
      if (sampai) params.set('sampai', sampai)
      const res = await api.get<ListResponse>(`/api/absensi?${params.toString()}`)
      const d = res.data!
      setRows(d.items)
      setTotal(d.total)
      setTotalPages(Math.max(1, d.totalPages))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat data absensi'
      swal.error('Gagal memuat', msg)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ, statusFilter, dari, sampai])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- fetch daftar karyawan ----
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

  // ---- buka dialog tambah manual ----
  function openAdd() {
    setAddForm({
      karyawanId: '',
      nik: '',
      nama: '',
      tanggal: todayStr(),
      jamMasuk: '08:00',
      jamPulang: '17:00',
      status: 'hadir',
      lokasi: 'Kantor Pusat',
      keterangan: '',
    })
    setAddOpen(true)
    if (karyawanList.length === 0) loadKaryawan()
  }

  // ---- buka dialog edit ----
  function openEdit(row: Absensi) {
    setEditing(row)
    setEditForm({
      tanggal: toDateInput(row.tanggal),
      jamMasuk: toTimeInput(row.jamMasuk),
      jamPulang: toTimeInput(row.jamPulang),
      status: row.status,
      lokasi: row.lokasi,
      keterangan: row.keterangan,
    })
    setEditOpen(true)
  }

  // ---- buka dialog hapus ----
  function openDelete(row: Absensi) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  // ---- handler pilih karyawan: auto-fill nik & nama dari objek karyawan terpilih ----
  function handlePilihKaryawan(karyawanId: string) {
    const k = karyawanList.find((x) => x.id === karyawanId)
    setAddForm((f) => ({
      ...f,
      karyawanId,
      nik: k?.nik ?? '',
      nama: k?.nama ?? '',
    }))
  }

  // ---- tombol filter "Hari Ini" ----
  function applyHariIni() {
    const t = todayStr()
    setDari(t)
    setSampai(t)
  }

  // ---- reset semua filter ----
  function resetFilter() {
    setQ('')
    setDebouncedQ('')
    setStatusFilter('all')
    setDari('')
    setSampai('')
  }

  const adaFilter = debouncedQ !== '' || statusFilter !== 'all' || dari !== '' || sampai !== ''

  // ---- submit tambah manual ----
  async function handleSubmitAdd() {
    if (!addForm.karyawanId) {
      swal.warning('Pilih karyawan', 'Karyawan wajib dipilih')
      return
    }
    if (!addForm.tanggal) {
      swal.warning('Tanggal kosong', 'Tanggal absensi wajib diisi')
      return
    }
    setSubmitting(true)
    swal.loading('Menyimpan absensi...')
    try {
      await api.post('/api/absensi', {
        mode: 'manual',
        nik: addForm.nik,
        nama: addForm.nama,
        tanggal: addForm.tanggal,
        jamMasuk: combineDateTime(addForm.tanggal, addForm.jamMasuk),
        jamPulang: combineDateTime(addForm.tanggal, addForm.jamPulang),
        status: addForm.status,
        lokasi: addForm.lokasi,
        keterangan: addForm.keterangan,
        karyawanId: addForm.karyawanId,
      })
      swal.close()
      swal.success('Absensi ditambahkan', `${addForm.nama} (${addForm.tanggal})`)
      setAddOpen(false)
      fetchData()
    } catch (err) {
      swal.close()
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan absensi'
      swal.error('Gagal menyimpan', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- submit edit absensi ----
  async function handleSubmitEdit() {
    if (!editing) return
    if (!editForm.tanggal) {
      swal.warning('Tanggal kosong', 'Tanggal absensi wajib diisi')
      return
    }
    setSubmitting(true)
    swal.loading('Memperbarui absensi...')
    try {
      // Kirim '' (string kosong) untuk jamMasuk/jamPulang agar API meng-clear nilai
      await api.put(`/api/absensi/${editing.id}`, {
        tanggal: editForm.tanggal,
        jamMasuk: editForm.jamMasuk ? combineDateTime(editForm.tanggal, editForm.jamMasuk) : '',
        jamPulang: editForm.jamPulang ? combineDateTime(editForm.tanggal, editForm.jamPulang) : '',
        status: editForm.status,
        lokasi: editForm.lokasi,
        keterangan: editForm.keterangan,
      })
      swal.close()
      swal.success('Absensi diperbarui')
      setEditOpen(false)
      fetchData()
    } catch (err) {
      swal.close()
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui absensi'
      swal.error('Gagal memperbarui', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- submit hapus absensi ----
  async function handleDelete() {
    if (!deleting) return
    try {
      await api.del(`/api/absensi/${deleting.id}`)
      swal.success('Absensi dihapus', `Record ${deleting.nama} berhasil dihapus`)
      setDeleting(null)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus absensi'
      swal.error('Gagal menghapus', msg)
      throw err
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Absensi"
        description="Kelola dan pantua catatan kehadiran karyawan harian"
      >
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button onClick={openAdd} className="gradient-primary text-white hover:opacity-90">
          <Plus className="h-4 w-4" />
          Tambah Manual
        </Button>
      </PageHeader>

      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4 space-y-3">
          {/* ===================== Filter Bar ===================== */}
          <div className="grid grid-cols-1 sm:flex sm:flex-row sm:flex-wrap gap-2 sm:items-center">
            <div className="sm:flex-1 min-w-0">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Cari nama atau NIK karyawan..."
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
              <Input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="w-full sm:w-36"
                aria-label="Dari tanggal"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className="w-full sm:w-36"
                aria-label="Sampai tanggal"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={applyHariIni}
              className="w-full sm:w-auto"
            >
              <CalendarDays className="h-4 w-4" />
              Hari Ini
            </Button>

            {adaFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilter}
                className="w-full sm:w-auto text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {/* ===================== Konten utama ===================== */}
          {loading ? (
            <AbsensiSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Belum ada absensi"
              description={adaFilter ? 'Tidak ada absensi yang cocok dengan filter.' : 'Tambahkan record absensi manual atau tunggu karyawan melakukan absen.'}
              action={
                !adaFilter ? (
                  <Button onClick={openAdd} className="gradient-primary text-white hover:opacity-90">
                    <Plus className="h-4 w-4" /> Tambah Manual
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resetFilter}>
                    Reset Filter
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      {/* Kolom Tanggal */}
                      <TableCell>
                        <span className="text-xs tabular-nums">{formatTanggal(row.tanggal)}</span>
                      </TableCell>

                      {/* Kolom Karyawan */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full gradient-primary text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {getInisial(row.nama)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[160px]">{row.nama}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.nik}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Kolom Jam Masuk */}
                      <TableCell>
                        <span className={cn('text-sm tabular-nums', !row.jamMasuk && 'text-muted-foreground')}>
                          {formatJam(row.jamMasuk)}
                        </span>
                      </TableCell>

                      {/* Kolom Jam Pulang */}
                      <TableCell>
                        <span className={cn('text-sm tabular-nums', !row.jamPulang && 'text-muted-foreground')}>
                          {formatJam(row.jamPulang)}
                        </span>
                      </TableCell>

                      {/* Kolom Status */}
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>

                      {/* Kolom Lokasi */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate block max-w-[140px]">
                          {row.lokasi || '-'}
                        </span>
                      </TableCell>

                      {/* Kolom Keterangan */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
                          {row.keterangan || '-'}
                        </span>
                      </TableCell>

                      {/* Kolom Aksi */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(row)}
                            title="Edit absensi"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDelete(row)}
                            title="Hapus absensi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
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

      {/* ===================== Dialog Tambah Manual ===================== */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Absensi Manual</DialogTitle>
            <DialogDescription>
              Tambahkan record absensi secara manual untuk karyawan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Pilih karyawan (auto-fill nik & nama) */}
            <div className="grid gap-1.5">
              <Label htmlFor="a-karyawan">Karyawan</Label>
              <Select
                value={addForm.karyawanId}
                onValueChange={handlePilihKaryawan}
              >
                <SelectTrigger id="a-karyawan" className="w-full">
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
              {addForm.nik && (
                <p className="text-[11px] text-muted-foreground">
                  NIK: <span className="font-mono">{addForm.nik}</span> · Nama: <span className="font-medium">{addForm.nama}</span>
                </p>
              )}
            </div>

            {/* Tanggal + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="a-tanggal">Tanggal</Label>
                <Input
                  id="a-tanggal"
                  type="date"
                  value={addForm.tanggal}
                  onChange={(e) => setAddForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="a-status">Status</Label>
                <Select
                  value={addForm.status}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, status: v as StatusKehadiran }))}
                >
                  <SelectTrigger id="a-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Jam Masuk + Jam Pulang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="a-masuk">Jam Masuk</Label>
                <Input
                  id="a-masuk"
                  type="time"
                  value={addForm.jamMasuk}
                  onChange={(e) => setAddForm((f) => ({ ...f, jamMasuk: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="a-pulang">Jam Pulang</Label>
                <Input
                  id="a-pulang"
                  type="time"
                  value={addForm.jamPulang}
                  onChange={(e) => setAddForm((f) => ({ ...f, jamPulang: e.target.value }))}
                />
              </div>
            </div>

            {/* Lokasi */}
            <div className="grid gap-1.5">
              <Label htmlFor="a-lokasi">Lokasi</Label>
              <Input
                id="a-lokasi"
                value={addForm.lokasi}
                onChange={(e) => setAddForm((f) => ({ ...f, lokasi: e.target.value }))}
                placeholder="cth: Kantor Pusat"
              />
            </div>

            {/* Keterangan */}
            <div className="grid gap-1.5">
              <Label htmlFor="a-ket">Keterangan</Label>
              <Input
                id="a-ket"
                value={addForm.keterangan}
                onChange={(e) => setAddForm((f) => ({ ...f, keterangan: e.target.value }))}
                placeholder="cth: Surat izin, datang terlambat karena..."
              />
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
              {submitting ? 'Menyimpan...' : 'Simpan Absensi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== Dialog Edit Absensi ===================== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Absensi</DialogTitle>
            <DialogDescription>
              {editing ? (
                <span>
                  Karyawan: <span className="font-semibold">{editing.nama}</span>{' '}
                  ({editing.nik})
                </span>
              ) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Tanggal + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="e-tanggal">Tanggal</Label>
                <Input
                  id="e-tanggal"
                  type="date"
                  value={editForm.tanggal}
                  onChange={(e) => setEditForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as StatusKehadiran }))}
                >
                  <SelectTrigger id="e-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Jam Masuk + Jam Pulang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="e-masuk">Jam Masuk</Label>
                <Input
                  id="e-masuk"
                  type="time"
                  value={editForm.jamMasuk}
                  onChange={(e) => setEditForm((f) => ({ ...f, jamMasuk: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">Kosongkan untuk menghapus jam masuk.</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-pulang">Jam Pulang</Label>
                <Input
                  id="e-pulang"
                  type="time"
                  value={editForm.jamPulang}
                  onChange={(e) => setEditForm((f) => ({ ...f, jamPulang: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">Kosongkan untuk menghapus jam pulang.</p>
              </div>
            </div>

            {/* Lokasi */}
            <div className="grid gap-1.5">
              <Label htmlFor="e-lokasi">Lokasi</Label>
              <Input
                id="e-lokasi"
                value={editForm.lokasi}
                onChange={(e) => setEditForm((f) => ({ ...f, lokasi: e.target.value }))}
              />
            </div>

            {/* Keterangan */}
            <div className="grid gap-1.5">
              <Label htmlFor="e-ket">Keterangan</Label>
              <Input
                id="e-ket"
                value={editForm.keterangan}
                onChange={(e) => setEditForm((f) => ({ ...f, keterangan: e.target.value }))}
              />
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
        title="Hapus Absensi?"
        description={
          deleting ? (
            <span>
              Record absensi <span className="font-semibold">{deleting.nama}</span>{' '}
              pada <span className="font-semibold">{formatTanggal(deleting.tanggal)}</span>{' '}
              akan dihapus permanen.
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
// Skeleton loading untuk tabel absensi
// ===================================================================
function AbsensiSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  )
}
