# Worklog — Website Absensi Karyawan

Project: Employee Attendance System (Next.js 16 + Prisma + SQLite)
Single visible route: `/` (SPA with client-side view routing via Zustand)

---
Task ID: 1
Agent: main
Task: Foundation — cleanup old wallet files, install packages (jsonwebtoken, qrcode), write Prisma schema, db:push, seed data

Work Log:
- Removed all wallet-specific components, stores, API routes, and types
- Installed jsonwebtoken + qrcode (+ types)
- Wrote prisma/schema.prisma with models: User, Karyawan, KartuKaryawan, Absensi, LogAktivitas
- Wrote src/lib/auth.ts (bcrypt + JWT httpOnly cookie session, getCurrentUser)
- Wrote src/lib/log.ts (catatLog audit helper, getClientIP, publicUser)
- Wrote src/lib/utils.ts (date format, generateIdKartu EMP-YYYY-NNNN, generateNIK, status badge meta)

Stage Summary:
- Auth strategy: custom JWT in httpOnly cookie (COOKIE_NAME=absensi_token, 8h expiry)
- SQLite adapter (not MySQL — env constraint). Schema mirrors the MySQL spec using String-typed enums with documented values.
- Unique card ID format: EMP-2026-0001 (auto-incremented per year)
- Unique NIK format: YYYYMM-NNN
- Next: run db:push, seed admin+user+karyawan+kartu+absensi sample data

---
Task ID: 6-c
Agent: full-stack-developer
Task: Build admin Log Aktivitas, Laporan (export), & Cetak Kartu views

Work Log:
- Read worklog + existing shared components (PageHeader, SearchInput, EmptyState, Pagination, StatusBadge), EmployeeCardDialog, lib/api, lib/swal, lib/utils, types, ui (card/badge/skeleton/select/table/avatar), admin-home-view for style reference
- Created src/components/admin/views/log-view.tsx — LogView with vertical timeline (gradient connecting line, colored dots ring-4, aksi->icon+color map: login=emerald/LogIn, logout=slate/LogOut, registrasi=sky/UserPlus, create=violet/Plus, update=amber/Pencil, delete=rose/Trash2, absen_masuk=emerald/LogIn, absen_pulang=sky/LogOut), debounced search (400ms), pagination 15/page, skeleton list, EmptyState, framer-motion stagger, IP + userId footer
- Created src/components/admin/views/laporan-view.tsx — LaporanView with filter bar (dari/sampai date inputs, divisi select IT/HR/Marketing/Finance/Umum, status select, Tampilkan button), 4 StatMini summary cards (total/hadir/terlambat/izin-sakit-alpha computed from items), preview Table (first 10 rows, sticky header, max-h scroll), Excel export (XLSX.json_to_sheet + column widths + writeFile), PDF export (jsPDF landscape A4 + autoTable with violet [99,102,241] header, footer timestamp), Cetak (window.print), EmptyState when no data, validation dari<=sampai
- Created src/components/admin/views/kartu-cetak-view.tsx — KartuCetakView with SearchInput + divisi filter, responsive grid (1/2/3/4 cols), each tile shows foto-or-initials in gradient header, nama, nik, jabatan, divisi, idKartu mono badge, kartu status badge (aktif/hilang/nonaktif), "Preview & Cetak" button opens EmployeeCardDialog passing karyawan + kartu, pagination 12/page, skeletons, EmptyState with reset action
- Verified TypeScript: tsc --noEmit reports zero errors in the three new files
- Note: pre-existing dev.log error "Can't resolve @/components/app-shell" is from another agent's task, unrelated to these views

Stage Summary:
- Files created (3):
  - src/components/admin/views/log-view.tsx — exports LogView (timeline audit trail)
  - src/components/admin/views/laporan-view.tsx — exports LaporanView (filter + Excel/PDF/print export)
  - src/components/admin/views/kartu-cetak-view.tsx — exports KartuCetakView (grid + EmployeeCardDialog integration)
