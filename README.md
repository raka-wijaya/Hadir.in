# Hadir.in (Sistem Informasi Presensi Magang)

Hadir.in adalah sistem informasi berbasis web yang dirancang untuk mengelola presensi harian, perizinan, tugas (jobdesk), rekap kegiatan (log book), dan manajemen data peserta magang serta karyawan Outsourcing (OS) secara terpusat, real-time, dan terintegrasi.

---

## Daftar Isi

1. [Fitur Utama](#fitur-utama)
2. [Role & Hak Akses Pengguna](#role--hak-akses-pengguna)
3. [Teknologi yang Digunakan](#teknologi-yang-digunakan)
4. [Struktur Project](#struktur-project)
5. [Arsitektur Aplikasi](#arsitektur-aplikasi)
6. [Database & Struktur Tabel](#database--struktur-tabel)
7. [API & Endpoint](#api--endpoint)
8. [Authentication & Authorization](#authentication--authorization)
9. [Sistem Presensi](#sistem-presensi)
10. [Sistem Izin](#sistem-izin)
11. [Sistem Tugas](#sistem-tugas)
12. [Sistem Log Book](#sistem-log-book)
13. [Dashboard & Statistik](#dashboard--statistik)
14. [Sistem UI / UX](#sistem-ui--ux)
15. [Environment Variable](#environment-variable)
16. [Instalasi & Menjalankan Project](#instalasi--menjalankan-project)
17. [Build & Deployment](#build--deployment)
18. [Keamanan](#keamanan)
19. [Troubleshooting](#troubleshooting)
20. [Pengembangan Selanjutnya](#pengembangan-selanjutnya)
21. [Lisensi & Kontributor](#lisensi--kontributor)

---

## Fitur Utama

Berdasarkan implementasi source code yang tersedia di dalam project:

- **Autentikasi Multi-Entitas**: Login terpadu menggunakan identifier fleksibel (email, nomor identitas/NIM/NIK, atau nomor telepon) yang memeriksa tabel `admin`, `karyawan_os`, dan `peserta_magang`.
- **Manajemen Registrasi & Verifikasi Akun**: Registrasi publik untuk calon admin atau karyawan OS dengan alur verifikasi status (`PENDING`, `APPROVED`, `REJECTED`).
- **Presensi Harian Real-time**: Check-in (Masuk) dan Check-out (Pulang) dilengkapi pengambilan foto selfie/kamera dan deteksi keterlambatan serta pulang cepat otomatis sesuai jam operasional.
- **Pengajuan & Pengelolaan Izin**: Form perizinan dengan lampiran berkas bukti (file/gambar) untuk peserta magang dan karyawan OS, serta antarmuka admin untuk mengelola pengajuan izin.
- **Sistem Jobdesk / Tugas**: Pemberian tugas kepada peserta magang dengan status pengerjaan (`BELUM_DIKERJAKAN`, `SELESAI`) yang dapat ditautkan ke entri log book.
- **Log Book Kegiatan**: Pencatatan aktivitas harian peserta magang dengan kategori resmi instansi, rentang waktu pengerjaan, dan dukungan pencetakan laporan.
- **Pendaftaran Magang Online**: Manajemen berkas pendaftaran calon peserta magang baru dengan workflow persetujuan (`PENDING`, `DITERIMA`, `DITOLAK`).
- **Rekapitulasi Kehadiran & Ekspor Cetak**: Rekap presensi dengan filter tanggal, status kehadiran, dan fitur cetak rekap kehadiran resmi.
- **Pengaturan Sistem Dinamis**: Konfigurasi jam operasional (masuk, pulang reguler, pulang hari Jumat), batas toleransi menit keterlambatan, hari kerja aktif, kalender hari libur, nomor WhatsApp admin, serta periode buka/tutup pendaftaran.
- **Server Clock Synchronization**: Waktu presensi disinkronkan langsung dengan jam server backend (`Asia/Jakarta`).
- **Global Key Event Protection**: Pencegahan submit tidak disengaja melalui pemblokiran tombol `Enter` secara global di seluruh antarmuka web (kecuali pada elemen `textarea`).

---

## Role & Hak Akses Pengguna

Hak akses diatur melalui permission matrix di `src/lib/permissions.ts`:

| Role | Dashboard Default | Hak Akses Halaman |
| :--- | :--- | :--- |
| **`SUPERADMIN`** | `/admin/dashboard` | Akses penuh ke seluruh menu: Dashboard, Pendaftaran, Anak Magang, Pegawai OS, Izin, Log Book, Rekap Kehadiran, Tugas, Pengaturan Sistem, Verifikasi Akun, Profil. |
| **`ADMIN_MAGANG`** | `/admin/dashboard` | Dashboard, Pendaftaran Magang, Data Anak Magang, Izin, Log Book, Rekap Kehadiran, Profil. |
| **`ADMIN_OS`** | `/admin/dashboard` | Dashboard, Data Pegawai OS, Izin, Rekap Kehadiran, Profil. |
| **`ANAK_MAGANG`** | `/magang/dashboard` | Dashboard, Kehadiran (Check-in/Check-out), Terlambat, Pengajuan Izin, Riwayat Presensi, Profil, Jobdesk/Tugas, Log Book Harian. |
| **`KARYAWAN_OS`** | `/pegawai-os/dashboard` | Dashboard, Kehadiran (Check-in/Check-out), Terlambat, Pengajuan Izin, Riwayat Presensi, Profil. |

---

## Teknologi yang Digunakan

### Core Framework & Bahasa
- **Next.js**: `^16.3.2` (React Framework dengan App Router architecture)
- **React**: `^19.2.4` / React DOM `^19.2.4`
- **TypeScript**: `^5.9.3`
- **Node.js**: Environment runtime server-side

### Database & Data Access
- **MySQL Database**: Engine database relasional
- **mysql2 / promise**: `^3.13.0` (Connection pooling client native untuk eksekusi query parameterized)
- **Prisma**: `^7.9.1` & `@prisma/client: ^7.9.1` (Schema definitions dan declarative models)

### Styling & UI Components
- **TailwindCSS**: `^4.0.0`
- **Mantine Core**: `@mantine/core ^9.5.1` & `@mantine/hooks ^9.5.1`
- **HeroUI**: `@heroui/react ^3.2.4`
- **Lucide React**: `^1.34.0` (Icon library)
- **Phosphor Icons**: `@phosphor-icons/react ^2.1.10`
- **Framer Motion**: `^13.1.0` (Animasi transisi antarmuka)
- **Recharts**: `^3.10.1` (Grafik statistik visual)
- **clsx** (`^2.1.1`) & **tailwind-merge** (`^3.6.0`): Dynamic class merging utilities

### Keamanan & Utilitas
- **bcryptjs**: `^3.0.3` (Hashing dan verifikasi password)
- **date-fns**: `^4.4.0` (Manipulasi tanggal dan waktu)

---

## Struktur Project

```text
SiPresma/
├── public/
│   ├── uploads/                     # Direktori penyimpanan media lokal
│   │   ├── absensi/DD-MM-YYYY/      # Foto bukti check-in/check-out
│   │   ├── avatars/                 # Foto profil user
│   │   ├── izin/                    # File lampiran perizinan
│   │   └── pendaftar/               # Berkas pendaftaran peserta
│   └── ...                          # Aset statis & ikon
├── prisma/
│   └── schema.prisma                # Definisi model data Prisma
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── admin/                   # Modul halaman role Admin (Superadmin/Magang/OS)
│   │   │   ├── anak-magang/         # Manajemen peserta magang
│   │   │   ├── dashboard/           # Dashboard analitik admin
│   │   │   ├── izin/                # Pengelolaan izin
│   │   │   ├── log-book/            # Monitoring log book
│   │   │   ├── pegawai-os/          # Manajemen karyawan OS
│   │   │   ├── pendaftaran/         # Verifikasi pendaftaran magang
│   │   │   ├── pengaturan/          # Pengaturan sistem
│   │   │   ├── profil/              # Profil admin
│   │   │   ├── rekap-kehadiran/     # Laporan & rekap presensi
│   │   │   ├── roles/               # Pengaturan role
│   │   │   ├── tugas/               # Distribusi tugas/jobdesk
│   │   │   └── verifikasi-akun/     # Verifikasi akun pendaftar baru
│   │   ├── api/                     # Backend API Route Handlers
│   │   │   ├── absensi/             # Endpoint presensi harian
│   │   │   ├── admin/               # Endpoint data admin
│   │   │   ├── attendance/          # Endpoint data presensi
│   │   │   ├── auth/                # Login, register, reset-password
│   │   │   ├── db-status/           # Healthcheck koneksi database
│   │   │   ├── izin/                # Endpoint pengajuan izin
│   │   │   ├── jobdesk/             # Endpoint jobdesk
│   │   │   ├── karyawan_os/         # Endpoint data karyawan OS
│   │   │   ├── log-book/            # Endpoint kegiatan log book
│   │   │   ├── pendaftar/           # Endpoint data pendaftar magang
│   │   │   ├── pendaftaran/         # Endpoint registrasi magang
│   │   │   ├── peserta_magang/      # Endpoint data anak magang
│   │   │   ├── server-time/         # Endpoint waktu server tersinkronisasi
│   │   │   ├── settings/            # Endpoint konfigurasi sistem
│   │   │   ├── statistics/          # Endpoint metrik statistik dashboard
│   │   │   ├── tugas/               # Endpoint tugas
│   │   │   └── users/               # Resource endpoints entitas user
│   │   ├── magang/                  # Modul halaman role Anak Magang
│   │   │   ├── absensi/             # Absensi
│   │   │   ├── dashboard/           # Dashboard peserta
│   │   │   ├── izin/                # Formulir pengajuan izin
│   │   │   ├── jobdesk/             # Daftar tugas diterima
│   │   │   ├── kehadiran/           # Check-in / check-out
│   │   │   ├── log-book/            # Pengisian log book harian
│   │   │   ├── profil/              # Profil peserta
│   │   │   ├── riwayat/             # Riwayat presensi pribadi
│   │   │   └── terlambat/           # Rekap keterlambatan
│   │   ├── pegawai-os/              # Modul halaman role Karyawan OS
│   │   │   ├── absensi/             # Absensi
│   │   │   ├── dashboard/           # Dashboard karyawan OS
│   │   │   ├── izin/                # Formulir pengajuan izin
│   │   │   ├── kehadiran/           # Check-in / check-out
│   │   │   ├── profil/              # Profil karyawan OS
│   │   │   ├── riwayat/             # Riwayat presensi karyawan OS
│   │   │   └── terlambat/
│   │   ├── login/                   # Halaman masuk sistem
│   │   ├── register/                # Halaman registrasi akun baru
│   │   ├── lupa-password/           # Halaman reset password
│   │   ├── layout.tsx               # Root Layout & Global Providers
│   │   └── page.tsx                 # Landing / Redirector root
│   ├── components/                  # Reusable UI Components
│   │   ├── AlertModal.tsx           # Modal dialog info & error
│   │   ├── ConfirmModal.tsx         # Modal dialog konfirmasi aksi
│   │   ├── DashboardLayout.tsx      # Kerangka layout utama dashboard
│   │   ├── EnterKeyBlocker.tsx      # Komponen pencegah trigger key Enter
│   │   ├── ModalPortal.tsx          # Portal DOM rendering modal
│   │   ├── NotificationProvider.tsx # Provider sistem toast notifikasi
│   │   ├── PhotoModal.tsx           # Modal tampilan foto presensi
│   │   ├── ServerClock.tsx          # Widget jam digital server
│   │   ├── Spinner.tsx              # Loading indicator
│   │   └── StatusBadge.tsx          # Badge status dinamis
│   ├── context/
│   │   └── AuthContext.tsx          # State management user, session & auth
│   ├── hooks/                       # Custom React hooks
│   ├── lib/                         # Server & client shared logic
│   │   ├── db/
│   │   │   └── prisma.ts            # Pool koneksi MySQL2 & parser DATABASE_URL
│   │   ├── permissions.ts           # Matrix navigasi & otorisasi role
│   │   └── utils/
│   │       ├── api-helpers.ts       # Standardized response helper
│   │       └── storage.ts           # File upload helper (FormData & Base64)
│   └── types/                       # TypeScript interface & type definitions
├── .env                             # Environment configuration (ignored)
├── next.config.mjs                  # Konfigurasi Next.js & allowedDevOrigins
├── package.json                     # Daftar package & script
├── tailwind.config.ts               # Konfigurasi tema Tailwind CSS
└── tsconfig.json                    # Konfigurasi TypeScript
```

---

## Arsitektur Aplikasi

```text
[ Browser Client ]
       │
       ├─► Global State: AuthContext (localStorage 'hadirin_user', Session Inactivity Tracker)
       ├─► Global Key Blocker: EnterKeyBlocker (Mencegah submit accidental)
       ├─► Server Clock Sync: Sinkronisasi waktu Asia/Jakarta dari /api/server-time
       │
       ▼ (HTTP Fetch / JSON / Multipart FormData)
[ Next.js API Routes (Serverless / Node.js Engine) ]
       │
       ├─► Password Verification (bcryptjs)
       ├─► File Storage Utility (public/uploads/...)
       ├─► Business Logic (Presensi, Izin, Tugas, Log Book, Settings)
       │
       ▼ (Parameter-based SQL Query)
[ MySQL Database (via mysql2/promise connection pool) ]
       ├── admin
       ├── karyawan_os
       ├── peserta_magang
       ├── absensi
       ├── izin
       ├── tugas
       ├── log_book
       └── pengaturan_sistem
```

---

## Database & Struktur Tabel

Database utama menggunakan engine **MySQL** (default nama database: `hadir_in`). Interaksi aktif query backend menggunakan native connection pool via `mysql2/promise` dengan placeholder query `?` untuk keamanan dari injeksi SQL.

### 1. Tabel `admin`
Menyimpan kredensial dan data profil untuk administrator.
- **Primary Key**: `id` (INT Auto Increment)
- **Kolom Penting**:
  - `name`: VARCHAR - Nama lengkap admin
  - `email`: VARCHAR (Unique)
  - `phone`: VARCHAR
  - `password`: VARCHAR (Hashed dengan bcrypt)
  - `role`: ENUM (`SUPERADMIN`, `ADMIN_MAGANG`, `ADMIN_OS`)
  - `identity_number`: VARCHAR
  - `position`: VARCHAR
  - `avatar`: VARCHAR (Path foto profil)
  - `verification_status`: ENUM (`PENDING`, `APPROVED`, `REJECTED`)
  - `created_at`, `updated_at`: TIMESTAMP

### 2. Tabel `peserta_magang`
Menyimpan data peserta magang yang terdaftar aktif.
- **Primary Key**: `id` (INT Auto Increment)
- **Kolom Penting**:
  - `name`: VARCHAR - Nama lengkap siswa/mahasiswa
  - `email`: VARCHAR (Unique)
  - `phone`: VARCHAR
  - `password`: VARCHAR (Hashed dengan bcrypt)
  - `identity_number`: VARCHAR (NIM/NIS)
  - `institution`: VARCHAR (Sekolah/Universitas asal)
  - `department`: VARCHAR (Jurusan/Program Studi)
  - `start_date`, `end_date`: DATE (Periode magang)
  - `avatar`: VARCHAR
  - `status`: ENUM (`ACTIVE`, `INACTIVE`, `COMPLETED`)
- **Relasi**:
  - Berelasi ke `absensi.peserta_magang_id` (1-to-many)
  - Berelasi ke `tugas.peserta_magang_id` (1-to-many)
  - Berelasi ke `log_book` via tugas atau identitas peserta

### 3. Tabel `karyawan_os`
Menyimpan data karyawan Outsourcing (OS).
- **Primary Key**: `id` (INT Auto Increment)
- **Kolom Penting**:
  - `name`: VARCHAR
  - `email`: VARCHAR (Unique)
  - `phone`: VARCHAR
  - `password`: VARCHAR (Hashed)
  - `identity_number`: VARCHAR (NIK/NIP)
  - `position`: VARCHAR (Jabatan/Unit kerja)
  - `vendor`: VARCHAR (Nama agensi/vendor)
  - `avatar`: VARCHAR
  - `verification_status`: ENUM (`PENDING`, `APPROVED`, `REJECTED`)
  - `status`: ENUM (`ACTIVE`, `INACTIVE`)
- **Relasi**: Berelasi ke `absensi.karyawan_os_id` (1-to-many)

### 4. Tabel `absensi`
Mencatat presensi harian untuk peserta magang maupun karyawan OS.
- **Primary Key**: `id` (INT Auto Increment)
- **Foreign Keys**:
  - `peserta_magang_id`: INT (Nullable) -> `peserta_magang(id)`
  - `karyawan_os_id`: INT (Nullable) -> `karyawan_os(id)`
- **Kolom Penting**:
  - `tanggal`: DATE
  - `jam_masuk`: TIME
  - `jam_pulang`: TIME (Nullable)
  - `foto_masuk`: VARCHAR (Path file foto masuk)
  - `foto_pulang`: VARCHAR (Path file foto pulang)
  - `status_masuk`: ENUM (`TEPAT_WAKTU`, `TERLAMBAT`)
  - `status_pulang`: ENUM (`TEPAT_WAKTU`, `PULANG_CEPAT`)
  - `keterlambatan_menit`: INT (Durasi telat dalam menit)
  - `pulang_cepat_menit`: INT (Durasi pulang awal dalam menit)
  - `foto_pulang_cepat`: VARCHAR (Opsional foto jika izin pulang cepat)
  - `alasan_pulang_cepat`: TEXT
  - `status`: ENUM (`HADIR`, `IZIN`, `SAKIT`, `ALPA`)

### 5. Tabel `izin`
Menyimpan rekaman permohonan izin/sakit.
- **Primary Key**: `id` (INT Auto Increment)
- **Kolom Penting**:
  - `peserta_magang_id`: INT (Nullable)
  - `karyawan_os_id`: INT (Nullable)
  - `jenis`: VARCHAR (misal: "Sakit", "Keperluan Keluarga", dll.)
  - `tanggal_mulai`: DATE
  - `tanggal_selesai`: DATE
  - `alasan`: TEXT
  - `attachment`: VARCHAR (Path file dokumen/surat dokter di `public/uploads/izin/`)
  - `created_at`: TIMESTAMP

### 6. Tabel `tugas`
Menyimpan tugas/jobdesk yang diberikan kepada peserta magang.
- **Primary Key**: `id` (INT Auto Increment)
- **Foreign Key**:
  - `peserta_magang_id`: INT -> `peserta_magang(id)`
  - `log_book_id`: INT (Nullable) -> `log_book(id)`
- **Kolom Penting**:
  - `judul_tugas`: VARCHAR
  - `status_pengerjaan`: ENUM (`BELUM_DIKERJAKAN`, `SELESAI`)
  - `created_at`, `updated_at`: TIMESTAMP
- *Catatan Skema*: Kolom `deskripsi` dan `kategori` telah dihapus melalui migrasi pembaruan tabel agar referensi kategori dan detail pengerjaan langsung terintegrasi dengan tabel `log_book`.

### 7. Tabel `log_book`
Mencatat aktivitas detail harian peserta magang.
- **Primary Key**: `id` (INT Auto Increment)
- **Kolom Penting**:
  - `tanggal`: DATE
  - `waktu_mulai`: TIME
  - `waktu_selesai`: TIME
  - `kategori`: ENUM (Kategori spesifik: `'akta kelahiran'`, `'akta kematian'`, `'tambah bio data'`, `'pindah keluar'`, `'pindah datang'`, `'media'`, `'programmer'`)
  - `aktivitas`: TEXT (Uraian kegiatan yang dikerjakan)
  - `created_at`: TIMESTAMP

### 8. Tabel `pendaftaran`
Menampung calon peserta yang mendaftar program magang secara online.
- **Primary Key**: `id` (INT Auto Increment)
- **Kolom Penting**:
  - `nama`: VARCHAR
  - `email`: VARCHAR
  - `telepon`: VARCHAR
  - `institusi`: VARCHAR
  - `jurusan`: VARCHAR
  - `tanggal_mulai`: DATE
  - `tanggal_selesai`: DATE
  - `berkas_cv`: VARCHAR
  - `surat_pengantar`: VARCHAR
  - `status`: ENUM (`PENDING`, `DITERIMA`, `DITOLAK`)
  - `created_at`: TIMESTAMP

### 9. Tabel `pengaturan_sistem`
Konfigurasi operasional global aplikasi.
- **Primary Key**: `id` (INT)
- **Kolom Penting**:
  - `jam_masuk`: TIME (Default: `'07:30'`)
  - `jam_pulang`: TIME (Default: `'16:00'`)
  - `jam_pulang_jumat`: TIME (Default: `'14:00'`)
  - `batas_toleransi`: INT (Toleransi keterlambatan dalam menit, Default: `15`)
  - `hari_kerja`: TEXT/JSON (Array nama-nama hari operasional aktif)
  - `hari_libur`: TEXT/JSON (Array data tanggal hari libur beserta keterangannya)
  - `no_wa_admin_magang`: VARCHAR
  - `no_wa_admin_os`: VARCHAR
  - `tgl_buka_pendaftaran`: DATE
  - `tgl_tutup_pendaftaran`: DATE
  - `aktif_manual`: BOOLEAN (Override pembukaan sistem secara manual)

---

## API & Endpoint

Semua endpoint berakar di path `/api/` dan mengembalikan format JSON terstandarisasi `{ success, data, message }`.

### Autentikasi (`/api/auth`)
- **`POST /api/auth/login`**
  - **Fungsi**: Login pengguna lintas entitas.
  - **Body**: `{ identifier: string, password: string }`
  - **Alur**: Mencari kecocokan `identifier` (email, nomor identitas, atau telepon) pada tabel `admin`, lalu `karyawan_os`, lalu `peserta_magang`. Memverifikasi password via `bcryptjs.compare`.
  - **Response**: Mengembalikan status verifikasi akun dan user payload (tanpa hash password).
- **`POST /api/auth/register`**
  - **Fungsi**: Mendaftarkan akun admin atau karyawan OS baru dengan status awal `PENDING`.
  - **Body**: Data profil, role, identifier, dan password.
- **`POST /api/auth/reset-password`**
  - **Fungsi**: Memperbarui kata sandi akun pengguna.

### Presensi (`/api/absensi` & `/api/attendance`)
- **`GET /api/absensi`**
  - **Fungsi**: Mengambil daftar data presensi harian dengan parameter filter (`tanggal`, `bulan`, `tahun`, `user_id`, `role`).
- **`POST /api/absensi`**
  - **Fungsi**: Check-in presensi masuk. Menerima payload foto (Base64 atau FormData) dan mencatat waktu presensi terhadap jam masuk dan toleransi.
- **`PATCH /api/absensi`**
  - **Fungsi**: Check-out presensi pulang atau presensi pulang cepat (dengan alasan dan bukti foto).
- **`DELETE /api/absensi`**
  - **Fungsi**: Menghapus data rekaman absensi tertentu.

### Perizinan (`/api/izin`)
- **`GET /api/izin`**
  - **Fungsi**: Menampilkan riwayat permohonan izin berdasarkan filter user atau semua pengguna untuk admin.
- **`POST /api/izin`**
  - **Fungsi**: Mengajukan permohonan izin beserta unggahan dokumen pendukung ke `public/uploads/izin/`.
- **`DELETE /api/izin`**
  - **Fungsi**: Menghapus data permohonan izin.

### Manajemen Tugas & Jobdesk (`/api/tugas` & `/api/jobdesk`)
- **`GET /api/tugas`**
  - **Fungsi**: Mengambil daftar tugas berdasarkan filter `peserta_magang_id`.
- **`POST /api/tugas`**
  - **Fungsi**: Admin menambahkan tugas baru untuk peserta magang (`judul_tugas`, `peserta_magang_id`, `status_pengerjaan`).
- **`PATCH /api/tugas`**
  - **Fungsi**: Memperbarui status tugas (misal: menyelesaikan tugas atau menautkan `log_book_id`).
- **`DELETE /api/tugas`**
  - **Fungsi**: Menghapus tugas dari database.

### Log Book Kegiatan (`/api/log-book`)
- **`GET /api/log-book`**
  - **Fungsi**: Mengambil daftar log kegiatan berdasarkan tanggal atau identitas peserta.
- **`POST /api/log-book`**
  - **Fungsi**: Menambahkan entri kegiatan baru (memvalidasi kategori resmi, jam mulai, jam selesai, dan teks aktivitas).
- **`PATCH /api/log-book`**
  - **Fungsi**: Mengedit entri catatan log book.
- **`DELETE /api/log-book`**
  - **Fungsi**: Menghapus entri log book.

### Pendaftaran Magang (`/api/pendaftar` & `/api/pendaftaran`)
- **`GET /api/pendaftar`**
  - **Fungsi**: Mengambil daftar data pelamar magang dengan filter status (`PENDING`, `DITERIMA`, `DITOLAK`).
- **`POST /api/pendaftar`**
  - **Fungsi**: Menerima pendaftaran peserta baru dan menyimpan berkas CV serta surat pengantar.
- **`PATCH /api/pendaftar`**
  - **Fungsi**: Memperbarui status penerimaan pendaftar (terima/tolak).
- **`DELETE /api/pendaftar`**
  - **Fungsi**: Menghapus data pelamar.

### Pengaturan & Utilitas Sistem
- **`GET /api/settings`** & **`POST /api/settings`**: Membaca dan memperbarui record pengaturan jam kerja, toleransi, nomor WA, hari libur, dan jadwal pendaftaran di tabel `pengaturan_sistem`.
- **`GET /api/server-time`**: Mengembalikan timestamp dan objek jam server aktual dalam zona waktu `Asia/Jakarta` agar presensi tidak dimanipulasi oleh jam lokal perangkat pengguna.
- **`GET /api/statistics`**: Mengembalikan rekapitulasi data presensi hari ini (jumlah hadir, terlambat, izin, alpa, pulang cepat).
- **`GET /api/db-status`**: Healthcheck konektivitas pool database MySQL.

---

## Authentication & Authorization

1. **State & Penyimpanan Sesi**:
   - Sistem menggunakan **Client-side Authentication Context** (`src/context/AuthContext.tsx`).
   - Data sesi pengguna aktif disimpan di `localStorage` pada key:
     ```text
     hadirin_user
     ```
   - Tema antarmuka (dark/light) disimpan di `localStorage` pada key:
     ```text
     hadirin_theme
     ```

2. **Session Inactivity Timeout (Keamanan Sesi Otomatis)**:
   - Sistem secara aktif memantau interaksi pengguna melalui event listener (`mousedown`, `keydown`, `touchstart`, `click`).
   - Jika pengguna tidak melakukan aktivitas apa pun selama **10 menit** (`10 * 60 * 1000 ms`), sesi akan diakhiri secara otomatis (`logout`) dan diarahkan ke `/login`.
   - Interval pengecekan dilakukan setiap 10 detik dengan pembatasan pencatatan aktivitas maksimal sekali per 5 detik.

3. **Status Verifikasi Akun**:
   - Untuk entitas `admin` dan `karyawan_os`, terdapat kolom `verification_status`.
   - Jika berstatus `PENDING`, pengguna tidak diizinkan masuk dan diberi peringatan untuk menunggu persetujuan Superadmin melalui menu `/admin/verifikasi-akun`.

4. **Pembatasan Akses Route**:
   - Komponen navigasi dan proteksi halaman membaca matriks hak akses di `src/lib/permissions.ts`.
   - Redirect otomatis diterapkan di level Next.js routing (misal: mengakses `/magang/absensi` langsung dialihkan ke `/magang/kehadiran`).

---

## Sistem Presensi

Alur dan aturan bisnis presensi bekerja sebagai berikut:

1. **Sinkronisasi Jam Server**:
   - Waktu acuan presensi tidak menggunakan waktu lokal laptop/ponsel klien, melainkan ditarik dari `/api/server-time` (`Asia/Jakarta`).

2. **Jadwal Kerja & Aturan Waktu**:
   - **Jam Masuk Standar**: `07:30` (dapat dikonfigurasi).
   - **Toleransi Keterlambatan**: Default `15 menit` (hingga pukul `07:45`).
   - **Jam Pulang Reguler (Senin - Kamis)**: `16:00`.
   - **Jam Pulang Khusus Jumat**: `14:00`.

3. **Penentuan Status Presensi**:
   - **Masuk Tepat Waktu**: Melakukan check-in pada atau sebelum jam masuk + toleransi (`<= 07:45`). Status: `TEPAT_WAKTU`.
   - **Terlambat**: Melakukan check-in setelah batas toleransi (`> 07:45`). Status: `TERLAMBAT`, dengan perhitungan selisih menit keterlambatan yang otomatis tersimpan ke kolom `keterlambatan_menit`.
   - **Pulang Tepat Waktu**: Melakukan check-out pada atau setelah jam pulang operasional hari yang bersangkutan. Status: `PULANG_CEPAT` tidak aktif.
   - **Pulang Cepat**: Melakukan check-out sebelum jam pulang resmi. Sistem mewajibkan input alasan pulang cepat dan opsional bukti foto, serta menghitung selisih `pulang_cepat_menit`.

4. **Bukti Foto Kehadiran (Photo Capture)**:
   - Check-in dan Check-out mengambil capture webcam/kamera pengguna dalam bentuk data Base64 image atau FormData.
   - File disimpan pada direktori:
     ```text
     public/uploads/absensi/DD-MM-YYYY/
     ```
   - Format penamaan file otomatis:
     ```text
     {in|out|early}_{userId}_{DD-MM-YYYY}_{HHmmss}_{random}.jpg
     ```

---

## Sistem Izin

1. **Alur Pengajuan**:
   - Peserta Magang atau Karyawan OS mengisi formulir pengajuan izin melalui halaman `/magang/izin` atau `/pegawai-os/izin`.
   - Pengguna memilih rentang tanggal (`tanggal_mulai` s/d `tanggal_selesai`), jenis izin (Sakit/Izin Keperluan), mengisi deskripsi alasan, dan mengunggah dokumen bukti (surat dokter/surat keterangan).
2. **Penyimpanan Berkas**:
   - Berkas lampiran diunggah ke server dan disimpan pada folder:
     ```text
     public/uploads/izin/
     ```
3. **Penyajian Data Admin**:
   - Administrator dapat melihat seluruh daftar permohonan izin melalui menu `/admin/izin`, memeriksa lampiran dokumen bukti, dan melakukan audit kehadiran peserta.

---

## Sistem Tugas

1. **Pengelolaan Tugas oleh Admin**:
   - Admin memberikan tugas kepada peserta magang melalui menu `/admin/tugas`.
   - Data tugas memuat `judul_tugas` dan relasi wajib ke `peserta_magang_id`.
2. **Status Pengerjaan**:
   - Status pengerjaan tugas memiliki 2 state:
     - `BELUM_DIKERJAKAN`
     - `SELESAI`
3. **Integrasi ke Log Book**:
   - Tabel `tugas` memiliki foreign key `log_book_id` yang dapat ditautkan ke rekaman aktivitas log book saat tugas diselesaikan oleh peserta magang.

---

## Sistem Log Book

1. **Pencatatan Aktivitas**:
   - Peserta magang mencatat kegiatan kerja harian pada menu `/magang/log-book`.
   - Setiap entri mencatat tanggal pelaksanaan, `waktu_mulai`, `waktu_selesai`, serta deskripsi detail `aktivitas`.
3. **Monitoring & Cetak Laporan**:
   - Admin memantau seluruh catatan log book di `/admin/log-book`.
   - Halaman dilengkapi fitur cetak laporan log book untuk arsip pertanggungjawaban kegiatan magang.

---

## Dashboard & Statistik

Halaman dashboard menampilkan indikator data berikut:

- **Dashboard Admin (`/admin/dashboard`)**:
  - Jam digital realtime tersinkronisasi server.
  - Kartu statistik kehadiran hari ini: Total Hadir, Terlambat, Izin/Sakit, Belum Hadir / Alpa.
  - Grafik distribusi kehadiran dan kepatuhan waktu kerja.
  - Daftar presensi terbaru dan antrean tugas aktif.
  - Quick action untuk mengakses pendaftaran dan verifikasi akun.
- **Dashboard Peserta Magang & Pegawai OS**:
  - Status kehadiran hari ini (Sudah Masuk / Belum, Jam Presensi).
  - Tombol aksi cepat Check-in / Check-out dengan integrasi kamera.
  - Ringkasan total kehadiran, akumulasi menit keterlambatan, dan kuota izin.
  - Status tugas yang belum terselesaikan.

---

## Sistem UI / UX

- **Design System & Layout**:
  - Tema modern dan clean menggunakan Tailwind CSS, Mantine Core, dan HeroUI.
  - Dukungan Dark Mode dan Light Mode yang tersimpan di local storage pengguna.
- **Tipografi & Ikon**:
  - Menggunakan font sistem modern dipadukan dengan icon set dari `@phosphor-icons/react` dan `lucide-react`.
- **Komponen Feedback & Interaksi**:
  - **Toast Notifications**: Menggunakan custom `NotificationProvider` (`showNotification`) untuk notifikasi aksi sukses, gagal, atau peringatan.
  - **Modal Dialog**: Komponen `ConfirmModal` dan `AlertModal` dengan render via `ModalPortal`.
  - **Loading States**: Animasi indikator progress melalui komponen `Spinner`.
- **Global Key Event Protection**:
  - Dilengkapi komponen `EnterKeyBlocker` di root layout yang memblokir penekanan tombol `Enter` pada form/button secara global agar tidak terjadi accidental submission, kecuali pada elemen `textarea` untuk kebutuhan baris baru (newline).

---

## Environment Variable

Konfigurasi lingkungan didefinisikan pada file `.env` di root direktori project:

```env
# Koneksi Database MySQL
DATABASE_URL="mysql://username:password@host:port/database_name"

# Opsi konfigurasi koneksi terpisah (fallback jika DATABASE_URL tidak digunakan)
DB_HOST="..."
DB_PORT="..."
DB_USER="..."
DB_PASSWORD="..."
DB_NAME="..."

# Zona Waktu Sistem
NEXT_PUBLIC_TIMEZONE="Asia/Jakarta"
```

> **Catatan Keamanan**: Jangan pernah menyertakan username, password, atau credential asli database ke dalam version control repository.

---

## Instalasi & Menjalankan Project

### Prasyarat Sistem
- **Node.js**: Versi `>= 18.18.0` (Disarankan Node.js LTS)
- **Database**: MySQL Server versi `>= 5.7` atau `>= 8.0`
- **Package Manager**: `npm` (atau `yarn` / `pnpm`)

### Langkah-langkah Instalasi

1. **Clone Repository**:
   ```bash
   git clone <repository_url>
   cd Hadirin
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Salin file konfigurasi dan sesuaikan kredensial database Anda:
   ```bash
   cp .env.example .env # atau sesuaikan file .env yang ada
   ```

4. **Inisialisasi Database**:
   - Buat database baru di server MySQL Anda (contoh: `hadir_in`).
   - Pastikan skema tabel (`admin`, `peserta_magang`, `karyawan_os`, `absensi`, `izin`, `tugas`, `log_book`, `pendaftaran`, `pengaturan_sistem`) telah terbuat di database MySQL Anda.

5. **Menjalankan Development Server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan pada host default:
   ```text
   http://localhost:3000
   ```
   *(Sesuai konfigurasi script `package.json`, server berjalan pada mode `next dev -H 0.0.0.0` sehingga dapat diakses melalui IP lokal jaringan).*

---

## Build & Deployment

### Build Production
Untuk menguji dan menghasilkan bundle production yang dioptimasi:

```bash
npm run build
```

### Menjalankan Mode Production
Setelah proses build selesai, jalankan server production:

```bash
npm run start
```
Server production akan mendengarkan request pada port 3000 di seluruh interface network (`0.0.0.0:3000`).

### Pertimbangan Deployment
1. **Penyimpanan Berkas Unggahan (Persistent Storage)**:
   - File presensi, avatar, dan berkas izin disimpan secara lokal pada folder `public/uploads/`.
   - Pada deployment berbasis container (Docker) atau serverless (Vercel/AWS Amplify), pastikan direktori `public/uploads` dimount ke persistent volume, atau migrasikan ke Object Storage pihak ketiga (misal: S3/Cloudinary) jika sistem dideploy secara stateless.
2. **Reverse Proxy**:
   - Sangat disarankan menempatkan Nginx atau Caddy sebagai reverse proxy di depan Next.js server untuk mengelola SSL/HTTPS, kompresi Gzip/Brotli, dan perlindungan boundary jaringan.

---

## Keamanan

Berdasarkan implementasi source code aktif:

- **Password Hashing**: Kata sandi disimpan dalam bentuk terenkripsi menggunakan library `bcryptjs` (salt rounds standar), mencegah kebocoran password dalam bentuk plain-text.
- **SQL Injection Mitigation**: Seluruh kueri backend dieksekusi melalui prepared statement dan parameterized queries (`?` placeholder) via library `mysql2/promise`.
- **Session Auto-Expiry**: Mekanisme auto logout client-side setelah 10 menit tanpa interaksi pengguna guna mencegah pembajakan sesi pada komputer bersama.
- **File Storage Safety**: Direktori unggahan diorganisir per tanggal dan kategori dengan penamaan acak/timestamp unik untuk mencegah penimpaan file (file overwriting).
- **Pembatasan Tombol Enter Global**: Mengurangi risiko submit data formulir ganda secara tidak sengaja oleh pengguna.

*Catatan Keamanan Tambahan dari Analisis Source Code*:
- Otorisasi endpoint API saat ini berfokus pada validasi payload server-side; disarankan untuk menambahkan middleware validasi token/session cookie tersentralisasi (HTTP-only) untuk proteksi endpoint API yang lebih ketat.
- Rate limiting dan CSRF token: `Belum ditemukan dalam source code`.

---

## Troubleshooting

1. **Error Koneksi Database (`connect ECONNREFUSED` / Access Denied)**:
   - Periksa variabel `DATABASE_URL` pada file `.env`.
   - Pastikan service MySQL sedang aktif dan port (default 3306) dapat diakses.
   - Buka endpoint `http://localhost:3000/api/db-status` untuk mengecek konektivitas database langsung dari API.

2. **Gagal Mengunggah Foto Presensi**:
   - Pastikan folder `public/uploads/absensi/` memiliki izin baca dan tulis (*write permission*) oleh user runtime Node.js.
   - Pastikan izin akses webcam/kamera telah diizinkan pada browser pengguna.

3. **Akun Baru Tidak Bisa Login**:
   - Untuk akun admin dan karyawan OS yang baru didaftarkan, akun membutuhkan persetujuan oleh Superadmin terlebih dahulu pada menu `/admin/verifikasi-akun` (status awal adalah `PENDING`).

4. **Waktu Presensi Tidak Sesuai Jam Laptop**:
   - Waktu presensi disinkronkan langsung ke server backend dengan zona waktu `Asia/Jakarta`. Periksa pengaturan waktu pada server tempat aplikasi dihosting.

---

## Pengembangan Selanjutnya

Berdasarkan anotasi dan struktur file yang ditemukan:

- Penambahan middleware auth tersentralisasi di sisi server (misal: session cookie HTTP-only atau JWT signed token).
- Implementasi storage adapter cloud (AWS S3 / Google Cloud Storage) untuk direktori `public/uploads/`.
- Integrasi push notification atau pengiriman pesan otomatis WhatsApp gateway melalui field konfigurasi nomor WA admin yang sudah tersedia.
- Penyempurnaan modul permission level granular di halaman `/admin/roles`.

---

## Lisensi

Informasi lisensi: `Belum ditentukan dalam source code`.

---

## Kontributor

Informasi nama kontributor spesifik: `Belum ditemukan dalam source code`.
Dikembangkan untuk sistem presensi dan manajemen peserta program magang (Hadirin).
