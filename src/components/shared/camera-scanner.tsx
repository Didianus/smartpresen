'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { Camera, CameraOff, X, ScanLine, RefreshCw, AlertTriangle, SwitchCamera, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { swal } from '@/lib/swal'

// ===================================================================
// CameraScanner — pemindai QR/Barcode langsung dari kamera
// Menggunakan @zxing/browser (BrowserMultiFormatReader)
//
// Penting: memakai decodeFromConstraints({ video: { facingMode } }) agar
// browser memunculkan prompt izin kamera (getUserMedia). Pendekatan
// listVideoInputDevices() → decodeFromVideoDevice(deviceId) GAGAL karena
// enumerateDevices() mengembalikan array kosong sebelum izin diberikan.
// ===================================================================

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dipanggil ketika kode terdeteksi. Lempar error untuk menandai gagal. */
  onDetected: (text: string) => void | Promise<void>
  /** Label deskriptif untuk apa yang dipindai (mis. "kartu karyawan") */
  hint?: string
}

type Status = 'idle' | 'starting' | 'scanning' | 'error' | 'denied' | 'insecure'

export function CameraScanner({ open, onOpenChange, onDetected, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [useFrontCamera, setUseFrontCamera] = useState(false)
  const [lastScan, setLastScan] = useState<string>('')
  const [flash, setFlash] = useState<'success' | 'fail' | null>(null)
  const processingRef = useRef(false)

  // ----------------------------------------------------------------
  // Cek apakah konteks aman (HTTPS / localhost) — getUserMedia butuh ini
  // ----------------------------------------------------------------
  const isSecureContext = useCallback(() => {
    if (typeof window === 'undefined') return true
    return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  }, [])

  // ----------------------------------------------------------------
  // Start kamera + scanning (constraints-based — memicu prompt izin)
  // ----------------------------------------------------------------
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return

    // cek konteks aman
    if (!isSecureContext() || !navigator.mediaDevices?.getUserMedia) {
      setStatus('insecure')
      setErrorMsg('Kamera membutuhkan koneksi aman (HTTPS). Buka aplikasi via Preview Panel.')
      return
    }

    setStatus('starting')
    setErrorMsg('')

    // hentikan sesi sebelumnya bila ada
    try {
      controlsRef.current?.stop()
    } catch { /* ignore */ }
    controlsRef.current = null

    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader()
      }

      // Constraints: prefer kamera belakang (environment). facingMode ideal
      // agar browser tetap fallback ke kamera apapun yang tersedia.
      const constraints: MediaStreamConstraints = {
        video: useFrontCamera
          ? { facingMode: { ideal: 'user' } }
          : { facingMode: { ideal: 'environment' } },
        audio: false,
      }

      const controls = await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, _err, ctrl) => {
          if (result && !processingRef.current) {
            const text = result.getText().trim()
            if (!text) return
            processingRef.current = true
            setLastScan(text)
            void Promise.resolve(onDetected(text))
              .then(() => {
                setFlash('success')
                setTimeout(() => setFlash(null), 1200)
                ctrl.stop()
                controlsRef.current = null
              })
              .catch(() => {
                setFlash('fail')
                setTimeout(() => {
                  setFlash(null)
                  processingRef.current = false
                }, 1500)
              })
          }
        },
      )
      controlsRef.current = controls
      setStatus('scanning')

      // setelah izin diberikan & stream aktif, enumerate devices untuk switch
      try {
        const all = await BrowserMultiFormatReader.listVideoInputDevices()
        setDevices(all)
      } catch { /* non-critical */ }
    } catch (err) {
      console.error('Camera start error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      const name = err instanceof Error ? err.name : ''
      if (/permission|denied|notallowed/i.test(name) || /permission|denied|notallowed/i.test(msg)) {
        setStatus('denied')
        setErrorMsg('Akses kamera ditolak. Klik ikon kamera di address bar browser Anda, izinkan akses kamera, lalu muat ulang halaman.')
      } else if (/notfound|no camera|noinput|devicesnotfound/i.test(name) || /notfound|no camera|noinput/i.test(msg)) {
        setStatus('error')
        setErrorMsg('Tidak ada kamera yang ditemukan pada perangkat ini. Pastikan kamera terhubung dan tidak sedang dipakai aplikasi lain.')
      } else if (/notreadable|trackstart/i.test(name)) {
        setStatus('error')
        setErrorMsg('Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.')
      } else {
        setStatus('error')
        setErrorMsg('Gagal memulai kamera: ' + (msg || 'kesalahan tidak diketahui'))
      }
    }
  }, [onDetected, useFrontCamera, isSecureContext])

  // ----------------------------------------------------------------
  // Switch kamera (depan <-> belakang) via toggle facingMode
  // ----------------------------------------------------------------
  const switchCamera = useCallback(() => {
    if (devices.length < 2) {
      swal.info('Hanya satu kamera', 'Perangkat ini hanya memiliki satu kamera.')
      return
    }
    setUseFrontCamera((v) => !v)
    processingRef.current = false
    // startCamera akan dipicu ulang via useEffect [useFrontCamera]
  }, [devices.length])

  // ----------------------------------------------------------------
  // Cleanup saat dialog tutup
  // ----------------------------------------------------------------
  const stopAndClose = useCallback(() => {
    try {
      controlsRef.current?.stop()
    } catch { /* ignore */ }
    controlsRef.current = null
    processingRef.current = false
    setStatus('idle')
    setFlash(null)
    setLastScan('')
    onOpenChange(false)
  }, [onOpenChange])

  // mulai kamera saat dialog dibuka ATAU saat ganti kamera
  // NOTE: elemen <video> dimuat di portal Radix Dialog secara async, jadi
  // kita tunggu videoRef.current tersedia sebelum startCamera.
  useEffect(() => {
    if (!open) {
      try {
        controlsRef.current?.stop()
      } catch { /* ignore */ }
      controlsRef.current = null
      return
    }
    processingRef.current = false
    let cancelled = false
    const tryStart = (attempts: number) => {
      if (cancelled) return
      if (videoRef.current) {
        void startCamera()
      } else if (attempts < 30) {
        setTimeout(() => tryStart(attempts + 1), 50)
      }
    }
    const t = setTimeout(() => tryStart(0), 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, useFrontCamera])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        controlsRef.current?.stop()
      } catch { /* ignore */ }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopAndClose(); else onOpenChange(o) }}>
      <DialogContent className="max-w-lg w-[95vw] p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Pindai Kartu dengan Kamera</DialogTitle>
        <DialogDescription className="sr-only">
          Aktifkan kamera dan arahkan ke QR code atau barcode pada kartu karyawan untuk mencatat kehadiran.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-gradient-to-r from-violet-50 to-sky-50 dark:from-slate-900 dark:to-violet-950">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white shadow-glow shrink-0">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight truncate">Scan Kartu Karyawan</h3>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">
                {hint ?? 'Arahkan kamera ke QR code / barcode pada kartu'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={stopAndClose}
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body — video preview (rasio 4:3, tinggi responsif) */}
        <div className="relative bg-black w-full" style={{ aspectRatio: '4 / 3' }}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* Overlay frame scanner */}
          {status === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[300px] aspect-[3/2] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] overflow-hidden bg-transparent">
                <span className="absolute -top-px -left-px w-6 h-6 sm:w-7 sm:h-7 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <span className="absolute -top-px -right-px w-6 h-6 sm:w-7 sm:h-7 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <span className="absolute -bottom-px -left-px w-6 h-6 sm:w-7 sm:h-7 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <span className="absolute -bottom-px -right-px w-6 h-6 sm:w-7 sm:h-7 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_2px_rgba(124,58,237,0.7)]"
                  initial={{ top: '10%' }}
                  animate={{ top: ['10%', '85%', '10%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/90 text-xs font-medium bg-black/50 backdrop-blur px-3 py-1.5 rounded-full whitespace-nowrap">
                Arahkan kode ke dalam kotak
              </p>
            </div>
          )}

          {/* Flash success/fail overlay */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 flex items-center justify-center ${
                  flash === 'success' ? 'bg-emerald-500/40' : 'bg-rose-500/40'
                }`}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex flex-col items-center gap-2 text-white"
                >
                  {flash === 'success' ? (
                    <>
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </div>
                      <p className="text-base sm:text-lg font-bold">Berhasil!</p>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <X className="h-10 w-10 sm:h-12 sm:w-12" />
                      </div>
                      <p className="text-base sm:text-lg font-bold">Tidak cocok</p>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Starting spinner */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white px-4 text-center">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <p className="text-sm">Memulai kamera…</p>
              <p className="text-xs text-white/60">Browser akan meminta izin akses kamera</p>
            </div>
          )}

          {/* Error / denied / insecure state */}
          {(status === 'error' || status === 'denied' || status === 'insecure') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-5 sm:p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-rose-500/20 flex items-center justify-center">
                {status === 'denied' ? <CameraOff className="h-7 w-7" /> : status === 'insecure' ? <Lock className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
              </div>
              <p className="text-sm font-semibold">
                {status === 'denied' ? 'Akses Kamera Ditolak' : status === 'insecure' ? 'Koneksi Tidak Aman' : 'Kamera Tidak Tersedia'}
              </p>
              <p className="text-xs text-white/80 max-w-xs leading-relaxed">{errorMsg}</p>
              <Button variant="secondary" size="sm" className="mt-1" onClick={startCamera}>
                <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
              </Button>
            </div>
          )}

          {/* Idle / no stream fallback */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70">
              <Camera className="h-10 w-10" />
            </div>
          )}
        </div>

        {/* Footer — controls */}
        <div className="px-3 sm:px-4 py-3 border-t border-border/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground min-w-0 flex-1">
            {lastScan ? (
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-semibold shrink-0">Terbaca:</span>
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate">{lastScan}</code>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 shrink-0" /> Menunggu kartu…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                disabled={status !== 'scanning' && status !== 'error'}
                title="Ganti kamera"
              >
                <SwitchCamera className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Ganti</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={stopAndClose}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
