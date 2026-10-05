import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

// ============================================================
// AUTO-MIGRATION: pastikan kolom tambahan ada di tabel pendaftaran
// ============================================================
let isPendaftaranSchemaChecked = false;
async function ensurePendaftaranSchema() {
  if (isPendaftaranSchemaChecked) return;
  try {
    const [cols]: any = await mysqlPool.query(
      `SHOW COLUMNS FROM pendaftaran`
    );
    const existing = new Set((cols as any[]).map((c: any) => c.Field.toLowerCase()));

    if (!existing.has("study_program")) {
      await mysqlPool.query(
        `ALTER TABLE pendaftaran ADD COLUMN study_program VARCHAR(150) NULL AFTER sekolah_kampus`
      );
    }
    if (!existing.has("semester")) {
      await mysqlPool.query(
        `ALTER TABLE pendaftaran ADD COLUMN semester TINYINT UNSIGNED NULL AFTER study_program`
      );
    }
    if (!existing.has("portfolio_file")) {
      await mysqlPool.query(
        `ALTER TABLE pendaftaran ADD COLUMN portfolio_file VARCHAR(500) NULL AFTER file_cv`
      );
    }
    isPendaftaranSchemaChecked = true;
  } catch (err) {
    console.warn("Auto-migration pendaftaran schema:", err);
  }
}

