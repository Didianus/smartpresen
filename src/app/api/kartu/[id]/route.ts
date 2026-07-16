import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import type { ApiResponse } from '@/types'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    const { id } = await params
    const body = await request.json()
    const { uid, jenis, status, masaBerlaku } = body as Record<string, string>

    const existing = await db.kartuKaryawan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })

    if (uid && uid !== existing.uid) {
      const existUid = await db.kartuKaryawan.findUnique({ where: { uid: String(uid) } })
      if (existUid) return NextResponse.json<ApiResponse>({ success: false, message: 'UID sudah dipakai' }, { status: 409 })
    }

    const updated = await db.kartuKaryawan.update({
      where: { id },
      data: {
        uid: uid ?? existing.uid,
        jenis: jenis ?? existing.jenis,
        status: status ?? existing.status,
        masaBerlaku: masaBerlaku ? new Date(masaBerlaku) : existing.masaBerlaku,
      },
    })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'update', modul: 'kartu', detail: `Update kartu ${updated.idKartu}`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Kartu diperbarui', data: updated })
  } catch (err) {
    console.error('PUT kartu[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    const { id } = await params
    const k = await db.kartuKaryawan.findUnique({ where: { id } })
    if (!k) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })
    await db.kartuKaryawan.delete({ where: { id } })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'delete', modul: 'kartu', detail: `Hapus kartu ${k.idKartu}`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Kartu dihapus' })
  } catch (err) {
    console.error('DELETE kartu[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
