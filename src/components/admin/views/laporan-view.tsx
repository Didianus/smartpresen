'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileSpreadsheet, FileText, Printer, Filter, CalendarCheck, UserCheck,
  Clock, FileClock, Search, BarChart3,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { swal } from '@/lib/swal'
import {
  formatJam, formatTanggal, formatTanggalPendek,
} from '@/lib/utils'
import type { Absensi } from '@/types'

// ===================================================================
// LaporanView — Laporan absensi dengan filter + export Excel/PDF/Cetak
// ===================================================================

interface LaporanResponse {
  items: Absensi[]
  filters: { dari: string; sampai: string; divisi: string; status: string }
}

const DIVISI_OPTIONS = [
  { value: 'all', label: 'Semua Divisi' },
  { value: 'IT', label: 'IT' },
  { value: 'Human Resource', label: 'Human Resource' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Umum', label: 'Umum' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'hadir', label: 'Hadir' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpha', label: 'Alpha' },
]

// Default rentang: awal bulan ini s/d hari ini
function defaultDari(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
function defaultSampai(): string {
  return new Date().toISOString().slice(0, 10)
}

export function LaporanView() {
  // State filter (input form)
  const [dari, setDari] = useState(defaultDari())
  const [sampai, setSampai] = useState(defaultSampai())
  const [divisi, setDivisi] = useState('all')
  const [status, setStatus] = useState('all')

  // State data hasil fetch
  const [items, setItems] = useState<Absensi[] | null>(null)
  const [loading, setLoading] = useState(false)
  // Salinan filter yang sedang aktif (digunakan untuk export)
  const [activeFilters, setActiveFilters] = useState<{ dari: string; sampai: string }>({
    dari: defaultDari(),
    sampai: defaultSampai(),
  })

  // Statistik ringkasan
  const stats = useMemo(() => {
    if (!items) return { total: 0, hadir: 0, terlambat: 0, lainnya: 0 }
    const total = items.length
    const hadir = items.filter((a) => a.status === 'hadir').length
    const terlambat = items.filter((a) => a.status === 'terlambat').length
    const lainnya = items.filter((a) =>
      ['izin', 'sakit', 'alpha'].includes(a.status),
    ).length
    return { total, hadir, terlambat, lainnya }
  }, [items])

  async function handleTampilkan() {
    // Validasi tanggal
    if (dari && sampai && new Date(dari) > new Date(sampai)) {
      swal.warning('Rentang Tidak Valid', 'Tanggal "dari" tidak boleh setelah "sampai".')
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ dari, sampai, divisi, status })
      const res = await api.get<LaporanResponse>(`/api/laporan?${params.toString()}`)
      setItems(res.data!.items)
      setActiveFilters({ dari, sampai })
      if (res.data!.items.length === 0) {
        swal.info('Data Kosong', 'Tidak ada data absensi untuk filter ini.')
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat laporan'
      swal.error('Gagal Memuat', msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------
  // Export Excel (.xlsx)
  // -----------------------------------------------------------------
  function handleExportExcel() {
    if (!items || items.length === 0) {
      swal.warning('Tidak Ada Data', 'Tampilkan laporan terlebih dahulu sebelum export.')
      return
    }
    try {
      const rows = items.map((a) => ({
        Tanggal: formatTanggalPendek(a.tanggal),
        NIK: a.nik,
        Nama: a.nama,
        'Jam Masuk': formatJam(a.jamMasuk),
        'Jam Pulang': formatJam(a.jamPulang),
        Status: a.status,
        Lokasi: a.lokasi,
        Keterangan: a.keterangan,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      // Lebar kolom
      ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 20 }, { wch: 30 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Absensi')
      XLSX.writeFile(wb, 'laporan-absensi.xlsx')
      swal.success('Berhasil', 'File Excel berhasil diunduh.')
    } catch (err) {
      swal.error('Gagal Export', 'Terjadi kesalahan saat membuat file Excel.')
    }
  }

  // -----------------------------------------------------------------
  // Export PDF (jsPDF + autoTable)
  // -----------------------------------------------------------------
  function handleExportPDF() {
    if (!items || items.length === 0) {
      swal.warning('Tidak Ada Data', 'Tampilkan laporan terlebih dahulu sebelum export.')
      return
    }
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('LAPORAN ABSENSI KARYAWAN', 14, 15)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const periodeLabel = `Periode: ${formatTanggalPendek(activeFilters.dari)} s/d ${formatTanggalPendek(activeFilters.sampai)}`
      doc.text(periodeLabel, 14, 22)
      doc.text(
        `Divisi: ${divisi === 'all' ? 'Semua' : divisi}  |  Status: ${status === 'all' ? 'Semua' : status}  |  Total: ${items.length} record`,
        14,
        27,
      )
      autoTable(doc, {
        startY: 31,
        head: [['Tanggal', 'NIK', 'Nama', 'Jam Masuk', 'Jam Pulang', 'Status', 'Lokasi', 'Keterangan']],
        body: items.map((a) => [
          formatTanggalPendek(a.tanggal),
          a.nik,
          a.nama,
          formatJam(a.jamMasuk),
          formatJam(a.jamPulang),
          a.status,
          a.lokasi,
          a.keterangan,
        ]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          2: { cellWidth: 50 },
          7: { cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      })
      // Footer
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 31
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `Dicetak: ${formatTanggal(new Date(), true)}`,
        14,
        Math.min(finalY + 6, 200),
      )
      doc.save('laporan-absensi.pdf')
      swal.success('Berhasil', 'File PDF berhasil diunduh.')
    } catch (err) {
      swal.error('Gagal Export', 'Terjadi kesalahan saat membuat file PDF.')
    }
  }

  // -----------------------------------------------------------------
  // Cetak (window.print)
  // -----------------------------------------------------------------
  function handleCetak() {
    if (!items || items.length === 0) {
      swal.warning('Tidak Ada Data', 'Tampilkan laporan terlebih dahulu sebelum mencetak.')
      return
    }
    window.print()
  }

  const hasData = !!items && items.length > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Absensi"
        description="Filter, pratinjau, dan ekspor data kehadiran karyawan"
      >
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={!hasData}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Export Excel
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={!hasData}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-rose-600" />
          Export PDF
        </Button>
        <Button
          onClick={handleCetak}
          disabled={!hasData}
          className="gap-2 gradient-primary text-white border-0"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </Button>
      </PageHeader>

      {/* Bar Filter */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Divisi</Label>
              <Select value={divisi} onValueChange={setDivisi}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Pilih divisi" />
                </SelectTrigger>
                <SelectContent>
                  {DIVISI_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleTampilkan} disabled={loading} className="h-10 gap-2 gradient-primary text-white border-0">
              <Filter className="h-4 w-4" />
              {loading ? 'Memuat...' : 'Tampilkan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kartu statistik ringkasan */}
      {items !== null && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatMini
            icon={BarChart3}
            label="Total Record"
            value={stats.total}
            color="violet"
            delay={0}
          />
          <StatMini
            icon={UserCheck}
            label="Hadir"
            value={stats.hadir}
            color="emerald"
            delay={0.05}
          />
          <StatMini
            icon={Clock}
            label="Terlambat"
            value={stats.terlambat}
            color="amber"
            delay={0.1}
          />
          <StatMini
            icon={FileClock}
            label="Izin/Sakit/Alpha"
            value={stats.lainnya}
            color="sky"
            delay={0.15}
          />
        </div>
      )}

      {/* Tabel pratinjau */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Pratinjau Data
            </h3>
            {items && items.length > 10 && (
              <span className="text-xs text-muted-foreground">
                Menampilkan 10 dari {items.length} baris · Export untuk melihat semua
              </span>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="p-4 space-y-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : items === null ? (
            <EmptyState
              icon={Search}
              title="Belum ada data"
              description="Pilih rentang tanggal lalu klik Tampilkan untuk memuat laporan absensi."
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Tidak ada data"
              description="Tidak ada record absensi untuk kombinasi filter yang dipilih."
            />
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Pulang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 10).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatTanggalPendek(a.tanggal)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.nik}</TableCell>
                      <TableCell className="font-medium text-sm">{a.nama}</TableCell>
                      <TableCell className="tabular-nums text-xs">{formatJam(a.jamMasuk)}</TableCell>
                      <TableCell className="tabular-nums text-xs">{formatJam(a.jamPulang)}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={a.lokasi}>
                        {a.lokasi || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={a.keterangan}>
                        {a.keterangan || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer info */}
      {items !== null && (
        <p className="text-xs text-muted-foreground text-center">
          {hasData
            ? `Data dimuat: ${formatTanggalPendek(activeFilters.dari)} s/d ${formatTanggalPendek(activeFilters.sampai)} · ${items.length} record`
            : '—'}
        </p>
      )}
    </div>
  )
}

// ===================================================================
// StatMini — kartu statistik kecil untuk ringkasan laporan
// ===================================================================
interface StatMiniProps {
  icon: React.ElementType
  label: string
  value: number
  color: 'violet' | 'emerald' | 'amber' | 'sky'
  delay?: number
}

const STAT_COLOR: Record<StatMiniProps['color'], { bg: string; text: string; ring: string }> = {
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/20' },
}

function StatMini({ icon: Icon, label, value, color, delay = 0 }: StatMiniProps) {
  const c = STAT_COLOR[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="rounded-2xl shadow-card overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl ${c.bg} ${c.text} flex items-center justify-center ring-4 ${c.ring} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
