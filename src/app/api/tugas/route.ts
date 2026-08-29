import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { TugasItem } from "@/types";

/**
 * ============================================================
 * API Route: /api/tugas
 * Tabel: `tugas` (7 Kolom sesuai skema database)
 *  1. id (int(11) AUTO_INCREMENT PRIMARY KEY)
 *  2. peserta_magang_id (bigint(20) UNSIGNED NULL, FK)
 *  3. log_book_id (int(11) NULL, FK)
 *  4. judul_tugas (varchar(255) NOT NULL)
 *  5. deskripsi (text NOT NULL)
 *  6. kategori (varchar(50) NOT NULL DEFAULT 'Umum')
 *  7. created_at (timestamp DEFAULT CURRENT_TIMESTAMP)
 * ============================================================
 */

async function ensureTugasTableExists() {
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`tugas\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL,
        \`log_book_id\` INT(11) DEFAULT NULL,
        \`judul_tugas\` VARCHAR(255) NOT NULL,
        \`deskripsi\` TEXT NOT NULL,
        \`kategori\` VARCHAR(50) NOT NULL DEFAULT 'Umum',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_tugas_peserta_magang_id\` (\`peserta_magang_id\`),
        KEY \`idx_tugas_log_book_id\` (\`log_book_id\`),
        KEY \`idx_tugas_kategori\` (\`kategori\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrasi aman jika tabel sebelumnya masih menggunakan user_id
    try {
      const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM \`tugas\``);
      const existing = new Set(cols.map((c: any) => c.Field.toLowerCase()));
      if (existing.has("user_id") && !existing.has("peserta_magang_id")) {
        await mysqlPool.query(
          `ALTER TABLE \`tugas\` ADD COLUMN \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL AFTER \`id\``
        );
      }
    } catch {
      // Abaikan jika kolom sudah ada
    }
  } catch (err) {
    console.warn("ensureTugasTableExists warning:", err);
  }
}

/**
 * ============================================================
 * GET: Mengambil daftar tugas
 * ============================================================
 * Query Params:
 *  - id: ID tugas spesifik
 *  - peserta_magang_id / pesertaMagangId: filter berdasarkan peserta magang
 *  - log_book_id / logBookId: filter berdasarkan id logbook yang ditautkan
 *  - kategori: filter kategori ('Programmer', 'Media', dll)
 *  - q / search: pencarian judul tugas, deskripsi, nama peserta
 */