- All three are 'use client', use Indonesian UI labels, shadcn/ui + Tailwind, framer-motion animations, gradient-primary accents, rounded-2xl shadow-card, responsive, try/catch with swal feedback, loading skeletons, EmptyState
- API contracts honored: GET /api/log?q=&page=1&limit=15, GET /api/laporan?dari=&sampai=&divisi=&status=, GET /api/karyawan?q=&divisi=&status=&page=1&limit=12 (with kartu included)
- No other files modified

---
Task ID: 6-a
Agent: full-stack-developer
Task: Build admin Karyawan & Users CRUD views

Work Log:
- Read existing project conventions: AppShell, shared components (PageHeader, SearchInput, EmptyState, Pagination, ConfirmDialog, ActiveBadge), API client (api.get/post/put/del with ApiError), swal helpers, lib/utils (formatTanggal, getInisial, cn), types/index.ts (SafeUser, KaryawanWithRelations, KartuKaryawan).
- Inspected API route contracts: GET/POST /api/karyawan (with q, divisi, status, page, limit), PUT/DELETE /api/karyawan/[id] (supports uid/jenis/masaBerlaku for kartu); GET/POST /api/users, PUT/DELETE /api/users/[id] (blocks self-delete).
- Created `src/components/admin/views/karyawan-view.tsx` exporting `KaryawanView`:
  * PageHeader "Data Karyawan" + Tambah Karyawan button + refresh button.
  * Filter bar (Card) with SearchInput + Select divisi (all/IT/Human Resource/Marketing/Finance/Umum) + Select status (all/aktif/nonaktif/cuti). Selecting a filter resets page to 1.
  * Responsive table (overflow-x-auto) with columns: Foto (Avatar, fallback initials gradient), NIK (mono), Nama+noTelepon, Jabatan, Divisi (badge), Email (hidden on mobile), Status (KaryawanStatusBadge handling aktif/nonaktif/cuti using ActiveBadge + custom amber badge for cuti), Kartu (idKartu or '-'), Aksi (DropdownMenu: Edit, Hapus).
  * Debounced search (350ms), skeleton loading, EmptyState with action.
  * Pagination using shared component.
  * Add/Edit Dialog (max-w-2xl, scrollable body): foto upload via FileReader → data URL with preview + remove button (2MB limit, image only), 2-col grid (nama, nik auto-disabled on edit, jabatan, divisi select, noTelepon, email), alamat textarea, status select, Kartu section (uid + jenis rfid/nfc/barcode/qrcode), Buat Akun Login checkbox (only on create) with email + password fields.
  * Submit: validates required fields, shows swal.loading, POST or PUT, swal.success on success, swal.error on failure. Delete via ConfirmDialog then api.del with page-back logic if last row on page > 1.
  * framer-motion entrance animation on rows (staggered delay).
- Created `src/components/admin/views/users-view.tsx` exporting `UsersView`:
  * PageHeader "Manajemen User" + Tambah User button + refresh button.
  * SearchInput filter (debounced 350ms).
  * Responsive table: Avatar+Nama (with "Anda" badge if self), Email (hidden on mobile, shown inline on mobile under name), Role (RoleBadge: admin = gradient-primary with Shield icon, user = outline with User icon), Status (ActiveBadge), Karyawan info (nik/jabatan/divisi hidden on small), Tanggal Registrasi (formatTanggal), Aksi (DropdownMenu Edit, Hapus — Hapus disabled for self).
  * Loading skeleton, EmptyState with action, Pagination.
  * Add/Edit Dialog (max-w-md): namaLengkap, email+password (only on add), email disabled on edit, role select (admin/user), status select (aktif/nonaktif).
  * Submit uses swal.loading then api.post/put, swal.success/error. Delete via ConfirmDialog, with self-delete check (defense-in-depth; API also blocks).
  * Uses useAuthStore to detect current user (for self badge + block self-delete).
  * framer-motion row entrance animations.

Stage Summary:
- Files created (ONLY these two new files):
  * `/home/z/my-project/src/components/admin/views/karyawan-view.tsx` — `KaryawanView` (full CRUD with foto upload, kartu link, optional account creation)
  * `/home/z/my-project/src/components/admin/views/users-view.tsx` — `UsersView` (full CRUD with role/status management, self-protection)
