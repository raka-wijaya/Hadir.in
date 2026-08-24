import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { saveBase64File } from "@/lib/storage";

// Helper: Normalisasi Role sesuai MySQL Enum
function normalizeRole(roleInput?: string | null): string {
  if (!roleInput) return "ANAK_MAGANG";
  const r = roleInput.toUpperCase().trim();
  if (r === "SUPER_ADMIN" || r === "SUPERADMIN") return "SUPERADMIN";
  if (r === "ADMIN_MAGANG") return "ADMIN_MAGANG";
  if (r === "ADMIN_OS") return "ADMIN_OS";
  if (r === "KARYAWAN_OS" || r === "PEGAWAI_OS" || r === "ANAK_OS" || r === "PEGAWAI") return "KARYAWAN_OS";
  if (r === "ANAK_MAGANG" || r === "MAGANG") return "ANAK_MAGANG";
  return r;
}

// Helper: Normalisasi Status sesuai MySQL Enum
function normalizeStatus(statusInput?: string | null): "ACTIVE" | "INACTIVE" {
  if (!statusInput) return "ACTIVE";
  const s = statusInput.toUpperCase().trim();
  if (s === "INACTIVE" || s === "NONAKTIF" || s === "NON_AKTIF" || s === "OFF") return "INACTIVE";
  return "ACTIVE";
}

const VALID_ROLES = ["SUPERADMIN", "ADMIN_MAGANG", "ADMIN_OS", "KARYAWAN_OS", "ANAK_MAGANG"];
const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

// GET: Ambil semua user dari MySQL
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");

    let sql = `
      SELECT id, name, email, role, status, phone,
             identity_number, institution, study_program,
             avatar, start_date, end_date, last_login_at, created_at
      FROM users WHERE 1=1
    `;
    const params: any[] = [];

    if (roleParam && roleParam !== "ALL") {
      const normalizedRole = normalizeRole(roleParam);
      sql += " AND role = ?";
      params.push(normalizedRole);
    }

    if (statusParam && statusParam !== "ALL") {
      const normalizedStatus = normalizeStatus(statusParam);
      sql += " AND status = ?";
      params.push(normalizedStatus);
    }

    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR institution LIKE ? OR study_program LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC";

    const [rows]: any = await mysqlPool.query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Gagal mengambil data user." }, { status: 500 });
  }
}

// POST: Tambah user baru ke MySQL
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = body.nama || body.name;
    const email = body.email;
    const rawPassword = body.password || "123456";
    const role = normalizeRole(body.role);
    const status = normalizeStatus(body.status);
    const phone = body.phone || body.no_hp || null;
    const institution = body.institution || body.sekolah_kampus || null;
    const studyProgram = body.study_program || body.studyProgram || body.unit_kerja || null;
    const identityNumber = body.identity_number || body.identityNumber || null;
    const rawAvatar = body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=72e3ad&color=1e2723&bold=true`;
    const avatar = (await saveBase64File(rawAvatar, "avatars", "avatar", email)) || rawAvatar;
    const startDate = body.start_date || body.startDate || body.periode_mulai || null;
    const endDate = body.end_date || body.endDate || body.periode_selesai || null;

    if (!name || !email) {
      return NextResponse.json({ success: false, message: "Nama dan email wajib diisi." }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ success: false, message: `Role tidak valid. Role yang diizinkan: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: `Status tidak valid. Status yang diizinkan: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const hashedPassword = await hashPassword(rawPassword);

    let newId: any;
    try {
      const [insertRes]: any = await mysqlPool.query(
        `INSERT INTO users (name, email, password, role, status, phone, identity_number, institution, study_program, avatar, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, role, status, phone, identityNumber, institution, studyProgram, avatar, startDate, endDate]
      );
      newId = insertRes.insertId;
    } catch (insertErr: any) {
      if (insertErr?.code === "ER_NO_DEFAULT_FOR_FIELD" || insertErr?.message?.includes("username")) {
        const [insertResFallback]: any = await mysqlPool.query(
          `INSERT INTO users (username, name, email, password, role, status, phone, identity_number, institution, study_program, avatar, start_date, end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [email, name, email, hashedPassword, role, status, phone, identityNumber, institution, studyProgram, avatar, startDate, endDate]
        );
        newId = insertResFallback.insertId;
      } else {
        throw insertErr;
      }
    }

    return NextResponse.json({ success: true, message: "User berhasil ditambahkan.", data: { id: newId, name, email, role, status } }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/users error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, message: "Email sudah digunakan." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err?.message || "Gagal menambahkan user." }, { status: 500 });
  }
}

// PATCH: Update data user
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      status,
      role,
      phone,
      no_hp,
      name,
      nama,
      email,
      institution,
      sekolah_kampus,
      study_program,
      studyProgram,
      unit_kerja,
      bagian,
      identity_number,
      identityNumber,
      avatar,
      start_date,
      end_date,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID user wajib diisi." }, { status: 400 });
    }

    const fields: string[] = [];
    const params: any[] = [];

    const finalName = name || nama;
    const finalPhone = phone || no_hp;
    const finalInstitution = institution || sekolah_kampus;
    const finalStudyProgram = study_program || studyProgram || unit_kerja || bagian;
    const finalIdentity = identity_number || identityNumber;

    if (finalName !== undefined) { fields.push("name = ?"); params.push(finalName); }
    if (email !== undefined) { fields.push("email = ?"); params.push(email); }
    if (status !== undefined) {
      const normalizedStatus = normalizeStatus(status);
      fields.push("status = ?");
      params.push(normalizedStatus);
    }
    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!VALID_ROLES.includes(normalizedRole)) {
        return NextResponse.json({ success: false, message: `Role tidak valid. Role yang diizinkan: ${VALID_ROLES.join(", ")}` }, { status: 400 });
      }
      fields.push("role = ?");
      params.push(normalizedRole);
    }
    if (finalPhone !== undefined) { fields.push("phone = ?"); params.push(finalPhone); }
    if (finalIdentity !== undefined) { fields.push("identity_number = ?"); params.push(finalIdentity); }
    if (finalInstitution !== undefined) { fields.push("institution = ?"); params.push(finalInstitution); }
    if (finalStudyProgram !== undefined) { fields.push("study_program = ?"); params.push(finalStudyProgram); }
    if (avatar !== undefined) {
      const savedAvatar = await saveBase64File(avatar, "avatars", "avatar", id);
      fields.push("avatar = ?");
      params.push(savedAvatar || avatar);
    }
    if (start_date !== undefined) { fields.push("start_date = ?"); params.push(start_date); }
    if (end_date !== undefined) { fields.push("end_date = ?"); params.push(end_date); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, message: "Tidak ada field yang diperbarui." }, { status: 400 });
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const [result]: any = await mysqlPool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User berhasil diperbarui." });
  } catch (err: any) {
    console.error("PATCH /api/users error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Gagal memperbarui user." }, { status: 500 });
  }
}

// DELETE: Hapus user
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID user wajib diisi." }, { status: 400 });
    }

    const [result]: any = await mysqlPool.query("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User berhasil dihapus." });
  } catch (err: any) {
    console.error("DELETE /api/users error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Gagal menghapus user." }, { status: 500 });
  }
}
