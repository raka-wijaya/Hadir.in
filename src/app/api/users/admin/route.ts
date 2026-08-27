import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { saveBase64File } from "@/lib/storage";

// Role yang diizinkan untuk admin
const ADMIN_ROLES = ["SUPERADMIN", "ADMIN_MAGANG", "ADMIN_OS"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

// Helper: Normalisasi Role admin
function normalizeAdminRole(roleInput?: string | null): string {
  if (!roleInput) return "ADMIN_MAGANG";
  const r = roleInput.toUpperCase().trim();
  if (r === "SUPERADMIN" || r === "SUPER_ADMIN") return "SUPERADMIN";
  if (r === "ADMIN_MAGANG") return "ADMIN_MAGANG";
  if (r === "ADMIN_OS") return "ADMIN_OS";
  return r;
}

// Helper: Normalisasi Status
function normalizeStatus(statusInput?: string | null): "ACTIVE" | "INACTIVE" {
  if (!statusInput) return "ACTIVE";
  const s = statusInput.toUpperCase().trim();
  if (s === "INACTIVE" || s === "NONAKTIF") return "INACTIVE";
  return "ACTIVE";
}

// GET: Ambil daftar admin (SUPERADMIN, ADMIN_MAGANG, ADMIN_OS)
// Query params: role, status, q (search)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");

    let sql = `
      SELECT id, email, role, name, phone, identity_number,
             avatar, status, last_login_at, created_at, updated_at
      FROM users
      WHERE role IN ('SUPERADMIN', 'ADMIN_MAGANG', 'ADMIN_OS')
    `;
    const params: any[] = [];

    if (roleParam && roleParam !== "ALL") {
      const normalized = normalizeAdminRole(roleParam);
      if (!ADMIN_ROLES.includes(normalized as AdminRole)) {
        return NextResponse.json(
          { success: false, message: `Role tidak valid. Role admin: ${ADMIN_ROLES.join(", ")}` },
          { status: 400 }
        );
      }
      sql += " AND role = ?";
      params.push(normalized);
    }

    if (statusParam && statusParam !== "ALL") {
      sql += " AND status = ?";
      params.push(normalizeStatus(statusParam));
    }

    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR identity_number LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY created_at DESC";

    const [rows]: any = await mysqlPool.query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("GET /api/users/admin error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data admin." },
      { status: 500 }
    );
  }
}

// POST: Tambah admin baru
// Body: { name, email, password?, role, phone?, identity_number?, avatar?, status? }
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = body.name || body.nama;
    const email = body.email;
    const rawPassword = body.password || "admin123";
    const role = normalizeAdminRole(body.role);
    const status = normalizeStatus(body.status);
    const phone = body.phone || body.no_hp || null;
    const identityNumber = body.identity_number || body.identityNumber || null;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Nama dan email wajib diisi." },
        { status: 400 }
      );
    }

    if (!ADMIN_ROLES.includes(role as AdminRole)) {
      return NextResponse.json(
        { success: false, message: `Role tidak valid. Role admin yang diizinkan: ${ADMIN_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const rawAvatar =
      body.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=ffffff&bold=true`;
    const avatar =
      (await saveBase64File(rawAvatar, "avatars", "avatar", email)) || rawAvatar;

    const hashedPassword = await hashPassword(rawPassword);

    let newId: any;
    try {
      const [insertRes]: any = await mysqlPool.query(
        `INSERT INTO users (name, email, password, role, status, phone, identity_number, avatar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, role, status, phone, identityNumber, avatar]
      );
      newId = insertRes.insertId;
    } catch (insertErr: any) {
      if (
        insertErr?.code === "ER_NO_DEFAULT_FOR_FIELD" ||
        insertErr?.message?.includes("username")
      ) {
        const [res2]: any = await mysqlPool.query(
          `INSERT INTO users (username, name, email, password, role, status, phone, identity_number, avatar)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [email, name, email, hashedPassword, role, status, phone, identityNumber, avatar]
        );
        newId = res2.insertId;
      } else {
        throw insertErr;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Admin berhasil ditambahkan.",
        data: { id: newId, name, email, role, status },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/users/admin error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menambahkan admin." },
      { status: 500 }
    );
  }
}

// PATCH: Update data admin
// Body: { id, name?, email?, password?, role?, phone?, identity_number?, avatar?, status? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      nama,
      email,
      password,
      role,
      phone,
      no_hp,
      identity_number,
      identityNumber,
      avatar,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID admin wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id, role FROM users WHERE id = ? AND role IN ('SUPERADMIN', 'ADMIN_MAGANG', 'ADMIN_OS')",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    const fields: string[] = [];
    const params: any[] = [];

    const finalName = name || nama;
    const finalPhone = phone || no_hp;
    const finalIdentity = identity_number || identityNumber;

    if (finalName !== undefined) { fields.push("name = ?"); params.push(finalName); }
    if (email !== undefined) { fields.push("email = ?"); params.push(email); }
    if (password !== undefined && password !== "") {
      const hashed = await hashPassword(password);
      fields.push("password = ?");
      params.push(hashed);
    }
    if (role !== undefined) {
      const normalizedRole = normalizeAdminRole(role);
      if (!ADMIN_ROLES.includes(normalizedRole as AdminRole)) {
        return NextResponse.json(
          { success: false, message: `Role tidak valid. Role admin: ${ADMIN_ROLES.join(", ")}` },
          { status: 400 }
        );
      }
      fields.push("role = ?");
      params.push(normalizedRole);
    }
    if (status !== undefined) { fields.push("status = ?"); params.push(normalizeStatus(status)); }
    if (finalPhone !== undefined) { fields.push("phone = ?"); params.push(finalPhone); }
    if (finalIdentity !== undefined) { fields.push("identity_number = ?"); params.push(finalIdentity); }
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
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Data admin berhasil diperbarui." });
  } catch (err: any) {
    console.error("PATCH /api/users/admin error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan oleh admin lain." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui data admin." },
      { status: 500 }
    );
  }
}

// DELETE: Hapus admin
// Query params: id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID admin wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id, role FROM users WHERE id = ? AND role IN ('SUPERADMIN', 'ADMIN_MAGANG', 'ADMIN_OS')",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM users WHERE id = ? AND role IN ('SUPERADMIN', 'ADMIN_MAGANG', 'ADMIN_OS')",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Admin berhasil dihapus." });
  } catch (err: any) {
    console.error("DELETE /api/users/admin error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus admin." },
      { status: 500 }
    );
  }
}
