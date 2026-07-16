import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import type { ApiResponse } from '@/types'

// PUT /api/password — ubah password (user sendiri)
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { passwordLama, passwordBaru, konfirmasi } = body as Record<string, string>
    if (!passwordLama || !passwordBaru || !konfirmasi) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Semua field wajib diisi' }, { status: 400 })
    }
    if (passwordBaru.length < 6) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Password baru minimal 6 karakter' }, { status: 400 })
    }
    if (passwordBaru !== konfirmasi) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Konfirmasi password tidak cocok' }, { status: 400 })
    }

    const full = await db.user.findUnique({ where: { id: user.id } })
    if (!full) return NextResponse.json<ApiResponse>({ success: false, message: 'User tidak ditemukan' }, { status: 404 })

    const ok = await verifyPassword(passwordLama, full.password)
    if (!ok) return NextResponse.json<ApiResponse>({ success: false, message: 'Password lama salah' }, { status: 400 })

    const hashed = await hashPassword(passwordBaru)
    await db.user.update({ where: { id: user.id }, data: { password: hashed } })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'update', modul: 'profil', detail: 'Ubah password', ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Password berhasil diubah' })
  } catch (err) {
    console.error('PUT password error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
