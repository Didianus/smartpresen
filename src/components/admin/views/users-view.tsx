'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Shield,
  User,
  MoreVertical,
  Mail,
  RefreshCw,
  CalendarDays,
  KeyRound,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { cn, formatTanggal, getInisial } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import type { SafeUser } from '@/types'

// ===================================================================
// Konstanta & tipe
// ===================================================================
const LIMIT = 10

type UserItem = SafeUser & {
  karyawan?: { nik: string; divisi: string; jabatan: string } | null
}

interface ListResponse {
  items: UserItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UserForm {
  namaLengkap: string
  email: string
  password: string
  role: 'admin' | 'user'
  status: 'aktif' | 'nonaktif'
}

const emptyForm: UserForm = {
  namaLengkap: '',
  email: '',
  password: '',
  role: 'user',
  status: 'aktif',
}

// ===================================================================
// RoleBadge — admin: primary, user: muted
// ===================================================================
function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <Badge className="gradient-primary text-white border-0 gap-1">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <User className="h-3 w-3" />
      User
    </Badge>
  )
}

// ===================================================================
// UsersView — halaman manajemen akun login (admin)
// ===================================================================
export function UsersView() {
  // ----- state data -----
  const [items, setItems] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // ----- state filter -----
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // ----- state dialog -----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  const currentUser = useAuthStore((s) => s.user)

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

      const res = await api.get<ListResponse>(`/api/users?${params.toString()}`)
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
  }, [page, debouncedQ])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ----- handlers -----
  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(u: UserItem) {
    setEditing(u)
    setForm({
      namaLengkap: u.namaLengkap,
      email: u.email,
      password: '', // tidak ditampilkan saat edit
      role: u.role,
      status: u.status,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.namaLengkap.trim()) {
      swal.warning('Lengkapi data', 'Nama lengkap wajib diisi')
      return
    }
    if (!editing) {
      if (!form.email.trim()) {
        swal.warning('Email wajib', 'Email diperlukan untuk akun baru')
        return
      }
      if (form.password.length < 6) {
        swal.warning('Password terlalu pendek', 'Minimal 6 karakter')
        return
      }
    }

    setSaving(true)
    swal.loading(editing ? 'Menyimpan perubahan...' : 'Menambahkan user...')
    try {
      if (editing) {
        await api.put(`/api/users/${editing.id}`, {
          namaLengkap: form.namaLengkap.trim(),
          role: form.role,
          status: form.status,
        })
        swal.close()
        swal.success('User diperbarui', `${form.namaLengkap} berhasil diperbarui`)
      } else {
        await api.post('/api/users', {
          namaLengkap: form.namaLengkap.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          status: form.status,
        })
        swal.close()
        swal.success('User ditambahkan', `${form.email} berhasil dibuat`)
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
    // Cegah hapus akun sendiri (defense-in-depth; API juga memblokir)
    if (currentUser && deleteTarget.id === currentUser.id) {
      swal.warning('Tidak diizinkan', 'Anda tidak dapat menghapus akun sendiri')
      setDeleteTarget(null)
      return
    }
    try {
      await api.del(`/api/users/${deleteTarget.id}`)
      swal.success('User dihapus', `${deleteTarget.email} telah dihapus`)
      setDeleteTarget(null)
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
    loadData()
  }

  // ----- render -----
  return (
    <div className="space-y-4">
      <PageHeader
        title="Manajemen User"
        description="Kelola akun login admin & karyawan beserta peran dan status"
      >
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="hidden sm:inline">Muat ulang</span>
        </Button>
        <Button onClick={openCreate} size="sm" className="gradient-primary text-white border-0">
          <Plus className="h-4 w-4" />
          Tambah User
        </Button>
      </PageHeader>

      {/* ===================== Filter ===================== */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari nama atau email..."
          />
        </CardContent>
      </Card>

      {/* ===================== Tabel ===================== */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="Belum ada user"
              description="Tambahkan akun login untuk admin atau karyawan baru."
              action={
                <Button
                  onClick={openCreate}
                  size="sm"
                  className="gradient-primary text-white border-0"
                >
                  <Plus className="h-4 w-4" /> Tambah User
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-4">User</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Karyawan</TableHead>
                      <TableHead className="hidden sm:table-cell">Registrasi</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((u, i) => {
                      const isSelf = currentUser?.id === u.id
                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.03 }}
                          className="hover:bg-muted/40 border-b transition-colors"
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border">
                                <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                                  {getInisial(u.namaLengkap) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                  {u.namaLengkap}
                                  {isSelf && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1.5"
                                    >
                                      Anda
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate md:hidden">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {u.email}
                            </span>
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={u.role} />
                          </TableCell>
                          <TableCell>
                            <ActiveBadge status={u.status} />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {u.karyawan ? (
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {u.karyawan.nik}
                                </span>
                                <span className="text-xs">
                                  {u.karyawan.jabatan} · {u.karyawan.divisi}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatTanggal(u.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => openEdit(u)}>
                                  <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={isSelf}
                                  onClick={() => setDeleteTarget(u)}
                                >
                                  <Trash2 className="h-4 w-4" /> Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {editing ? 'Edit User' : 'Tambah User'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Perbarui nama, peran, dan status akun.'
                : 'Buat akun login baru untuk admin atau karyawan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Nama Lengkap" required>
              <Input
                value={form.namaLengkap}
                onChange={(e) => setForm((f) => ({ ...f, namaLengkap: e.target.value }))}
                placeholder="cth. Budi Santoso"
              />
            </Field>

            {!editing && (
              <>
                <Field label="Email" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="nama@perusahaan.com"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Password" required hint="Minimal 6 karakter">
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••"
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}

            {editing && (
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  disabled
                  className="bg-muted/50 text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email tidak dapat diubah.
                </p>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Role">
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as 'admin' | 'user' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as 'aktif' | 'nonaktif' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
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
              {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== Konfirmasi Hapus ===================== */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus User?"
        description={
          <span>
            Anda akan menghapus akun{' '}
            <span className="font-semibold text-foreground">{deleteTarget?.namaLengkap}</span>{' '}
            (<span className="font-mono">{deleteTarget?.email}</span>). Aksi ini tidak dapat
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
// Field wrapper
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
// Skeleton loading
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
          <div className="h-6 w-14 rounded bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  )
}
