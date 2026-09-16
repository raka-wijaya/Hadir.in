import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { comparePassword } from "@/lib/auth/password";

type UserRole =
  | "SUPERADMIN"
  | "ADMIN_MAGANG"
  | "ADMIN_OS"
  | "KARYAWAN_OS"
  | "ANAK_MAGANG";

const VALID_ROLES: readonly UserRole[] = [
  "SUPERADMIN",
  "ADMIN_MAGANG",
  "ADMIN_OS",
  "KARYAWAN_OS",
  "ANAK_MAGANG",
] as const;

function normalizeRole(roleInput?: string | null): UserRole | null {
  if (!roleInput) return null;
  const r = roleInput.toUpperCase().trim();
  if (r === "SUPERADMIN" || r === "SUPER_ADMIN") return "SUPERADMIN";
  if (r === "ADMIN_MAGANG") return "ADMIN_MAGANG";
  if (r === "ADMIN_OS") return "ADMIN_OS";
  if (
    r === "KARYAWAN_OS" ||
    r === "PEGAWAI_OS" ||
    r === "ANAK_OS" ||
    r === "PEGAWAI"
  )
    return "KARYAWAN_OS";
  if (r === "ANAK_MAGANG" || r === "MAGANG") return "ANAK_MAGANG";
  return null;
}

function normalizeStatus(statusInput?: string | null): "ACTIVE" | "INACTIVE" {
  if (!statusInput) return "ACTIVE";
  const s = statusInput.toUpperCase().trim();
  if (s === "INACTIVE" || s === "NONAKTIF" || s === "NON_AKTIF" || s === "OFF")
    return "INACTIVE";
  return "ACTIVE";
}

function formatDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(val);
}

