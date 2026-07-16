import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import { generateIdKartu } from '@/lib/utils'
import type { ApiResponse } from '@/types'

// GET /api/kartu — list kartu karyawan
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { idKartu: { contains: q } },
        { uid: { contains: q } },
        { karyawan: { nama: { contains: q } } },
        { karyawan: { nik: { contains: q } } },
      ]
    }

    const [total, items] = await Promise.all([
      db.kartuKaryawan.count({ where }),
      db.kartuKaryawan.findMany({
        where,
        include: { karyawan: { select: { nama: true, nik: true, jabatan: true, divisi: true, foto: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error('GET kartu error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// POST /api/kartu — buat kartu baru (admin)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })

    const body = await request.json()
    const { uid, jenis, karyawanId, masaBerlaku, status } = body as Record<string, string>
    if (!uid || !karyawanId) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'UID & Karyawan wajib diisi' }, { status: 400 })
    }
    const existUid = await db.kartuKaryawan.findUnique({ where: { uid: String(uid) } })
    if (existUid) return NextResponse.json<ApiResponse>({ success: false, message: 'UID sudah digunakan' }, { status: 409 })
    const existKary = await db.kartuKaryawan.findUnique({ where: { karyawanId: String(karyawanId) } })
    if (existKary) return NextResponse.json<ApiResponse>({ success: false, message: 'Karyawan sudah punya kartu' }, { status: 409 })

    const idKartu = await generateIdKartu()
    const k = await db.kartuKaryawan.create({
      data: {
        idKartu,
        uid: String(uid),
        jenis: String(jenis ?? 'rfid'),
        status: String(status ?? 'aktif'),
        masaBerlaku: masaBerlaku ? new Date(masaBerlaku) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        karyawanId: String(karyawanId),
      },
    })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'create', modul: 'kartu', detail: `Buat kartu ${idKartu} (UID: ${uid})`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Kartu dibuat', data: k })
  } catch (err) {
    console.error('POST kartu error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