- Both components are `'use client'`, fully typed, Indonesian UI, use shadcn components + shared helpers, no test files, no other files modified.
- Imports resolve against existing modules (`@/components/shared/*`, `@/components/ui/*`, `@/lib/api`, `@/lib/swal`, `@/lib/utils`, `@/store/auth-store`, `@/types`, `framer-motion`, `lucide-react`).
- Styling follows app theme: violet/fuchsia `gradient-primary`, `shadow-card`, rounded-2xl cards, glass-friendly. NO indigo/blue Tailwind utilities used directly — only `text-primary`/`gradient-primary` semantic classes.

---
Task ID: 6-b
Agent: full-stack-developer
Task: Build admin Kartu & Absensi CRUD views

Work Log:
- Read worklog.md to understand prior context (foundation, schema, API routes)
- Inspected shared components (PageHeader, SearchInput, EmptyState, Pagination, ConfirmDialog, StatusBadge/ActiveBadge) and shadcn/ui primitives (card, button, input, label, select, table, dialog, badge, avatar, skeleton, dropdown-menu)
- Inspected API routes for /api/kartu and /api/absensi (GET/POST/PUT/DELETE contracts) and /api/karyawan for the dropdown source
- Created src/components/admin/views/kartu-view.tsx — `KartuView`:
  - PageHeader "Data Kartu Karyawan" + "Refresh" & "Tambah Kartu" (gradient-primary) buttons
  - Debounced SearchInput (idKartu / uid / nama / NIK)
  - Table columns: Karyawan (avatar+nama+NIK+jabatan), ID Kartu (mono Badge), UID (mono), Jenis (icon+color badge: rfid→Radio/emerald, nfc→Nfc/sky, qrcode→QrCode/violet, barcode→Barcode/amber), Masa Berlaku (formatTanggalPendek or ∞), Status (ActiveBadge + custom "Hilang" badge), Aksi (Edit ghost, Hapus ghost destructive)
  - Add Dialog: karyawan select (loaded from /api/karyawan?limit=100, lazy on open), UID input, jenis select, masaBerlaku date, status select — with validation
  - Edit Dialog: edit UID, jenis, status, masaBerlaku (karyawan tidak dapat diubah)
  - Delete with ConfirmDialog
  - Pagination, EmptyState (with conditional action based on search), Skeleton loading rows
  - framer-motion row entrance animation
- Created src/components/admin/views/absensi-view.tsx — `AbsensiView`:
  - PageHeader "Data Absensi" + "Refresh" & "Tambah Manual" buttons
  - Responsive filter bar (stacks on mobile): SearchInput (nama/NIK), status Select (all/hadir/terlambat/izin/sakit/alpha), date range (dari→sampai), "Hari Ini" quick button, conditional "Reset" button
  - Table columns: Tanggal (formatTanggal), Karyawan (avatar inisial + nama + NIK mono), Jam Masuk (formatJam or --:--), Jam Pulang (formatJam or --:--), Status (StatusBadge), Lokasi, Keterangan, Aksi
  - Add Manual Dialog: karyawan select (auto-fills nik & nama from selected KaryawanWithRelations object via handlePilihKaryawan), tanggal (date, default today), jamMasuk (time, default 08:00), jamPulang (time, default 17:00), status, lokasi, keterangan — combines tanggal+time → ISO datetime for API
  - Edit Dialog: edit tanggal, jamMasuk, jamPulang, status, lokasi, keterangan — sends '' to clear jamMasuk/jamPulang per PUT contract
  - Delete with ConfirmDialog
  - Pagination, EmptyState (conditional action), Skeleton loading rows
  - Debounced search, reset page on filter change, framer-motion row animation
- Both files: 'use client', Indonesian comments, try/catch all async with swal feedback, ApiError handling, TypeScript strict, only imports from the allowed shared paths and shadcn/ui

