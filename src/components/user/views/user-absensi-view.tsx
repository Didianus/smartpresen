'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ScanLine, LogIn, LogOut, Clock, CheckCircle2, XCircle, QrCode, RefreshCw, Camera, Keyboard } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import { formatJam, formatTanggal } from '@/lib/utils'
import { CameraScanner } from '@/components/shared/camera-scanner'
import type { Absensi } from '@/types'

// ===================================================================
// User Absensi View — scan UID kartu untuk absen masuk / pulang
// Mendukung: (1) Scan dengan kamera (QR/Barcode), (2) Input manual
// ===================================================================

export function UserAbsensiView() {
  const [uid, setUid] = useState('')
  const [aksi, setAksi] = useState<'masuk' | 'pulang'>('masuk')
  const [loading, setLoading] = useState(false)
  const [today, setToday] = useState<Absensi | null>(null)
  const [now, setNow] = useState(new Date())
  const [cameraOpen, setCameraOpen] = useState(false)
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const inputRef = useRef<HTMLInputElement>(null)

  // load today's status
  const loadToday = async () => {
    try {
      const r = await api.get<{ items: Absensi[] }>('/api/absensi?limit=1')
      setToday(r.data!.items[0] ?? null)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadToday()
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ----------------------------------------------------------------
  // Proses absensi dengan UID tertentu (dipakai camera & manual)
  // ----------------------------------------------------------------
  const prosesAbsen = useCallback(async (uidValue: string): Promise<void> => {
    if (!uidValue.trim()) {
      throw new Error('UID kosong')
    }
    setLoading(true)
    try {
      const res = await api.post<Absensi>('/api/absensi', { aksi, uid: uidValue.trim() })
      await swal.success('Berhasil!', res.message)
      setUid('')
      await loadToday()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Terjadi kesalahan')
      await swal.error('Gagal', msg)
      // lempar agar CameraScanner tahu ini gagal (menampilkan flash merah)
      throw err
    } finally {
      setLoading(false)
    }
  }, [aksi])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!uid.trim()) {
      swal.warning('UID kosong', 'Silakan masukkan/scan nomor kartu Anda')
      return
    }
    await prosesAbsen(uid)
    inputRef.current?.focus()
  }

  // handler ketika kamera berhasil membaca kode
  const handleCameraDetected = useCallback(async (text: string) => {
    await prosesAbsen(text)
    // tutup dialog kamera setelah sukses
    setCameraOpen(false)
  }, [prosesAbsen])

  // deteksi status untuk disable tombol
  const sudahMasuk = !!(today && today.jamMasuk)
  const sudahPulang = !!(today && today.jamPulang)

  return (
    <div className="space-y-5">
      <PageHeader title="Absensi" description="Pindai kartu karyawan Anda untuk mencatat kehadiran" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scanner card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" /> Scan Kartu</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Clock + status */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex flex-col items-center"
              >
                <p className="text-5xl font-bold tabular-nums gradient-text">
                  {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{formatTanggal(now, true)}</p>
              </motion.div>
            </div>

            {/* Pilih aksi */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setAksi('masuk')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all ${aksi === 'masuk' ? 'border-primary bg-primary/5 shadow-glow' : 'border-border hover:border-primary/40'}`}
              >
                <LogIn className={`h-6 w-6 ${aksi === 'masuk' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold">Absen Masuk</span>
                {sudahMasuk && <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Sudah</span>}
              </button>
              <button
                onClick={() => setAksi('pulang')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all ${aksi === 'pulang' ? 'border-primary bg-primary/5 shadow-glow' : 'border-border hover:border-primary/40'}`}
              >
                <LogOut className={`h-6 w-6 ${aksi === 'pulang' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold">Absen Pulang</span>
                {sudahPulang && <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Sudah</span>}
              </button>
            </div>

            {/* Toggle mode: Kamera / Manual */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 mb-4">
              <button
                onClick={() => setMode('camera')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'camera' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Camera className="h-4 w-4" /> Scan Kamera
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'manual' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Keyboard className="h-4 w-4" /> Input Manual
              </button>
            </div>

            {/* ---- MODE KAMERA ---- */}
            {mode === 'camera' ? (
              <div className="space-y-3">
                <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-violet-50/50 to-sky-50/50 dark:from-violet-950/20 dark:to-sky-950/20 p-6 text-center">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex h-16 w-16 rounded-2xl gradient-primary items-center justify-center text-white shadow-glow mb-3"
                  >
                    <Camera className="h-8 w-8" />
                  </motion.div>
                  <p className="text-sm font-semibold mb-1">Pindai Kartu dengan Kamera</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                    Klik tombol di bawah untuk mengaktifkan kamera, lalu arahkan ke QR code atau barcode pada kartu karyawan Anda. Kehadiran akan tercatat otomatis saat kode terbaca.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    disabled={loading}
                    className="h-12 px-8 gradient-primary text-white border-0 text-base"
                  >
                    {loading ? (
                      <><RefreshCw className="h-5 w-5 animate-spin" /> Memproses…</>
                    ) : (
                      <><ScanLine className="h-5 w-5" /> Aktifkan Kamera & Scan</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* ---- MODE MANUAL ---- */
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label className="mb-1.5 block">Nomor Kartu (UID)</Label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                      placeholder="Tempel kartu atau ketik UID..."
                      className="pl-10 h-12 text-lg font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Petunjuk: gunakan kartu RFID/NFC/QR Anda, atau ketik UID manual. Untuk demo, gunakan UID kartu Anda dari halaman Kartu Saya.
                  </p>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 gradient-primary text-white border-0 text-base">
                  {loading ? 'Memproses...' : (
                    <>
                      {aksi === 'masuk' ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                      {aksi === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'}
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Today status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <LogIn className="h-4 w-4 text-emerald-500" /> Absen Masuk
              </div>
              {sudahMasuk ? (
                <>
                  <p className="text-2xl font-bold tabular-nums">{formatJam(today!.jamMasuk)}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Tercatat</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold tabular-nums text-muted-foreground">--:--</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Belum absen</p>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <LogOut className="h-4 w-4 text-sky-500" /> Absen Pulang
              </div>
              {sudahPulang ? (
                <>
                  <p className="text-2xl font-bold tabular-nums">{formatJam(today!.jamPulang)}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Tercatat</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold tabular-nums text-muted-foreground">--:--</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Belum absen</p>
                </>
              )}
            </div>

            {today && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{today.status}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Lokasi</span><span className="font-medium">{today.lokasi}</span></div>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={loadToday}>
              <RefreshCw className="h-4 w-4" /> Refresh Status
            </Button>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5" /> Jam Kerja</p>
              <p>Masuk: 08:00 (Terlambat setelah 09:00)</p>
              <p>Pulang: 17:00</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog pemindai kamera */}
      <CameraScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={handleCameraDetected}
        hint={`Mode: ${aksi === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'} — arahkan ke QR/barcode kartu`}
      />
    </div>
  )
}
