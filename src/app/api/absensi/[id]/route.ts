import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import type { ApiResponse } from '@/types'

// PUT — update absensi (admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const { tanggal, jamMasuk, jamPulang, status, lokasi, keterangan } = body as Record<string, string>

    const existing = await db.absensi.findUnique({ where: { id } })
    if (!existing) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })

    const updated = await db.absensi.update({
      where: { id },
      data: {
        tanggal: tanggal ? new Date(tanggal) : existing.tanggal,
        jamMasuk: jamMasuk ? new Date(jamMasuk) : jamMasuk === '' ? null : existing.jamMasuk,
        jamPulang: jamPulang ? new Date(jamPulang) : jamPulang === '' ? null : existing.jamPulang,
        status: status ?? existing.status,
        lokasi: lokasi ?? existing.lokasi,
        keterangan: keterangan ?? existing.keterangan,
      },
    })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'update', modul: 'absensi', detail: `Update absensi ${existing.nama}`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Absensi diperbarui', data: updated })
  } catch (err) {
    console.error('PUT absensi[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// DELETE — hapus absensi (admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }
    const { id } = await params
    const a = await db.absensi.findUnique({ where: { id } })
    if (!a) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })
    await db.absensi.delete({ where: { id } })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'delete', modul: 'absensi', detail: `Hapus absensi ${a.nama} ${new Date(a.tanggal).toLocaleDateString('id-ID')}`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Absensi dihapus' })
  } catch (err) {
    console.error('DELETE absensi[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