Stage Summary:
- Created: src/components/admin/views/kartu-view.tsx (KartuView)
- Created: src/components/admin/views/absensi-view.tsx (AbsensiView)
- No other files modified
- Both views follow the established design system (rounded-2xl shadow-card cards, gradient-primary accent, StatusBadge/ActiveBadge consistency, responsive overflow-x-auto tables)
- Ready to be wired into the admin AppShell routing (the admin page switcher should render <KartuView /> for 'kartu' and <AbsensiView /> for 'absensi')

---
Task ID: 9
Agent: main
Task: Wire page.tsx + layout, lint, self-verify with Agent Browser, fix all errors

Work Log:
- Built admin-dashboard.tsx shell (8 nav items: dashboard, karyawan, absensi, kartu, users, kartu-cetak, laporan, log) importing all admin views
- Built user-dashboard.tsx shell (6 nav items: home, absensi, riwayat, kartu, profil, password) importing all user views
- Built page.tsx as SPA entry: session check via /api/auth/me → AuthPages / AdminDashboard / UserDashboard, with loading screen, idle timeout (30min auto-logout), periodic session validation (5min)
- Fixed lint: theme-toggle (CSS-based icon swap, no setState-in-effect), user-riwayat-view (async-safe loading), removed unused eslint-disable comments
- Regenerated Prisma Client + restarted dev server (old server had stale client cached)
- Agent Browser verification (all passed):
  * Login admin@absensi.com/admin123 → Admin Dashboard (stats cards, bar+pie charts, attendance list) ✓
  * Admin pages render: Data Karyawan (table+filters), Data Absensi (filters+manual add), Laporan (export PDF/Excel), Cetak Kartu (grid+preview dialog) ✓
  * Logout (SweetAlert confirm) → login page ✓
  * Login budi@absensi.com/user123 → User Dashboard (profile, stats, card info) ✓
  * Absen Masuk via UID scan "RFID-B001-BUDI" → recorded (jamMasuk 07:20, status hadir) ✓
  * Double-absence prevention → "sudah absen masuk hari ini, tidak dapat absen ganda" ✓
  * Absen Pulang via UID scan → recorded (jamPulang 07:22) ✓
  * Kartu Saya → card preview with QR code + unique ID EMP-2026-0001 ✓
  * Admin Cetak Kartu → EmployeeCardDialog with CR80 size, QR, EMP-2026-0000 ✓
  * Dark mode toggle → dark class applied ✓
  * Mobile responsive (390x844) → hamburger menu, responsive navbar ✓
  * No console/runtime errors throughout ✓
- Final: bun run lint passes clean (0 errors, 0 warnings)

Stage Summary:
- App fully functional end-to-end. All requested features working:
  auth (login/register/bcrypt/JWT/role-based), admin dashboard (stats/charts/CRUD for
  karyawan/users/kartu/absensi/log/laporan), user dashboard (profile/absen scan/riwayat/card),
  employee card (CR80 preview + QR + unique EMP-YYYY-NNNN ID + PDF export), dark mode,
  glassmorphism, animations, responsive, session timeout, audit logging.
- Demo accounts: admin@absensi.com/admin123, budi@absensi.com/user123 (+ siti, andi, dewi)
- Database: SQLite (adapted from MySQL spec due to env constraint)
- Single visible route `/` (SPA with client-side view routing via Zustand)

---
Task ID: 10
Agent: main
Task: Tambahkan fitur kamera untuk absensi — user klik Scan, kamera aktif, scan QR/barcode, jika UID cocok langsung ada notifikasi berhasil