// ============================================================
// Generate kode pendaftaran: DFT-YYYYMM-XXXX
// ============================================================
async function generateKodePendaftaran(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `DFT-${year}${month}-`;

  const [rows]: any = await mysqlPool.query(
    `SELECT kode_pendaftaran FROM pendaftaran
     WHERE kode_pendaftaran LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows && rows.length > 0) {
    const last = rows[0].kode_pendaftaran as string;
    const parts = last.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function formatDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

function normalizeStatus(s: string): "PENDING" | "DITERIMA" | "DITOLAK" | "DIBATALKAN" {
  const upper = s.toUpperCase().trim();
  if (upper === "DITERIMA" || upper === "LOLOS") return "DITERIMA";
  if (upper === "DITOLAK" || upper === "TIDAK_LOLOS" || upper === "TIDAK LOLOS") return "DITOLAK";
  if (upper === "DIBATALKAN") return "DIBATALKAN";
  return "PENDING";
}

function mapRow(row: any) {
  return {
    id: String(row.id),
    kode_pendaftaran: row.kode_pendaftaran,
    user_id: row.user_id ? String(row.user_id) : null,
    nama: row.nama,
    email: row.email,
    no_hp: row.no_hp,
    sekolah_kampus: row.sekolah_kampus,
    study_program: row.study_program || row.jurusan || null,
    jurusan: row.study_program || row.jurusan || null,
    semester: row.semester ?? null,
    bagian: row.bagian,
    alamat: row.alamat,
    periode_mulai: formatDate(row.periode_mulai),
    periode_selesai: formatDate(row.periode_selesai),
    file_cv: row.file_cv || null,
    portfolio_file: row.portfolio_file || null,
    status: row.status,
    catatan_admin: row.catatan_admin || null,
    tanggal_daftar: row.tanggal_daftar
      ? new Date(row.tanggal_daftar).toISOString()
      : new Date().toISOString(),
    created_at: row.created_at
      ? new Date(row.created_at).toISOString()
      : null,
    updated_at: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
  };
}

// ============================================================
// GET — list semua pendaftar (dengan optional ?status= & ?q=)
// ============================================================
export async function GET(req: Request) {
  await ensurePendaftaranSchema();
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("q");
    const idParam = searchParams.get("id");

    let sql = `SELECT * FROM pendaftaran WHERE 1=1`;
    const params: any[] = [];

    if (idParam) {
      sql += " AND id = ?";
      params.push(idParam);
    }
    if (statusParam && statusParam !== "ALL") {
      sql += " AND status = ?";
      params.push(normalizeStatus(statusParam));
    }
    if (search) {
      const q = `%${search.trim()}%`;
      sql += ` AND (nama LIKE ? OR kode_pendaftaran LIKE ? OR sekolah_kampus LIKE ? OR bagian LIKE ? OR email LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += " ORDER BY tanggal_daftar DESC";

    const [rows]: any = await mysqlPool.query(sql, params);
    const data = (rows as any[]).map(mapRow);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/pendaftaran error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data pendaftaran." },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — buat pendaftaran baru
// ============================================================
export async function POST(req: Request) {
  await ensurePendaftaranSchema();
  try {
    const body = await req.json();

    const nama = String(body.nama || "").trim().slice(0, 150);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 150);
    const no_hp = String(body.no_hp || "").trim().slice(0, 20);
    const sekolah_kampus = String(body.sekolah_kampus || "").trim().slice(0, 200);
    const study_program = String(
      body.study_program || body.jurusan || ""
    ).trim().slice(0, 150);
    const semester = body.semester ? Number(body.semester) || null : null;
    const bagian = String(body.bagian || "").trim().slice(0, 100);
    const alamat = String(body.alamat || "Sidoarjo").trim();
    const periode_mulai = body.periode_mulai || null;
    const periode_selesai = body.periode_selesai || null;
    const file_cv = body.file_cv || null;
    const portfolio_file = body.portfolio_file || null;
    const status = normalizeStatus(body.status || "PENDING");

    if (!nama || !email || !no_hp || !sekolah_kampus || !bagian) {
      return NextResponse.json(
        { success: false, message: "Field nama, email, no_hp, sekolah_kampus, dan bagian wajib diisi." },
        { status: 400 }
      );
    }

    const kode_pendaftaran = await generateKodePendaftaran();

    const [result]: any = await mysqlPool.query(
      `INSERT INTO pendaftaran
        (kode_pendaftaran, nama, email, no_hp, sekolah_kampus, study_program, semester, bagian, alamat,
         periode_mulai, periode_selesai, file_cv, portfolio_file, status, tanggal_daftar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        kode_pendaftaran, nama, email, no_hp, sekolah_kampus,
        study_program || null, semester, bagian, alamat,
        periode_mulai, periode_selesai, file_cv, portfolio_file, status,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pendaftaran berhasil disimpan.",
        data: { id: String(result.insertId), kode_pendaftaran },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/pendaftaran error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menyimpan pendaftaran." },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT — update status & catatan_admin
// ============================================================
export async function PUT(req: Request) {
  await ensurePendaftaranSchema();
  try {
    const body = await req.json();

    // Support: PUT /api/pendaftaran (body: { id, status, catatan_admin })
    // atau URL param: /api/pendaftaran?id=...
    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID pendaftaran wajib diisi." },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (body.status !== undefined) {
      fields.push("status = ?");
      params.push(normalizeStatus(body.status));
    }
    if (body.catatan_admin !== undefined) {
      fields.push("catatan_admin = ?");
      params.push(body.catatan_admin || null);
    }
    if (body.nama !== undefined) {
      fields.push("nama = ?");
      params.push(String(body.nama).trim().slice(0, 150));
    }
    if (body.periode_mulai !== undefined) {
      fields.push("periode_mulai = ?");
      params.push(body.periode_mulai || null);
    }
    if (body.periode_selesai !== undefined) {
      fields.push("periode_selesai = ?");
      params.push(body.periode_selesai || null);
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
      `UPDATE pendaftaran SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data pendaftaran tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Status pendaftaran berhasil diperbarui.",
    });
  } catch (err: any) {
    console.error("PUT /api/pendaftaran error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui pendaftaran." },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — hapus pendaftaran berdasarkan ?id= atau body.id
// ============================================================
export async function DELETE(req: Request) {
  await ensurePendaftaranSchema();
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
        { success: false, message: "ID pendaftaran wajib diisi." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM pendaftaran WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data pendaftaran tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pendaftaran berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/pendaftaran error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus pendaftaran." },
      { status: 500 }
    );
  }
}
