import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { TugasItem } from "@/types";

/**
 * ============================================================
 * API Route: /api/tugas
 * Tabel: `tugas` (8 Kolom sesuai skema database)
 *  1. id (int(11) AUTO_INCREMENT PRIMARY KEY)
 *  2. peserta_magang_id (bigint(20) UNSIGNED NULL, FK)
 *  3. log_book_id (int(11) NULL, FK)
 *  4. judul_tugas (varchar(255) NOT NULL)
 *  5. deskripsi (text NOT NULL)
 *  6. kategori (varchar(50) NOT NULL DEFAULT 'Umum')
 *  7. status_pengerjaan (enum('BELUM_DIKERJAKAN', 'SELESAI') DEFAULT 'BELUM_DIKERJAKAN')
 *  8. created_at (timestamp DEFAULT CURRENT_TIMESTAMP)
 * ============================================================
 */

function normalizeStatusPengerjaan(
  statusInput?: string | null
): "BELUM_DIKERJAKAN" | "SELESAI" {
  if (!statusInput) return "BELUM_DIKERJAKAN";
  const s = statusInput.toUpperCase().trim();
  if (s === "SELESAI" || s === "COMPLETED" || s === "DONE") return "SELESAI";
  return "BELUM_DIKERJAKAN";
}

async function ensureTugasTableExists() {
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`log_book\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL,
        \`tanggal\` DATE NOT NULL,
        \`waktu_mulai\` TIME NOT NULL,
        \`waktu_selesai\` TIME NOT NULL,
        \`kategori\` ENUM('akta kelahiran','akta kematian','tambah bio data','pindah keluar','pindah datang','media','programmer') NOT NULL,
        \`aktivitas\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_log_book_peserta_magang_id\` (\`peserta_magang_id\`),
        KEY \`idx_log_book_tanggal\` (\`tanggal\`),
        KEY \`idx_log_book_kategori\` (\`kategori\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`tugas\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL,
        \`log_book_id\` INT(11) DEFAULT NULL,
        \`judul_tugas\` VARCHAR(255) NOT NULL,
        \`deskripsi\` TEXT NOT NULL,
        \`kategori\` VARCHAR(50) NOT NULL DEFAULT 'Umum',
        \`status_pengerjaan\` ENUM('BELUM_DIKERJAKAN', 'SELESAI') NOT NULL DEFAULT 'BELUM_DIKERJAKAN',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_tugas_peserta_magang_id\` (\`peserta_magang_id\`),
        KEY \`idx_tugas_log_book_id\` (\`log_book_id\`),
        KEY \`idx_tugas_kategori\` (\`kategori\`),
        KEY \`idx_tugas_status_pengerjaan\` (\`status_pengerjaan\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrasi aman agar kolom dan enum selalu sinkron
    try {
      const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM \`tugas\``);
      const existing = new Set(cols.map((c: any) => c.Field.toLowerCase()));

      if (!existing.has("status_pengerjaan")) {
        await mysqlPool.query(
          `ALTER TABLE \`tugas\` ADD COLUMN \`status_pengerjaan\` ENUM('BELUM_DIKERJAKAN', 'SELESAI') NOT NULL DEFAULT 'BELUM_DIKERJAKAN' AFTER \`kategori\``
        );
      }

      if (existing.has("user_id") && !existing.has("peserta_magang_id")) {
        await mysqlPool.query(
          `ALTER TABLE \`tugas\` ADD COLUMN \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL AFTER \`id\``
        );
      }

      if (existing.has("log_book_id")) {
        await mysqlPool.query(
          `ALTER TABLE \`tugas\` MODIFY COLUMN \`log_book_id\` INT(11) NULL DEFAULT NULL`
        );
      }

      if (existing.has("peserta_magang_id")) {
        await mysqlPool.query(
          `ALTER TABLE \`tugas\` MODIFY COLUMN \`peserta_magang_id\` BIGINT(20) UNSIGNED NULL DEFAULT NULL`
        );
      }
    } catch (migErr) {
      console.warn("ensureTugasTableExists migration warning:", migErr);
    }
  } catch (err) {
    console.warn("ensureTugasTableExists warning:", err);
  }
}

const VALID_LOGBOOK_CATEGORIES = [
  "akta kelahiran",
  "akta kematian",
  "tambah bio data",
  "pindah keluar",
  "pindah datang",
  "media",
  "programmer",
] as const;

function mapToLogBookCategory(kategori?: string | null): string {
  if (!kategori) return "programmer";
  const cleaned = kategori.trim().toLowerCase();
  const found = VALID_LOGBOOK_CATEGORIES.find((cat) => cat === cleaned);
  if (found) return found;

  if (cleaned.includes("kelahiran") || cleaned.includes("lahir")) return "akta kelahiran";
  if (cleaned.includes("kematian") || cleaned.includes("mati")) return "akta kematian";
  if (cleaned.includes("bio") || cleaned.includes("biodata") || cleaned.includes("tambah data")) return "tambah bio data";
  if (cleaned.includes("pindah keluar") || cleaned.includes("keluar")) return "pindah keluar";
  if (cleaned.includes("pindah datang") || cleaned.includes("datang") || cleaned.includes("masuk")) return "pindah datang";
  if (cleaned.includes("program") || cleaned.includes("coding") || cleaned.includes("dev")) return "programmer";
  if (cleaned.includes("media") || cleaned.includes("desain") || cleaned.includes("sosmed")) return "media";

  return "programmer";
}

