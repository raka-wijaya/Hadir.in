import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { comparePassword } from "@/lib/auth/password";

type UserRole =
  | "SUPERADMIN"
  | "ADMIN_MAGANG"
  | "ADMIN_OS"
  | "KARYAWAN_OS"
  | "ANAK_MAGANG";

const VALID_ROLES: UserRole[] = [
  "SUPERADMIN",
  "ADMIN_MAGANG",
  "ADMIN_OS",
  "KARYAWAN_OS",
  "ANAK_MAGANG",
];

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Email dan password wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // CARI USER DI TABEL `users` (MySQL)
    // ============================================================
    const [rows]: any = await mysqlPool.query(
      `
        SELECT
          id,
          email,
          password,
          role,
          name,
          phone,
          identity_number,
          institution,
          study_program,
          avatar,
          start_date,
          end_date,
          status,
          last_login_at,
          created_at,
          updated_at
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `,
      [cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    const user = rows[0];

    // ============================================================
    // CEK STATUS AKUN
    // ============================================================
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda telah dinonaktifkan. Silakan hubungi admin.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // CEK ROLE
    // ============================================================
    let userRole = String(user.role).toUpperCase() as UserRole;
    if (userRole === ("SUPER_ADMIN" as any)) {
      userRole = "SUPERADMIN";
    }

    if (!VALID_ROLES.includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Role akun tidak valid.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // CEK PASSWORD
    // ============================================================
    const isPasswordValid = await comparePassword(
      cleanPassword,
      user.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    // ============================================================
    // UPDATE LAST LOGIN AT
    // ============================================================
    try {
      await mysqlPool.query(
        `
          UPDATE users
          SET last_login_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [user.id]
      );
    } catch (err) {
      console.warn("Failed to update last_login_at:", err);
    }

    // ============================================================
    // RESPONSE DATA USER (SANITIZED & COMPATIBLE)
    // ============================================================
    const startDateFormatted = formatDate(user.start_date);
    const endDateFormatted = formatDate(user.end_date);

    const safeUser = {
      id: String(user.id),
      email: user.email,
      role: userRole,
      name: user.name,
      nama: user.name, // alias kompatibilitas
      phone: user.phone,
      no_hp: user.phone, // alias kompatibilitas
      identity_number: user.identity_number,
      institution: user.institution,
      sekolah_kampus: user.institution, // alias kompatibilitas
      study_program: user.study_program,
      jurusan: user.study_program, // alias kompatibilitas
      avatar: user.avatar,
      start_date: startDateFormatted,
      periode_mulai: startDateFormatted, // alias kompatibilitas
      end_date: endDateFormatted,
      periode_selesai: endDateFormatted, // alias kompatibilitas
      status: user.status,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
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