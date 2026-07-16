import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import type { ApiResponse } from '@/types'

// PUT /api/profil — edit profil karyawan (user sendiri)
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { nama, jabatan, divisi, alamat, noTelepon, foto } = body as Record<string, string>

    const karyawan = await db.karyawan.findUnique({ where: { userId: user.id } })
    if (!karyawan) return NextResponse.json<ApiResponse>({ success: false, message: 'Profil karyawan tidak ditemukan' }, { status: 404 })

    const updated = await db.karyawan.update({
      where: { id: karyawan.id },
      data: {
        nama: nama ?? karyawan.nama,
        jabatan: jabatan ?? karyawan.jabatan,
        divisi: divisi ?? karyawan.divisi,
        alamat: alamat ?? karyawan.alamat,
        noTelepon: noTelepon ?? karyawan.noTelepon,
        foto: foto !== undefined ? foto : karyawan.foto,
      },
    })

    // sinkron nama user
    if (nama && nama !== user.namaLengkap) {
      await db.user.update({ where: { id: user.id }, data: { namaLengkap: nama } })
    }

    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'update', modul: 'profil', detail: 'Edit profil sendiri', ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Profil diperbarui', data: updated })
  } catch (err) {
    console.error('PUT profil error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
