import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { ApiResponse } from '@/types'

// GET /api/laporan — data laporan absensi untuk export PDF/Excel
// Query: dari, sampai, divisi, status, format
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const dari = searchParams.get('dari') ?? ''
    const sampai = searchParams.get('sampai') ?? ''
    const divisi = searchParams.get('divisi') ?? ''
    const status = searchParams.get('status') ?? ''

    const where: Record<string, unknown> = {}
    if (dari && sampai) {
      where.tanggal = { gte: new Date(dari), lte: new Date(sampai + 'T23:59:59') }
    }
    if (status) where.status = status
    if (divisi) {
      const karyawans = await db.karyawan.findMany({ where: { divisi }, select: { nik: true } })
      where.nik = { in: karyawans.map((k) => k.nik) }
    }

    const items = await db.absensi.findMany({
      where,
      orderBy: { tanggal: 'desc' },
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: { items, filters: { dari, sampai, divisi, status } } })
  } catch (err) {
    console.error('GET laporan error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
