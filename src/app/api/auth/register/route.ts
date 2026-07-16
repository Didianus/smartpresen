import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { catatLog, getClientIP, publicUser } from '@/lib/log'
import { generateIdKartu, generateNIK } from '@/lib/utils'
import type { ApiResponse, SafeUser, Role } from '@/types'

// ===================================================================
// POST /api/auth/register — registrasi user + karyawan + kartu
// ===================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const namaLengkap = String(body.namaLengkap ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const konfirmasiPassword = String(body.konfirmasiPassword ?? '')
    const nomorKartu = String(body.nomorKartu ?? '').trim()
    const role: Role = body.role === 'admin' ? 'admin' : 'user'

    if (!namaLengkap || namaLengkap.length < 3) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Nama lengkap minimal 3 karakter.' },
        { status: 400 }
      )
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Format email tidak valid.' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }
    if (password !== konfirmasiPassword) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Konfirmasi password tidak cocok.' },
        { status: 400 }
      )
    }
    if (!nomorKartu || nomorKartu.length < 4) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Nomor Kartu Karyawan wajib diisi (min. 4 karakter).' },
        { status: 400 }
      )
    }

    const existEmail = await db.user.findUnique({ where: { email } })
    if (existEmail) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Email sudah terdaftar.' },
        { status: 409 }
      )
    }
    const existUid = await db.kartuKaryawan.findUnique({ where: { uid: nomorKartu } })
    if (existUid) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Nomor Kartu sudah digunakan karyawan lain.' },
        { status: 409 }
      )
    }

    const hashed = await hashPassword(password)
    const user = await db.user.create({
      data: {
        namaLengkap,
        email,
        password: hashed,
        role,
        status: 'aktif',
      },
    })

    const nik = await generateNIK()
    const karyawan = await db.karyawan.create({
      data: {
        nik,
        nama: namaLengkap,
        jabatan: role === 'admin' ? 'Administrator' : 'Staff',
        divisi: 'Umum',
        alamat: '',
        noTelepon: '',
        email,
        status: 'aktif',
        userId: user.id,
      },
    })

    const idKartu = await generateIdKartu()
    await db.kartuKaryawan.create({
      data: {
        idKartu,
        uid: nomorKartu,
        jenis: 'rfid',
        status: 'aktif',
        masaBerlaku: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        karyawanId: karyawan.id,
      },
    })

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
      aksi: 'registrasi',
      modul: 'auth',
      detail: `Registrasi akun baru sebagai ${role} (NIK: ${nik})`,
      ip,
    })

    return NextResponse.json<ApiResponse<SafeUser>>({
      success: true,
      message: 'Registrasi berhasil!',
      data: publicUser(user) as SafeUser,
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
