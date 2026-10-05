import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { saveStorageFile } from "@/lib/storage";

// ============================================================
// AUTO-MIGRATION: buat tabel magang_program jika belum ada
// ============================================================
let isTableChecked = false;
async function ensureTable() {
  if (isTableChecked) return;
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS magang_program (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        judul VARCHAR(255) NOT NULL,
        deskripsi TEXT DEFAULT NULL,
        durasi VARCHAR(100) DEFAULT NULL,
        kategori VARCHAR(100) DEFAULT NULL,
        kuota INT UNSIGNED DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'aktif',
        gambar VARCHAR(500) DEFAULT NULL,
        gambar1 VARCHAR(500) DEFAULT NULL,
        gambar2 VARCHAR(500) DEFAULT NULL,
        gambar3 VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure columns exist if table was previously created with only `gambar`
    const cols = ["gambar1", "gambar2", "gambar3"];
    for (const col of cols) {
      try {
        await mysqlPool.query(`ALTER TABLE magang_program ADD COLUMN ${col} VARCHAR(500) DEFAULT NULL`);
      } catch (e: any) {
        // Ignored if column already exists (ER_DUP_FIELDNAME)
      }
    }

    isTableChecked = true;
  } catch (err) {
    console.warn("ensureMagangProgramTable:", err);
  }
}

function mapRow(row: any) {
  const g1 = row.gambar1 || row.gambar || null;
  const g2 = row.gambar2 || null;
  const g3 = row.gambar3 || null;

  return {
    id: row.id,
    judul: row.judul,
    nama_program: row.judul,
    title: row.judul,
    deskripsi: row.deskripsi || null,
    description: row.deskripsi || null,
    durasi: row.durasi || null,
    duration: row.durasi || null,
    kategori: row.kategori || null,
    tipe: row.kategori || null,
    kuota: row.kuota ?? null,
    status: row.status || "aktif",
    gambar: g1,
    gambar1: g1,
    gambar2: g2,
    gambar3: g3,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET — list semua program magang
export async function GET(req: Request) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let sql = "SELECT * FROM magang_program WHERE 1=1";
    const params: any[] = [];
    if (id) { sql += " AND id = ?"; params.push(id); }
    sql += " ORDER BY created_at DESC";

    const [rows]: any = await mysqlPool.query(sql, params);
    const data = (rows as any[]).map(mapRow);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data program magang." },
      { status: 500 }
    );
  }
}

