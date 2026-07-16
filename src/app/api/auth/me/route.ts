import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { ApiResponse, SafeUser } from '@/types'

// ===================================================================
// GET /api/auth/me — ambil user saat ini dari JWT cookie
// ===================================================================

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Belum login' },
        { status: 401 }
      )
    }

    // ambil info karyawan & kartu
    const karyawan = await db.karyawan.findUnique({
      where: { userId: user.id },
      include: { kartu: true },
    })

    return NextResponse.json<ApiResponse<SafeUser & { karyawan?: unknown }>>({
      success: true,
      message: 'OK',
      data: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        karyawan,
      },
    })
  } catch (err) {
    console.error('Me error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
