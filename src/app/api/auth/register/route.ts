import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

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

function normalizeRole(roleInput?: string): UserRole {
  const r = String(roleInput || "").trim().toUpperCase();
  if (r === "MAGANG" || r === "ANAK_MAGANG") return "ANAK_MAGANG";
  if (
    r === "PEGAWAI" ||
    r === "KARYAWAN_OS" ||
    r === "PEGAWAI_OS" ||
    r === "ANAK_OS"
  )
    return "KARYAWAN_OS";
  if (r === "SUPER_ADMIN" || r === "SUPERADMIN") return "SUPERADMIN";
  if (r === "ADMIN_MAGANG") return "ADMIN_MAGANG";
  if (r === "ADMIN_OS") return "ADMIN_OS";
  return "KARYAWAN_OS";
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

    const rawName = body.name || body.nama;
    const rawEmail = body.email;
    const rawPassword = body.password;
    const rawPhone = body.phone || body.no_hp;
    const rawInstitution = body.institution || body.sekolah_kampus;
    const rawStudyProgram =
      body.study_program || body.studyProgram || body.jurusan;
    const rawIdentityNumber =
      body.identity_number || body.identityNumber || body.nip || body.nim;
    const rawStartDate =
      body.start_date || body.periode_mulai || body.startDate;
    const rawEndDate = body.end_date || body.periode_selesai || body.endDate;

    if (!rawName || !rawEmail || !rawPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama, email, dan password wajib diisi.",
        },
        { status: 400 }
      );
    }

    const cleanName = String(rawName).trim().slice(0, 150);
    const cleanEmail = String(rawEmail).trim().toLowerCase().slice(0, 150);
    const cleanPassword = String(rawPassword);
    const cleanPhone = rawPhone ? String(rawPhone).trim().slice(0, 20) : null;
    const cleanRole = normalizeRole(body.role);
    const cleanIdentityNumber = rawIdentityNumber
      ? String(rawIdentityNumber).trim().slice(0, 50)
      : null;
    const cleanInstitution = rawInstitution
      ? String(rawInstitution).trim().slice(0, 200)
      : null;
    const cleanStudyProgram = rawStudyProgram
      ? String(rawStudyProgram).trim().slice(0, 150)
      : null;
    const startDate = rawStartDate
      ? String(rawStartDate).trim().slice(0, 10)
      : null;
    const endDate = rawEndDate ? String(rawEndDate).trim().slice(0, 10) : null;

    const rawDivisi = body.divisi;
    const cleanDivisi = rawDivisi ? String(rawDivisi).trim().slice(0, 150) : null;

    const cleanAvatar = body.avatar
      ? String(body.avatar).trim().slice(0, 500)
      : getDefaultAvatar(cleanRole, cleanName);

    if (!VALID_ROLES.includes(cleanRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Role akun tidak valid.",
        },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password minimal 6 karakter.",
        },
        { status: 400 }
      );
    }

    // Cek duplikasi email di seluruh tabel pengguna (admin, karyawan_os, peserta_magang)
    // Email dianggap sudah digunakan jika ditemukan di salah satu dari ketiga tabel.
    const [emailCheckRows]: any = await mysqlPool.query(
      `SELECT 1 FROM admin WHERE LOWER(email) = ?
       UNION ALL
       SELECT 1 FROM karyawan_os WHERE LOWER(email) = ?
       UNION ALL
       SELECT 1 FROM peserta_magang WHERE LOWER(email) = ?
       LIMIT 1`,
      [cleanEmail, cleanEmail, cleanEmail]
    );

    if (emailCheckRows && emailCheckRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email sudah terdaftar. Silakan gunakan email lain atau masuk.",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(cleanPassword);
    let newUserId: any;

    if (
      cleanRole === "SUPERADMIN" ||
      cleanRole === "ADMIN_MAGANG" ||
      cleanRole === "ADMIN_OS"
    ) {
      try {
        const [insertRes]: any = await mysqlPool.query(
          `INSERT INTO admin (email, password, role, name, phone, identity_number, avatar, status, verification_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PENDING')`,
          [
            cleanEmail,
            hashedPassword,
            cleanRole,
            cleanName,
            cleanPhone,
            cleanIdentityNumber,
            cleanAvatar,
          ]
        );
        newUserId = insertRes.insertId;
      } catch {
        const [insertRes]: any = await mysqlPool.query(
          `INSERT INTO admin (email, password, role, name, phone, identity_number, avatar, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [
            cleanEmail,
            hashedPassword,
            cleanRole,
            cleanName,
            cleanPhone,
            cleanIdentityNumber,
            cleanAvatar,
          ]
        );
        newUserId = insertRes.insertId;
      }
    } else if (cleanRole === "KARYAWAN_OS") {
      try {
        const [insertRes]: any = await mysqlPool.query(
          `INSERT INTO karyawan_os (email, password, name, phone, identity_number, avatar, status, verification_status)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 'PENDING')`,
          [
            cleanEmail,
            hashedPassword,
            cleanName,
            cleanPhone,
            cleanIdentityNumber,
            cleanAvatar,
          ]
        );
        newUserId = insertRes.insertId;
      } catch {
        const [insertRes]: any = await mysqlPool.query(
          `INSERT INTO karyawan_os (email, password, name, phone, identity_number, avatar, status)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [
            cleanEmail,
            hashedPassword,
            cleanName,
            cleanPhone,
            cleanIdentityNumber,
            cleanAvatar,
          ]
        );
        newUserId = insertRes.insertId;
      }
    } else if (cleanRole === "ANAK_MAGANG") {
      const [insertRes]: any = await mysqlPool.query(
        `INSERT INTO peserta_magang (email, password, name, phone, identity_number, institution, study_program, divisi, avatar, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          cleanEmail,
          hashedPassword,
          cleanName,
          cleanPhone,
          cleanIdentityNumber,
          cleanInstitution,
          cleanStudyProgram,
          cleanDivisi,
          cleanAvatar,
          startDate,
          endDate,
        ]
      );
      newUserId = insertRes.insertId;
    }

    const isPendingVerif = cleanRole !== "ANAK_MAGANG";

    return NextResponse.json(
      {
        success: true,
        message: isPendingVerif
          ? "Akun berhasil mendaftar! Akun Anda saat ini dalam proses verifikasi oleh Admin. Silakan tunggu persetujuan sebelum dapat masuk."
          : "Akun berhasil dibuat. Silakan masuk.",
        userId: String(newUserId),
        role: cleanRole,
        verificationStatus: isPendingVerif ? "PENDING" : "APPROVED",
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