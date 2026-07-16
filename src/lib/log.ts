import { db } from './db'
import type { User } from '@prisma/client'

// ===================================================================
// Helper untuk mencatat aktivitas ke tabel LogAktivitas (audit log)
// ===================================================================

export async function catatLog(params: {
  userId?: string | null
  namaUser?: string
  aksi: string
  modul?: string
  detail?: string
  ip?: string
}) {
  try {
    await db.logAktivitas.create({
      data: {
        userId: params.userId ?? null,
        namaUser: params.namaUser ?? 'System',
        aksi: params.aksi,
        modul: params.modul ?? '',
        detail: params.detail ?? '',
        ip: params.ip ?? '',
      },
    })
  } catch (e) {
    // jangan gagalkan operasi utama jika log gagal
    console.error('Gagal mencatat log aktivitas:', e)
  }
}

/** Ambil IP client dari request headers */
export function getClientIP(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

/** Public-safe user object (tanpa password) */
export function publicUser(u: User) {
  const { password: _password, ...rest } = u
  return rest
}
