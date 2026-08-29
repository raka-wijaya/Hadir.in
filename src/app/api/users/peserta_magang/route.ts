import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");

    let sql = `
      SELECT
        id,
        email,
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
      FROM peserta_magang
      WHERE 1=1
    `;
    const params: any[] = [];

    if (statusParam && statusParam !== "ALL") {
      sql += " AND status = ?";
      params.push(normalizeStatus(statusParam));
    }

    if (search) {
      sql +=
        " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR identity_number LIKE ? OR institution LIKE ? OR study_program LIKE ?)";
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q, q, q);
    }

    sql += " ORDER BY created_at DESC";

    const [rows]: any = await mysqlPool.query(sql, params);

    const safeRows = (rows || []).map((row: any) => {
      const startDateFormatted = formatDate(row.start_date);
      const endDateFormatted = formatDate(row.end_date);

      return {
        id: String(row.id),
        email: row.email,
        role: "ANAK_MAGANG",
        name: row.name,
        phone: row.phone || null,
        identity_number: row.identity_number || null,
        institution: row.institution || null,
        study_program: row.study_program || null,
        avatar: row.avatar || null,
        start_date: startDateFormatted,
        end_date: endDateFormatted,
        status: row.status,
        last_login_at: row.last_login_at || null,
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
        nama: row.name,
        no_hp: row.phone || null,
        identityNumber: row.identity_number || null,
        nim: row.identity_number || null,
        sekolah_kampus: row.institution || null,
        jurusan: row.study_program || null,
        studyProgram: row.study_program || null,
        startDate: startDateFormatted,
        periode_mulai: startDateFormatted,
        endDate: endDateFormatted,
        periode_selesai: endDateFormatted,
      };
    });

    return NextResponse.json({ success: true, data: safeRows });
  } catch (err: any) {
    console.error("GET /api/users/peserta_magang error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal mengambil data peserta magang.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawName = body.name || body.nama;
    const rawEmail = body.email;
    const rawPassword = body.password || "magang123";
    const status = normalizeStatus(body.status);
    const rawPhone = body.phone || body.no_hp;
    const rawIdentityNumber =
      body.identity_number || body.identityNumber || body.nim;
    const rawInstitution = body.institution || body.sekolah_kampus;
    const rawStudyProgram =
      body.study_program || body.studyProgram || body.jurusan;
    const rawStartDate =
      body.start_date || body.startDate || body.periode_mulai;
    const rawEndDate = body.end_date || body.endDate || body.periode_selesai;

    if (!rawName || !rawEmail) {
      return NextResponse.json(
        { success: false, message: "Nama dan email wajib diisi." },
        { status: 400 }
      );
    }

    const name = String(rawName).trim().slice(0, 150);
    const email = String(rawEmail).trim().toLowerCase().slice(0, 150);
    const phone = rawPhone ? String(rawPhone).trim().slice(0, 20) : null;
    const identityNumber = rawIdentityNumber
      ? String(rawIdentityNumber).trim().slice(0, 50)
      : null;
    const institution = rawInstitution
      ? String(rawInstitution).trim().slice(0, 200)
      : null;
    const studyProgram = rawStudyProgram
      ? String(rawStudyProgram).trim().slice(0, 150)
      : null;
    const startDate = rawStartDate
      ? String(rawStartDate).trim().slice(0, 10)
      : null;
    const endDate = rawEndDate ? String(rawEndDate).trim().slice(0, 10) : null;

    const avatar = body.avatar
      ? String(body.avatar).trim().slice(0, 500)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=72e3ad&color=1e2723&bold=true`;

    const hashedPassword = await hashPassword(rawPassword);

    const [insertRes]: any = await mysqlPool.query(
      `INSERT INTO peserta_magang (name, email, password, status, phone, identity_number, institution, study_program, avatar, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        status,
        phone,
        identityNumber,
        institution,
        studyProgram,
        avatar,
        startDate,
        endDate,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Peserta magang berhasil ditambahkan.",
        data: {
          id: String(insertRes.insertId),
          email,
          role: "ANAK_MAGANG",
          name,
          phone,
          identity_number: identityNumber,
          institution,
          study_program: studyProgram,
          avatar,
          start_date: startDate,
          end_date: endDate,
          status,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/users/peserta_magang error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal menambahkan peserta magang.",
      },
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
      nim,
      institution,
      sekolah_kampus,
      study_program,
      studyProgram,
      jurusan,
      avatar,
      start_date,
      startDate,
      periode_mulai,
      end_date,
      endDate,
      periode_selesai,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID peserta magang wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id FROM peserta_magang WHERE id = ?",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Peserta magang tidak ditemukan." },
        { status: 404 }
      );
    }

    const fields: string[] = [];
    const params: any[] = [];

    const finalName = name !== undefined ? name : nama;
    const finalPhone = phone !== undefined ? phone : no_hp;
    const finalIdentity =
      identity_number !== undefined
        ? identity_number
        : identityNumber !== undefined
          ? identityNumber
          : nim;
    const finalInstitution =
      institution !== undefined ? institution : sekolah_kampus;
    const finalStudyProgram =
      study_program !== undefined
        ? study_program
        : studyProgram !== undefined
          ? studyProgram
          : jurusan;
    const finalStartDate =
      start_date !== undefined
        ? start_date
        : startDate !== undefined
          ? startDate
          : periode_mulai;
    const finalEndDate =
      end_date !== undefined
        ? end_date
        : endDate !== undefined
          ? endDate
          : periode_selesai;

    if (finalName !== undefined) {
      fields.push("name = ?");
      params.push(String(finalName).trim().slice(0, 150));
    }
    if (email !== undefined) {
      fields.push("email = ?");
      params.push(String(email).trim().toLowerCase().slice(0, 150));
    }
    if (password !== undefined && password !== "") {
      const hashed = await hashPassword(password);
      fields.push("password = ?");
      params.push(hashed);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      params.push(normalizeStatus(status));
    }
    if (finalPhone !== undefined) {
      fields.push("phone = ?");
      params.push(finalPhone ? String(finalPhone).trim().slice(0, 20) : null);
    }
    if (finalIdentity !== undefined) {
      fields.push("identity_number = ?");
      params.push(
        finalIdentity ? String(finalIdentity).trim().slice(0, 50) : null
      );
    }
    if (finalInstitution !== undefined) {
      fields.push("institution = ?");
      params.push(
        finalInstitution ? String(finalInstitution).trim().slice(0, 200) : null
      );
    }
    if (finalStudyProgram !== undefined) {
      fields.push("study_program = ?");
      params.push(
        finalStudyProgram
          ? String(finalStudyProgram).trim().slice(0, 150)
          : null
      );
    }
    if (avatar !== undefined) {
      fields.push("avatar = ?");
      params.push(avatar ? String(avatar).trim().slice(0, 500) : null);
    }
    if (finalStartDate !== undefined) {
      fields.push("start_date = ?");
      params.push(
        finalStartDate ? String(finalStartDate).trim().slice(0, 10) : null
      );
    }
    if (finalEndDate !== undefined) {
      fields.push("end_date = ?");
      params.push(
        finalEndDate ? String(finalEndDate).trim().slice(0, 10) : null
      );
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
      `UPDATE peserta_magang SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Peserta magang tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data peserta magang berhasil diperbarui.",
    });
  } catch (err: any) {
    console.error("PATCH /api/users/peserta_magang error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan oleh akun lain." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal memperbarui data peserta magang.",
      },
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
        { success: false, message: "ID peserta magang wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id FROM peserta_magang WHERE id = ?",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Peserta magang tidak ditemukan." },
        { status: 404 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM peserta_magang WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Peserta magang tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Peserta magang berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/users/peserta_magang error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal menghapus peserta magang.",
      },
      { status: 500 }
    );
  }
}