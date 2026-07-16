-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Karyawan" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "divisi" TEXT NOT NULL,
    "alamat" TEXT NOT NULL DEFAULT '',
    "noTelepon" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "foto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KartuKaryawan" (
    "id" TEXT NOT NULL,
    "idKartu" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'rfid',
    "tanggalBuat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masaBerlaku" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "karyawanId" TEXT NOT NULL,

    CONSTRAINT "KartuKaryawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jamMasuk" TIMESTAMP(3),
    "jamPulang" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'hadir',
    "lokasi" TEXT NOT NULL DEFAULT 'Kantor Pusat',
    "foto" TEXT,
    "keterangan" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "karyawanId" TEXT,

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAktivitas" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "namaUser" TEXT NOT NULL DEFAULT 'System',
    "aksi" TEXT NOT NULL,
    "modul" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Karyawan_nik_key" ON "Karyawan"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "Karyawan_userId_key" ON "Karyawan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KartuKaryawan_idKartu_key" ON "KartuKaryawan"("idKartu");

-- CreateIndex
CREATE UNIQUE INDEX "KartuKaryawan_uid_key" ON "KartuKaryawan"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "KartuKaryawan_karyawanId_key" ON "KartuKaryawan"("karyawanId");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_karyawanId_tanggal_key" ON "Absensi"("karyawanId", "tanggal");

-- CreateIndex
CREATE INDEX "LogAktivitas_userId_idx" ON "LogAktivitas"("userId");

-- CreateIndex
CREATE INDEX "LogAktivitas_createdAt_idx" ON "LogAktivitas"("createdAt");

-- AddForeignKey
ALTER TABLE "Karyawan" ADD CONSTRAINT "Karyawan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KartuKaryawan" ADD CONSTRAINT "KartuKaryawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
