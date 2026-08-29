// ============================================================
// SiPresma — Type Definitions
// Design System v2
//
// Database mapping:
// users
// absensi
// pendaftar
// periode
// pengaturan
// izin / leave request
// ============================================================


// ============================================================
// USER ROLE
// ============================================================
//
// Role yang digunakan di DATABASE:
//
// SUPERADMIN
// ADMIN_MAGANG
// ADMIN_OS
// ANAK_MAGANG
// KARYAWAN_OS
//
// Jangan menambahkan SUPER_ADMIN, ANAK_OS, atau PEGAWAI_OS
// karena tidak digunakan di database.
// ============================================================

export type UserRole =
  | "SUPERADMIN"
  | "ADMIN_MAGANG"
  | "ADMIN_OS"
  | "ANAK_MAGANG"
  | "KARYAWAN_OS";


// ============================================================
// USER STATUS
// ============================================================

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE";


// ============================================================
// ABSENSI STATUS
// ============================================================
//
// DB: absensi.status
//
// Status utama:
// hadir
// terlambat
// pulang_cepat
// izin
// sakit
// alpa
//
// Legacy compatibility:
// PRESENT
// LATE
// PERMITTED
// ABSENT
// ============================================================

export type AbsensiStatus =
  | "HADIR"
  | "IZIN"
  | "SAKIT"
  | "ALPA"
  | "TERLAMBAT"
  | "PULANG_CEPAT"
  | "TEPAT_WAKTU"
  | "hadir"
  | "terlambat"
  | "pulang_cepat"
  | "izin"
  | "sakit"
  | "alpa"
  | "PRESENT"
  | "LATE"
  | "PERMITTED"
  | "ABSENT";


// ============================================================
// STATUS MASUK
// ============================================================
//
// DB: absensi.status_masuk
// ============================================================

export type StatusMasuk =
  | "TEPAT_WAKTU"
  | "TERLAMBAT"
  | "tepat_waktu"
  | "terlambat";


// ============================================================
// STATUS PULANG
// ============================================================
//
// DB: absensi.status_pulang
//
// TEPAT_WAKTU  = pulang sesuai / setelah jam pulang standar
// PULANG_CEPAT = pulang sebelum jam pulang standar
// ============================================================

export type StatusPulang =
  | "TEPAT_WAKTU"
  | "PULANG_CEPAT"
  | "tepat_waktu"
  | "pulang_cepat";


// ============================================================
// PENDAFTAR STATUS
// ============================================================
//
// DB: pendaftar.status
// ============================================================

export type PendaftarStatus = "PENDING" | "DITERIMA" | "DITOLAK";


// ============================================================
// LEGACY COMPATIBILITY
// ============================================================

export type AttendanceStatus = AbsensiStatus;


// ============================================================
// LEAVE / IZIN
// ============================================================

export type LeaveType =
  | "SAKIT"
  | "KEPERLUAN_PRIBADI"
  | "LAINNYA"
  | "Sakit"
  | "Keperluan Pribadi"
  | "Lainnya";


export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PENDING"
  | "Disetujui"
  | "Ditolak";


// ============================================================
// REGISTRATION STATUS
// ============================================================

export type RegistrationStatus =
  | "PENDING"
  | "lolos"
  | "Ditolak"
  | "Menunggu"
  | "Diterima"
  | "Ditolak"
  | "Aktif"
  | "Selesai";


// ============================================================
// JOBDESK STATUS
// ============================================================

export type JobdeskStatus =
  | "Belum Mulai"
  | "Berjalan"
  | "Selesai";


// ============================================================
// DATABASE: users
// ============================================================

export interface User {
  // ----------------------------------------------------------
  // Primary
  // ----------------------------------------------------------

  id: string;

  email: string;

  password?: string;


  // ----------------------------------------------------------
  // Identity
  // ----------------------------------------------------------

  nama?: string;

  no_hp?: string;


  // ----------------------------------------------------------
  // Role & Status
  // ----------------------------------------------------------

  role: UserRole;

  status: UserStatus;


  // ----------------------------------------------------------
  // Pendidikan / Unit
  // ----------------------------------------------------------

  sekolah_kampus?: string;

  unit_kerja?: string;

  bagian?: string;


  // ----------------------------------------------------------
  // Periode
  // ----------------------------------------------------------

  periode_mulai?: string;

  periode_selesai?: string;


  // ----------------------------------------------------------
  // Profile
  // ----------------------------------------------------------

  avatar?: string;


  // ----------------------------------------------------------
  // Timestamp
  // ----------------------------------------------------------

  created_at?: string;


  // ==========================================================
  // LEGACY COMPATIBILITY ALIASES
  // ==========================================================

  name?: string;

  phone?: string;

