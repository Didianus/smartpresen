import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { ApiResponse, DashboardStats } from '@/types'

// GET /api/dashboard — statistik untuk dashboard admin & user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

    // rentang hari ini
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayStart.getDate() + 1)

    if (user.role === 'admin') {
      const [totalKaryawan, totalUser, absensiHariIni] = await Promise.all([
        db.karyawan.count(),
        db.user.count(),
        db.absensi.findMany({ where: { tanggal: { gte: todayStart, lt: todayEnd } } }),
      ])

      const count = (s: string) => absensiHariIni.filter((a) => a.status === s).length
      const stats: DashboardStats = {
        totalKaryawan,
        totalAbsensiHariIni: absensiHariIni.length,
        hadirHariIni: count('hadir'),
        terlambatHariIni: count('terlambat'),
        izinHariIni: count('izin'),
        sakitHariIni: count('sakit'),
        alphaHariIni: count('alpha'),
        totalUser,
      }

      // data grafik 7 hari terakhir
      const chartData: { tanggal: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart)
        d.setDate(todayStart.getDate() - i)
        const next = new Date(d)
        next.setDate(d.getDate() + 1)
        const recs = await db.absensi.findMany({ where: { tanggal: { gte: d, lt: next } } })
        chartData.push({
          tanggal: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d),
          hadir: recs.filter((r) => r.status === 'hadir').length,
          terlambat: recs.filter((r) => r.status === 'terlambat').length,
          izin: recs.filter((r) => r.status === 'izin').length,
          sakit: recs.filter((r) => r.status === 'sakit').length,
          alpha: recs.filter((r) => r.status === 'alpha').length,
        })
      }

      // distribusi divisi
      const divisiRaw = await db.karyawan.groupBy({ by: ['divisi'], _count: true })
      const divisiData = divisiRaw.map((d) => ({ name: d.divisi, value: d._count }))

      return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: { stats, chartData, divisiData } })
    }

    // --- User: statistik pribadi ---
    const karyawan = await db.karyawan.findUnique({ where: { userId: user.id } })
    if (!karyawan) return NextResponse.json<ApiResponse>({ success: false, message: 'Profil karyawan tidak ditemukan' }, { status: 404 })

    const myAbsensi = await db.absensi.findMany({ where: { karyawanId: karyawan.id }, orderBy: { tanggal: 'desc' } })
    const myToday = myAbsensi.find((a) => {
      const t = new Date(a.tanggal)
      return t >= todayStart && t < todayEnd
    })

    // statistik bulan ini
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const bulanIni = myAbsensi.filter((a) => {
      const t = new Date(a.tanggal)
      return t >= monthStart && t < monthEnd
    })
    const personalStats = {
      totalBulanIni: bulanIni.length,
      hadir: bulanIni.filter((a) => a.status === 'hadir').length,
      terlambat: bulanIni.filter((a) => a.status === 'terlambat').length,
      izin: bulanIni.filter((a) => a.status === 'izin').length,
      sakit: bulanIni.filter((a) => a.status === 'sakit').length,
      alpha: bulanIni.filter((a) => a.status === 'alpha').length,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'OK',
      data: { karyawan, kartu: karyawan ? await db.kartuKaryawan.findUnique({ where: { karyawanId: karyawan.id } }) : null, myToday, personalStats, recent: myAbsensi.slice(0, 5) },
    })
  } catch (err) {
    console.error('GET dashboard error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
