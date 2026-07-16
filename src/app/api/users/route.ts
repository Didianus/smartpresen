import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP, publicUser } from '@/lib/log'
import type { ApiResponse } from '@/types'

// GET /api/users — list user (admin)
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))

    const where: Record<string, unknown> = {}
    if (q) where.OR = [{ namaLengkap: { contains: q } }, { email: { contains: q } }]

    const [total, items] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: { id: true, namaLengkap: true, email: true, role: true, status: true, createdAt: true, karyawan: { select: { nik: true, divisi: true, jabatan: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error('GET users error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// POST /api/users — tambah user (admin)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })

    const body = await request.json()
    const { namaLengkap, email, password, role, status } = body as Record<string, string>
    if (!namaLengkap || !email || !password) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Field wajib kurang' }, { status: 400 })
    }
    const exist = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (exist) return NextResponse.json<ApiResponse>({ success: false, message: 'Email sudah terdaftar' }, { status: 409 })

    const { hashPassword } = await import('@/lib/auth')
    const hashed = await hashPassword(String(password))
    const u = await db.user.create({
      data: {
        namaLengkap: String(namaLengkap),
        email: String(email).toLowerCase(),
        password: hashed,
        role: role === 'admin' ? 'admin' : 'user',
        status: status === 'nonaktif' ? 'nonaktif' : 'aktif',
      },
    })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'create', modul: 'user', detail: `Tambah user ${u.email} (${u.role})`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'User ditambahkan', data: publicUser(u) })
  } catch (err) {
    console.error('POST users error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
