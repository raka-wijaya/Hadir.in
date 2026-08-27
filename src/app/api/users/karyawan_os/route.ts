import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { saveBase64File } from "@/lib/storage";

function normalizeStatus(statusInput?: string | null): "ACTIVE" | "INACTIVE" {
  if (!statusInput) return "ACTIVE";
  const s = statusInput.toUpperCase().trim();
  if (s === "INACTIVE" || s === "NONAKTIF") return "INACTIVE";
  return "ACTIVE";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");

    let sql = `
      SELECT id, email, name, phone, identity_number,
             institution, study_program, avatar, status,
             last_login_at, created_at, updated_at
      FROM users
      WHERE role = 'KARYAWAN_OS'
    `;
    const params: any[] = [];

    if (statusParam && statusParam !== "ALL") {
      sql += " AND status = ?";
      params.push(normalizeStatus(statusParam));
    }

    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR identity_number LIKE ? OR institution LIKE ? OR study_program LIKE ?)";
      const q = "%" + search + "%";
      params.push(q, q, q, q, q, q);
    }

    sql += " ORDER BY created_at DESC";

    const [rows]: any = await mysqlPool.query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("GET /api/users/karyawan_os error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data karyawan OS." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = body.name || body.nama;
    const email = body.email;
    const rawPassword = body.password || "karyawan123";
    const status = normalizeStatus(body.status);
    const phone = body.phone || body.no_hp || null;
    const identityNumber = body.identity_number || body.identityNumber || body.nip || null;
    const institution = body.institution || body.vendor || body.sekolah_kampus || null;
    const studyProgram = body.study_program || body.studyProgram || body.divisi || body.unit_kerja || null;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Nama dan email wajib diisi." },
        { status: 400 }
      );
    }

    const rawAvatar =
      body.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f59e0b&color=000000&bold=true`;
    const avatar =
      (await saveBase64File(rawAvatar, "avatars", "avatar", email)) || rawAvatar;

    const hashedPassword = await hashPassword(rawPassword);

    let newId: any;
    try {
      const [insertRes]: any = await mysqlPool.query(
        `INSERT INTO users (name, email, password, role, status, phone, identity_number, institution, study_program, avatar)
         VALUES (?, ?, ?, 'KARYAWAN_OS', ?, ?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, status, phone, identityNumber, institution, studyProgram, avatar]
      );
      newId = insertRes.insertId;
    } catch (insertErr: any) {
      if (
        insertErr?.code === "ER_NO_DEFAULT_FOR_FIELD" ||
        insertErr?.message?.includes("username")
      ) {
        const [res2]: any = await mysqlPool.query(
          `INSERT INTO users (username, name, email, password, role, status, phone, identity_number, institution, study_program, avatar)
           VALUES (?, ?, ?, ?, 'KARYAWAN_OS', ?, ?, ?, ?, ?, ?)`,
          [email, name, email, hashedPassword, status, phone, identityNumber, institution, studyProgram, avatar]
        );
        newId = res2.insertId;
      } else {
        throw insertErr;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Karyawan OS berhasil ditambahkan.",
        data: { id: newId, name, email, role: "KARYAWAN_OS", status },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/users/karyawan_os error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menambahkan karyawan OS." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      nama,
      email,
      password,
      phone,
      no_hp,
      identity_number,
      identityNumber,
      nip,
      institution,
      vendor,
      sekolah_kampus,
      study_program,
      studyProgram,
      divisi,
      unit_kerja,
      avatar,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID karyawan OS wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'KARYAWAN_OS'",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Karyawan OS tidak ditemukan." },
        { status: 404 }
      );
    }

    const fields: string[] = [];
    const params: any[] = [];

    const finalName = name || nama;
    const finalPhone = phone || no_hp;
    const finalIdentity = identity_number || identityNumber || nip;
    const finalInstitution = institution || vendor || sekolah_kampus;
    const finalStudyProgram = study_program || studyProgram || divisi || unit_kerja;

    if (finalName !== undefined) { fields.push("name = ?"); params.push(finalName); }
    if (email !== undefined) { fields.push("email = ?"); params.push(email); }
    if (password !== undefined && password !== "") {
      const hashed = await hashPassword(password);
      fields.push("password = ?");
      params.push(hashed);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      params.push(normalizeStatus(status));
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

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada field yang diperbarui." },
        { status: 400 }
      );
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const [result]: any = await mysqlPool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Karyawan OS tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Data karyawan OS berhasil diperbarui." });
  } catch (err: any) {
    console.error("PATCH /api/users/karyawan_os error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui data karyawan OS." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // no body
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID karyawan OS wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'KARYAWAN_OS'",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Karyawan OS tidak ditemukan." },
        { status: 404 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM users WHERE id = ? AND role = 'KARYAWAN_OS'",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Karyawan OS tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Karyawan OS berhasil dihapus." });
  } catch (err: any) {
    console.error("DELETE /api/users/karyawan_os error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus karyawan OS." },
      { status: 500 }
    );
  }
}
