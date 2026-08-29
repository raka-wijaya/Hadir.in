import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      identifier,
      identity_number,
      identityNumber,
      nip,
      nim,
      phone,
      no_hp,
      newPassword,
      password,
    } = body || {};

    const rawTarget =
      email ||
      identifier ||
      identity_number ||
      identityNumber ||
      nip ||
      nim ||
      phone ||
      no_hp;
    const cleanTarget = String(rawTarget || "").trim();
    const cleanEmail = cleanTarget.toLowerCase();
    const rawNewPassword = newPassword || password;
    const cleanPassword = String(rawNewPassword || "");

    if (!cleanTarget || !cleanPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Email / No. Identitas dan password baru wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password baru minimal 6 karakter.",
        },
        { status: 400 }
      );
    }

    let user: any = null;
    let userTable: "admin" | "karyawan_os" | "peserta_magang" | null = null;

    // 1. Cari di tabel `admin`
    const [adminRows]: any = await mysqlPool.query(
      `
        SELECT id, email, status
        FROM admin
        WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
        LIMIT 1
      `,
      [cleanEmail, cleanEmail, cleanTarget]
    );

    if (adminRows && adminRows.length > 0) {
      user = adminRows[0];
      userTable = "admin";
    }

    // 2. Jika belum ada, cari di tabel `karyawan_os`
    if (!user) {
      const [osRows]: any = await mysqlPool.query(
        `
          SELECT id, email, status
          FROM karyawan_os
          WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
          LIMIT 1
        `,
        [cleanEmail, cleanEmail, cleanTarget]
      );

      if (osRows && osRows.length > 0) {
        user = osRows[0];
        userTable = "karyawan_os";
      }
    }

    // 3. Jika belum ada, cari di tabel `peserta_magang`
    if (!user) {
      const [magangRows]: any = await mysqlPool.query(
        `
          SELECT id, email, status
          FROM peserta_magang
          WHERE LOWER(email) = ? OR LOWER(identity_number) = ? OR phone = ?
          LIMIT 1
        `,
        [cleanEmail, cleanEmail, cleanTarget]
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
          message:
            "Akun dengan email / nomor identitas tersebut tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const statusUpper = String(user.status || "")
      .toUpperCase()
      .trim();
    if (statusUpper !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
        },
        { status: 403 }
      );
    }

    const hashedPassword = await hashPassword(cleanPassword);

    await mysqlPool.query(
      `
        UPDATE ${userTable}
        SET
          password = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [hashedPassword, user.id]
    );

    return NextResponse.json({
      success: true,
      message:
        "Password berhasil direset. Silakan masuk dengan password baru Anda.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Terjadi kesalahan pada server saat mereset password.",
      },
      { status: 500 }
    );
  }
}