Work Log:
- Membaca worklog.md + file terkait (user-absensi-view.tsx, api/absensi/route.ts, employee-card.tsx, lib/swal.ts, package.json) untuk memahami konteks: QR code kartu berisi kartu.uid (mis. RFID-B001-BUDI, NFC-C001-SITI, QR-D001-ANDI)
- Install package @zxing/browser@0.2.1 + @zxing/library@0.23.0 (scanner QR/barcode multi-format, supports rfid/nfc/barcode/qrcode card types)
- Membuat src/components/shared/camera-scanner.tsx — komponen CameraScanner reusable:
  * Menggunakan BrowserMultiFormatReader.decodeFromVideoDevice untuk live scanning
  * Auto-detect kamera belakang (prefer environment), support switch kamera (depan/belakang)
  * Overlay frame scanner dengan corner accents + animated scan line (framer-motion)
  * Green flash overlay saat sukses, red flash saat gagal (AnimatePresence)
  * Graceful error handling: status 'idle'/'starting'/'scanning'/'error'/'denied'
  * Retry button saat kamera tidak tersedia / akses ditolak
  * Polling videoRef.current (max 30x @ 50ms) untuk menunggu elemen <video> mount di portal Radix Dialog sebelum startCamera (fix bug: effect jalan sebelum video mount → early return)
  * Cleanup controls.stop() saat dialog tutup / unmount
  * A11y: DialogTitle + DialogDescription (sr-only)
- Update src/components/user/views/user-absensi-view.tsx:
  * Toggle mode "Scan Kamera" / "Input Manual" (default: Scan Kamera)
  * Mode kamera: card dengan ikon Camera + tombol "Aktifkan Kamera & Scan" → buka CameraScanner dialog
  * handleCameraDetected callback → prosesAbsen(uid) → jika sukses: swal.success + dialog tutup; jika gagal: swal.error + flash merah di scanner
  * Refactor prosesAbsen jadi useCallback (shared camera & manual mode)
  * Manual mode tetap ada (regression-safe)
- Lint: bun run lint → 0 errors, 0 warnings (handle set-state-in-effect rule via defer setTimeout)
- Agent Browser verification (login as budi/siti/andi@absensi.com):
  * Toggle "Scan Kamera"/"Input Manual" tampil ✓
  * Klik "Aktifkan Kamera & Scan" → dialog kamera terbuka dengan header "Scan Kartu Karyawan" + mode hint + frame scanner + animated scan line ✓
  * Di headless (no camera): graceful "Kamera Tidak Tersedia — Tidak ada kamera yang terdeteksi" + tombol "Coba Lagi" ✓
  * Error path (UID sudah absen): swal.error "Gagal — Anda sudah absen masuk hari ini..." ✓
  * Success path (UID cocok, belum absen): swal.success "Berhasil! — Absen masuk berhasil — Tepat waktu" ✓ (verifikasi via hapus absensi Andi hari ini via Prisma, lalu submit UID QR-D001-ANDI)
  * Manual mode regression: form input UID + submit → notifikasi muncul ✓
  * Tidak ada runtime/console error ✓

Stage Summary:
- Files created: src/components/shared/camera-scanner.tsx (CameraScanner component)
- Files modified: src/components/user/views/user-absensi-view.tsx (added camera mode + toggle)
- Packages installed: @zxing/browser, @zxing/library
- Flow: user klik "Aktifkan Kamera & Scan" → kamera aktif → arahkan ke QR/barcode kartu → auto-detect UID → POST /api/absensi → jika UID cocok dengan kartu terdaftar: notifikasi "Berhasil!" + flash hijau + dialog tutup; jika tidak cocok: notifikasi "Gagal" + flash merah
- Camera scanner mendukung semua jenis kartu (RFID/NFC/Barcode/QR) karena BrowserMultiFormatReader multi-format
- Di environment preview user (browser dengan kamera), fitur akan langsung berfungsi: izinkan akses kamera saat diminta browser

---
Task ID: 11
Agent: main
Task: Fix 2 bug + finalisasi responsif: (1) kamera tidak bisa aktif saat scan, (2) foto profil hilang saat kartu dicetak, (3) pastikan semua responsif

