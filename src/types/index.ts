// ===================================================================
// Tipe data bersama untuk aplikasi Absensi Karyawan
// ===================================================================

export type Role = 'admin' | 'user'
export type UserStatus = 'aktif' | 'nonaktif'
export type JenisKartu = 'rfid' | 'nfc' | 'barcode' | 'qrcode'
export type StatusKehadiran = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha'
export type StatusKaryawan = 'aktif' | 'nonaktif' | 'cuti'

/** User tanpa password — untuk dikirim ke client */
export interface SafeUser {
  id: string
  namaLengkap: string
  email: string
  role: Role
  status: UserStatus
  createdAt: string
}

/** Data karyawan lengkap (dengan relasi user & kartu) */
export interface KaryawanWithRelations {
  id: string
  nik: string
  nama: string
  jabatan: string
  divisi: string
  alamat: string
  noTelepon: string
  email: string
  foto: string | null
  status: StatusKaryawan
  createdAt: string
  updatedAt: string
  userId: string
  kartu?: KartuKaryawan | null
}

export interface KartuKaryawan {
  id: string
  idKartu: string
  uid: string
  jenis: JenisKartu
  tanggalBuat: string
  masaBerlaku: string | null
  status: 'aktif' | 'nonaktif' | 'hilang'
  karyawanId: string
}

export interface Absensi {
  id: string
  nik: string
  nama: string
  tanggal: string
  jamMasuk: string | null
  jamPulang: string | null
  status: StatusKehadiran
  lokasi: string
  foto: string | null
  keterangan: string
  karyawanId: string | null
  createdAt: string
}

export interface LogAktivitas {
  id: string
  userId: string | null
  namaUser: string
  aksi: string
  modul: string
  detail: string
  ip: string
  createdAt: string
}

/** View/route yang dikelola client-side via Zustand */
export type AppView =
  | 'login'
  | 'register'
  | 'admin'
  | 'user'

export type AdminPage =
  | 'dashboard'
  | 'karyawan'
  | 'users'
  | 'kartu'
  | 'absensi'
  | 'log'
  | 'laporan'
  | 'kartu-cetak'

export type UserPage =
  | 'home'
  | 'absensi'
  | 'riwayat'
  | 'kartu'
  | 'profil'
  | 'password'

/** Statistik dashboard */
export interface DashboardStats {
  totalKaryawan: number
  totalAbsensiHariIni: number
  hadirHariIni: number
  terlambatHariIni: number
  izinHariIni: number
  sakitHariIni: number
  alphaHariIni: number
  totalUser: number
}

/** Response standar API */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}