function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

function getCurrentTimeJakarta(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function createLogBookForTask(
  pesertaMagangId: number | string | null,
  judulTugas: string,
  deskripsi: string,
  kategori: string
): Promise<number | null> {
  if (!pesertaMagangId) return null;
  try {
    const today = getTodayJakarta();
    const timeNow = getCurrentTimeJakarta();
    const logKategori = mapToLogBookCategory(kategori);
    const cleanJudul = (judulTugas || "Tugas Selesai").trim();
    const cleanDeskripsi = (deskripsi || "").trim();
    const aktivitas = cleanDeskripsi
      ? `[Tugas Selesai] ${cleanJudul} - ${cleanDeskripsi}`
      : `[Tugas Selesai] ${cleanJudul}`;

    const [res]: any = await mysqlPool.query(
      `INSERT INTO \`log_book\` (\`peserta_magang_id\`, \`tanggal\`, \`waktu_mulai\`, \`waktu_selesai\`, \`kategori\`, \`aktivitas\`)
       VALUES (?, ?, '08:00:00', ?, ?, ?)`,
      [Number(pesertaMagangId), today, timeNow, logKategori, aktivitas]
    );

    return res?.insertId ? Number(res.insertId) : null;
  } catch (err) {
    console.error("Gagal membuat log_book otomatis untuk tugas:", err);
    return null;
  }
}

async function removeLogBookForTask(logBookId: number | string | null) {
  if (!logBookId) return;
  try {
    await mysqlPool.query("DELETE FROM \`log_book\` WHERE \`id\` = ?", [Number(logBookId)]);
  } catch (err) {
    console.error("Gagal menghapus log_book untuk tugas:", err);
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
 *  - status_pengerjaan / statusPengerjaan: filter ('BELUM_DIKERJAKAN', 'SELESAI')
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
    const statusPengerjaan =
      searchParams.get("status_pengerjaan") ||
      searchParams.get("statusPengerjaan");
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

    if (statusPengerjaan && statusPengerjaan !== "ALL") {
      conditions.push("t.status_pengerjaan = ?");
      params.push(normalizeStatusPengerjaan(statusPengerjaan));
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
        t.status_pengerjaan,
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
          status_pengerjaan: r.status_pengerjaan || "BELUM_DIKERJAKAN",
          statusPengerjaan: r.status_pengerjaan || "BELUM_DIKERJAKAN",
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
 *  - status_pengerjaan / statusPengerjaan: 'BELUM_DIKERJAKAN' | 'SELESAI'
 */
export async function POST(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const body = await req.json();

    const rawIds = body.peserta_magang_ids || body.pesertaMagangIds;
    let targetIds: (number | null)[] = [];

    if (Array.isArray(rawIds) && rawIds.length > 0) {
      targetIds = rawIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0);
    } else if (body.peserta_magang_id || body.pesertaMagangId) {
      targetIds = [Number(body.peserta_magang_id || body.pesertaMagangId)];
    } else {
      targetIds = [null];
    }

    const logBookId = body.log_book_id || body.logBookId || null;
    const judulTugas = (body.judul_tugas || body.judulTugas || "").trim();
    const deskripsi = (body.deskripsi || "").trim();
    const kategori = (body.kategori || "Umum").trim();
    const statusPengerjaan = normalizeStatusPengerjaan(
      body.status_pengerjaan || body.statusPengerjaan
    );

    if (!judulTugas) {
      return NextResponse.json(
        { success: false, message: "Judul tugas wajib diisi." },
        { status: 400 }
      );
    }

    const insertedRecords: any[] = [];

    for (const pId of targetIds) {
      let effectiveLogBookId = logBookId ? Number(logBookId) : null;
      if (statusPengerjaan === "SELESAI" && !effectiveLogBookId && pId) {
        effectiveLogBookId = await createLogBookForTask(
          pId,
          judulTugas,
          deskripsi,
          kategori
        );
      }

      const [result]: any = await mysqlPool.query(
        `
        INSERT INTO \`tugas\` (
          \`peserta_magang_id\`,
          \`log_book_id\`,
          \`judul_tugas\`,
          \`deskripsi\`,
          \`kategori\`,
          \`status_pengerjaan\`
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          pId ? Number(pId) : null,
          effectiveLogBookId,
          judulTugas,
          deskripsi,
          kategori,
          statusPengerjaan,
        ]
      );

      const insertedId = result.insertId;

      let userInfo: any = {};
      if (pId) {
        try {
          const [pmRows]: any = await mysqlPool.query(
            "SELECT id, name, avatar, institution, study_program FROM peserta_magang WHERE id = ? LIMIT 1",
            [pId]
          );
          if (pmRows && pmRows.length > 0) userInfo = pmRows[0];
        } catch {
          // ignore
        }
      }

      insertedRecords.push({
        id: Number(insertedId),
        peserta_magang_id: pId ? String(pId) : null,
        pesertaMagangId: pId ? String(pId) : null,
        log_book_id: effectiveLogBookId,
        logBookId: effectiveLogBookId,
        judul_tugas: judulTugas,
        judulTugas: judulTugas,
        deskripsi,
        kategori,
        status_pengerjaan: statusPengerjaan,
        statusPengerjaan: statusPengerjaan,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        user_nama: userInfo.name || null,
        userName: userInfo.name || null,
        user_avatar: userInfo.avatar || null,
        user_institution: userInfo.institution || null,
      });
    }

    const message =
      insertedRecords.length > 1
        ? `Tugas berhasil dibagikan kepada ${insertedRecords.length} peserta magang.`
        : statusPengerjaan === "SELESAI"
          ? "Tugas berhasil ditambahkan dan dicatat ke log book."
          : "Tugas berhasil ditambahkan.";

    return NextResponse.json(
      {
        success: true,
        message,
        data: insertedRecords[0] || null,
        items: insertedRecords,
        count: insertedRecords.length,
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

    const [existingRows]: any = await mysqlPool.query(
      "SELECT id, peserta_magang_id, log_book_id, judul_tugas, deskripsi, kategori, status_pengerjaan FROM `tugas` WHERE `id` = ? LIMIT 1",
      [Number(id)]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan." },
        { status: 404 }
      );
    }

    const existingTask = existingRows[0];
    const currentStatus = (existingTask.status_pengerjaan || "").toUpperCase();
    const statusRequested =
      body.status_pengerjaan !== undefined || body.statusPengerjaan !== undefined;
    const newStatus = statusRequested
      ? normalizeStatusPengerjaan(body.status_pengerjaan || body.statusPengerjaan)
      : currentStatus;

    const pmId =
      body.peserta_magang_id !== undefined || body.pesertaMagangId !== undefined
        ? (body.peserta_magang_id ?? body.pesertaMagangId)
        : existingTask.peserta_magang_id;

    const judulTugas =
      body.judul_tugas ?? body.judulTugas ?? existingTask.judul_tugas;
    const deskripsi = body.deskripsi ?? existingTask.deskripsi;
    const kategori = body.kategori ?? existingTask.kategori;

    let targetLogBookId =
      body.log_book_id !== undefined || body.logBookId !== undefined
        ? (body.log_book_id ?? body.logBookId)
        : existingTask.log_book_id;

    // Sinkronisasi otomatis ke log_book
    if (newStatus === "SELESAI") {
      if (targetLogBookId) {
        // Pastikan entri log_book masih ada
        const [lbRows]: any = await mysqlPool.query(
          "SELECT id FROM `log_book` WHERE `id` = ? LIMIT 1",
          [Number(targetLogBookId)]
        );
        if (!lbRows || lbRows.length === 0) {
          targetLogBookId = await createLogBookForTask(pmId, judulTugas, deskripsi, kategori);
        }
      } else {
        // Belum ada logbook, buat baru otomatis
        targetLogBookId = await createLogBookForTask(pmId, judulTugas, deskripsi, kategori);
      }
    } else if (newStatus === "BELUM_DIKERJAKAN" && currentStatus === "SELESAI") {
      // Jika dibatalkan kembali ke BELUM_DIKERJAKAN, hapus entri log_book yang terhubung
      if (targetLogBookId) {
        await removeLogBookForTask(targetLogBookId);
        targetLogBookId = null;
      }
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
    if (statusRequested) {
      updates.push("`status_pengerjaan` = ?");
      params.push(newStatus);
    }
    if (
      body.peserta_magang_id !== undefined ||
      body.pesertaMagangId !== undefined
    ) {
      updates.push("`peserta_magang_id` = ?");
      params.push(pmId ? Number(pmId) : null);
    }

    // Selalu sinkronkan log_book_id bila nilainya berubah
    if (targetLogBookId !== existingTask.log_book_id) {
      updates.push("`log_book_id` = ?");
      params.push(targetLogBookId ? Number(targetLogBookId) : null);
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
      message:
        newStatus === "SELESAI"
          ? "Tugas berhasil diselesaikan dan dicatat ke log book."
          : "Tugas berhasil diperbarui.",
      log_book_id: targetLogBookId,
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

    // Jika ada log_book terkait tugas ini, hapus juga log_book-nya
    const [existingTaskRows]: any = await mysqlPool.query(
      "SELECT log_book_id FROM `tugas` WHERE `id` = ? LIMIT 1",
      [Number(id)]
    );
    if (existingTaskRows && existingTaskRows.length > 0 && existingTaskRows[0].log_book_id) {
      await removeLogBookForTask(existingTaskRows[0].log_book_id);
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
