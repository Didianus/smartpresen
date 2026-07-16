'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
import jsPDF from 'jspdf'
import type { KaryawanWithRelations, KartuKaryawan } from '@/types'
import { formatTanggalPendek, getInisial } from '@/lib/utils'

// ===================================================================
// Employee Card — ukuran CR80 (85.60 x 53.98 mm)
// Preview + Export PDF (dengan foto profil) + Cetak (print-friendly)
// ===================================================================

interface Props {
  karyawan: KaryawanWithRelations
  kartu: KartuKaryawan | null
  open: boolean
  onOpenChange: (b: boolean) => void
}

const NAMA_PERUSAHAAN = 'PT. MAJU BERSAMA'
const ALAMAT_PERUSAHAAN = 'Jl. Sudirman No. 1, Jakarta'

export function EmployeeCardDialog({ karyawan, kartu, open, onOpenChange }: Props) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [fotoDataUrl, setFotoDataUrl] = useState<string>('')
  const cardRef = useRef<HTMLDivElement>(null)

  // generate QR code
  useEffect(() => {
    if (!open) return
    const payload = kartu?.uid ?? karyawan.nik
    QRCode.toDataURL(payload, { width: 240, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''))
  }, [open, kartu, karyawan])

  // persiapan foto untuk PDF: jika foto ada (data URL), pastikan formatnya
  // didukung jsPDF (PNG/JPEG). Karena disimpan sebagai data URL dari FileReader,
  // sudah berupa PNG/JPEG.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const prepare = () => {
      if (cancelled) return
      if (karyawan.foto && karyawan.foto.startsWith('data:image/')) {
        setFotoDataUrl(karyawan.foto)
      } else if (karyawan.foto) {
        // URL eksternal — perlu di-load ke canvas untuk dapat data URL
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (cancelled) return
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth || 240
            canvas.height = img.naturalHeight || 300
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              setFotoDataUrl(canvas.toDataURL('image/jpeg', 0.92))
            }
          } catch {
            setFotoDataUrl('')
          }
        }
        img.onerror = () => { if (!cancelled) setFotoDataUrl('') }
        img.src = karyawan.foto
      } else {
        setFotoDataUrl('')
      }
    }
    // defer ke macrotask agar setState tidak sync di body effect
    const t = setTimeout(prepare, 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, karyawan.foto])

  // ----------------------------------------------------------------
  // Export PDF — menyertakan FOTO PROFIL
  // ----------------------------------------------------------------
  function handleDownloadPDF() {
    const doc = new jsPDF({ unit: 'mm', format: [85.6, 53.98], orientation: 'landscape' })
    // background putih
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 85.6, 53.98, 'F')

    // header band (gradient simulasi: ungu-biru)
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 85.6, 14, 'F')
    // accent strip bawah header
    doc.setFillColor(139, 92, 246)
    doc.rect(0, 14, 85.6, 0.8, 'F')

    // logo placeholder circle
    doc.setFillColor(255, 255, 255)
    doc.circle(8, 7, 4, 'F')
    doc.setTextColor(79, 70, 229)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('MB', 8, 8, { align: 'center' })

    // company name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.text(NAMA_PERUSAHAAN, 15, 6.5)
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'normal')
    doc.text(ALAMAT_PERUSAHAAN, 15, 10.5)

    // ---- FOTO PROFIL ----
    // kotak foto 14x16 mm di kiri body
    const fotoX = 5, fotoY = 18, fotoW = 14, fotoH = 16
    if (fotoDataUrl) {
      try {
        // border foto
        doc.setFillColor(221, 214, 254)
        doc.roundedRect(fotoX - 0.6, fotoY - 0.6, fotoW + 1.2, fotoH + 1.2, 1, 1, 'F')
        // gambar foto (format terdeteksi otomatis dari data URL)
        const fmt = fotoDataUrl.includes('image/png') ? 'PNG' : 'JPEG'
        doc.addImage(fotoDataUrl, fmt, fotoX, fotoY, fotoW, fotoH, undefined, 'FAST')
      } catch (e) {
        // fallback: kotak abu dengan inisial
        doc.setFillColor(237, 233, 254)
        doc.roundedRect(fotoX, fotoY, fotoW, fotoH, 1, 1, 'F')
        doc.setTextColor(124, 58, 237)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(getInisial(karyawan.nama), fotoX + fotoW / 2, fotoY + fotoH / 2 + 1.5, { align: 'center' })
      }
    } else {
      // tidak ada foto → kotak gradient simulasi dengan inisial
      doc.setFillColor(237, 233, 254)
      doc.roundedRect(fotoX, fotoY, fotoW, fotoH, 1, 1, 'F')
      doc.setTextColor(124, 58, 237)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(getInisial(karyawan.nama), fotoX + fotoW / 2, fotoY + fotoH / 2 + 1.5, { align: 'center' })
    }

    // ---- INFO TEKS ----
    const textX = fotoX + fotoW + 3 // 22
    doc.setTextColor(30, 27, 75)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text(karyawan.nama.length > 24 ? karyawan.nama.slice(0, 23) + '…' : karyawan.nama, textX, 21)

    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 120)
    doc.text(`NIK: ${karyawan.nik}`, textX, 25.5)
    doc.text(`Jabatan: ${karyawan.jabatan}`, textX, 29.5)
    doc.text(`Divisi: ${karyawan.divisi}`, textX, 33.5)
    doc.text(`No. Kartu: ${kartu?.idKartu ?? '-'}`, textX, 37.5)
    doc.text(`Berlaku s/d: ${kartu?.masaBerlaku ? formatTanggalPendek(kartu.masaBerlaku) : '∞'}`, textX, 41.5)

    // ---- QR CODE ----
    if (qrUrl) {
      doc.addImage(qrUrl, 'PNG', 66, 17, 16, 16)
      doc.setFontSize(4.5)
      doc.setTextColor(100, 100, 120)
      doc.text('Scan untuk', 74, 34.5, { align: 'center' })
      doc.text('verifikasi', 74, 36.5, { align: 'center' })
    }

    // footer band
    doc.setFillColor(139, 92, 246)
    doc.rect(0, 50, 85.6, 3.98, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.text(`UID: ${kartu?.uid ?? karyawan.nik}`, 5, 52.2)

    doc.save(`kartu-${karyawan.nik}.pdf`)
  }

  // ----------------------------------------------------------------
  // Cetak — gunakan window.print() dengan print-area CSS
  // ----------------------------------------------------------------
  function handlePrint() {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Kartu Karyawan {karyawan.nama}</DialogTitle>
        <DialogDescription className="sr-only">
          Preview kartu karyawan ukuran CR80 dengan foto profil. Unduh sebagai PDF atau cetak langsung.
        </DialogDescription>
        <div className="p-5 sm:p-6 bg-gradient-to-br from-sky-50 to-violet-100 dark:from-slate-900 dark:to-violet-950">
          <h3 className="text-center text-sm font-semibold mb-4">Preview Kartu Karyawan</h3>
          {/* Kartu — area cetak */}
          <div ref={cardRef} className="print-area mx-auto">
            <div className="id-card-cr80 mx-auto shadow-2xl relative">
              <CardFace karyawan={karyawan} kartu={kartu} qrUrl={qrUrl} />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Ukuran standar ID Card CR80 (85,60 × 53,98 mm)
          </p>
          {/* Tombol */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5 no-print">
            <Button onClick={handleDownloadPDF} className="flex-1 gradient-primary text-white border-0">
              <Download className="h-4 w-4" /> Unduh PDF
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1 no-print">
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ===================================================================
// Tampilan depan kartu (React, untuk preview di layar & cetak)
// ===================================================================
export function CardFace({ karyawan, kartu, qrUrl }: { karyawan: KaryawanWithRelations; kartu: KartuKaryawan | null; qrUrl: string }) {
  return (
    <div className="w-full h-full flex flex-col bg-white relative overflow-hidden">
      {/* Header */}
      <div className="gradient-primary text-white px-3 py-1.5 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center text-[8px] font-bold text-violet-700 shrink-0">
          MB
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold leading-tight truncate">{NAMA_PERUSAHAAN}</p>
          <p className="text-[6px] leading-tight opacity-90 truncate">{ALAMAT_PERUSAHAAN}</p>
        </div>
        <span className="ml-auto text-[6px] bg-white/20 px-1.5 py-0.5 rounded-full shrink-0">KARTU KARYAWAN</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex p-2.5 gap-2.5">
        {/* Foto — tetap ada saat cetak */}
        <div className="shrink-0">
          {karyawan.foto ? (
            <img
              src={karyawan.foto}
              alt={`Foto ${karyawan.nama}`}
              className="w-12 h-14 object-cover rounded-md border-2 border-violet-200"
            />
          ) : (
            <div className="w-12 h-14 rounded-md border-2 border-violet-200 bg-gradient-to-br from-violet-100 to-sky-100 flex items-center justify-center text-violet-400 font-bold text-sm">
              {getInisial(karyawan.nama)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">{karyawan.nama}</p>
          <div className="text-[6.5px] text-slate-500 space-y-0.5 mt-1">
            <p><span className="text-slate-400">NIK:</span> {karyawan.nik}</p>
            <p><span className="text-slate-400">Jabatan:</span> {karyawan.jabatan}</p>
            <p><span className="text-slate-400">Divisi:</span> {karyawan.divisi}</p>
            <p><span className="text-slate-400">No. Kartu:</span> <span className="font-mono font-semibold text-violet-700">{kartu?.idKartu ?? '-'}</span></p>
          </div>
        </div>

        {/* QR */}
        <div className="shrink-0 flex flex-col items-center justify-center">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code verifikasi" className="w-12 h-12 rounded" />
          ) : (
            <div className="w-12 h-12 rounded bg-slate-100 animate-pulse" />
          )}
          <p className="text-[5px] text-slate-400 mt-0.5 text-center">Scan verifikasi</p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-violet-600 text-white px-3 py-0.5 flex items-center justify-between text-[6px]">
        <span>Berlaku s/d: {kartu?.masaBerlaku ? formatTanggalPendek(kartu.masaBerlaku) : '∞'}</span>
        <span className="font-mono opacity-90">{kartu?.uid ?? karyawan.nik}</span>
      </div>
    </div>
  )
}
