import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { saveStorageFile } from "@/lib/storage";

function normalizeStatus(statusInput?: string | null): "ACTIVE" | "INACTIVE" {
  if (!statusInput) return "ACTIVE";
  const s = statusInput.toUpperCase().trim();
  if (s === "INACTIVE" || s === "NONAKTIF" || s === "NON_AKTIF" || s === "OFF")
    return "INACTIVE";
  return "ACTIVE";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");

    let rows: any;
    let usedTable = "karyawan_os";

    try {
      let sql = `
        SELECT
          id,
          email,
          name,
          phone,
          identity_number,
          avatar,
          status,
          last_login_at,
          created_at,
          updated_at
        FROM karyawan_os
        WHERE 1=1
      `;
      const params: any[] = [];

      if (statusParam && statusParam !== "ALL") {
        sql += " AND status = ?";
        params.push(normalizeStatus(statusParam));
      }

      if (search) {
        sql +=
          " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR identity_number LIKE ?)";
        const q = `%${search.trim()}%`;
        params.push(q, q, q, q);
      }

      sql += " ORDER BY created_at DESC";

      [rows] = await mysqlPool.query(sql, params);
    } catch (osErr: any) {
      // Fallback ke tabel users jika tabel karyawan_os tidak ada
      usedTable = "users";
      let fallbackSql = `
        SELECT
          id,
          email,
          name,
          phone,
          identity_number,
          avatar,
          status,
          last_login_at,
          created_at,
          updated_at
        FROM users
        WHERE (role = 'KARYAWAN_OS' OR role IS NULL)
      `;
      const fallbackParams: any[] = [];

      if (statusParam && statusParam !== "ALL") {
        fallbackSql += " AND status = ?";
        fallbackParams.push(normalizeStatus(statusParam));
      }

      if (search) {
        fallbackSql +=
          " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR identity_number LIKE ?)";
        const q = `%${search.trim()}%`;
        fallbackParams.push(q, q, q, q);
      }

      fallbackSql += " ORDER BY created_at DESC";
      [rows] = await mysqlPool.query(fallbackSql, fallbackParams);
    }

    const safeRows = (rows || []).map((row: any) => ({
      id: String(row.id),
      email: row.email,
      role: "KARYAWAN_OS",
      name: row.name,
      phone: row.phone || null,
      identity_number: row.identity_number || null,
      avatar: row.avatar || null,
      status: row.status || "ACTIVE",
      last_login_at: row.last_login_at || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
      nama: row.name,
      no_hp: row.phone || null,
      identityNumber: row.identity_number || null,
      nip: row.identity_number || null,
    }));

    return NextResponse.json({ success: true, data: safeRows });
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

    const rawName = body.name || body.nama;
    const rawEmail = body.email;
    const rawPassword = body.password || "karyawan123";
    const status = normalizeStatus(body.status);
    const rawPhone = body.phone || body.no_hp;
    const rawIdentityNumber =
      body.identity_number || body.identityNumber || body.nip;

    if (!rawName || !rawEmail) {
      return NextResponse.json(
        { success: false, message: "Nama dan email wajib diisi." },
        { status: 400 },
      );
    }

    const name = String(rawName).trim().slice(0, 150);
    const email = String(rawEmail).trim().toLowerCase().slice(0, 150);
    const phone = rawPhone ? String(rawPhone).trim().slice(0, 20) : null;
    const identityNumber = rawIdentityNumber
      ? String(rawIdentityNumber).trim().slice(0, 50)
      : null;

    let finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f59e0b&color=000000&bold=true`;
    if (body.avatar && typeof body.avatar === "string") {
      if (body.avatar.startsWith("data:")) {
        const saved = await saveStorageFile(body.avatar, "avatars", "avatar", identityNumber || email);
        if (saved) finalAvatar = saved;
      } else {
        finalAvatar = String(body.avatar).trim().slice(0, 500);
      }
    }

    const hashedPassword = await hashPassword(rawPassword);

    let newId: any;
    try {
      const [insertRes]: any = await mysqlPool.query(
        `INSERT INTO karyawan_os (name, email, password, status, phone, identity_number, avatar)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, status, phone, identityNumber, finalAvatar],
      );
      newId = insertRes.insertId;
    } catch (insertErr: any) {
      if (
        insertErr?.code === "ER_NO_SUCH_TABLE" ||
        insertErr?.message?.includes("karyawan_os")
      ) {
        const [resUsers]: any = await mysqlPool.query(
          `INSERT INTO users (name, email, password, role, status, phone, identity_number, avatar)
           VALUES (?, ?, ?, 'KARYAWAN_OS', ?, ?, ?, ?)`,
          [name, email, hashedPassword, status, phone, identityNumber, finalAvatar],
        );
        newId = resUsers.insertId;
      } else {
        throw insertErr;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Karyawan OS berhasil ditambahkan.",
        data: {
          id: String(newId),
          email,
          role: "KARYAWAN_OS",
          name,
          phone,
          identity_number: identityNumber,
          avatar,
          status,
        },
      },
      { status: 201 },
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
      avatar,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID karyawan OS wajib diisi." },
        { status: 400 }
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
          : nip;

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
        finalIdentity ? String(finalIdentity).trim().slice(0, 50) : null,
      );
    }
    if (avatar !== undefined) {
      let finalAvatar = avatar;
      if (avatar && typeof avatar === "string" && avatar.startsWith("data:")) {
        const saved = await saveStorageFile(avatar, "avatars", "avatar", id);
        if (saved) finalAvatar = saved;
      }
      fields.push("avatar = ?");
      params.push(finalAvatar ? String(finalAvatar).trim().slice(0, 500) : null);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada field yang diperbarui." },
        { status: 400 }
      );
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    let updated = false;
    try {
      const [result]: any = await mysqlPool.query(
        `UPDATE karyawan_os SET ${fields.join(", ")} WHERE id = ?`,
        params,
      );
      if (result.affectedRows > 0) {
        updated = true;
      }
    } catch {
      // Fallback ke tabel users
    }

    if (!updated) {
      try {
        const [resUsers]: any = await mysqlPool.query(
          `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
          params,
        );
        if (resUsers.affectedRows > 0) {
          updated = true;
        }
      } catch {
        // Abaikan
      }
    }

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Karyawan OS tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data karyawan OS berhasil diperbarui.",
      data: {
        avatar: avatar !== undefined ? params[fields.indexOf("avatar = ?")] : undefined,
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/users/karyawan_os error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan oleh akun lain." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui data karyawan OS." },
      { status: 500 }
    );
  }
}

// DELETE: Hapus karyawan OS
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

    let deleted = false;
    try {
      const [result]: any = await mysqlPool.query(
        "DELETE FROM karyawan_os WHERE id = ?",
        [id],
      );
      if (result.affectedRows > 0) {
        deleted = true;
      }
    } catch {
      // Fallback ke users
    }

    if (!deleted) {
      try {
        const [resUsers]: any = await mysqlPool.query(
          "DELETE FROM users WHERE id = ?",
          [id],
        );
        if (resUsers.affectedRows > 0) {
          deleted = true;
        }
      } catch {
        // Abaikan
      }
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Karyawan OS tidak ditemukan." },
        { status: 404 },
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