  institution?: string;

  studyProgram?: string;

  study_program?: string;

  startDate?: string;

  start_date?: string;

  endDate?: string;

  end_date?: string;

  identityNumber?: string;

  identity_number?: string;

  supervisor?: string;
}


// ============================================================
// DATABASE: absensi
// ============================================================

export interface Absensi {
  // ----------------------------------------------------------
  // Primary
  // ----------------------------------------------------------

  id: string;

  karyawan_os_id?: string | null;
  peserta_magang_id?: string | null;
  pengaturan_sistem_id?: number | null;

  // ----------------------------------------------------------
  // Attendance date
  // ----------------------------------------------------------

  tanggal: string;


  // ----------------------------------------------------------
  // CHECK IN
  // ----------------------------------------------------------

  jam_masuk: string | null;

  foto_masuk?: string;

  status_masuk?: StatusMasuk;


  // ----------------------------------------------------------
  // CHECK OUT
  // ----------------------------------------------------------

  jam_pulang: string | null;

  /** Alias kolom DB: jam_keluar */
  jam_keluar?: string | null;

  foto_pulang?: string;

  /** Alias kolom DB: foto_keluar */
  foto_keluar?: string;

  /** Alias kolom DB: foto_pulang_cepat */
  foto_pulang_cepat?: string;

  status_pulang?: StatusPulang;


  // ----------------------------------------------------------
  // STATUS TOTAL
  // ----------------------------------------------------------

  status: AbsensiStatus;


  // ----------------------------------------------------------
  // IZIN
  // ----------------------------------------------------------

  keterangan_izin?: string;

  dokumen_izin?: string;


  // ----------------------------------------------------------
  // TIMESTAMP
  // ----------------------------------------------------------

  created_at?: string;


  // ==========================================================
  // JOINED / COMPUTED DISPLAY FIELDS
  // ==========================================================

  user_nama?: string;

  user_role?: UserRole;

  user_sekolah?: string;

  user_institution?: string;

  user_avatar?: string;

  user_identity_number?: string;

  user_study_program?: string;

  menit_terlambat?: number;


  // ==========================================================
  // OPTIONAL PULANG COMPUTED FIELDS
  // ==========================================================

  menit_pulang_cepat?: number;

  keterangan_pulang_cepat?: string;


  // ==========================================================
  // LEGACY COMPATIBILITY PROPERTIES
  // ==========================================================

  // FK ke peserta_magang atau karyawan_os (sebagai alias frontend)
  pesertaMagangId?: string;

  karyawanOsId?: string;

  userName?: string;

  userRole?: UserRole;

  userInstitution?: string;

  userAvatar?: string;

  userIdentityNumber?: string;

  userStudyProgram?: string;

  attendanceDate?: string;

  jamMasuk?: string | null;

  jamKeluar?: string | null;

  jamPulang?: string | null;

  checkIn?: string | null;

  checkOut?: string | null;

  fotoMasuk?: string;

  fotoKeluar?: string;

  fotoPulang?: string;

  fotoPulangCepat?: string;

  checkInPhoto?: string;

  checkOutPhoto?: string;

  lateMinutes?: number;

  keteranganIzin?: string;

  alasan?: string;

  jenis?: string;

  notes?: string;


  // Legacy status aliases

  statusMasuk?: StatusMasuk;

  statusPulang?: StatusPulang;


  // ==========================================================
  // DB ABSENSI EXTRA FIELDS
  // ==========================================================

  keterangan?: string;

  attachment?: string | null;

  pengaturanSistemId?: number | null;

  updated_at?: string;
}


// ============================================================
// LEGACY COMPATIBILITY ALIAS
// ============================================================

export type AttendanceRecord = Absensi;


// ============================================================
// DATABASE: pendaftar
// ============================================================

export interface Pendaftar {
  // ----------------------------------------------------------
  // Primary & Foreign Keys
  // ----------------------------------------------------------

  id: string;

  pengaturan_id?: number | null;

  kode_pendaftaran: string;

  peserta_magang_id?: string | null;

  pesertaMagangId?: string | null;

  // ----------------------------------------------------------
  // Identity
  // ----------------------------------------------------------

  nama: string;

  email: string;

  no_hp: string;

  // ----------------------------------------------------------
  // Pendidikan
  // ----------------------------------------------------------

  sekolah_kampus: string;

  study_program: string;

  jurusan?: string;

  // ----------------------------------------------------------
  // Address & Divisi
  // ----------------------------------------------------------

  alamat: string;

  bagian: string;

  // ----------------------------------------------------------
  // Periode
  // ----------------------------------------------------------

  periode_mulai?: string | null;

  periode_selesai?: string | null;

  // ----------------------------------------------------------
  // Status & File
  // ----------------------------------------------------------

