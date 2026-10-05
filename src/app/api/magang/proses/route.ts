import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

let isTableChecked = false;
async function ensureTable() {
  if (isTableChecked) return;
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS magang_proses (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        step INT UNSIGNED NOT NULL DEFAULT 1,
        judul VARCHAR(255) NOT NULL,
        deskripsi TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    isTableChecked = true;
  } catch (err) {
    console.warn("ensureMagangProsesTable:", err);
  }
}

function mapRow(row: any) {
  return {
    id: row.id,
    step: row.step,
    langkah: row.step,
    urutan: row.step,
    judul: row.judul,
    title: row.judul,
    deskripsi: row.deskripsi || null,
    description: row.deskripsi || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(req: Request) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    let sql = "SELECT * FROM magang_proses WHERE 1=1";
    const params: any[] = [];
    if (id) { sql += " AND id = ?"; params.push(id); }
    sql += " ORDER BY step ASC";
    const [rows]: any = await mysqlPool.query(sql, params);
    return NextResponse.json({ success: true, data: (rows as any[]).map(mapRow) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data proses magang." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await ensureTable();
  try {
    const body = await req.json();
    const judul = String(body.judul || body.title || "").trim().slice(0, 255);
    const step = Number(body.step || body.langkah || body.urutan || 1);
    const deskripsi = body.deskripsi || body.description || null;

    if (!judul) {
      return NextResponse.json({ success: false, message: "Judul wajib diisi." }, { status: 400 });
    }

    const [result]: any = await mysqlPool.query(
      "INSERT INTO magang_proses (step, judul, deskripsi) VALUES (?, ?, ?)",
      [step, judul, deskripsi]
    );
    return NextResponse.json(
      { success: true, message: "Proses magang berhasil ditambahkan.", data: { id: result.insertId } },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menambahkan proses." },
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
    const step = body.step ?? body.langkah ?? body.urutan;
    if (step !== undefined) { fields.push("step = ?"); params.push(Number(step)); }
    const deskripsi = body.deskripsi ?? body.description;
    if (deskripsi !== undefined) { fields.push("deskripsi = ?"); params.push(deskripsi || null); }

    if (fields.length === 0) return NextResponse.json({ success: false, message: "Tidak ada field." }, { status: 400 });
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const [result]: any = await mysqlPool.query(
      `UPDATE magang_proses SET ${fields.join(", ")} WHERE id = ?`, params
    );
    if (result.affectedRows === 0) return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Proses magang berhasil diperbarui." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui proses." },
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

    const [result]: any = await mysqlPool.query("DELETE FROM magang_proses WHERE id = ?", [id]);
    if (result.affectedRows === 0) return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Proses magang berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus proses." },
      { status: 500 }
    );
  }
}
