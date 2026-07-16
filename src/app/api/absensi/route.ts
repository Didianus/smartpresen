import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP } from '@/lib/log'
import type { ApiResponse } from '@/types'

// ===================================================================
// GET /api/absensi — list dengan search, filter tanggal/status, pagination
// ===================================================================
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const status = searchParams.get('status') ?? ''
    const tanggal = searchParams.get('tanggal') ?? ''
    const dari = searchParams.get('dari') ?? ''
    const sampai = searchParams.get('sampai') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))

    // user biasa hanya lihat absensinya sendiri
    let karyawanIdFilter: string | undefined
    if (user.role !== 'admin') {
      const k = await db.karyawan.findUnique({ where: { userId: user.id } })
      karyawanIdFilter = k?.id
    }

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [{ nama: { contains: q } }, { nik: { contains: q } }]
    }
    if (status) where.status = status
    if (tanggal) {
      const d = new Date(tanggal)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      where.tanggal = { gte: d, lt: next }
    } else if (dari && sampai) {
      where.tanggal = { gte: new Date(dari), lte: new Date(sampai) }
    }
    if (karyawanIdFilter) where.karyawanId = karyawanIdFilter

    const [total, items] = await Promise.all([
      db.absensi.count({ where }),
      db.absensi.findMany({
        where,
        orderBy: { tanggal: 'desc' },
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
    console.error('GET absensi error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ===================================================================
// POST /api/absensi — absen masuk / pulang via scan UID kartu
// Body: { aksi: 'masuk' | 'pulang', uid, lokasi?, foto?, keterangan? }
// Juga mendukung { mode: 'manual' } untuk admin menambah record manual
// ===================================================================
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const aksi = String(body.aksi ?? 'masuk') // 'masuk' | 'pulang'
    const uid = String(body.uid ?? '').trim()
    const mode = String(body.mode ?? 'scan')
    const ip = getClientIP(request)

    // --- MODE MANUAL (admin) ---
    if (mode === 'manual') {
      if (user.role !== 'admin') {
        return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
      }
      const { nik, nama, tanggal, jamMasuk, jamPulang, status, lokasi, keterangan, karyawanId } = body as Record<string, string>
      const rec = await db.absensi.create({
        data: {
          nik: String(nik),
          nama: String(nama),
          tanggal: tanggal ? new Date(tanggal) : new Date(),
          jamMasuk: jamMasuk ? new Date(jamMasuk) : null,
          jamPulang: jamPulang ? new Date(jamPulang) : null,
          status: String(status ?? 'hadir'),
          lokasi: String(lokasi ?? 'Kantor Pusat'),
          keterangan: String(keterangan ?? ''),
          karyawanId: karyawanId || null,
        },
      })
      await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'create', modul: 'absensi', detail: `Tambah absensi manual ${nama}`, ip })
      return NextResponse.json<ApiResponse>({ success: true, message: 'Absensi ditambahkan', data: rec })
    }

    // --- MODE SCAN ---
    if (!uid) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'UID kartu wajib diisi' }, { status: 400 })
    }

    // 1. Verifikasi UID kartu
    const kartu = await db.kartuKaryawan.findUnique({
      where: { uid },
      include: { karyawan: true },
    })
    if (!kartu || !kartu.karyawan) {
      await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'absen_' + aksi, modul: 'absensi', detail: `Gagal: kartu UID ${uid} tidak dikenal`, ip })
      return NextResponse.json<ApiResponse>({ success: false, message: 'Kartu tidak terdaftar' }, { status: 404 })
    }
    if (kartu.status !== 'aktif') {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Kartu nonaktif. Hubungi admin.' }, { status: 403 })
    }
    // user biasa hanya bisa absen dengan kartunya sendiri
    if (user.role !== 'admin') {
      const myK = await db.karyawan.findUnique({ where: { userId: user.id } })
      if (!myK || myK.id !== kartu.karyawanId) {
        return NextResponse.json<ApiResponse>({ success: false, message: 'Kartu bukan milik Anda' }, { status: 403 })
      }
    }

    const karyawan = kartu.karyawan
    const now = new Date()
    // hari ini (00:00)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayStart.getDate() + 1)

    // 2. Cek absensi hari ini
    const existing = await db.absensi.findFirst({
      where: { karyawanId: karyawan.id, tanggal: { gte: todayStart, lt: todayEnd } },
    })

    if (aksi === 'masuk') {
      if (existing && existing.jamMasuk) {
        return NextResponse.json<ApiResponse>({
          success: false,
          message: `Anda sudah absen masuk hari ini pada ${new Date(existing.jamMasuk).toLocaleTimeString('id-ID')}. Tidak dapat absen ganda.`,
        }, { status: 409 })
      }
      // tentukan status: terlambat jika > 09:00
      const batasJam = new Date(todayStart)
      batasJam.setHours(9, 0, 0, 0)
      const status = now > batasJam ? 'terlambat' : 'hadir'

      if (existing) {
        // sudah ada record (misal izin/sakit) tapi belum masuk → update
        const updated = await db.absensi.update({
          where: { id: existing.id },
          data: { jamMasuk: now, status, lokasi: String(body.lokasi ?? 'Kantor Pusat') },
        })
        await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'absen_masuk', modul: 'absensi', detail: `${karyawan.nama} absen masuk (${status})`, ip })
        return NextResponse.json<ApiResponse>({ success: true, message: `Absen masuk berhasil — ${status === 'terlambat' ? 'Terlambat' : 'Tepat waktu'}`, data: updated })
      }

      const rec = await db.absensi.create({
        data: {
          nik: karyawan.nik,
          nama: karyawan.nama,
          tanggal: todayStart,
          jamMasuk: now,
          status,
          lokasi: String(body.lokasi ?? 'Kantor Pusat'),
          foto: body.foto ? String(body.foto) : null,
          keterangan: '',
          karyawanId: karyawan.id,
        },
      })
      await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'absen_masuk', modul: 'absensi', detail: `${karyawan.nama} absen masuk (${status})`, ip })
      return NextResponse.json<ApiResponse>({ success: true, message: `Absen masuk berhasil — ${status === 'terlambat' ? 'Terlambat' : 'Tepat waktu'}`, data: rec })
    }

    // aksi === 'pulang'
    if (!existing || !existing.jamMasuk) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Anda belum absen masuk hari ini. Silakan absen masuk terlebih dahulu.' }, { status: 400 })
    }
    if (existing.jamPulang) {
      return NextResponse.json<ApiResponse>({ success: false, message: `Anda sudah absen pulang hari ini pada ${new Date(existing.jamPulang).toLocaleTimeString('id-ID')}.` }, { status: 409 })
    }
    const updated = await db.absensi.update({
      where: { id: existing.id },
      data: { jamPulang: now },
    })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'absen_pulang', modul: 'absensi', detail: `${karyawan.nama} absen pulang`, ip })
    return NextResponse.json<ApiResponse>({ success: true, message: 'Absen pulang berhasil. Selamat beristirahat!', data: updated })
  } catch (err) {
    console.error('POST absensi error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
