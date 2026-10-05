import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

let isTableChecked = false;
async function ensureTable() {
  if (isTableChecked) return;
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS magang_timeline (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        kegiatan VARCHAR(255) NOT NULL,
        tanggal_mulai DATE DEFAULT NULL,
        tanggal_selesai DATE DEFAULT NULL,
        deskripsi TEXT DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'upcoming',
        urutan INT UNSIGNED DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    isTableChecked = true;
  } catch (err) {
    console.warn("ensureMagangTimelineTable:", err);
  }
}

function formatDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
  }
  return String(val);
}

function mapRow(row: any) {
  return {
    id: row.id,
    kegiatan: row.kegiatan,
    judul: row.kegiatan,
    title: row.kegiatan,
    tanggal: formatDate(row.tanggal_mulai),
    tanggal_mulai: formatDate(row.tanggal_mulai),
    tanggal_selesai: formatDate(row.tanggal_selesai),
    deskripsi: row.deskripsi || null,
    description: row.deskripsi || null,
    status: row.status || "upcoming",
    urutan: row.urutan || 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(req: Request) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    let sql = "SELECT * FROM magang_timeline WHERE 1=1";
    const params: any[] = [];
    if (id) { sql += " AND id = ?"; params.push(id); }
    sql += " ORDER BY urutan ASC, tanggal_mulai ASC";
    const [rows]: any = await mysqlPool.query(sql, params);
    return NextResponse.json({ success: true, data: (rows as any[]).map(mapRow) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data timeline." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await ensureTable();
  try {
    const body = await req.json();
    const kegiatan = String(body.kegiatan || body.judul || body.title || "").trim().slice(0, 255);
    const tanggal_mulai = body.tanggal_mulai || body.tanggal || null;
    const tanggal_selesai = body.tanggal_selesai || null;
    const deskripsi = body.deskripsi || body.description || null;
    const status = body.status || "upcoming";
    const urutan = Number(body.urutan || 1);

    if (!kegiatan) {
      return NextResponse.json({ success: false, message: "Nama kegiatan wajib diisi." }, { status: 400 });
    }

    const [result]: any = await mysqlPool.query(
      `INSERT INTO magang_timeline (kegiatan, tanggal_mulai, tanggal_selesai, deskripsi, status, urutan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [kegiatan, tanggal_mulai || null, tanggal_selesai || null, deskripsi, status, urutan]
    );
    return NextResponse.json(
      { success: true, message: "Timeline berhasil ditambahkan.", data: { id: result.insertId } },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menambahkan timeline." },
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

    const kegiatan = body.kegiatan ?? body.judul ?? body.title;
    if (kegiatan !== undefined) { fields.push("kegiatan = ?"); params.push(String(kegiatan).trim().slice(0, 255)); }
    const tanggal_mulai = body.tanggal_mulai ?? body.tanggal;
    if (tanggal_mulai !== undefined) { fields.push("tanggal_mulai = ?"); params.push(tanggal_mulai || null); }
    if (body.tanggal_selesai !== undefined) { fields.push("tanggal_selesai = ?"); params.push(body.tanggal_selesai || null); }
    const deskripsi = body.deskripsi ?? body.description;
    if (deskripsi !== undefined) { fields.push("deskripsi = ?"); params.push(deskripsi || null); }
    if (body.status !== undefined) { fields.push("status = ?"); params.push(body.status); }
    if (body.urutan !== undefined) { fields.push("urutan = ?"); params.push(Number(body.urutan)); }

    if (fields.length === 0) return NextResponse.json({ success: false, message: "Tidak ada field." }, { status: 400 });
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const [result]: any = await mysqlPool.query(
      `UPDATE magang_timeline SET ${fields.join(", ")} WHERE id = ?`, params
    );
    if (result.affectedRows === 0) return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Timeline berhasil diperbarui." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui timeline." },
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

    const [result]: any = await mysqlPool.query("DELETE FROM magang_timeline WHERE id = ?", [id]);
    if (result.affectedRows === 0) return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Timeline berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus timeline." },
      { status: 500 }
    );
  }
}
