# Task 6-a — Admin Karyawan & Users CRUD Views

## Task
Create TWO admin dashboard sub-views (rendered inside AppShell, SPA under `/` route):
1. `KaryawanView` — `src/components/admin/views/karyawan-view.tsx`
2. `UsersView` — `src/components/admin/views/users-view.tsx`

## Files Created (only these two)

### 1. `src/components/admin/views/karyawan-view.tsx`
Exports `KaryawanView` — full CRUD for karyawan data:
- **PageHeader**: "Data Karyawan" + Refresh button + "Tambah Karyawan" button (gradient-primary).
- **Filter bar** (Card): SearchInput (cari nama/NIK/jabatan/email) + Select divisi (all/IT/Human Resource/Marketing/Finance/Umum) + Select status (all/aktif/nonaktif/cuti). Filter change resets page=1.
- **Responsive Table** (overflow-x-auto) columns:
  - Foto (Avatar with AvatarImage + gradient-primary fallback initials)
  - NIK (mono)
  - Nama + noTelepon
  - Jabatan
  - Divisi (badge)
  - Email (hidden lg:table-cell)
  - Status (`KaryawanStatusBadge` — uses `ActiveBadge` for aktif/nonaktif + custom amber badge for cuti)
  - Kartu (idKartu or '-')
  - Aksi (DropdownMenu: Edit / Hapus)
- **Loading**: 6-row skeleton with animate-pulse
- **Empty state**: EmptyState with "Tambah Karyawan" CTA
- **Pagination**: shared `<Pagination>` component
- **Add/Edit Dialog** (max-w-2xl, scrollable body, max-h-[90vh]):
  - Foto upload (FileReader → data URL) with preview + remove, 2MB limit
  - Grid form: nama, nik (disabled on edit, hint "auto-generate"), jabatan, divisi select, noTelepon, email
  - alamat (Textarea)
  - status select (aktif/nonaktif/cuti)
  - Kartu section: uid + jenis (rfid/nfc/barcode/qrcode)
  - Buat Akun Login checkbox (only on create) — reveals email + password fields
- **Submit**: validates required fields → `swal.loading` → api.post/api.put → `swal.success`/`swal.error`
- **Delete**: ConfirmDialog → `api.del` → `swal.success` → page-back logic if last row on page > 1
- **Animations**: framer-motion staggered row entrance
- State: `items`, `total`, `totalPages`, `page`, `loading`, `q`, `debouncedQ` (350ms), `divisi`, `status`, `dialogOpen`, `editing`, `form`, `saving`, `deleteTarget`
- Type extension: `KaryawanItem = KaryawanWithRelations & { user?: {...} | null }`

### 2. `src/components/admin/views/users-view.tsx`
Exports `UsersView` — full CRUD for user accounts:
- **PageHeader**: "Manajemen User" + Refresh + "Tambah User" button.
- **Filter**: SearchInput (cari nama/email, debounced 350ms).
- **Responsive Table** columns:
  - User (Avatar + nama + "Anda" badge if self; email shown inline on mobile)
  - Email (hidden md:table-cell, with Mail icon)
  - Role (`RoleBadge`: admin = gradient-primary + Shield icon, user = outline + User icon)
  - Status (`ActiveBadge`)
  - Karyawan (nik/jabatan·divisi, hidden lg:table-cell)
  - Tanggal Registrasi (formatTanggal, hidden sm:table-cell, CalendarDays icon)
  - Aksi (DropdownMenu: Edit, Hapus — Hapus `disabled` for self)
- **Loading**: 6-row skeleton
- **Empty state**: EmptyState with CTA
- **Pagination**: shared component
- **Add/Edit Dialog** (max-w-md):
  - namaLengkap (always)
  - email + password (only on add, password field text type, autocomplete=new-password)
  - email (disabled on edit, with hint)
  - role select (user/admin)
  - status select (aktif/nonaktif)
- **Submit**: `swal.loading` → api.post/api.put → `swal.success`/`swal.error`
- **Delete**: ConfirmDialog → `api.del` → `swal.success`; defense-in-depth self-delete check using `useAuthStore` currentUser id (API also blocks)
- **Animations**: framer-motion staggered row entrance
- Uses `useAuthStore` for current user detection.

## API Contracts Used
- `GET /api/karyawan?q=&divisi=&status=&page=1&limit=10` → `{ items: KaryawanWithRelations & {user}, total, page, limit, totalPages }`
- `POST /api/karyawan` → `{ nama, nik?, jabatan, divisi, alamat?, noTelepon?, email?, status?, foto?, uid?, jenis?, buatAkun?, password? }`
- `PUT /api/karyawan/[id]` → `{ nama?, jabatan?, divisi?, alamat?, noTelepon?, email?, status?, foto?, uid?, jenis?, masaBerlaku? }`
- `DELETE /api/karyawan/[id]`
- `GET /api/users?q=&page=1&limit=10` → `{ items: SafeUser & { karyawan?: {nik,divisi,jabatan} }, total, page, limit, totalPages }`
- `POST /api/users` → `{ namaLengkap, email, password, role, status }`
- `PUT /api/users/[id]` → `{ role?, status?, namaLengkap? }`
- `DELETE /api/users/[id]` (API blocks self-delete)

## Design Decisions
- **Debounced search (350ms)**: prevents API spam as user types.
- **Single Dialog for Add/Edit** controlled by `editing` state — reduces duplicate UI code.
- **NIK field disabled on edit**: NIK is a stable identifier (auto-generated on create per existing API contract).
- **Email disabled on edit for users**: API only allows updating role/status/namaLengkap, not email.
- **"Buat Akun Login" only shown on create**: PUT /api/karyawan/[id] doesn't accept buatAkun/password; account creation is a create-time concern.
- **KaryawanStatusBadge**: ActiveBadge only handles aktif/nonaktif, so wrapped with custom amber badge for cuti.
- **RoleBadge**: admin shown in gradient-primary (matches app theme), user in outline — clearly distinguishes privileges.
- **Self-delete protection**: UI disables the menu item AND shows "Anda" badge next to current user; defense-in-depth with API's own check.
- **Page-back on last-row delete**: if deleting the only row on page > 1, decrement page so we don't land on an empty page.
- **Styling**: rounded-2xl cards with `shadow-card`; primary actions use `gradient-primary text-white border-0`; semantic `text-primary`/`bg-primary` only — no raw indigo/blue utilities. Glass-friendly neutral backgrounds.
- **Imports**: only from allowed paths (`@/components/shared/*`, `@/components/ui/*`, `@/lib/api`, `@/lib/swal`, `@/lib/utils`, `@/store/auth-store`, `@/types`, `framer-motion`, `lucide-react`).

## Status
✅ Both view files written. No other files modified. No test files created. Did NOT run lint/build per task instructions.
