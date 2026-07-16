import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import { generateIdKartu } from '@/lib/utils'
import type { ApiResponse } from '@/types'

// ===================================================================
// GET /api/karyawan/[id] — detail karyawan
// ===================================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const k = await db.karyawan.findUnique({
      where: { id },
      include: { kartu: true, user: { select: { role: true, status: true, email: true, namaLengkap: true } } },
    })
    if (!k) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })
    return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: k })
  } catch (err) {
    console.error('GET karyawan[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ===================================================================
// PUT /api/karyawan/[id] — update karyawan (+ optional kartu)
// ===================================================================
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
    const { nama, jabatan, divisi, alamat, noTelepon, email, status, foto, uid, jenis, masaBerlaku } = body as Record<string, string>

    const existing = await db.karyawan.findUnique({ where: { id }, include: { kartu: true } })
    if (!existing) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })

    const updated = await db.karyawan.update({
      where: { id },
      data: {
        nama: nama ?? existing.nama,
        jabatan: jabatan ?? existing.jabatan,
        divisi: divisi ?? existing.divisi,
        alamat: alamat ?? existing.alamat,
        noTelepon: noTelepon ?? existing.noTelepon,
        email: email ?? existing.email,
        status: status ?? existing.status,
        foto: foto !== undefined ? foto : existing.foto,
      },
    })

    // kelola kartu
    if (uid) {
      const existUid = await db.kartuKaryawan.findUnique({ where: { uid: String(uid) } })
      if (existUid && existUid.karyawanId !== id) {
        return NextResponse.json<ApiResponse>({ success: false, message: 'UID kartu sudah dipakai karyawan lain' }, { status: 409 })
      }
      if (existing.kartu) {
        await db.kartuKaryawan.update({
          where: { karyawanId: id },
          data: { uid: String(uid), jenis: String(jenis ?? existing.kartu.jenis), masaBerlaku: masaBerlaku ? new Date(masaBerlaku) : existing.kartu.masaBerlaku },
        })
      } else {
        const idKartu = await generateIdKartu()
        await db.kartuKaryawan.create({
          data: {
            idKartu,
            uid: String(uid),
            jenis: String(jenis ?? 'rfid'),
            status: 'aktif',
            masaBerlaku: masaBerlaku ? new Date(masaBerlaku) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            karyawanId: id,
          },
        })
      }
    }

    await catatLog({
      userId: user.id,
      namaUser: user.namaLengkap,
      aksi: 'update',
      modul: 'karyawan',
      detail: `Update karyawan ${updated.nama} (NIK: ${updated.nik})`,
      ip: getClientIP(request),
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'Karyawan diperbarui', data: updated })
  } catch (err) {
    console.error('PUT karyawan[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ===================================================================
// DELETE /api/karyawan/[id] — hapus karyawan
// ===================================================================
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
    const k = await db.karyawan.findUnique({ where: { id } })
    if (!k) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })

    await db.karyawan.delete({ where: { id } })

    await catatLog({
      userId: user.id,
      namaUser: user.namaLengkap,
      aksi: 'delete',
      modul: 'karyawan',
      detail: `Hapus karyawan ${k.nama} (NIK: ${k.nik})`,
      ip: getClientIP(request),
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'Karyawan dihapus' })
  } catch (err) {
    console.error('DELETE karyawan[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
