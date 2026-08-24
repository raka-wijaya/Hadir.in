import { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  category?: 'Beranda' | 'Pendaftaran' | 'Manajemen' | 'Kehadiran' | 'Sistem';
}

const ADMIN_PATHS = [
  '/admin/dashboard',
  '/admin/pendaftaran',
  '/admin/periode',
  '/admin/anak-magang',
  '/admin/pegawai-os',
  '/admin/izin',
  '/admin/roles',
  '/admin/log-book',
  '/admin/rekap-kehadiran',
  '/admin/pengaturan',
  '/admin/profil',
  '/profile'
];

const ADMIN_MAGANG_PATHS = [
  '/admin/dashboard',
  '/admin/pendaftaran',
  '/admin/periode',
  '/admin/anak-magang',
  '/admin/izin',
  '/admin/log-book',
  '/admin/rekap-kehadiran',
  '/admin/profil',
  '/profile'
];

const ADMIN_OS_PATHS = [
  '/admin/dashboard',
  '/admin/pegawai-os',
  '/admin/izin',
  '/admin/rekap-kehadiran',
  '/admin/profil',
  '/profile'
];

const MAGANG_PATHS = [
  '/magang/dashboard',
  '/magang/kehadiran',
  '/magang/terlambat',
  '/magang/izin',
  '/magang/riwayat',
  '/magang/profil',
  '/magang/jobdesk',
  '/magang/log-book'
];

const OS_PATHS = [
  '/pegawai-os/dashboard',
  '/pegawai-os/kehadiran',
  '/pegawai-os/terlambat',
  '/pegawai-os/izin',
  '/pegawai-os/riwayat',
  '/pegawai-os/profil',
  '/magang/dashboard'
];

export const PERMISSION_MATRIX: Record<string, string[]> = {
  SUPERADMIN: ADMIN_PATHS,
  SUPER_ADMIN: ADMIN_PATHS,
  ADMIN_MAGANG: ADMIN_MAGANG_PATHS,
  ADMIN_OS: ADMIN_OS_PATHS,
  ANAK_MAGANG: MAGANG_PATHS,
  ANAK_OS: OS_PATHS,
  PEGAWAI_OS: OS_PATHS,
  KARYAWAN_OS: OS_PATHS,
};

export function getDefaultDashboardForRole(role?: string | null): string {
  const r = String(role || "").trim().toUpperCase();
  switch (r) {
    case "SUPERADMIN":
    case "SUPER_ADMIN":
    case "ADMIN_MAGANG":
    case "ADMIN_OS":
      return "/admin/dashboard";
    case "KARYAWAN_OS":
    case "PEGAWAI_OS":
    case "ANAK_OS":
      return "/pegawai-os/dashboard";
    case "ANAK_MAGANG":
    case "MAGANG":
      return "/magang/dashboard";
    default:
      return "/login";
  }
}

export function hasPermission(role: string, path: string): boolean {
  const r = String(role || "").trim().toUpperCase();
  const allowedPaths = PERMISSION_MATRIX[r] || [];
  return allowedPaths.some(p => path.startsWith(p));
}
