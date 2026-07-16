import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { ApiResponse } from '@/types'

// GET /api/log — list log aktivitas (admin)
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '15', 10))

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [{ namaUser: { contains: q } }, { aksi: { contains: q } }, { modul: { contains: q } }, { detail: { contains: q } }]
    }

    const [total, items] = await Promise.all([
      db.logAktivitas.count({ where }),
      db.logAktivitas.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error('GET log error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
