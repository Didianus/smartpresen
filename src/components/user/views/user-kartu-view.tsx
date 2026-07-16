'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IdCard, Download, Printer, QrCode } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { EmployeeCardDialog, CardFace } from '@/components/card/employee-card'
import { formatTanggal, formatTanggalPendek } from '@/lib/utils'
import type { KaryawanWithRelations, KartuKaryawan } from '@/types'

interface Data {
  karyawan: KaryawanWithRelations
  kartu: KartuKaryawan | null
}

export function UserKartuView() {
  const [data, setData] = useState<Data | null>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.get<Data>('/api/dashboard').then((r) => {
      setData(r.data!)
      const payload = r.data!.kartu?.uid ?? r.data!.karyawan.nik
      import('qrcode').then((QR) => QR.toDataURL(payload, { width: 240, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } }).then(setQrUrl))
    })
  }, [])

  if (!data) return <div className="h-64 rounded-2xl bg-muted animate-pulse" />

  const { karyawan, kartu } = data

  return (
    <div className="space-y-5">
      <PageHeader title="Kartu Karyawan Saya" description="Preview & unduh kartu ID Anda" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><IdCard className="h-4 w-4 text-primary" /> Preview Kartu</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <motion.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{ perspective: 1000 }}
            >
              <div className="id-card-cr80 shadow-2xl print-area">
                <CardFace karyawan={karyawan} kartu={kartu} qrUrl={qrUrl} />
              </div>
            </motion.div>
            <p className="text-xs text-muted-foreground mt-3">Ukuran standar ID Card CR80 (85,60 × 53,98 mm)</p>
            <div className="flex gap-3 mt-4 w-full">
              <Button className="flex-1 gradient-primary text-white border-0" onClick={() => setOpen(true)}>
                <Download className="h-4 w-4" /> Unduh PDF
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Cetak
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> Detail Kartu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="ID Kartu" value={kartu?.idKartu ?? '-'} mono />
            <InfoRow label="UID" value={kartu?.uid ?? '-'} mono />
            <InfoRow label="Jenis" value={kartu?.jenis?.toUpperCase() ?? '-'} />
            <InfoRow label="Status" value={kartu?.status ?? '-'} />
            <InfoRow label="Tanggal Dibuat" value={kartu ? formatTanggal(kartu.tanggalBuat) : '-'} />
            <InfoRow label="Masa Berlaku" value={kartu?.masaBerlaku ? formatTanggal(kartu.masaBerlaku) : 'Tanpa batas'} />

            <div className="pt-3 mt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pemegang Kartu</p>
              <InfoRow label="Nama" value={karyawan.nama} />
              <InfoRow label="NIK" value={karyawan.nik} mono />
              <InfoRow label="Jabatan" value={karyawan.jabatan} />
              <InfoRow label="Divisi" value={karyawan.divisi} />
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 mt-3">
              <p className="font-semibold mb-0.5">Tips Keamanan</p>
              <p>Jaga kartu Anda agar tidak hilang. Laporkan segera ke admin jika kartu hilang untuk dinonaktifkan.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmployeeCardDialog karyawan={karyawan} kartu={kartu} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
