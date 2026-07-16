'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'

export function UserPasswordView() {
  const [form, setForm] = useState({ passwordLama: '', passwordBaru: '', konfirmasi: '' })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  function set(key: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.passwordBaru !== form.konfirmasi) {
      swal.error('Gagal', 'Konfirmasi password tidak cocok')
      return
    }
    setSaving(true)
    try {
      await api.put('/api/password', form)
      await swal.success('Password Diubah', 'Password Anda berhasil diperbarui')
      setForm({ passwordLama: '', passwordBaru: '', konfirmasi: '' })
    } catch (err) {
      swal.error('Gagal', err instanceof ApiError ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const strength = (() => {
    const p = form.passwordBaru
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()
  const strengthLabel = ['Terlalu lemah', 'Lemah', 'Cukup', 'Baik', 'Kuat', 'Sangat kuat'][strength]
  const strengthColor = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500', 'bg-emerald-600'][strength]

  return (
    <div className="space-y-5">
      <PageHeader title="Ubah Password" description="Pastikan akun Anda tetap aman" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Ganti Password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <Field label="Password Lama" icon={<Lock className="h-4 w-4" />}>
                <Input type={show ? 'text' : 'password'} value={form.passwordLama} onChange={(e) => set('passwordLama', e.target.value)} className="pl-10 h-10" required />
              </Field>
              <Field label="Password Baru" icon={<Lock className="h-4 w-4" />}>
                <Input type={show ? 'text' : 'password'} value={form.passwordBaru} onChange={(e) => set('passwordBaru', e.target.value)} className="pl-10 h-10" required minLength={6} />
              </Field>
              {form.passwordBaru && (
                <div>
                  <div className="flex gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? strengthColor : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Kekuatan: <span className="font-medium">{strengthLabel}</span></p>
                </div>
              )}
              <Field label="Konfirmasi Password Baru" icon={<Lock className="h-4 w-4" />}>
                <Input type={show ? 'text' : 'password'} value={form.konfirmasi} onChange={(e) => set('konfirmasi', e.target.value)} className="pl-10 h-10" required />
              </Field>
              <button type="button" onClick={() => setShow((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {show ? 'Sembunyikan' : 'Tampilkan'} password
              </button>
              <Button type="submit" disabled={saving} className="gradient-primary text-white border-0">
                <ShieldCheck className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Ubah Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tips Keamanan</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <Tip text="Gunakan minimal 6 karakter, idealnya 10+." />
            <Tip text="Kombinasikan huruf besar, kecil, angka, dan simbol." />
            <Tip text="Jangan gunakan password yang sama dengan akun lain." />
            <Tip text="Ganti password secara berkala setiap 3 bulan." />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  )
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
