import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { catatLog, getClientIP, publicUser } from '@/lib/log'
import type { ApiResponse } from '@/types'

// PUT /api/users/[id] — update role/status (admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    const { id } = await params
    const body = await request.json()
    const { role, status, namaLengkap } = body as Record<string, string>

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })

    const updated = await db.user.update({
      where: { id },
      data: {
        role: role ? (role === 'admin' ? 'admin' : 'user') : existing.role,
        status: status ? (status === 'aktif' ? 'aktif' : 'nonaktif') : existing.status,
        namaLengkap: namaLengkap ?? existing.namaLengkap,
      },
    })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'update', modul: 'user', detail: `Update user ${updated.email} → role: ${updated.role}, status: ${updated.status}`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'User diperbarui', data: publicUser(updated) })
  } catch (err) {
    console.error('PUT users[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/users/[id] (admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
    const { id } = await params
    if (id === user.id) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })

    const u = await db.user.findUnique({ where: { id } })
    if (!u) return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ditemukan' }, { status: 404 })
    await db.user.delete({ where: { id } })
    await catatLog({ userId: user.id, namaUser: user.namaLengkap, aksi: 'delete', modul: 'user', detail: `Hapus user ${u.email}`, ip: getClientIP(request) })
    return NextResponse.json<ApiResponse>({ success: true, message: 'User dihapus' })
  } catch (err) {
    console.error('DELETE users[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Server error' }, { status: 500 })
  }
}