export async function GET(req: NextRequest) {
  try {
    await ensureTugasTableExists();

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const pesertaMagangId =
      searchParams.get("peserta_magang_id") ||
      searchParams.get("pesertaMagangId");
    const logBookId =
      searchParams.get("log_book_id") ||
      searchParams.get("logBookId");
    const kategori = searchParams.get("kategori");
    const q = searchParams.get("q") || searchParams.get("search");

    const conditions: string[] = [];
    const params: any[] = [];

    if (idParam) {
      conditions.push("t.id = ?");
      params.push(Number(idParam));
    }

    if (pesertaMagangId) {
      conditions.push("t.peserta_magang_id = ?");
      params.push(pesertaMagangId);
    }

    if (logBookId) {
      conditions.push("t.log_book_id = ?");
      params.push(logBookId);
    }

    if (kategori && kategori !== "ALL") {
      conditions.push("LOWER(t.kategori) = LOWER(?)");
      params.push(kategori);
    }

    if (q && q.trim()) {
      conditions.push(
        "(t.judul_tugas LIKE ? OR t.deskripsi LIKE ? OR t.kategori LIKE ? OR pm.name LIKE ? OR pm.institution LIKE ?)"
      );
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        t.id,
        t.peserta_magang_id,
        t.log_book_id,
        t.judul_tugas,
        t.deskripsi,
        t.kategori,
        t.created_at,
        pm.name          AS pm_name,
        pm.avatar        AS pm_avatar,
        pm.institution   AS pm_institution,
        pm.study_program AS pm_study_program,
        lb.aktivitas     AS log_book_aktivitas,
        lb.tanggal       AS log_book_tanggal
      FROM \`tugas\` t
      LEFT JOIN peserta_magang pm ON pm.id = t.peserta_magang_id
      LEFT JOIN \`log_book\`   lb ON lb.id = t.log_book_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT 150
      `,
      params
    );

    const data: TugasItem[] = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: Number(r.id),
          peserta_magang_id: r.peserta_magang_id
            ? String(r.peserta_magang_id)
            : null,
          pesertaMagangId: r.peserta_magang_id
            ? String(r.peserta_magang_id)
            : null,
          log_book_id: r.log_book_id ? Number(r.log_book_id) : null,
          logBookId: r.log_book_id ? Number(r.log_book_id) : null,
          judul_tugas: r.judul_tugas || "",
          judulTugas: r.judul_tugas || "",
          deskripsi: r.deskripsi || "",
          kategori: r.kategori || "Umum",
          created_at: r.created_at
            ? new Date(r.created_at).toISOString()
            : new Date().toISOString(),
          createdAt: r.created_at
            ? new Date(r.created_at).toISOString()
            : new Date().toISOString(),
          user_nama: r.pm_name || null,
          userName: r.pm_name || null,
          user_avatar: r.pm_avatar || null,
          userAvatar: r.pm_avatar || null,
          user_institution: r.pm_institution || null,
          user_sekolah: r.pm_institution || null,
          user_study_program: r.pm_study_program || null,
          user_role: "ANAK_MAGANG",
          userRole: "ANAK_MAGANG",
          log_book_aktivitas: r.log_book_aktivitas || null,
          log_book_tanggal: r.log_book_tanggal
            ? String(r.log_book_tanggal).slice(0, 10)
            : undefined,
        }))
      : [];

    if (idParam && data.length > 0) {
      return NextResponse.json({
        success: true,
        data: data[0],
        item: data[0],
        total: 1,
      });
    }

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (err: any) {
    console.error("GET /api/tugas error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal memuat data tugas.",
        data: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * POST: Menambahkan data tugas baru
 * ============================================================
 * Request Body:
 *  - peserta_magang_id / pesertaMagangId: ID peserta magang (opsional/wajib)
 *  - log_book_id / logBookId: ID logbook terkait (opsional)
 *  - judul_tugas / judulTugas: string (wajib)
 *  - deskripsi: string
 *  - kategori: string (default 'Umum')
 */
export async function POST(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const body = await req.json();

    const pesertaMagangId =
      body.peserta_magang_id || body.pesertaMagangId || null;
    const logBookId = body.log_book_id || body.logBookId || null;
    const judulTugas = (body.judul_tugas || body.judulTugas || "").trim();
    const deskripsi = (body.deskripsi || "").trim();
    const kategori = (body.kategori || "Umum").trim();

    if (!judulTugas) {
      return NextResponse.json(
        { success: false, message: "Judul tugas wajib diisi." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      `
      INSERT INTO \`tugas\` (
        \`peserta_magang_id\`,
        \`log_book_id\`,
        \`judul_tugas\`,
        \`deskripsi\`,
        \`kategori\`
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        pesertaMagangId ? Number(pesertaMagangId) : null,
        logBookId ? Number(logBookId) : null,
        judulTugas,
        deskripsi,
        kategori,
      ]
    );

    const insertedId = result.insertId;

    // Ambil info peserta magang jika ada
    let userInfo: any = {};
    if (pesertaMagangId) {
      try {
        const [pmRows]: any = await mysqlPool.query(
          "SELECT id, name, avatar, institution, study_program FROM peserta_magang WHERE id = ? LIMIT 1",
          [pesertaMagangId]
        );
        if (pmRows && pmRows.length > 0) userInfo = pmRows[0];
      } catch {
        // ignore
      }
    }

    const createdRecord = {
      id: Number(insertedId),
      peserta_magang_id: pesertaMagangId ? String(pesertaMagangId) : null,
      pesertaMagangId: pesertaMagangId ? String(pesertaMagangId) : null,
      log_book_id: logBookId ? Number(logBookId) : null,
      logBookId: logBookId ? Number(logBookId) : null,
      judul_tugas: judulTugas,
      judulTugas: judulTugas,
      deskripsi,
      kategori,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      user_nama: userInfo.name || null,
      userName: userInfo.name || null,
      user_avatar: userInfo.avatar || null,
      user_institution: userInfo.institution || null,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Tugas berhasil ditambahkan.",
        data: createdRecord,
        item: createdRecord,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/tugas error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal membuat tugas." },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * PUT / PATCH: Memperbarui data tugas
 * ============================================================
 */
export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const body = await req.json();

    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID tugas wajib disertakan." },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (body.judul_tugas !== undefined || body.judulTugas !== undefined) {
      updates.push("`judul_tugas` = ?");
      params.push(body.judul_tugas || body.judulTugas);
    }
    if (body.deskripsi !== undefined) {
      updates.push("`deskripsi` = ?");
      params.push(body.deskripsi);
    }
    if (body.kategori !== undefined) {
      updates.push("`kategori` = ?");
      params.push(body.kategori);
    }
    if (
      body.peserta_magang_id !== undefined ||
      body.pesertaMagangId !== undefined
    ) {
      const pmId = body.peserta_magang_id ?? body.pesertaMagangId;
      updates.push("`peserta_magang_id` = ?");
      params.push(pmId ? Number(pmId) : null);
    }
    if (
      body.log_book_id !== undefined ||
      body.logBookId !== undefined
    ) {
      const lbId = body.log_book_id ?? body.logBookId;
      updates.push("`log_book_id` = ?");
      params.push(lbId ? Number(lbId) : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada perubahan." });
    }

    params.push(Number(id));
    await mysqlPool.query(
      `UPDATE \`tugas\` SET ${updates.join(", ")} WHERE \`id\` = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil diperbarui.",
    });
  } catch (err: any) {
    console.error("PUT/PATCH /api/tugas error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui tugas." },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * DELETE: Menghapus data tugas
 * ============================================================
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // ignore
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID tugas wajib disertakan." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM `tugas` WHERE `id` = ?",
      [Number(id)]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data tugas tidak ditemukan atau sudah dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/tugas error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus tugas." },
      { status: 500 }
    );
  }
}