  status: PendaftarStatus | "PENDING" | "DITERIMA" | "DITOLAK";

  file_cv?: string | null;

  portfolio_file?: string | null;

  catatan_admin?: string | null;

  // ----------------------------------------------------------
  // Registration date & Timestamps
  // ----------------------------------------------------------

  tanggal_daftar: string;

  created_at?: string;

  updated_at?: string;

  // ==========================================================
  // LEGACY ALIASES
  // ==========================================================

  name?: string;

  institution?: string;

  studyProgram?: string;

  periodStart?: string | null;

  periodEnd?: string | null;

  createdAt?: string;
}


// ============================================================
// LEGACY COMPATIBILITY ALIAS
// ============================================================

export type InternRegistration = Pendaftar;


// ============================================================
// DATABASE: periode
// ============================================================

export interface Periode {
  id: string;

  tanggal_buka: string;

  tanggal_tutup: string;

  aktif_manual: boolean;
}


// ============================================================
// DATABASE: pengaturan
// ============================================================

export interface Pengaturan {
  id: string;


  // ----------------------------------------------------------
  // Jam kerja
  // ----------------------------------------------------------

  jam_masuk_standar: string;

  jam_pulang_standar: string;

  jam_pulang_jumat: string;


  // ----------------------------------------------------------
  // Toleransi
  // ----------------------------------------------------------

  batas_toleransi_menit: number;


  // ----------------------------------------------------------
  // Hari kerja
  // ----------------------------------------------------------

  hari_kerja: string[];


  // ----------------------------------------------------------
  // Hari libur
  // ----------------------------------------------------------

  hari_libur: HariLibur[];


  // ----------------------------------------------------------
  // Dashboard visibility
  // ----------------------------------------------------------

  tampilkan_rekap_kedisiplinan: boolean;

  tampilkan_presensi_hari_ini: boolean;


  // ----------------------------------------------------------
  // WhatsApp admin
  // ----------------------------------------------------------

  no_wa_admin_magang?: string;

  no_wa_admin_os?: string;
}


// ============================================================
// HARI LIBUR
// ============================================================

export interface HariLibur {
  id: string;

  tanggal: string;

  keterangan: string;

  tipe:
    | "Nasional"
    | "Khusus";
}


// ============================================================
// LEGACY SYSTEM SETTINGS
// ============================================================

export type SystemSettings = {
  systemName?: string;

  timezone?: string;

  checkInTime?: string;

  checkOutTime?: string;

  lateToleranceMinutes?: number;

  requirePhoto?: boolean;

  allowCheckOut?: boolean;

  detectLate?: boolean;

  enforceServerTime?: boolean;

  workDays?: string[];


  // ----------------------------------------------------------
  // Database-compatible properties
  // ----------------------------------------------------------

  jam_masuk_standar?: string;

  jam_pulang_standar?: string;

  jam_pulang_jumat?: string;

  batas_toleransi_menit?: number;

  hari_kerja?: string[];
};


// ============================================================
// DATABASE: izin
// ============================================================

export interface Izin {
  // ----------------------------------------------------------
  // Schema Database (11 Kolom)
  // ----------------------------------------------------------
  id: string;
  absensi_id?: string | null;
  peserta_magang_id?: string | null;
  karyawan_os_id?: string | null;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  attachment?: string | null;
  created_at?: string;
  updated_at?: string;

  // ----------------------------------------------------------
  // Joined & Frontend Compatibility Aliases
  // ----------------------------------------------------------
  absensiId?: string | null;
  pesertaMagangId?: string | null;
  karyawanOsId?: string | null;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  catatanAdmin?: string;
  userName?: string;
  user_nama?: string;
  userEmail?: string;
  user_email?: string;
  userRole?: UserRole;
  user_role?: UserRole;
  userAvatar?: string | null;
  user_avatar?: string | null;
  userInstitution?: string;
  user_institution?: string;
  userStudyProgram?: string;
  user_study_program?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// LEAVE REQUEST / PENGAJUAN IZIN
// ============================================================

export interface LeaveRequest {
  // ----------------------------------------------------------
  // Primary
  // ----------------------------------------------------------

  id: string;


  // ----------------------------------------------------------
  // User
  // ----------------------------------------------------------

  peserta_magang_id?: string | null;

  karyawan_os_id?: string | null;

  pesertaMagangId?: string | null;

  karyawanOsId?: string | null;

  userName: string;

  userRole: UserRole;


  // ----------------------------------------------------------
  // Leave
  // ----------------------------------------------------------

  type: LeaveType;

  startDate: string;

  endDate: string;

  tanggalMulai?: string;

  tanggalSelesai?: string;

  reason: string;


