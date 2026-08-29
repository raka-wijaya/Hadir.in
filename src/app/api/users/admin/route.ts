import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

const ADMIN_ROLES = ["SUPERADMIN", "ADMIN_MAGANG", "ADMIN_OS"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function normalizeAdminRole(roleInput?: string | null): AdminRole | null {
  if (!roleInput) return "ADMIN_MAGANG";
  const r = roleInput.toUpperCase().trim();
  if (r === "SUPERADMIN" || r === "SUPER_ADMIN") return "SUPERADMIN";
  if (r === "ADMIN_MAGANG") return "ADMIN_MAGANG";
  if (r === "ADMIN_OS") return "ADMIN_OS";
  if (ADMIN_ROLES.includes(r as AdminRole)) return r as AdminRole;
  return null;
}

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
    const roleParam = searchParams.get("role");
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");

    let sql = `
      SELECT
        id,
        email,
        role,
        name,
        phone,
        identity_number,
        avatar,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM admin
      WHERE 1=1
    `;
    const params: any[] = [];

    if (roleParam && roleParam !== "ALL") {
      const normalizedRole = normalizeAdminRole(roleParam);
      if (normalizedRole) {
        sql += " AND role = ?";
        params.push(normalizedRole);
      }
    }

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

    const [rows]: any = await mysqlPool.query(sql, params);

    const safeRows = (rows || []).map((row: any) => ({
      id: String(row.id),
      email: row.email,
      role: row.role,
      name: row.name,
      phone: row.phone || null,
      identity_number: row.identity_number || null,
      avatar: row.avatar || null,
      status: row.status,
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
    console.error("GET /api/users/admin error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data admin." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawName = body.name || body.nama;
    const rawEmail = body.email;
    const rawPassword = body.password || "admin123";
    const rawRole = body.role;
    const status = normalizeStatus(body.status);
    const rawPhone = body.phone || body.no_hp;
    const rawIdentityNumber =
      body.identity_number || body.identityNumber || body.nip;

    const normalizedRole = normalizeAdminRole(rawRole) || "ADMIN_MAGANG";

    if (!rawName || !rawEmail) {
      return NextResponse.json(
        { success: false, message: "Nama dan email wajib diisi." },
        { status: 400 }
      );
    }

    if (!normalizedRole) {
      return NextResponse.json(
        {
          success: false,
          message: `Role tidak valid. Role admin yang diizinkan: ${ADMIN_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const name = String(rawName).trim().slice(0, 150);
    const email = String(rawEmail).trim().toLowerCase().slice(0, 150);
    const phone = rawPhone ? String(rawPhone).trim().slice(0, 20) : null;
    const identityNumber = rawIdentityNumber
      ? String(rawIdentityNumber).trim().slice(0, 50)
      : null;

    const avatar = body.avatar
      ? String(body.avatar).trim().slice(0, 500)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=ffffff&bold=true`;

    const hashedPassword = await hashPassword(rawPassword);

    const [insertRes]: any = await mysqlPool.query(
      `INSERT INTO admin (name, email, password, role, status, phone, identity_number, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, normalizedRole, status, phone, identityNumber, avatar]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Admin berhasil ditambahkan.",
        data: {
          id: String(insertRes.insertId),
          email,
          role: normalizedRole,
          name,
          phone,
          identity_number: identityNumber,
          avatar,
          status,
        },
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
      "SELECT id, role FROM admin WHERE id = ?",
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

    const finalName = name !== undefined ? name : nama;
    const finalPhone = phone !== undefined ? phone : no_hp;
    const finalIdentity =
      identity_number !== undefined ? identity_number : identityNumber;

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
    if (role !== undefined) {
      const normalizedRole = normalizeAdminRole(role);
      if (!normalizedRole) {
        return NextResponse.json(
          {
            success: false,
            message: `Role tidak valid. Role admin: ${ADMIN_ROLES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      fields.push("role = ?");
      params.push(normalizedRole);
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
      params.push(finalIdentity ? String(finalIdentity).trim().slice(0, 50) : null);
    }
    if (avatar !== undefined) {
      fields.push("avatar = ?");
      params.push(avatar ? String(avatar).trim().slice(0, 500) : null);
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
      `UPDATE admin SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data admin berhasil diperbarui.",
    });
  } catch (err: any) {
    console.error("PATCH /api/users/admin error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan oleh akun lain." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui data admin." },
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
        { success: false, message: "ID admin wajib diisi." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id FROM admin WHERE id = ?",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM admin WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/users/admin error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus admin." },
      { status: 500 }
    );
  }
}