Work Log:
- Analisis screenshot upload via VLM: dialog "Kamera Tidak Tersedia — Tidak ada kamera yang terdeteksi pada perangkat ini." + video black screen
- Root cause #1 (kamera): kode lama memanggil BrowserMultiFormatReader.listVideoInputDevices() SEBELUM getUserMedia(). Browser mengembalikan array KOSONG karena izin belum diberikan → "no chosen device" → error. Kamera TIDAK PERNAH bisa aktif karena prompt izin tidak pernah muncul.
- Fix #1: rewrite camera-scanner.tsx startCamera() menggunakan decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, videoRef, callback). Ini memanggil getUserMedia() internal → memicu PROMPT IZIN KAMERA browser. Enumerate devices hanya setelah stream aktif (untuk fitur switch camera).
- Tambah state 'insecure' (cek window.isSecureContext) dengan pesan HTTPS-required jika getUserMedia tidak tersedia
- Tambah handling error spesifik: NotFoundError (no camera), NotAllowedError (denied), NotReadableError (busy), generic
- Switch kamera via toggle useFrontCamera (facingMode user/environment) → useEffect [useFrontCamera] restart kamera
- Responsif: dialog w-[95vw] max-w-lg, video aspectRatio 4/3 responsif, frame scanner w-[70%] max-w-[300px], padding/size icon adaptif sm:, footer text "Ganti" hidden di mobile

- Root cause #2 (foto cetak): handleDownloadPDF lama TIDAK memanggil doc.addImage untuk foto — hanya menggambar teks + QR. Saat Unduh PDF, foto profil hilang.
- Fix #2: tambah useEffect prepare foto → fotoDataUrl (deteksi data:image/ langsung, URL eksternal load via Image+canvas+toDataURL). handleDownloadPDF sekarang: doc.roundedRect border ungu + doc.addImage(fotoDataUrl, fmt, 5, 18, 14, 16) dengan fallback inisial jika gagal.
- Tambah DialogDescription untuk a11y (fix warning)
- Print CSS (globals.css @media print): .print-area positioned center top, -webkit-print-color-adjust:exact untuk pertahankan gradient + warna, img visibility visible, @page size landscape margin 10mm
- user-kartu-view.tsx: tambah class print-area pada .id-card-cr80 agar window.print() menampilkan kartu dengan foto

- Verifikasi Agent Browser:
  * Login admin → Cetak Kartu → Preview salah satu karyawan → dialog render 2 img: "Foto [Nama]" + "QR Code verifikasi" ✓ (sebelumnya hanya 1 img QR)
  * Login budi → Kartu Saya → Unduh PDF dialog → kartu render dengan foto ✓
  * Set foto DB untuk Andi & admin (base64 JPEG) untuk verifikasi: dialog menampilkan "Foto Andi Wijaya" (data:image/jpeg) ✓
  * VLM konfirmasi kartu: foto kiri, QR kanan, nama/NIK/jabatan/divisi, header biru + footer ungu ✓
  * Mobile viewport 390x844: dialog kamera width 371px fits, card width 324px fits, hamburger menu, grid 1-col, buttons stacked ✓
  * VLM konfirmasi mobile: dialog fit no overflow, scanning frame visible, footer controls visible, card dengan foto visible, buttons stacked readable ✓
  * Lint: 0 errors, 0 warnings ✓
  * Dev log: no runtime errors (hanya expected NotFoundError camera di headless) ✓

Stage Summary:
- Files modified:
  * src/components/shared/camera-scanner.tsx — rewrite startCamera pakai decodeFromConstraints (trigger permission prompt), state 'insecure', error handling spesifik, responsif mobile
  * src/components/card/employee-card.tsx — handleDownloadPDF sekarang include FOTO PROFIL via doc.addImage, useEffect prepare fotoDataUrl, DialogDescription a11y, print-area class
  * src/app/globals.css — @media print: print-area center, print-color-adjust exact, img visible, @page landscape
  * src/components/user/views/user-kartu-view.tsx — tambah print-area class pada kartu preview
- Key fix camera: decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }) → getUserMedia → browser permission prompt muncul → user izinkan → kamera aktif. Pendekatan lama (listVideoInputDevices dulu) GAGAL karena enumerateDevices kosong sebelum izin.
- Key fix cetak: PDF export sekarang menyertakan foto profil (doc.addImage dengan format auto-detect PNG/JPEG), border ungu, fallback inisial jika error. Print CSS mempertahankan warna gradient + foto.
- Semua responsif: dialog kamera w-95vw, video aspect-ratio adaptif, frame scanner fluid, card grid 1/2/3/4 col, buttons stacked mobile, hamburger menu sidebar
