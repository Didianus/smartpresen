import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format tanggal ke format Indonesia */
export function formatTanggal(date: Date | string, withTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }
  return new Intl.DateTimeFormat('id-ID', opts).format(d)
}

/** Format tanggal pendek dd/mm/yyyy */
export function formatTanggalPendek(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** Format jam HH:MM */
export function formatJam(date: Date | string | null | undefined): string {
  if (!date) return '--:--'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Format angka dengan pemisah ribuan */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

/** Cek apakah tanggal sama (ignore time) */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Hari dalam bahasa Indonesia */
export function namaHari(date: Date): string {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return hari[date.getDay()]
}

/** Generate ID Kartu unik berformat EMP-YYYY-NNNN */
export async function generateIdKartu(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `EMP-${year}-`
  // cari kartu dengan prefix tahun ini untuk menentukan nomor urut
  const { db } = await import('./db')
  const existing = await db.kartuKaryawan.findMany({
    where: { idKartu: { startsWith: prefix } },
    select: { idKartu: true },
  })
  const numbers = existing
    .map((k) => parseInt(k.idKartu.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

/** Generate NIK unik berformat YYYYMM-NNN */
export async function generateNIK(): Promise<string> {
  const now = new Date()
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`
  const { db } = await import('./db')
  const existing = await db.karyawan.findMany({
    where: { nik: { startsWith: prefix } },
    select: { nik: true },
  })
  const numbers = existing
    .map((k) => parseInt(k.nik.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

/** Label & warna badge untuk status kehadiran */
export function statusKehadiranMeta(status: string) {
  switch (status) {
    case 'hadir':
      return { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' }
    case 'terlambat':
      return { label: 'Terlambat', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
    case 'izin':
      return { label: 'Izin', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' }
    case 'sakit':
      return { label: 'Sakit', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' }
    case 'alpha':
      return { label: 'Alpha', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' }
    default:
      return { label: status, color: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400' }
  }
}

/** Inisial dari nama untuk avatar */
export function getInisial(nama: string): string {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}