  // ----------------------------------------------------------
  // Attachment
  // ----------------------------------------------------------

  attachment?: string;


  // ----------------------------------------------------------
  // Status
  // ----------------------------------------------------------

  status: LeaveStatus;


  // ----------------------------------------------------------
  // Admin review
  // ----------------------------------------------------------

  adminNote?: string;

  approvedBy?: string;

  approvedAt?: string;


  // ----------------------------------------------------------
  // Legacy aliases
  // ----------------------------------------------------------

  reviewedBy?: string;

  reviewedAt?: string;


  // ----------------------------------------------------------
  // Timestamp
  // ----------------------------------------------------------

  createdAt: string;
}


// ============================================================
// TUGAS / JOBDESK ITEM
// Sesuai tabel MySQL: `tugas` (7 Kolom)
// Kolom: id, peserta_magang_id, log_book_id, judul_tugas, deskripsi, kategori, created_at
// ============================================================

export interface TugasItem {
  id: number | string;

  // FK ke peserta_magang
  peserta_magang_id?: number | string | null;
  pesertaMagangId?: number | string | null;

  // FK ke log_book
  log_book_id?: number | string | null;
  logBookId?: number | string | null;

  // Data tugas
  judul_tugas: string;
  judulTugas?: string;

  deskripsi: string;

  kategori: string;

  created_at: string;
  createdAt?: string;

  // Join dari peserta_magang / karyawan_os (opsional, diisi saat query WITH JOIN)
  user_nama?: string | null;
  userName?: string | null;
  user_avatar?: string | null;
  userAvatar?: string | null;
  user_institution?: string | null;
  user_sekolah?: string | null;
  user_role?: string | null;
  userRole?: string | null;

  // Join dari log_book (opsional)
  log_book_aktivitas?: string | null;
  log_book_tanggal?: string | null;
}

/** @deprecated Gunakan TugasItem — JobDeskItem adalah alias lama */
export interface JobDeskItem {
  id: string;
  internId: string;
  internName: string;
  title: string;
  description: string;
  status: JobdeskStatus;
  dueDate: string;
  createdAt: string;
}


// ============================================================
// ROLE LABEL MAPPING
// ============================================================
//
// HARUS SAMA DENGAN UserRole DAN DATABASE
// ============================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: "Super Admin",

  ADMIN_MAGANG: "Admin Magang",

  ADMIN_OS: "Admin OS",

  ANAK_MAGANG: "Anak Magang",

  KARYAWAN_OS: "Karyawan OS",
};


// ============================================================
// BAGIAN / DIVISI OPTIONS
// ============================================================

export const BAGIAN_OPTIONS = ["Programmer", "Operator", "Branding"] as const;


// ============================================================
// TYPE BAGIAN
// ============================================================

export type Bagian = typeof BAGIAN_OPTIONS[number];


// ============================================================
// LOGBOOK / LOG-BOOK CATEGORIES & TYPES
// ============================================================

export const LOGBOOK_CATEGORIES = [
  "akta kelahiran",
  "akta kematian",
  "tambah bio data",
  "pindah keluar",
  "pindah datang",
  "media",
  "programmer",
] as const;

export type LogBookCategory = typeof LOGBOOK_CATEGORIES[number];

export const LOGBOOK_CATEGORY_LABELS: Record<LogBookCategory, string> = {
  "akta kelahiran": "Akta Kelahiran",
  "akta kematian": "Akta Kematian",
  "tambah bio data": "Tambah Bio Data",
  "pindah keluar": "Pindah Keluar",
  "pindah datang": "Pindah Datang",
  media: "Media",
  programmer: "Programmer",
};

export interface LogBook {
  id: number;
  peserta_magang_id?: string | number | null;
  pesertaMagangId?: string | number | null;
  user_nama?: string;
  userName?: string;
  user_role?: UserRole | string;
  userRole?: UserRole | string;
  user_sekolah?: string;
  user_institution?: string;
  userInstitution?: string;
  user_jurusan?: string;
  user_study_program?: string;
  userStudyProgram?: string;
  user_avatar?: string | null;
  userAvatar?: string | null;
  tanggal: string; // YYYY-MM-DD
  waktu_mulai: string; // HH:mm:ss atau HH:mm
  waktu_selesai: string; // HH:mm:ss atau HH:mm
  waktuMulai?: string;
  waktuSelesai?: string;
  durasi_menit?: number;
  kategori: LogBookCategory | string;
  aktivitas: string;
  created_at: string;
  createdAt?: string;
}

export interface LogBookInput {
  peserta_magang_id?: string | number | null;
  pesertaMagangId?: string | number | null;
  tanggal?: string;
  waktu_mulai: string;
  waktu_selesai: string;
  kategori: string;
  aktivitas: string;
}