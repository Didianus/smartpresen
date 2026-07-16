import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import { generateIdKartu, generateNIK } from '@/lib/utils'
import type { ApiResponse } from '@/types'

// ===================================================================
// GET /api/karyawan — list dengan search, filter divisi, pagination
// Query: q, divisi, status, page, limit
// ===================================================================
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const divisi = searchParams.get('divisi') ?? ''
    const status = searchParams.get('status') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { nama: { contains: q } },
        { nik: { contains: q } },
        { jabatan: { contains: q } },
        { email: { contains: q } },
      ]
    }
    if (divisi) where.divisi = divisi
    if (status) where.status = status

    const [total, items] = await Promise.all([
      db.karyawan.count({ where }),
      db.karyawan.findMany({
        where,
        include: { kartu: true, user: { select: { role: true, status: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'OK',
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('GET karyawan error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ===================================================================
// POST /api/karyawan — tambah karyawan + user (admin) + kartu
// ===================================================================
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { nama, jabatan, divisi, alamat, noTelepon, email, status, foto, nik: nikInput, uid, jenis, buatAkun, password } = body as Record<string, string | boolean>

    if (!nama || !jabatan || !divisi) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Nama, jabatan, divisi wajib diisi' }, { status: 400 })
    }

    const nik = nikInput ? String(nikInput) : await generateNIK()
    // cek NIK unik
    const existNik = await db.karyawan.findUnique({ where: { nik } })
    if (existNik) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'NIK sudah digunakan' }, { status: 409 })
    }

    let userId: string | undefined
    if (buatAkun && email) {
      const { hashPassword } = await import('@/lib/auth')
      const existEmail = await db.user.findUnique({ where: { email: String(email) } })
      if (existEmail) {
        return NextResponse.json<ApiResponse>({ success: false, message: 'Email sudah terdaftar' }, { status: 409 })
      }
      const hashed = await hashPassword(String(password || 'password123'))
      const u = await db.user.create({
        data: {
          namaLengkap: String(nama),
          email: String(email),
          password: hashed,
          role: 'user',
          status: 'aktif',
        },
      })
      userId = u.id
    }

    const karyawan = await db.karyawan.create({
      data: {
        nik,
        nama: String(nama),
        jabatan: String(jabatan),
        divisi: String(divisi),
        alamat: String(alamat ?? ''),
        noTelepon: String(noTelepon ?? ''),
        email: String(email ?? ''),
        foto: foto ? String(foto) : null,
        status: String(status ?? 'aktif'),
        ...(userId ? { userId } : {}),
      },
    })

    // buat kartu jika UID diberikan
    if (uid) {
      const existUid = await db.kartuKaryawan.findUnique({ where: { uid: String(uid) } })
      if (existUid) {
        return NextResponse.json<ApiResponse>({ success: false, message: 'UID kartu sudah digunakan' }, { status: 409 })
      }
      const idKartu = await generateIdKartu()
      await db.kartuKaryawan.create({
        data: {
          idKartu,
          uid: String(uid),
          jenis: String(jenis ?? 'rfid'),
          status: 'aktif',
          masaBerlaku: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          karyawanId: karyawan.id,
        },
      })
    }

    await catatLog({
      userId: user.id,
      namaUser: user.namaLengkap,
      aksi: 'create',
      modul: 'karyawan',
      detail: `Tambah karyawan ${nama} (NIK: ${nik})`,
      ip: getClientIP(request),
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'Karyawan ditambahkan', data: karyawan })
  } catch (err) {
    console.error('POST karyawan error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
