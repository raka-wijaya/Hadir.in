import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, identifier, newPassword } = body || {};

    const targetEmail = String(email || identifier || "").trim().toLowerCase();
    const cleanPassword = String(newPassword || "");

    if (!targetEmail || !cleanPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Email dan password baru wajib diisi.",
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

    // ============================================================
    // CARI USER DI TABEL `users` (MySQL)
    // ============================================================
    const [rows]: any = await mysqlPool.query(
      `
        SELECT id, email, status
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `,
      [targetEmail]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun dengan email tersebut tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const user = rows[0];

    // ============================================================
    // CEK STATUS USER
    // ============================================================
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // HASH PASSWORD BARU
    // ============================================================
    const hashedPassword = await hashPassword(cleanPassword);

    // ============================================================
    // UPDATE PASSWORD DI TABEL `users`
    // ============================================================
    await mysqlPool.query(
      `
        UPDATE users
        SET
          password = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [hashedPassword, user.id]
    );

    return NextResponse.json({
      success: true,
      message: "Password berhasil direset. Silakan masuk dengan password baru Anda.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan pada server saat mereset password.",
      },
      { status: 500 }
    );
  }
}