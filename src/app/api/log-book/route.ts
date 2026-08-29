import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

const TIMEZONE = "Asia/Jakarta";

export const VALID_CATEGORIES = [
  "akta kelahiran",
  "akta kematian",
  "tambah bio data",
  "pindah keluar",
  "pindah datang",
  "media",
  "programmer",
] as const;

export type LogBookKategori = typeof VALID_CATEGORIES[number];

/**
 * Helper: Ambil tanggal hari ini dalam format YYYY-MM-DD di zona waktu Asia/Jakarta
 */
function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
  }).format(new Date());
}

/**
 * Helper: Normalisasi nilai tanggal ke format YYYY-MM-DD
 */
function formatDateYMD(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: TIMEZONE,
    }).format(value);
  }
  return String(value).slice(0, 10);
}

/**
 * Helper: Normalisasi format waktu ke HH:mm:ss atau HH:mm
 */
function normalizeTime(value: any): string {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 5) return `${trimmed}:00`;
    return trimmed.slice(0, 8);
  }
  if (value instanceof Date) {
    return value.toTimeString().slice(0, 8);
  }
  return String(value).slice(0, 8);
}

/**
 * Helper: Hitung durasi aktivitas dalam menit
 */
function calculateDurationMinutes(waktuMulai: string, waktuSelesai: string): number {
  if (!waktuMulai || !waktuSelesai) return 0;
  const [h1 = 0, m1 = 0, s1 = 0] = waktuMulai.split(":").map(Number);
  const [h2 = 0, m2 = 0, s2 = 0] = waktuSelesai.split(":").map(Number);
  const sec1 = h1 * 3600 + m1 * 60 + s1;
  const sec2 = h2 * 3600 + m2 * 60 + s2;
  const diff = sec2 - sec1;
  return diff > 0 ? Math.floor(diff / 60) : 0;
}

/**
 * Helper: Normalisasi kategori agar sesuai dengan ENUM database
 */
function normalizeKategori(kategori: string): string {
  if (!kategori) return "media";
  const cleaned = kategori.trim().toLowerCase();
  const found = VALID_CATEGORIES.find((cat) => cat === cleaned);
  if (found) return found;

  if (cleaned.includes("kelahiran") || cleaned.includes("lahir")) return "akta kelahiran";
  if (cleaned.includes("kematian") || cleaned.includes("mati")) return "akta kematian";
  if (cleaned.includes("bio") || cleaned.includes("biodata") || cleaned.includes("tambah data")) return "tambah bio data";
  if (cleaned.includes("pindah keluar") || cleaned.includes("keluar")) return "pindah keluar";
  if (cleaned.includes("pindah datang") || cleaned.includes("datang") || cleaned.includes("masuk")) return "pindah datang";
  if (cleaned.includes("program") || cleaned.includes("coding") || cleaned.includes("dev")) return "programmer";
  if (cleaned.includes("media") || cleaned.includes("desain") || cleaned.includes("sosmed")) return "media";

  return cleaned;
}

/**
 * ============================================================
 * Skema Tabel `log_book` (8 Kolom sesuai Database MySQL)
 *  1. id (int(11) AUTO_INCREMENT PRIMARY KEY)
 *  2. peserta_magang_id (bigint(20) UNSIGNED NULL, FK)
 *  3. tanggal (date NOT NULL)
 *  4. waktu_mulai (time NOT NULL)
 *  5. waktu_selesai (time NOT NULL)
 *  6. kategori (enum('akta kelahiran','akta kematian','tambah bio data','pindah keluar','pindah datang','media','programmer') NOT NULL)
 *  7. aktivitas (text NOT NULL)
 *  8. created_at (timestamp DEFAULT CURRENT_TIMESTAMP)
 * ============================================================
 */
