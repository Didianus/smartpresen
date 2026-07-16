import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, setSessionCookie } from '@/lib/auth'
import { catatLog, getClientIP, publicUser } from '@/lib/log'
import type { ApiResponse, SafeUser } from '@/types'

// ===================================================================
// POST /api/auth/login — autentikasi user, set JWT cookie
// ===================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Email dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    if (user.status !== 'aktif') {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Akun Anda dinonaktifkan. Hubungi administrator.' },
        { status: 403 }
      )
    }

    const ok = await verifyPassword(password, user.password)
    if (!ok) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    // set session cookie (JWT httpOnly)
    await setSessionCookie({
      id: user.id,
      email: user.email,
      namaLengkap: user.namaLengkap,
      role: user.role as 'admin' | 'user',
    })

    const ip = getClientIP(request)
    await catatLog({
      userId: user.id,
      namaUser: user.namaLengkap,
      aksi: 'login',
      modul: 'auth',
      detail: `Login berhasil sebagai ${user.role}`,
      ip,
    })

    return NextResponse.json<ApiResponse<SafeUser>>({
      success: true,
      message: 'Login berhasil',
      data: publicUser(user) as SafeUser,
    })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
