import type { ApiResponse } from '@/types'

// ===================================================================
// API client — wrapper fetch dengan handling error & auth
// Cookie JWT dikirim otomatis (same-origin), tidak perlu header manual
// ===================================================================

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      cache: 'no-store',
    })
    const json = (await res.json()) as ApiResponse<T>
    if (!res.ok || !json.success) {
      throw new ApiError(json.message || json.error || 'Terjadi kesalahan', res.status)
    }
    return json
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('Kesalahan jaringan. Silakan coba lagi.', 0)
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