async function ensureLogBookTableExists() {
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

    // Migrasi aman jika tabel lama hanya punya user_id
    try {
      const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM \`log_book\``);
      const existingCols = new Set(cols.map((c: any) => c.Field.toLowerCase()));

      if (existingCols.has("user_id") && !existingCols.has("peserta_magang_id")) {
        await mysqlPool.query(
          `ALTER TABLE \`log_book\` ADD COLUMN \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL AFTER \`id\``
        );
      }
    } catch {
      // Abaikan jika kolom sudah ada
    }
  } catch (err) {
    console.warn("ensureLogBookTableExists warning/error:", err);
  }
}

/**
 * ============================================================
 * GET: Mengambil daftar log-book atau 1 data log-book berdasarkan filter
 * ============================================================
 * Query Params:
 *  - id: ID logbook spesifik
 *  - peserta_magang_id / pesertaMagangId: filter berdasarkan peserta magang
 *  - tanggal / date: filter tanggal tertentu (YYYY-MM-DD)
 *  - startDate / start_date / dari: filter rentang tanggal mulai
 *  - endDate / end_date / sampai: filter rentang tanggal selesai
 *  - kategori / category: filter kategori
 *  - q / search: pencarian aktivitas, kategori, nama peserta
 *  - limit: batas jumlah data
 *  - page: nomor halaman (1-based)
 *  - sort: 'ASC' | 'DESC' (default 'DESC')
 */
