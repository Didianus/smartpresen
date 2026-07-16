'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Save, Camera, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import { getInisial } from '@/lib/utils'
import type { KaryawanWithRelations, KartuKaryawan } from '@/types'

export function UserProfilView() {
  const [form, setForm] = useState({ nama: '', jabatan: '', divisi: '', alamat: '', noTelepon: '', foto: '' })
  const [original, setOriginal] = useState<typeof form | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<{ karyawan: KaryawanWithRelations; kartu: KartuKaryawan | null }>('/api/dashboard').then((r) => {
      const k = r.data!.karyawan
      const f = { nama: k.nama, jabatan: k.jabatan, divisi: k.divisi, alamat: k.alamat, noTelepon: k.noTelepon, foto: k.foto ?? '' }
      setForm(f)
      setOriginal(f)
    }).finally(() => setLoading(false))
  }, [])

  function set(key: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [key]: v }))
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      swal.warning('Foto terlalu besar', 'Maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set('foto', String(reader.result))
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/api/profil', form)
      await swal.success('Profil Diperbarui', 'Perubahan profil Anda telah disimpan')
      setOriginal(form)
    } catch (err) {
      swal.error('Gagal', err instanceof ApiError ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const dirty = original ? JSON.stringify(original) !== JSON.stringify(form) : false

  if (loading) return <div className="h-64 rounded-2xl bg-muted animate-pulse" />

  return (
    <div className="space-y-5">
      <PageHeader title="Edit Profil" description="Perbarui informasi pribadi Anda" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Foto */}
        <Card>
          <CardHeader><CardTitle className="text-base">Foto Profil</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                {form.foto ? (
                  <img src={form.foto} alt="Foto" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="gradient-primary text-white text-3xl font-bold">{getInisial(form.nama)}</AvatarFallback>
                )}
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-1 right-1 h-9 w-9 rounded-full gradient-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            <p className="text-xs text-muted-foreground mt-3 text-center">Klik ikon kamera untuk mengubah foto. Maks 2MB.</p>
            {form.foto && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => set('foto', '')}>
                <X className="h-3.5 w-3.5" /> Hapus Foto
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Informasi Pribadi</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap"><Input value={form.nama} onChange={(e) => set('nama', e.target.value)} className="h-10" /></Field>
                <Field label="Jabatan"><Input value={form.jabatan} onChange={(e) => set('jabatan', e.target.value)} className="h-10" /></Field>
                <Field label="Divisi"><Input value={form.divisi} onChange={(e) => set('divisi', e.target.value)} className="h-10" /></Field>
                <Field label="No. Telepon"><Input value={form.noTelepon} onChange={(e) => set('noTelepon', e.target.value)} className="h-10" /></Field>
              </div>
              <Field label="Alamat"><Input value={form.alamat} onChange={(e) => set('alamat', e.target.value)} className="h-10" /></Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => original && setForm(original)} disabled={!dirty || saving}>
                  Reset
                </Button>
                <motion.div whileHover={{ scale: dirty ? 1.02 : 1 }} whileTap={{ scale: dirty ? 0.98 : 1 }}>
                  <Button type="submit" disabled={saving || !dirty} className="gradient-primary text-white border-0">
                    <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  )
}