function getDefaultAvatar(role: UserRole, name: string): string {
  const encodedName = encodeURIComponent(name || "User");
  switch (role) {
    case "SUPERADMIN":
    case "ADMIN_MAGANG":
    case "ADMIN_OS":
      return `https://ui-avatars.com/api/?name=${encodedName}&background=4f46e5&color=ffffff&bold=true`;
    case "KARYAWAN_OS":
      return `https://ui-avatars.com/api/?name=${encodedName}&background=f59e0b&color=000000&bold=true`;
    case "ANAK_MAGANG":
    default:
      return `https://ui-avatars.com/api/?name=${encodedName}&background=72e3ad&color=1e2723&bold=true`;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      identifier,
      username,
      identity_number,
      identityNumber,
      nip,
      nim,
      password,
    } = body || {};

    const rawLoginKey =
      email ||
      identifier ||
      username ||
      identity_number ||
      identityNumber ||
      nip ||
      nim;
    const cleanIdentifier = String(rawLoginKey || "").trim();
    const cleanEmail = cleanIdentifier.toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanIdentifier || !cleanPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Email / No. Identitas dan password wajib diisi.",
        },
        { status: 400 }
      );
    }

    let user: any = null;
    let userTable: "admin" | "karyawan_os" | "peserta_magang" | null = null;

    // 1. Cari di tabel `admin`
    try {
      const [adminRows]: any = await mysqlPool.query(
        `
          SELECT
            id, email, password, role, name, phone, identity_number,
            NULL AS institution, NULL AS study_program, avatar,
            NULL AS start_date, NULL AS end_date, status, last_login_at,
            created_at, updated_at, verification_status, rejection_reason
          FROM admin
          WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
          LIMIT 1
        `,
        [cleanEmail, cleanEmail, cleanIdentifier]
      );

      if (adminRows && adminRows.length > 0) {
        user = adminRows[0];
        userTable = "admin";
      }
    } catch {
      const [adminRows]: any = await mysqlPool.query(
        `
          SELECT
            id, email, password, role, name, phone, identity_number,
            NULL AS institution, NULL AS study_program, avatar,
            NULL AS start_date, NULL AS end_date, status, last_login_at,
            created_at, updated_at
          FROM admin
          WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
          LIMIT 1
        `,
        [cleanEmail, cleanEmail, cleanIdentifier]
      );

      if (adminRows && adminRows.length > 0) {
        user = adminRows[0];
        userTable = "admin";
      }
    }

    // 2. Jika belum ketemu, cari di tabel `karyawan_os`
    if (!user) {
      try {
        const [osRows]: any = await mysqlPool.query(
          `
            SELECT
              id, email, password, 'KARYAWAN_OS' AS role, name, phone, identity_number,
              NULL AS institution, NULL AS study_program, avatar,
              NULL AS start_date, NULL AS end_date, status, last_login_at,
              created_at, updated_at, verification_status, rejection_reason
            FROM karyawan_os
            WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
            LIMIT 1
          `,
          [cleanEmail, cleanEmail, cleanIdentifier]
        );

        if (osRows && osRows.length > 0) {
          user = osRows[0];
          userTable = "karyawan_os";
        }
      } catch {
        const [osRows]: any = await mysqlPool.query(
          `
            SELECT
              id, email, password, 'KARYAWAN_OS' AS role, name, phone, identity_number,
              NULL AS institution, NULL AS study_program, avatar,
              NULL AS start_date, NULL AS end_date, status, last_login_at,
              created_at, updated_at
            FROM karyawan_os
            WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
            LIMIT 1
          `,
          [cleanEmail, cleanEmail, cleanIdentifier]
        );

        if (osRows && osRows.length > 0) {
          user = osRows[0];
          userTable = "karyawan_os";
        }
      }
    }

    // 3. Jika belum ketemu, cari di tabel `peserta_magang`
    if (!user) {
      const [magangRows]: any = await mysqlPool.query(
        `
          SELECT
            id, email, password, 'ANAK_MAGANG' AS role, name, phone, identity_number,
            institution, study_program, divisi, avatar, start_date, end_date,
            status, last_login_at, created_at, updated_at,
            'APPROVED' AS verification_status, NULL AS rejection_reason
          FROM peserta_magang
          WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
          LIMIT 1
        `,
        [cleanEmail, cleanEmail, cleanIdentifier]
      );

      if (magangRows && magangRows.length > 0) {
        user = magangRows[0];
        userTable = "peserta_magang";
      }
    }

    if (!user || !userTable) {
      return NextResponse.json(
        {
          success: false,
          message: "Email / No. Identitas atau password salah.",
        },
        { status: 401 }
      );
    }

    const normalizedStatus = normalizeStatus(user.status);
    if (normalizedStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda telah dinonaktifkan. Silakan hubungi admin.",
        },
        { status: 403 }
      );
    }

    const userRole = normalizeRole(user.role);
    if (!userRole || !VALID_ROLES.includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Role akun tidak valid atau tidak memiliki akses.",
        },
        { status: 403 }
      );
    }

    const isPasswordValid = await comparePassword(
      cleanPassword,
      user.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Email / No. Identitas atau password salah.",
        },
        { status: 401 }
      );
    }

    // Cek status verifikasi akun
    const verifStatus = String(user.verification_status || user.verificationStatus || "").toUpperCase();
    if (verifStatus === "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda masih dalam proses verifikasi oleh Admin. Silakan tunggu persetujuan Admin sebelum dapat masuk.",
        },
        { status: 403 }
      );
    }

    if (verifStatus === "REJECTED") {
      const reason = user.rejection_reason || user.rejectionReason;
      return NextResponse.json(
        {
          success: false,
          message: `Akun Anda telah ditolak oleh Admin.${reason ? ` Alasan: ${reason}` : ""}`,
        },
        { status: 403 }
      );
    }

    // Update last_login_at di tabel yang tepat
    try {
      await mysqlPool.query(
        `
          UPDATE ${userTable}
          SET last_login_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [user.id]
      );
    } catch (err) {
      console.warn(`Failed to update last_login_at on ${userTable}:`, err);
    }

    const startDateFormatted = formatDate(user.start_date);
    const endDateFormatted = formatDate(user.end_date);
    const resolvedAvatar =
      user.avatar || getDefaultAvatar(userRole, user.name || "User");

    const safeUser = {
      id: String(user.id),
      email: user.email,
      role: userRole,
      name: user.name || "",
      phone: user.phone || null,
      identity_number: user.identity_number || null,
      institution: user.institution || null,
      study_program: user.study_program || null,
      avatar: resolvedAvatar,
      start_date: startDateFormatted,
      end_date: endDateFormatted,
      status: normalizedStatus,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at,

      // Aliases
      nama: user.name || "",
      no_hp: user.phone || null,
      identityNumber: user.identity_number || null,
      nip: user.identity_number || null,
      nim: user.identity_number || null,
      sekolah_kampus: user.institution || null,
      vendor: user.institution || null,
      jurusan: user.study_program || null,
      studyProgram: user.study_program || null,
      divisi: user.divisi !== undefined ? (user.divisi || null) : (user.study_program || null),
      unit_kerja: user.study_program || null,
      bagian: user.study_program || null,
      startDate: startDateFormatted,
      periode_mulai: startDateFormatted,
      endDate: endDateFormatted,
      periode_selesai: endDateFormatted,
    };

    return NextResponse.json({
      success: true,
      message: "Login berhasil.",
      user: safeUser,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}