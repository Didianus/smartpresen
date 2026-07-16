'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, Mail, Lock, User, IdCard, Eye, EyeOff, ShieldCheck, UserCircle, ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth-store'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import type { SafeUser } from '@/types'

type Mode = 'login' | 'register'

export function AuthPages() {
  const [mode, setMode] = useState<Mode>('login')
  const setUser = useAuthStore((s) => s.setUser)

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      <AnimatedBackground />
      <AnimatePresence mode="wait">
        {mode === 'login' ? (
          <LoginForm key="login" onSwitch={() => setMode('register')} onSuccess={setUser} />
        ) : (
          <RegisterForm key="register" onSwitch={() => setMode('login')} onSuccess={setUser} />
        )}
      </AnimatePresence>
    </div>
  )
}

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950" />
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-400/30 blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-fuchsia-400/25 blur-3xl animate-blob animation-delay-4000" />
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  )
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-6">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow mb-4"
      >
        <Fingerprint className="h-9 w-9" />
      </motion.div>
      <h1 className="text-2xl font-bold tracking-tight">
        <span className="gradient-text">Absensi</span> Karyawan
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}

function LoginForm({ onSwitch, onSuccess }: { onSwitch: () => void; onSuccess: (u: SafeUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!email) err.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = 'Format email tidak valid'
    if (!password) err.password = 'Password wajib diisi'
    setErrors(err)
    if (Object.keys(err).length) return

    setLoading(true)
    try {
      const res = await api.post<SafeUser>('/api/auth/login', { email, password })
      onSuccess(res.data!)
      await swal.success('Login Berhasil!', `Selamat datang, ${res.data!.namaLengkap}`)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Terjadi kesalahan'
      swal.error('Login Gagal', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.97 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-glow"
    >
      <Brand subtitle="Masuk ke akun Anda untuk melanjutkan" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" icon={<Mail className="h-4 w-4" />} error={errors.email}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" className="pl-10" autoComplete="email" />
        </Field>

        <Field label="Password" icon={<Lock className="h-4 w-4" />} error={errors.password}>
          <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" autoComplete="current-password" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>

        <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-white border-0 hover:opacity-90">
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>

      <div className="mt-6 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-semibold mb-1 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Akun Demo</p>
        <p>Admin: <span className="font-mono">admin@absensi.com</span> / <span className="font-mono">admin123</span></p>
        <p>User: <span className="font-mono">budi@absensi.com</span> / <span className="font-mono">user123</span></p>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Belum punya akun?{' '}
        <button onClick={onSwitch} className="font-semibold text-primary hover:underline">Daftar di sini</button>
      </p>
    </motion.div>
  )
}

function RegisterForm({ onSwitch, onSuccess }: { onSwitch: () => void; onSuccess: (u: SafeUser) => void }) {
  const [form, setForm] = useState({ namaLengkap: '', email: '', password: '', konfirmasiPassword: '', nomorKartu: '', role: 'user' as 'admin' | 'user' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!form.namaLengkap || form.namaLengkap.length < 3) err.namaLengkap = 'Nama minimal 3 karakter'
    if (!form.email) err.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Format email tidak valid'
    if (!form.password || form.password.length < 6) err.password = 'Password minimal 6 karakter'
    if (form.password !== form.konfirmasiPassword) err.konfirmasiPassword = 'Konfirmasi password tidak cocok'
    if (!form.nomorKartu || form.nomorKartu.length < 4) err.nomorKartu = 'Nomor kartu min. 4 karakter'
    setErrors(err)
    if (Object.keys(err).length) return

    setLoading(true)
    try {
      const res = await api.post<SafeUser>('/api/auth/register', form)
      await swal.success('Registrasi Berhasil!', `Akun ${res.data!.namaLengkap} dibuat. Anda akan diarahkan ke dashboard.`)
      onSuccess(res.data!)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Terjadi kesalahan'
      swal.error('Registrasi Gagal', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.97 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-glow max-h-[92vh] overflow-y-auto"
    >
      <button onClick={onSwitch} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Login
      </button>
      <Brand subtitle="Buat akun baru — gratis & cepat" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama Lengkap" icon={<User className="h-4 w-4" />} error={errors.namaLengkap}>
          <Input value={form.namaLengkap} onChange={(e) => set('namaLengkap', e.target.value)} placeholder="Nama lengkap Anda" className="pl-10" />
        </Field>

        <Field label="Email" icon={<Mail className="h-4 w-4" />} error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@perusahaan.com" className="pl-10" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" icon={<Lock className="h-4 w-4" />} error={errors.password}>
            <Input type={show ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" className="pl-10" />
          </Field>
          <Field label="Konfirmasi" icon={<Lock className="h-4 w-4" />} error={errors.konfirmasiPassword}>
            <Input type={show ? 'text' : 'password'} value={form.konfirmasiPassword} onChange={(e) => set('konfirmasiPassword', e.target.value)} placeholder="••••••" className="pl-10" />
          </Field>
        </div>

        <button type="button" onClick={() => setShow((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {show ? 'Sembunyikan' : 'Tampilkan'} password
        </button>

        <Field label="Nomor Kartu Karyawan" icon={<IdCard className="h-4 w-4" />} error={errors.nomorKartu}>
          <Input value={form.nomorKartu} onChange={(e) => set('nomorKartu', e.target.value)} placeholder="UID RFID / NFC / QR Code" className="pl-10" />
        </Field>

        <div>
          <Label className="mb-2 block">Daftar sebagai</Label>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard active={form.role === 'user'} onClick={() => set('role', 'user')} icon={<UserCircle className="h-5 w-5" />} title="User" desc="Karyawan" />
            <RoleCard active={form.role === 'admin'} onClick={() => set('role', 'admin')} icon={<ShieldCheck className="h-5 w-5" />} title="Admin" desc="Administrator" />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-white border-0 hover:opacity-90">
          {loading ? 'Memproses...' : 'Daftar Sekarang'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Sudah punya akun?{' '}
        <button onClick={onSwitch} className="font-semibold text-primary hover:underline">Masuk di sini</button>
      </p>
    </motion.div>
  )
}

function Field({ label, icon, error, children }: { label: string; icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function RoleCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${active ? 'border-primary bg-primary/5 shadow-glow' : 'border-border hover:border-primary/40'}`}
    >
      <span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
    </button>
  )
}
