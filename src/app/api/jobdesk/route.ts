import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { TugasItem } from "@/types";

/**
 * API Route: /api/jobdesk
 * Tabel: `tugas`
 * Kolom: id (int), user_id (bigint), log_book_id (int), judul_tugas (varchar), deskripsi (text), kategori (varchar), created_at (timestamp)
 */

async function ensureTugasTableExists() {
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`tugas\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT(20) UNSIGNED DEFAULT NULL,
        \`log_book_id\` INT(11) DEFAULT NULL,
        \`judul_tugas\` VARCHAR(255) NOT NULL,
        \`deskripsi\` TEXT NOT NULL,
        \`kategori\` VARCHAR(50) NOT NULL DEFAULT 'Umum',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_tugas_user_id\` (\`user_id\`),
        KEY \`idx_tugas_log_book_id\` (\`log_book_id\`),
        KEY \`idx_tugas_kategori\` (\`kategori\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.warn("ensureTugasTableExists warning:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTugasTableExists();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("user_id");
    const logBookId = searchParams.get("logBookId") || searchParams.get("log_book_id");
    const kategori = searchParams.get("kategori");
    const q = searchParams.get("q");

    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) {
      conditions.push("t.user_id = ?");
      params.push(userId);
    }

    if (logBookId) {
      conditions.push("t.log_book_id = ?");
      params.push(logBookId);
    }

    if (kategori && kategori !== "ALL") {
      conditions.push("t.kategori = ?");
      params.push(kategori);
    }

    if (q && q.trim()) {
      conditions.push("(t.judul_tugas LIKE ? OR t.deskripsi LIKE ? OR t.kategori LIKE ? OR u.name LIKE ? OR u.nama LIKE ?)");
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        t.id,
        t.user_id,
        t.log_book_id,
        t.judul_tugas,
        t.deskripsi,
        t.kategori,
        t.created_at,
        COALESCE(u.nama, u.name) AS user_nama,
        u.avatar AS user_avatar,
        COALESCE(u.institution, u.sekolah_kampus) AS user_institution,
        u.role AS user_role,
        lb.aktivitas AS log_book_aktivitas,
        lb.tanggal AS log_book_tanggal
      FROM \`tugas\` t
      LEFT JOIN \`users\` u ON u.id = t.user_id
      LEFT JOIN \`log_book\` lb ON lb.id = t.log_book_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT 100
      `,
      params
    );

    const data: TugasItem[] = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: Number(r.id),
          user_id: r.user_id ? String(r.user_id) : null,
          log_book_id: r.log_book_id ? Number(r.log_book_id) : null,
          judul_tugas: r.judul_tugas || "",
          deskripsi: r.deskripsi || "",
          kategori: r.kategori || "Umum",
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          user_nama: r.user_nama || null,
          user_avatar: r.user_avatar || null,
          user_institution: r.user_institution || null,
          user_role: r.user_role || null,
          log_book_aktivitas: r.log_book_aktivitas || null,
          log_book_tanggal: r.log_book_tanggal
            ? String(r.log_book_tanggal).slice(0, 10)
            : undefined,
        }))
      : [];

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (err: any) {
    console.error("GET /api/jobdesk error:", err);
    return NextResponse.json({
      success: false,
      message: err?.message || "Gagal memuat data tugas.",
      data: [],
      total: 0,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const body = await req.json();

    const userId = body.user_id || body.userId || null;
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
      `INSERT INTO \`tugas\` (\`user_id\`, \`log_book_id\`, \`judul_tugas\`, \`deskripsi\`, \`kategori\`)
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, logBookId || null, judulTugas, deskripsi, kategori]
    );

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil ditambahkan.",
      data: {
        id: result.insertId,
        user_id: userId,
        log_book_id: logBookId,
        judul_tugas: judulTugas,
        deskripsi,
        kategori,
      },
    });
  } catch (err: any) {
    console.error("POST /api/jobdesk error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal membuat tugas." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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
    if (body.user_id !== undefined || body.userId !== undefined) {
      updates.push("`user_id` = ?");
      params.push(body.user_id || body.userId);
    }
    if (body.log_book_id !== undefined || body.logBookId !== undefined) {
      updates.push("`log_book_id` = ?");
      params.push(body.log_book_id || body.logBookId);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada perubahan." });
    }

    params.push(id);
    await mysqlPool.query(
      `UPDATE \`tugas\` SET ${updates.join(", ")} WHERE \`id\` = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil diperbarui.",
    });
  } catch (err: any) {
    console.error("PUT /api/jobdesk error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memperbarui tugas." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID tugas wajib disertakan." },
        { status: 400 }
      );
    }

    await mysqlPool.query(`DELETE FROM \`tugas\` WHERE \`id\` = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/jobdesk error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus tugas." },
      { status: 500 }
    );
  }
}
