import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

let isTableChecked = false;
async function ensureTable() {
  if (isTableChecked) return;
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS magang_benefit (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        judul VARCHAR(255) NOT NULL,
        deskripsi TEXT DEFAULT NULL,
        icon VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    isTableChecked = true;
  } catch (err) {
    console.warn("ensureMagangBenefitTable:", err);
  }
}

function mapRow(row: any) {
  return {
    id: row.id,
    judul: row.judul,
    title: row.judul,
    deskripsi: row.deskripsi || null,
    description: row.deskripsi || null,
    icon: row.icon || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(req: Request) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    let sql = "SELECT * FROM magang_benefit WHERE 1=1";
    const params: any[] = [];
    if (id) { sql += " AND id = ?"; params.push(id); }
    sql += " ORDER BY created_at ASC";
    const [rows]: any = await mysqlPool.query(sql, params);
    return NextResponse.json({ success: true, data: (rows as any[]).map(mapRow) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data benefit magang." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await ensureTable();
  try {
    const body = await req.json();
    const judul = String(body.judul || body.title || "").trim().slice(0, 255);
    const deskripsi = body.deskripsi || body.description || null;
    const icon = body.icon || null;

    if (!judul) {
      return NextResponse.json({ success: false, message: "Judul wajib diisi." }, { status: 400 });
    }

    const [result]: any = await mysqlPool.query(
      "INSERT INTO magang_benefit (judul, deskripsi, icon) VALUES (?, ?, ?)",
      [judul, deskripsi, icon]
    );
    return NextResponse.json(
      { success: true, message: "Benefit magang berhasil ditambahkan.", data: { id: result.insertId } },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menambahkan benefit." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  await ensureTable();
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID wajib diisi." }, { status: 400 });

    const fields: string[] = [];
    const params: any[] = [];

    const judul = body.judul ?? body.title;
    if (judul !== undefined) { fields.push("judul = ?"); params.push(String(judul).trim().slice(0, 255)); }
    const deskripsi = body.deskripsi ?? body.description;
    if (deskripsi !== undefined) { fields.push("deskripsi = ?"); params.push(deskripsi || null); }
    if (body.icon !== undefined) { fields.push("icon = ?"); params.push(body.icon || null); }

    if (fields.length === 0) return NextResponse.json({ success: false, message: "Tidak ada field." }, { status: 400 });
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const [result]: any = await mysqlPool.query(
      `UPDATE magang_benefit SET ${fields.join(", ")} WHERE id = ?`, params
    );
    if (result.affectedRows === 0) return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Benefit magang berhasil diperbarui." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui benefit." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) { try { const body = await req.json(); id = body?.id; } catch { /* no body */ } }
    if (!id) return NextResponse.json({ success: false, message: "ID wajib diisi." }, { status: 400 });

    const [result]: any = await mysqlPool.query("DELETE FROM magang_benefit WHERE id = ?", [id]);
    if (result.affectedRows === 0) return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Benefit magang berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus benefit." },
      { status: 500 }
    );
  }
}
