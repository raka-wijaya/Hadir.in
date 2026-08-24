import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

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

function normalizeRole(roleInput?: string): UserRole {
  const r = String(roleInput || "").trim().toUpperCase();
  if (r === "MAGANG" || r === "ANAK_MAGANG") return "ANAK_MAGANG";
  if (r === "PEGAWAI" || r === "KARYAWAN_OS" || r === "PEGAWAI_OS" || r === "ANAK_OS") return "KARYAWAN_OS";
  if (r === "SUPER_ADMIN" || r === "SUPERADMIN") return "SUPERADMIN";
  if (r === "ADMIN_MAGANG") return "ADMIN_MAGANG";
  if (r === "ADMIN_OS") return "ADMIN_OS";
  return "ANAK_MAGANG";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawName = body.name || body.nama;
    const rawEmail = body.email;
    const rawPassword = body.password;
    const rawPhone = body.phone || body.no_hp;
    const rawInstitution = body.institution || body.sekolah_kampus;
    const rawStudyProgram = body.study_program || body.studyProgram || body.jurusan;
    const rawIdentityNumber = body.identity_number || body.identityNumber;
    const rawAvatar = body.avatar;
    const rawStartDate = body.start_date || body.periode_mulai || body.startDate;
    const rawEndDate = body.end_date || body.periode_selesai || body.endDate;

    // ============================================================
    // VALIDASI FIELD WAJIB
    // ============================================================
    if (!rawName || !rawEmail || !rawPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama, email, dan password wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // CLEAN DATA
    // ============================================================
    const cleanName = String(rawName).trim().slice(0, 150);
    const cleanEmail = String(rawEmail).trim().toLowerCase().slice(0, 150);
    const cleanPassword = String(rawPassword);
    const cleanPhone = rawPhone ? String(rawPhone).trim().slice(0, 20) : null;
    const cleanRole = normalizeRole(body.role);
    const cleanInstitution = rawInstitution ? String(rawInstitution).trim().slice(0, 200) : null;
    const cleanStudyProgram = rawStudyProgram ? String(rawStudyProgram).trim().slice(0, 150) : null;
    const cleanIdentityNumber = rawIdentityNumber ? String(rawIdentityNumber).trim().slice(0, 50) : null;
    const cleanAvatar = rawAvatar ? String(rawAvatar).trim().slice(0, 500) : null;
    const startDate = rawStartDate ? String(rawStartDate).trim().slice(0, 10) : null;
    const endDate = rawEndDate ? String(rawEndDate).trim().slice(0, 10) : null;

    // ============================================================
    // VALIDASI ROLE
    // ============================================================
    if (!VALID_ROLES.includes(cleanRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Role akun tidak valid.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // VALIDASI PASSWORD
    // ============================================================
    if (cleanPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password minimal 6 karakter.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // VALIDASI PERIODE MAGANG (JIKA DIISI)
    // ============================================================
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Format tanggal magang tidak valid.",
          },
          { status: 400 }
        );
      }

      if (end < start) {
        return NextResponse.json(
          {
            success: false,
            message: "Tanggal selesai magang tidak boleh sebelum tanggal mulai.",
          },
          { status: 400 }
        );
      }
    }

    // ============================================================
    // CEK DUPLIKASI EMAIL DI TABEL `users`
    // ============================================================
    const [existingRows]: any = await mysqlPool.query(
      `
        SELECT id, email
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `,
      [cleanEmail]
    );

    if (existingRows && existingRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email sudah terdaftar. Silakan gunakan email lain atau masuk.",
        },
        { status: 409 }
      );
    }

    // ============================================================
    // HASH PASSWORD
    // ============================================================
    const hashedPassword = await hashPassword(cleanPassword);

    // ============================================================
    // INSERT KE TABEL `users` (MySQL)
    // ============================================================
    let result: any;
    try {
      const [insertRes]: any = await mysqlPool.query(
        `
          INSERT INTO users (
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
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          cleanEmail,
          hashedPassword,
          cleanRole,
          cleanName,
          cleanPhone,
          cleanIdentityNumber,
          cleanInstitution,
          cleanStudyProgram,
          cleanAvatar,
          startDate,
          endDate,
        ]
      );
      result = insertRes;
    } catch (insertErr: any) {
      // Fallback jika database masih memiliki kolom NOT NULL username
      if (insertErr?.code === "ER_NO_DEFAULT_FOR_FIELD" || insertErr?.message?.includes("username")) {
        const [insertResFallback]: any = await mysqlPool.query(
          `
            INSERT INTO users (
              username,
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
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
          `,
          [
            cleanEmail,
            cleanEmail,
            hashedPassword,
            cleanRole,
            cleanName,
            cleanPhone,
            cleanIdentityNumber,
            cleanInstitution,
            cleanStudyProgram,
            cleanAvatar,
            startDate,
            endDate,
          ]
        );
        result = insertResFallback;
      } else {
        throw insertErr;
      }
    }

    const rawKodePendaftaran = body.kode_pendaftaran ? String(body.kode_pendaftaran).trim() : null;
    if (rawKodePendaftaran) {
      try {
        await mysqlPool.query(
          `UPDATE pendaftaran SET user_id = ? WHERE LOWER(TRIM(kode_pendaftaran)) = LOWER(?)`,
          [result.insertId, rawKodePendaftaran]
        );
      } catch (linkErr) {
        console.warn("Gagal menautkan user_id ke pendaftaran:", linkErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Akun berhasil dibuat. Silakan masuk.",
        userId: String(result.insertId),
        role: cleanRole,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "Email sudah terdaftar.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}