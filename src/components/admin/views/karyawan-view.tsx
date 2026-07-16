'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  CreditCard,
  Camera,
  KeyRound,
  MoreVertical,
  ImageUp,
  IdCard,
  RefreshCw,
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

import { api } from '@/lib/api'
import { swal } from '@/lib/swal'
import { cn, getInisial } from '@/lib/utils'
import type { KaryawanWithRelations } from '@/types'

// ===================================================================
// Konstanta opsi
// ===================================================================
const DIVISI_OPTIONS = ['IT', 'Human Resource', 'Marketing', 'Finance', 'Umum'] as const
const STATUS_KARYAWAN = ['aktif', 'nonaktif', 'cuti'] as const
const JENIS_KARTU = ['rfid', 'nfc', 'barcode', 'qrcode'] as const

const LIMIT = 10

// ===================================================================
// Tipe lokal
// ===================================================================

/** Item karyawan dari GET /api/karyawan — menyertakan relasi kartu & user */
type KaryawanItem = KaryawanWithRelations & {
  user?: { role: string; status: string; email: string } | null
}

interface ListResponse {
  items: KaryawanItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface KaryawanForm {
  nama: string
  nik: string
  jabatan: string
  divisi: string
  alamat: string
  noTelepon: string
  email: string
  status: 'aktif' | 'nonaktif' | 'cuti'
  foto: string | null
  uid: string
  jenis: 'rfid' | 'nfc' | 'barcode' | 'qrcode'
  buatAkun: boolean
  password: string
}

const emptyForm: KaryawanForm = {
  nama: '',
  nik: '',
  jabatan: '',
  divisi: 'IT',
  alamat: '',
  noTelepon: '',
  email: '',
  status: 'aktif',
  foto: null,
  uid: '',
  jenis: 'rfid',
  buatAkun: false,
  password: '',
}

// ===================================================================
// Helper badge untuk status karyawan (3 state: aktif/nonaktif/cuti)
// ===================================================================
function KaryawanStatusBadge({ status }: { status: string }) {
  if (status === 'cuti') {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-500/10"
      >
        Cuti
      </Badge>
    )
  }
  return <ActiveBadge status={status} />
}