// POST — tambah program baru
export async function POST(req: Request) {
  await ensureTable();
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};
    const gambarFiles: { [key: string]: File } = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (
          (key === "gambar" || key === "gambar1" || key === "gambar2" || key === "gambar3") &&
          typeof value === "object" &&
          typeof (value as any).arrayBuffer === "function"
        ) {
          gambarFiles[key] = value as File;
        } else {
          body[key] = value;
        }
      }
    } else {
      body = await req.json();
    }

    const judul = String(body.judul || body.nama_program || body.title || "").trim().slice(0, 255);
    const deskripsi = body.deskripsi || body.description || null;
    const durasi = body.durasi || body.duration || null;
    const kategori = body.kategori || body.tipe || null;
    const kuota = body.kuota !== undefined && body.kuota !== null && body.kuota !== "" ? Number(body.kuota) || null : null;
    const status = body.status || "aktif";

    let gambar1: string | null = null;
    let gambar2: string | null = null;
    let gambar3: string | null = null;

    const file1 = gambarFiles["gambar1"] || gambarFiles["gambar"];
    if (file1 && file1.size > 0) {
      gambar1 = await saveStorageFile(file1, "magang", "program1");
    } else if (typeof (body.gambar1 || body.gambar) === "string" && (body.gambar1 || body.gambar).trim()) {
      gambar1 = (body.gambar1 || body.gambar).trim().slice(0, 500);
    }

    if (gambarFiles["gambar2"] && gambarFiles["gambar2"].size > 0) {
      gambar2 = await saveStorageFile(gambarFiles["gambar2"], "magang", "program2");
    } else if (typeof body.gambar2 === "string" && body.gambar2.trim()) {
      gambar2 = body.gambar2.trim().slice(0, 500);
    }

    if (gambarFiles["gambar3"] && gambarFiles["gambar3"].size > 0) {
      gambar3 = await saveStorageFile(gambarFiles["gambar3"], "magang", "program3");
    } else if (typeof body.gambar3 === "string" && body.gambar3.trim()) {
      gambar3 = body.gambar3.trim().slice(0, 500);
    }

    if (!judul) {
      return NextResponse.json(
        { success: false, message: "Judul program wajib diisi." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      `INSERT INTO magang_program (judul, deskripsi, durasi, kategori, kuota, status, gambar, gambar1, gambar2, gambar3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [judul, deskripsi, durasi, kategori, kuota, status, gambar1, gambar1, gambar2, gambar3]
    );

    return NextResponse.json(
      { success: true, message: "Program magang berhasil ditambahkan.", data: { id: result.insertId } },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menambahkan program magang." },
      { status: 500 }
    );
  }
}

// PUT — update program
export async function PUT(req: Request) {
  await ensureTable();
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};
    const gambarFiles: { [key: string]: File } = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (
          (key === "gambar" || key === "gambar1" || key === "gambar2" || key === "gambar3") &&
          typeof value === "object" &&
          typeof (value as any).arrayBuffer === "function"
        ) {
          gambarFiles[key] = value as File;
        } else {
          body[key] = value;
        }
      }
    } else {
      body = await req.json();
    }

    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi." }, { status: 400 });
    }

    const fields: string[] = [];
    const params: any[] = [];

    const judul = body.judul || body.nama_program || body.title;
    if (judul !== undefined) { fields.push("judul = ?"); params.push(String(judul).trim().slice(0, 255)); }
    const deskripsi = body.deskripsi ?? body.description;
    if (deskripsi !== undefined) { fields.push("deskripsi = ?"); params.push(deskripsi || null); }
    const durasi = body.durasi ?? body.duration;
    if (durasi !== undefined) { fields.push("durasi = ?"); params.push(durasi || null); }
    const kategori = body.kategori ?? body.tipe;
    if (kategori !== undefined) { fields.push("kategori = ?"); params.push(kategori || null); }
    if (body.kuota !== undefined) {
      const val = body.kuota !== null && body.kuota !== "" ? Number(body.kuota) : null;
      fields.push("kuota = ?");
      params.push(val);
    }
    if (body.status !== undefined) { fields.push("status = ?"); params.push(body.status); }

    // Foto 1
    const file1 = gambarFiles["gambar1"] || gambarFiles["gambar"];
    if (file1 && file1.size > 0) {
      const savedPath = await saveStorageFile(file1, "magang", "program1", id);
      if (savedPath) {
        fields.push("gambar = ?");
        params.push(savedPath);
        fields.push("gambar1 = ?");
        params.push(savedPath);
      }
    } else if (body.gambar1 !== undefined || body.gambar !== undefined) {
      const val = body.gambar1 ?? body.gambar ?? null;
      fields.push("gambar = ?");
      params.push(val);
      fields.push("gambar1 = ?");
      params.push(val);
    }

    // Foto 2
    if (gambarFiles["gambar2"] && gambarFiles["gambar2"].size > 0) {
      const savedPath = await saveStorageFile(gambarFiles["gambar2"], "magang", "program2", id);
      if (savedPath) {
        fields.push("gambar2 = ?");
        params.push(savedPath);
      }
    } else if (body.gambar2 !== undefined) {
      fields.push("gambar2 = ?");
      params.push(body.gambar2 || null);
    }

    // Foto 3
    if (gambarFiles["gambar3"] && gambarFiles["gambar3"].size > 0) {
      const savedPath = await saveStorageFile(gambarFiles["gambar3"], "magang", "program3", id);
      if (savedPath) {
        fields.push("gambar3 = ?");
        params.push(savedPath);
      }
    } else if (body.gambar3 !== undefined) {
      fields.push("gambar3 = ?");
      params.push(body.gambar3 || null);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, message: "Tidak ada field yang diperbarui." }, { status: 400 });
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const [result]: any = await mysqlPool.query(
      `UPDATE magang_program SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Program magang berhasil diperbarui." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui program magang." },
      { status: 500 }
    );
  }
}

// DELETE — hapus program
export async function DELETE(req: Request) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      try { const body = await req.json(); id = body?.id; } catch { /* no body */ }
    }
    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi." }, { status: 400 });
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM magang_program WHERE id = ?", [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Data tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Program magang berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus program magang." },
      { status: 500 }
    );
  }
}