export async function GET(req: NextRequest) {
  try {
    await ensureLogBookTableExists();

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const pesertaMagangId =
      searchParams.get("peserta_magang_id") ||
      searchParams.get("pesertaMagangId");
    const tanggalParam = searchParams.get("tanggal") || searchParams.get("date");
    const startDate =
      searchParams.get("startDate") ||
      searchParams.get("start_date") ||
      searchParams.get("dari");
    const endDate =
      searchParams.get("endDate") ||
      searchParams.get("end_date") ||
      searchParams.get("sampai");
    const kategoriParam =
      searchParams.get("kategori") || searchParams.get("category");
    const searchParam = searchParams.get("q") || searchParams.get("search");
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const sortParam =
      (searchParams.get("sort") || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const conditions: string[] = [];
    const params: any[] = [];

    if (idParam) {
      conditions.push("lb.id = ?");
      params.push(Number(idParam));
    }

    if (pesertaMagangId) {
      conditions.push("lb.peserta_magang_id = ?");
      params.push(pesertaMagangId);
    }

    if (tanggalParam) {
      conditions.push("lb.tanggal = ?");
      params.push(tanggalParam);
    }

    if (startDate) {
      conditions.push("lb.tanggal >= ?");
      params.push(startDate);
    }

    if (endDate) {
      conditions.push("lb.tanggal <= ?");
      params.push(endDate);
    }

    if (kategoriParam && kategoriParam !== "ALL") {
      conditions.push("lb.kategori = ?");
      params.push(normalizeKategori(kategoriParam));
    }

    if (searchParam) {
      conditions.push(
        "(lb.aktivitas LIKE ? OR lb.kategori LIKE ? OR pm.name LIKE ? OR pm.institution LIKE ?)"
      );
      params.push(
        `%${searchParam}%`,
        `%${searchParam}%`,
        `%${searchParam}%`,
        `%${searchParam}%`
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query Total Count
    const [countRows]: any = await mysqlPool.query(
      `
      SELECT COUNT(*) as total 
      FROM log_book lb
      LEFT JOIN peserta_magang pm ON pm.id = lb.peserta_magang_id
      ${whereClause}
      `,
      params
    );
    const totalCount = countRows?.[0]?.total
      ? Number(countRows[0].total)
      : 0;

    // Pagination clause
    let paginationClause = "";
    if (limitParam) {
      const limit = Math.max(1, Number(limitParam) || 10);
      const page = Math.max(1, Number(pageParam) || 1);
      const offset = (page - 1) * limit;
      paginationClause = `LIMIT ${limit} OFFSET ${offset}`;
    }

    // Query Data dengan JOIN peserta_magang
    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        lb.id,
        lb.peserta_magang_id,
        lb.tanggal,
        lb.waktu_mulai,
        lb.waktu_selesai,
        lb.kategori,
        lb.aktivitas,
        lb.created_at,
        pm.name          AS pm_name,
        pm.avatar        AS pm_avatar,
        pm.institution   AS pm_institution,
        pm.study_program AS pm_study_program
      FROM log_book lb
      LEFT JOIN peserta_magang pm ON pm.id = lb.peserta_magang_id
      ${whereClause}
      ORDER BY lb.tanggal ${sortParam}, lb.waktu_mulai ${sortParam}, lb.id ${sortParam}
      ${paginationClause}
      `,
      params
    );

    const formattedData = (rows as any[]).map((row) => {
      const tanggal = formatDateYMD(row.tanggal);
      const waktuMulai = normalizeTime(row.waktu_mulai);
      const waktuSelesai = normalizeTime(row.waktu_selesai);
      const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);
      const createdAt = row.created_at
        ? new Date(row.created_at).toISOString()
        : new Date().toISOString();

      const userName = row.pm_name || "Peserta Magang";
      const userRole = "ANAK_MAGANG";
      const userInstitution = row.pm_institution || "";
      const userStudyProgram = row.pm_study_program || "";
      const userAvatar = row.pm_avatar || null;

      return {
        id: Number(row.id),
        peserta_magang_id: row.peserta_magang_id
          ? String(row.peserta_magang_id)
          : null,
        pesertaMagangId: row.peserta_magang_id
          ? String(row.peserta_magang_id)
          : null,
        user_nama: userName,
        userName,
        user_role: userRole,
        userRole,
        user_institution: userInstitution,
        userInstitution,
        user_sekolah: userInstitution,
        user_study_program: userStudyProgram,
        user_jurusan: userStudyProgram,
        userStudyProgram,
        user_avatar: userAvatar,
        userAvatar,
        tanggal,
        waktu_mulai: waktuMulai,
        waktu_selesai: waktuSelesai,
        waktuMulai,
        waktuSelesai,
        durasi_menit: durasiMenit,
        kategori: row.kategori,
        aktivitas: row.aktivitas,
        created_at: createdAt,
        createdAt,
      };
    });

    // Jika mencari berdasarkan ID spesifik
    if (idParam && formattedData.length > 0) {
      return NextResponse.json({
        success: true,
        data: formattedData[0],
        item: formattedData[0],
        total: 1,
      });
    }

    if (idParam && formattedData.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data log-book tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formattedData,
      logbooks: formattedData,
      total: totalCount,
      count: formattedData.length,
    });
  } catch (error: any) {
    console.error("API Log-Book GET Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data log-book" },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * POST: Menambahkan data log-book baru
 * ============================================================
 * Request Body (JSON atau FormData):
 *  - peserta_magang_id / pesertaMagangId: ID peserta magang (opsional)
 *  - tanggal: string (YYYY-MM-DD, opsional, default hari ini Jakarta)
 *  - waktu_mulai / waktuMulai: string (HH:mm atau HH:mm:ss, wajib)
 *  - waktu_selesai / waktuSelesai: string (HH:mm atau HH:mm:ss, wajib)
 *  - kategori / category: string (wajib)
 *  - aktivitas / activity / kegiatan: string (wajib)
 */
export async function POST(req: NextRequest) {
  try {
    await ensureLogBookTableExists();

    const contentType = req.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawBody: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        rawBody[key] = value;
      }
      body = rawBody;
    } else {
      body = await req.json();
    }

    const pesertaMagangId =
      body.peserta_magang_id || body.pesertaMagangId || null;

    const todayJakarta = getTodayJakarta();
    const tanggal = body.tanggal
      ? formatDateYMD(body.tanggal)
      : todayJakarta;
    const rawWaktuMulai =
      body.waktu_mulai || body.waktuMulai || body.start_time || body.jam_mulai;
    const rawWaktuSelesai =
      body.waktu_selesai ||
      body.waktuSelesai ||
      body.end_time ||
      body.jam_selesai;
    const rawKategori = body.kategori || body.category;
    const rawAktivitas =
      body.aktivitas ||
      body.activity ||
      body.kegiatan ||
      body.deskripsi ||
      body.description;

    // Validasi input wajib
    if (!rawWaktuMulai) {
      return NextResponse.json(
        { success: false, message: "Waktu mulai wajib diisi." },
        { status: 400 }
      );
    }

    if (!rawWaktuSelesai) {
      return NextResponse.json(
        { success: false, message: "Waktu selesai wajib diisi." },
        { status: 400 }
      );
    }

    if (!rawKategori) {
      return NextResponse.json(
        { success: false, message: "Kategori wajib dipilih." },
        { status: 400 }
      );
    }

    if (!rawAktivitas || String(rawAktivitas).trim() === "") {
      return NextResponse.json(
        { success: false, message: "Aktivitas wajib diisi." },
        { status: 400 }
      );
    }

    const waktuMulai = normalizeTime(rawWaktuMulai);
    const waktuSelesai = normalizeTime(rawWaktuSelesai);
    const kategori = normalizeKategori(String(rawKategori));
    const aktivitas = String(rawAktivitas).trim();

    const [insertResult]: any = await mysqlPool.query(
      `
      INSERT INTO log_book (peserta_magang_id, tanggal, waktu_mulai, waktu_selesai, kategori, aktivitas)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        pesertaMagangId ? Number(pesertaMagangId) : null,
        tanggal,
        waktuMulai,
        waktuSelesai,
        kategori,
        aktivitas,
      ]
    );

    const insertedId = insertResult.insertId;
    const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);
    const nowIso = new Date().toISOString();

    // Ambil info peserta magang jika ada
    let userInfo: any = {};
    if (pesertaMagangId) {
      try {
        const [pmRows]: any = await mysqlPool.query(
          "SELECT id, name, institution, study_program, avatar FROM peserta_magang WHERE id = ? LIMIT 1",
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
      user_nama: userInfo.name || null,
      userName: userInfo.name || null,
      user_role: "ANAK_MAGANG",
      userRole: "ANAK_MAGANG",
      user_institution: userInfo.institution || null,
      user_sekolah: userInfo.institution || null,
      user_study_program: userInfo.study_program || null,
      user_avatar: userInfo.avatar || null,
      tanggal,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai,
      waktuMulai,
      waktuSelesai,
      durasi_menit: durasiMenit,
      kategori,
      aktivitas,
      created_at: nowIso,
      createdAt: nowIso,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Data log-book berhasil disimpan.",
        data: createdRecord,
        record: createdRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Log-Book POST Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menyimpan data log-book",
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * PUT / PATCH: Memperbarui data log-book berdasarkan ID
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
    await ensureLogBookTableExists();

    const contentType = req.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawBody: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        rawBody[key] = value;
      }
      body = rawBody;
    } else {
      body = await req.json();
    }

    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID log-book wajib disertakan." },
        { status: 400 }
      );
    }

    // Ambil data lama terlebih dahulu
    const [existingRows]: any = await mysqlPool.query(
      "SELECT * FROM log_book WHERE id = ? LIMIT 1",
      [Number(id)]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data log-book tidak ditemukan." },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (
      body.peserta_magang_id !== undefined ||
      body.pesertaMagangId !== undefined
    ) {
      const pmId = body.peserta_magang_id ?? body.pesertaMagangId;
      updates.push("peserta_magang_id = ?");
      params.push(pmId ? Number(pmId) : null);
    }

    if (body.tanggal !== undefined) {
      updates.push("tanggal = ?");
      params.push(formatDateYMD(body.tanggal));
    }

    if (
      body.waktu_mulai !== undefined ||
      body.waktuMulai !== undefined ||
      body.start_time !== undefined
    ) {
      const wMulai = body.waktu_mulai || body.waktuMulai || body.start_time;
      updates.push("waktu_mulai = ?");
      params.push(normalizeTime(wMulai));
    }

    if (
      body.waktu_selesai !== undefined ||
      body.waktuSelesai !== undefined ||
      body.end_time !== undefined
    ) {
      const wSelesai =
        body.waktu_selesai || body.waktuSelesai || body.end_time;
      updates.push("waktu_selesai = ?");
      params.push(normalizeTime(wSelesai));
    }

    if (body.kategori !== undefined || body.category !== undefined) {
      const kat = body.kategori || body.category;
      updates.push("kategori = ?");
      params.push(normalizeKategori(String(kat)));
    }

    if (
      body.aktivitas !== undefined ||
      body.activity !== undefined ||
      body.kegiatan !== undefined ||
      body.deskripsi !== undefined
    ) {
      const akt =
        body.aktivitas || body.activity || body.kegiatan || body.deskripsi;
      updates.push("aktivitas = ?");
      params.push(String(akt).trim());
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada field data yang diubah." },
        { status: 400 }
      );
    }

    params.push(Number(id));
    await mysqlPool.query(
      `UPDATE log_book SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    // Ambil data terbaru setelah diupdate beserta relasi
    const [updatedRows]: any = await mysqlPool.query(
      `
      SELECT
        lb.id,
        lb.peserta_magang_id,
        lb.tanggal,
        lb.waktu_mulai,
        lb.waktu_selesai,
        lb.kategori,
        lb.aktivitas,
        lb.created_at,
        pm.name          AS pm_name,
        pm.avatar        AS pm_avatar,
        pm.institution   AS pm_institution,
        pm.study_program AS pm_study_program
      FROM log_book lb
      LEFT JOIN peserta_magang pm ON pm.id = lb.peserta_magang_id
      WHERE lb.id = ? LIMIT 1
      `,
      [Number(id)]
    );

    const updated = updatedRows[0];
    const tanggal = formatDateYMD(updated.tanggal);
    const waktuMulai = normalizeTime(updated.waktu_mulai);
    const waktuSelesai = normalizeTime(updated.waktu_selesai);
    const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);
    const createdAt = updated.created_at
      ? new Date(updated.created_at).toISOString()
      : new Date().toISOString();

    const userName = updated.pm_name || "Peserta Magang";
    const userRole = "ANAK_MAGANG";
    const userAvatar = updated.pm_avatar || null;

    const formattedUpdated = {
      id: Number(updated.id),
      peserta_magang_id: updated.peserta_magang_id
        ? String(updated.peserta_magang_id)
        : null,
      pesertaMagangId: updated.peserta_magang_id
        ? String(updated.peserta_magang_id)
        : null,
      user_nama: userName,
      userName,
      user_role: userRole,
      userRole,
      user_institution: updated.pm_institution || "",
      user_sekolah: updated.pm_institution || "",
      user_study_program: updated.pm_study_program || "",
      user_avatar: userAvatar,
      tanggal,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai,
      waktuMulai,
      waktuSelesai,
      durasi_menit: durasiMenit,
      kategori: updated.kategori,
      aktivitas: updated.aktivitas,
      created_at: createdAt,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      message: "Data log-book berhasil diperbarui.",
      data: formattedUpdated,
      record: formattedUpdated,
    });
  } catch (error: any) {
    console.error("API Log-Book PUT/PATCH Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal memperbarui data log-book",
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * DELETE: Menghapus data log-book berdasarkan ID
 * ============================================================
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureLogBookTableExists();

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // ignore jika request body kosong
      }
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID log-book wajib disertakan untuk menghapus.",
        },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM log_book WHERE id = ?",
      [Number(id)]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data log-book tidak ditemukan atau sudah dihapus.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data log-book berhasil dihapus.",
      id: Number(id),
    });
  } catch (error: any) {
    console.error("API Log-Book DELETE Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menghapus data log-book",
      },
      { status: 500 }
    );
  }
}