// ===================================================================
// KaryawanView — halaman manajemen data karyawan (admin)
// ===================================================================
export function KaryawanView() {
  // ----- state data -----
  const [items, setItems] = useState<KaryawanItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // ----- state filter -----
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [divisi, setDivisi] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')

  // ----- state dialog -----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<KaryawanItem | null>(null)
  const [form, setForm] = useState<KaryawanForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KaryawanItem | null>(null)

  // ----- debounce search -----
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  // ----- load data -----
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      })
      if (debouncedQ) params.set('q', debouncedQ)
      if (divisi !== 'all') params.set('divisi', divisi)
      if (status !== 'all') params.set('status', status)

      const res = await api.get<ListResponse>(`/api/karyawan?${params.toString()}`)
      const d = res.data!
      setItems(d.items)
      setTotal(d.total)
      setTotalPages(d.totalPages)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat data'
      swal.error('Gagal memuat', msg)
      setItems([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ, divisi, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ----- handlers -----
  function onDivisiChange(v: string) {
    setDivisi(v)
    setPage(1)
  }

  function onStatusChange(v: string) {
    setStatus(v)
    setPage(1)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(k: KaryawanItem) {
    setEditing(k)
    setForm({
      nama: k.nama,
      nik: k.nik,
      jabatan: k.jabatan,
      divisi: k.divisi,
      alamat: k.alamat,
      noTelepon: k.noTelepon,
      email: k.email,
      status: k.status,
      foto: k.foto,
      uid: k.kartu?.uid ?? '',
      jenis: (k.kartu?.jenis as KaryawanForm['jenis']) ?? 'rfid',
      buatAkun: false,
      password: '',
    })
    setDialogOpen(true)
  }

  // Upload foto → data URL via FileReader
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      swal.warning('Format tidak didukung', 'Pilih file gambar (JPG/PNG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      swal.warning('Ukuran terlalu besar', 'Maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, foto: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    // ----- validasi -----
    if (!form.nama.trim()) {
      swal.warning('Lengkapi data', 'Nama wajib diisi')
      return
    }
    if (!form.jabatan.trim()) {
      swal.warning('Lengkapi data', 'Jabatan wajib diisi')
      return
    }
    if (!form.divisi) {
      swal.warning('Lengkapi data', 'Divisi wajib dipilih')
      return
    }
    if (!editing && form.buatAkun) {
      if (!form.email.trim()) {
        swal.warning('Email wajib', 'Email diperlukan untuk akun login')
        return
      }
      if (form.password.length < 6) {
        swal.warning('Password terlalu pendek', 'Minimal 6 karakter')
        return
      }
    }

    setSaving(true)
    swal.loading(editing ? 'Menyimpan perubahan...' : 'Menambahkan karyawan...')
    try {
      if (editing) {
        // ----- UPDATE -----
        await api.put(`/api/karyawan/${editing.id}`, {
          nama: form.nama.trim(),
          jabatan: form.jabatan.trim(),
          divisi: form.divisi,
          alamat: form.alamat,
          noTelepon: form.noTelepon,
          email: form.email,
          status: form.status,
          foto: form.foto,
          uid: form.uid.trim() || undefined,
          jenis: form.jenis,
        })
        swal.close()
        swal.success('Karyawan diperbarui', `${form.nama} berhasil diperbarui`)
      } else {
        // ----- CREATE -----
        await api.post('/api/karyawan', {
          nama: form.nama.trim(),
          nik: form.nik.trim() || undefined,
          jabatan: form.jabatan.trim(),
          divisi: form.divisi,
          alamat: form.alamat,
          noTelepon: form.noTelepon,
          email: form.email.trim() || undefined,
          status: form.status,
          foto: form.foto,
          uid: form.uid.trim() || undefined,
          jenis: form.jenis,
          buatAkun: form.buatAkun,
          password: form.password || undefined,
        })
        swal.close()
        swal.success('Karyawan ditambahkan', `${form.nama} berhasil ditambahkan`)
      }
      setDialogOpen(false)
      loadData()
    } catch (e) {
      swal.close()
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan'
      swal.error('Gagal menyimpan', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.del(`/api/karyawan/${deleteTarget.id}`)
      swal.success('Karyawan dihapus', `${deleteTarget.nama} telah dihapus`)
      setDeleteTarget(null)
      // Jika setelah hapus halaman menjadi kosong & bukan halaman 1, mundur 1 halaman
      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        loadData()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan'
      swal.error('Gagal menghapus', msg)
    }
  }

  function handleRefresh() {
    setPage(1)
    setQ('')
    setDivisi('all')
    setStatus('all')
    loadData()
  }

  // ----- render -----
  return (
    <div className="space-y-4">
      <PageHeader
        title="Data Karyawan"
        description="Kelola data karyawan beserta kartu identitas & akun login"
      >
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="hidden sm:inline">Muat ulang</span>
        </Button>
        <Button onClick={openCreate} size="sm" className="gradient-primary text-white border-0">
          <Plus className="h-4 w-4" />
          Tambah Karyawan
        </Button>
      </PageHeader>

      {/* ===================== Filter ===================== */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari nama, NIK, jabatan, email..."
            className="md:col-span-1"
          />
          <Select value={divisi} onValueChange={onDivisiChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Divisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Divisi</SelectItem>
              {DIVISI_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS_KARYAWAN.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'aktif' ? 'Aktif' : s === 'nonaktif' ? 'Nonaktif' : 'Cuti'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ===================== Tabel ===================== */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada karyawan"
              description="Tambahkan data karyawan baru untuk mulai mengelola absensi."
              action={
                <Button onClick={openCreate} size="sm" className="gradient-primary text-white border-0">
                  <Plus className="h-4 w-4" /> Tambah Karyawan
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-4">Foto</TableHead>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Kartu</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((k, i) => (
                      <motion.tr
                        key={k.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                        className="hover:bg-muted/40 border-b transition-colors"
                      >
                        <TableCell className="pl-4">
                          <Avatar className="h-9 w-9 border border-border">
                            {k.foto ? <AvatarImage src={k.foto} alt={k.nama} /> : null}
                            <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                              {getInisial(k.nama) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {k.nik}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{k.nama}</span>
                            {k.noTelepon && (
                              <span className="text-[11px] text-muted-foreground">{k.noTelepon}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{k.jabatan}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {k.divisi}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {k.email || '-'}
                        </TableCell>
                        <TableCell>
                          <KaryawanStatusBadge status={k.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {k.kartu?.idKartu ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono">
                              <CreditCard className="h-3.5 w-3.5 text-primary" />
                              {k.kartu.idKartu}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openEdit(k)}>
                                <Pencil className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(k)}
                              >
                                <Trash2 className="h-4 w-4" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4 pb-2">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===================== Dialog Tambah/Edit ===================== */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-primary" />
              {editing ? 'Edit Karyawan' : 'Tambah Karyawan'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Perbarui informasi karyawan, foto, dan kartu.'
                : 'Lengkapi form di bawah untuk menambahkan karyawan baru.'}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto pr-1 -mr-1 space-y-5 pb-1">
            {/* ----- Foto ----- */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-border">
                  {form.foto ? <AvatarImage src={form.foto} alt="Preview" /> : null}
                  <AvatarFallback className="gradient-primary text-white text-xl font-semibold">
                    {form.nama ? getInisial(form.nama) : <Camera className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                {form.foto && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, foto: null }))}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow text-xs"
                    aria-label="Hapus foto"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="foto-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-accent text-sm">
                    <ImageUp className="h-4 w-4" />
                    {form.foto ? 'Ganti Foto' : 'Unggah Foto'}
                  </div>
                </Label>
                <Input
                  id="foto-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                <p className="text-xs text-muted-foreground">JPG/PNG, maksimal 2MB</p>
              </div>
            </div>

            {/* ----- Data utama ----- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Lengkap" required>
                <Input
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="cth. Budi Santoso"
                />
              </Field>
              <Field
                label="NIK"
                hint={editing ? undefined : 'Kosongkan untuk generate otomatis'}
              >
                <Input
                  value={form.nik}
                  onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value }))}
                  placeholder="YYYYMM-NNN"
                  className="font-mono"
                  disabled={!!editing}
                />
              </Field>
              <Field label="Jabatan" required>
                <Input
                  value={form.jabatan}
                  onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))}
                  placeholder="cth. Staff IT"
                />
              </Field>
              <Field label="Divisi" required>
                <Select
                  value={form.divisi}
                  onValueChange={(v) => setForm((f) => ({ ...f, divisi: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISI_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="No. Telepon">
                <Input
                  value={form.noTelepon}
                  onChange={(e) => setForm((f) => ({ ...f, noTelepon: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nama@perusahaan.com"
                />
              </Field>
            </div>

            <Field label="Alamat">
              <Textarea
                value={form.alamat}
                onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
                placeholder="Alamat lengkap"
                rows={2}
              />
            </Field>

            <Field label="Status Karyawan">
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as KaryawanForm['status'] }))
                }
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_KARYAWAN.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'aktif' ? 'Aktif' : s === 'nonaktif' ? 'Nonaktif' : 'Cuti'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* ----- Kartu ----- */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                Kartu Identitas
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="UID Kartu" hint="Kosongkan jika belum punya kartu">
                  <Input
                    value={form.uid}
                    onChange={(e) => setForm((f) => ({ ...f, uid: e.target.value }))}
                    placeholder="cth. 04A3B2C1"
                    className="font-mono"
                  />
                </Field>
                <Field label="Jenis Kartu">
                  <Select
                    value={form.jenis}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, jenis: v as KaryawanForm['jenis'] }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_KARTU.map((j) => (
                        <SelectItem key={j} value={j} className="uppercase">
                          {j.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            {/* ----- Akun login (hanya saat tambah) ----- */}
            {!editing && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Buat Akun Login
                  </div>
                  <Checkbox
                    checked={form.buatAkun}
                    onCheckedChange={(c) =>
                      setForm((f) => ({ ...f, buatAkun: c === true }))
                    }
                  />
                </div>
                {form.buatAkun && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Email Login" required>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="nama@perusahaan.com"
                      />
                    </Field>
                    <Field label="Password" required>
                      <Input
                        type="text"
                        value={form.password}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, password: e.target.value }))
                        }
                        placeholder="Minimal 6 karakter"
                      />
                    </Field>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Akun login memungkinkan karyawan masuk ke aplikasi untuk absensi mandiri.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="gradient-primary text-white border-0"
            >
              {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Karyawan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== Konfirmasi Hapus ===================== */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus Karyawan?"
        description={
          <span>
            Anda akan menghapus{' '}
            <span className="font-semibold text-foreground">{deleteTarget?.nama}</span> (NIK:{' '}
            <span className="font-mono">{deleteTarget?.nik}</span>). Aksi ini tidak dapat
            dibatalkan.
          </span>
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ===================================================================
// Field wrapper — label + hint + input
// ===================================================================
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ===================================================================
// Skeleton loading untuk tabel
// ===================================================================
function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-muted/70 animate-pulse" />
          </div>
          <div className="h-6 w-16 rounded bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  )
}
