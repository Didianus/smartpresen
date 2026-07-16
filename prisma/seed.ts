import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database Absensi Karyawan...')

  // --- Users ---
  const adminPass = await bcrypt.hash('admin123', 10)
  const userPass = await bcrypt.hash('user123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@absensi.com' },
    update: {},
    create: {
      namaLengkap: 'Administrator Sistem',
      email: 'admin@absensi.com',
      password: adminPass,
      role: 'admin',
      status: 'aktif',
    },
  })

  const budi = await prisma.user.upsert({
    where: { email: 'budi@absensi.com' },
    update: {},
    create: {
      namaLengkap: 'Budi Santoso',
      email: 'budi@absensi.com',
      password: userPass,
      role: 'user',
      status: 'aktif',
    },
  })

  const siti = await prisma.user.upsert({
    where: { email: 'siti@absensi.com' },
    update: {},
    create: {
      namaLengkap: 'Siti Nurhaliza',
      email: 'siti@absensi.com',
      password: userPass,
      role: 'user',
      status: 'aktif',
    },
  })

  const andi = await prisma.user.upsert({
    where: { email: 'andi@absensi.com' },
    update: {},
    create: {
      namaLengkap: 'Andi Wijaya',
      email: 'andi@absensi.com',
      password: userPass,
      role: 'user',
      status: 'aktif',
    },
  })

  const dewi = await prisma.user.upsert({
    where: { email: 'dewi@absensi.com' },
    update: {},
    create: {
      namaLengkap: 'Dewi Lestari',
      email: 'dewi@absensi.com',
      password: userPass,
      role: 'user',
      status: 'aktif',
    },
  })

  // --- Karyawan ---
  const kBudi = await prisma.karyawan.upsert({
    where: { nik: '202601-001' },
    update: {},
    create: {
      nik: '202601-001',
      nama: 'Budi Santoso',
      jabatan: 'Software Engineer',
      divisi: 'IT',
      alamat: 'Jl. Merdeka No. 12, Jakarta',
      noTelepon: '081234567801',
      email: 'budi@absensi.com',
      status: 'aktif',
      userId: budi.id,
    },
  })

  const kSiti = await prisma.karyawan.upsert({
    where: { nik: '202601-002' },
    update: {},
    create: {
      nik: '202601-002',
      nama: 'Siti Nurhaliza',
      jabatan: 'HR Manager',
      divisi: 'Human Resource',
      alamat: 'Jl. Sudirman No. 45, Bandung',
      noTelepon: '081234567802',
      email: 'siti@absensi.com',
      status: 'aktif',
      userId: siti.id,
    },
  })

  const kAndi = await prisma.karyawan.upsert({
    where: { nik: '202601-003' },
    update: {},
    create: {
      nik: '202601-003',
      nama: 'Andi Wijaya',
      jabatan: 'Marketing Specialist',
      divisi: 'Marketing',
      alamat: 'Jl. Gatot Subroto No. 8, Surabaya',
      noTelepon: '081234567803',
      email: 'andi@absensi.com',
      status: 'aktif',
      userId: andi.id,
    },
  })

  const kDewi = await prisma.karyawan.upsert({
    where: { nik: '202601-004' },
    update: {},
    create: {
      nik: '202601-004',
      nama: 'Dewi Lestari',
      jabatan: 'Finance Officer',
      divisi: 'Finance',
      alamat: 'Jl. Diponegoro No. 22, Semarang',
      noTelepon: '081234567804',
      email: 'dewi@absensi.com',
      status: 'aktif',
      userId: dewi.id,
    },
  })

  const kAdmin = await prisma.karyawan.upsert({
    where: { nik: '202601-000' },
    update: {},
    create: {
      nik: '202601-000',
      nama: 'Administrator Sistem',
      jabatan: 'System Administrator',
      divisi: 'IT',
      alamat: 'Jl. Pusat Data No. 1, Jakarta',
      noTelepon: '081234567800',
      email: 'admin@absensi.com',
      status: 'aktif',
      userId: admin.id,
    },
  })

  // --- Kartu Karyawan ---
  const kartuData = [
    { idKartu: 'EMP-2026-0000', uid: 'RFID-A001-ADMIN', jenis: 'rfid', karyawanId: kAdmin.id },
    { idKartu: 'EMP-2026-0001', uid: 'RFID-B001-BUDI', jenis: 'rfid', karyawanId: kBudi.id },
    { idKartu: 'EMP-2026-0002', uid: 'NFC-C001-SITI', jenis: 'nfc', karyawanId: kSiti.id },
    { idKartu: 'EMP-2026-0003', uid: 'QR-D001-ANDI', jenis: 'qrcode', karyawanId: kAndi.id },
    { idKartu: 'EMP-2026-0004', uid: 'BARCODE-E001-DEWI', jenis: 'barcode', karyawanId: kDewi.id },
  ]

  for (const k of kartuData) {
    await prisma.kartuKaryawan.upsert({
      where: { idKartu: k.idKartu },
      update: {},
      create: {
        idKartu: k.idKartu,
        uid: k.uid,
        jenis: k.jenis,
        status: 'aktif',
        masaBerlaku: new Date('2027-12-31'),
        karyawanId: k.karyawanId,
      },
    })
  }

  // --- Absensi (7 hari terakhir) ---
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const karyawanList = [kBudi, kSiti, kAndi, kDewi]
  const statusOptions = ['hadir', 'hadir', 'hadir', 'terlambat', 'izin', 'sakit']

  for (let i = 6; i >= 0; i--) {
    const tgl = new Date(today)
    tgl.setDate(today.getDate() - i)
    // skip Sunday
    if (tgl.getDay() === 0) continue

    for (const k of karyawanList) {
      // cek unik (karyawanId + tanggal) — gunakan upsert composite
      const tanggalKey = new Date(tgl)
      const existing = await prisma.absensi.findFirst({
        where: { karyawanId: k.id, tanggal: tanggalKey },
      })
      if (existing) continue

      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)]
      let jamMasuk: Date | null = null
      let jamPulang: Date | null = null
      if (status === 'hadir' || status === 'terlambat') {
        jamMasuk = new Date(tgl)
        jamMasuk.setHours(status === 'terlambat' ? 9 : 8, status === 'terlambat' ? 15 : 5, 0, 0)
        jamPulang = new Date(tgl)
        jamPulang.setHours(17, Math.floor(Math.random() * 50), 0, 0)
      }

      await prisma.absensi.create({
        data: {
          nik: k.nik,
          nama: k.nama,
          tanggal: tanggalKey,
          jamMasuk,
          jamPulang,
          status,
          lokasi: 'Kantor Pusat',
          karyawanId: k.id,
          keterangan:
            status === 'izin'
              ? 'Acara keluarga'
              : status === 'sakit'
              ? 'Demam'
              : '',
        },
      })
    }
  }

  // --- Log Aktivitas awal ---
  await prisma.logAktivitas.create({
    data: {
      namaUser: 'System',
      aksi: 'registrasi',
      modul: 'auth',
      detail: 'Inisialisasi database & seed data awal',
    },
  })

  console.log('✅ Seed selesai!')
  console.log('   Admin : admin@absensi.com / admin123')
  console.log('   User  : budi@absensi.com / user123')
  console.log('   User  : siti@absensi.com / user123')
  console.log('   User  : andi@absensi.com / user123')
  console.log('   User  : dewi@absensi.com / user123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
