import { NextResponse } from 'next/server'
import { getCurrentUser, clearSessionCookie } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import type { ApiResponse } from '@/types'

// ===================================================================
// POST /api/auth/logout — hapus session cookie
// ===================================================================

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (user) {
      await catatLog({
        userId: user.id,
        namaUser: user.namaLengkap,
        aksi: 'logout',
        modul: 'auth',
        detail: 'Logout berhasil',
        ip: getClientIP(request),
      })
    }
    await clearSessionCookie()
    return NextResponse.json<ApiResponse>({ success: true, message: 'Logout berhasil' })
  } catch (err) {
    console.error('Logout error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
