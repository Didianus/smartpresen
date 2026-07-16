import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from './db'

// ===================================================================
// Autentikasi: bcrypt password hashing + JWT session (httpOnly cookie)
// ===================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'absensi-karyawan-secret-key-2026-very-secure'
const COOKIE_NAME = 'absensi_token'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 jam (session timeout)

/** Hash password dengan bcrypt */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** Verifikasi password terhadap hash bcrypt */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Payload JWT — info user yang disimpan di token */
export interface JwtPayload {
  id: string
  email: string
  namaLengkap: string
  role: 'admin' | 'user'
}

/** Buat signed JWT token */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_MAX_AGE}s` })
}

/** Verifikasi & decode JWT token */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/** Set httpOnly cookie berisi JWT */
export async function setSessionCookie(payload: JwtPayload) {
  const token = signToken(payload)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/** Hapus cookie session (logout) */
export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Ambil user saat ini dari cookie (untuk dipakai di API route server-side) */
export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await db.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      namaLengkap: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  })

  if (!user || user.status !== 'aktif') return null
  return user
}

export { COOKIE_NAME, SESSION_MAX_AGE }
