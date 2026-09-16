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

export type LogBookKategori = (typeof VALID_CATEGORIES)[number];

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
function normalizeKategori(kategori: string): LogBookKategori {
  if (!kategori) return "programmer";
  const cleaned = kategori.trim().toLowerCase();
  const found = VALID_CATEGORIES.find((cat) => cat === cleaned);
  if (found) return found;

  if (cleaned.includes("kelahiran") || cleaned.includes("lahir"))
    return "akta kelahiran";
  if (cleaned.includes("kematian") || cleaned.includes("mati"))
    return "akta kematian";
  if (
    cleaned.includes("bio") ||
    cleaned.includes("biodata") ||
    cleaned.includes("tambah data")
  )
    return "tambah bio data";
  if (cleaned.includes("pindah keluar") || cleaned.includes("keluar"))
    return "pindah keluar";
  if (
    cleaned.includes("pindah datang") ||
    cleaned.includes("datang") ||
    cleaned.includes("masuk")
  )
    return "pindah datang";
  if (
    cleaned.includes("program") ||
    cleaned.includes("coding") ||
    cleaned.includes("dev")
  )
    return "programmer";
  if (
    cleaned.includes("media") ||
    cleaned.includes("desain") ||
    cleaned.includes("sosmed")
  )
    return "media";

  return "programmer";
}

/**
 * ============================================================
 * Skema Tabel `log_book` (8 Kolom sesuai Database MySQL)
 *  1. id (int(11) AUTO_INCREMENT PRIMARY KEY)
 *  2. peserta_magang_id (bigint(20) UNSIGNED NULL, FK)
 *  3. tanggal (date NOT NULL)
 *  4. waktu_mulai (time NOT NULL)
 *  5. waktu_selesai (time NOT NULL)
 *  6. kategori (enum NOT NULL)
 *  7. aktivitas (text NOT NULL)
 *  8. created_at (timestamp DEFAULT CURRENT_TIMESTAMP)
 *
 * CATATAN: TIDAK ADA kolom `tugas_id` pada tabel `log_book`.
 * Relasi yang benar: `tugas.log_book_id -> log_book.id`.
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
        KEY \`idx_log_book_tanggal\`           (\`tanggal\`),
        KEY \`idx_log_book_kategori\`          (\`kategori\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM \`log_book\``);
      const existingCols = new Set(cols.map((c: any) => c.Field.toLowerCase()));

      if (existingCols.has("user_id") && !existingCols.has("peserta_magang_id")) {
        await mysqlPool.query(
          `ALTER TABLE \`log_book\` ADD COLUMN \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL AFTER \`id\``
        );
      }
    } catch {
      // Abaikan jika kolom sudah sesuai
    }
  } catch (err) {
    console.warn("ensureLogBookTableExists warning/error:", err);
  }
}

/**
 * ============================================================
 * GET /api/log-book
 * Mengambil daftar log-book dengan LEFT JOIN ke peserta_magang dan tugas
 * ============================================================
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
        "(lb.aktivitas LIKE ? OR lb.kategori LIKE ? OR pm.name LIKE ? OR pm.institution LIKE ? OR pm.divisi LIKE ? OR t.judul_tugas LIKE ?)",
      );
      params.push(
        `%${searchParam}%`,
        `%${searchParam}%`,
        `%${searchParam}%`,
        `%${searchParam}%`,
        `%${searchParam}%`,
        `%${searchParam}%`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows]: any = await mysqlPool.query(
      `
      SELECT COUNT(DISTINCT lb.id) as total 
      FROM log_book lb
      LEFT JOIN peserta_magang pm ON pm.id = lb.peserta_magang_id
      LEFT JOIN tugas t ON t.log_book_id = lb.id
      ${whereClause}
      `,
      params,
    );
    const totalCount = countRows?.[0]?.total
      ? Number(countRows[0].total)
      : 0;

    let paginationClause = "";
    if (limitParam) {
      const limit = Math.max(1, Number(limitParam) || 10);
      const page = Math.max(1, Number(pageParam) || 1);
      const offset = (page - 1) * limit;
      paginationClause = `LIMIT ${limit} OFFSET ${offset}`;
    }

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        lb.id,
        lb.peserta_magang_id,
        DATE_FORMAT(lb.tanggal, '%Y-%m-%d') AS tanggal_formatted,
        DATE_FORMAT(lb.waktu_mulai, '%H:%i:%s') AS waktu_mulai_formatted,
        DATE_FORMAT(lb.waktu_selesai, '%H:%i:%s') AS waktu_selesai_formatted,
        lb.kategori,
        lb.aktivitas,
        DATE_FORMAT(lb.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_formatted,
        lb.created_at,
        pm.name          AS pm_name,
        pm.avatar        AS pm_avatar,
        pm.institution   AS pm_institution,
        pm.study_program AS pm_study_program,
        pm.divisi        AS pm_divisi,
        t.id             AS tugas_id,
        t.judul_tugas    AS tugas_judul,
        t.status_pengerjaan AS tugas_status_pengerjaan
      FROM log_book lb
      LEFT JOIN peserta_magang pm ON pm.id = lb.peserta_magang_id
      LEFT JOIN tugas t ON t.log_book_id = lb.id
      ${whereClause}
      ORDER BY lb.tanggal ${sortParam}, lb.waktu_mulai ${sortParam}, lb.id ${sortParam}
      ${paginationClause}
      `,
      params,
    );

    const formattedData = (rows as any[]).map((row) => {
      const tanggal = row.tanggal_formatted || formatDateYMD(row.tanggal);
      const waktuMulai =
        row.waktu_mulai_formatted || normalizeTime(row.waktu_mulai);
      const waktuSelesai =
        row.waktu_selesai_formatted || normalizeTime(row.waktu_selesai);
      const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);
      const createdAt =
        row.created_at_formatted ||
        (row.created_at
          ? new Date(row.created_at).toISOString()
          : new Date().toISOString());

      const userName = row.pm_name || "Peserta Magang";
      const userRole = "ANAK_MAGANG";
      const userInstitution = row.pm_institution || "";
      const userStudyProgram = row.pm_study_program || "";
      const userDivisi = row.pm_divisi || "";
      const userAvatar = row.pm_avatar || null;

      return {
        id: Number(row.id),
        peserta_magang_id: row.peserta_magang_id
          ? Number(row.peserta_magang_id)
          : null,
        pesertaMagangId: row.peserta_magang_id
          ? Number(row.peserta_magang_id)
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
        user_divisi: userDivisi,
        userDivisi,
        divisi: userDivisi,
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
        tugas_id: row.tugas_id ? Number(row.tugas_id) : null,
        tugasId: row.tugas_id ? Number(row.tugas_id) : null,
        tugas_judul: row.tugas_judul || null,
        tugasJudul: row.tugas_judul || null,
        tugas_status_pengerjaan: row.tugas_status_pengerjaan || null,
      };
    });

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
 * POST /api/log-book
 * Menambahkan data log-book baru.
 *
 * Ketika peserta magang mengisi log-book ini:
 *  - Jika ada tugas yang dikaitkan (atau tugas BELUM_DIKERJAKAN yang sesuai),
 *    maka tugas tersebut ditautkan (tugas.log_book_id = log_book.id)
 *    dan status tugas diperbarui menjadi 'SELESAI'.
 * ============================================================
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

    const linkedTugasId =
      body.tugas_id || body.tugasId
        ? Number(body.tugas_id || body.tugasId)
        : null;
    const conn = await mysqlPool.getConnection();

    try {
      await conn.beginTransaction();

      // Waktu server saat ini (Asia/Jakarta)
      const nowJkt = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

      let pesertaMagangId =
        body.peserta_magang_id || body.pesertaMagangId || null;
      let tanggal = body.tanggal ? formatDateYMD(body.tanggal) : null;
      // Jika tidak dikirim dari client → gunakan waktu server sekarang
      let rawWaktuMulai =
        body.waktu_mulai ||
        body.waktuMulai ||
        body.start_time ||
        body.jam_mulai ||
        nowJkt;
      let rawWaktuSelesai =
        body.waktu_selesai ||
        body.waktuSelesai ||
        body.end_time ||
        body.jam_selesai ||
        nowJkt;
      // Jika kategori tidak dikirim → default 'programmer'
      let rawKategori = body.kategori || body.category || "programmer";
      let rawAktivitas =
        body.aktivitas ||
        body.activity ||
        body.kegiatan ||
        body.deskripsi ||
        body.description;

      // ── CEK KETERKAITAN TUGAS EKSPLISIT ─────────────────────────────────────
      if (linkedTugasId) {
        const [tugasRows]: any = await conn.query(
          `SELECT
             id,
             peserta_magang_id,
             log_book_id,
             judul_tugas,
             DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal_db,
             DATE_FORMAT(created_at, '%H:%i:%s') AS waktu_db
           FROM \`tugas\`
           WHERE id = ?
           LIMIT 1`,
          [linkedTugasId],
        );

        if (tugasRows && tugasRows.length > 0) {
          const tRow = tugasRows[0];

          // Cegah pembuatan log-book ganda jika tugas sudah punya log_book_id
          if (tRow.log_book_id !== null) {
            console.log(
              `[POST /api/log-book] Tugas #${linkedTugasId} sudah terhubung ke log_book #${tRow.log_book_id}. Mengembalikan data yang ada.`,
            );
            await conn.commit();
            conn.release();

            const [existingLb]: any = await mysqlPool.query(
              "SELECT * FROM log_book WHERE id = ? LIMIT 1",
              [Number(tRow.log_book_id)],
            );
            if (existingLb && existingLb.length > 0) {
              return NextResponse.json({
                success: true,
                message: "Log-book sudah ada sebelumnya.",
                data: existingLb[0],
              });
            }
          }

          pesertaMagangId = pesertaMagangId || tRow.peserta_magang_id;
          tanggal = tanggal || String(tRow.tanggal_db);
          rawAktivitas = rawAktivitas || tRow.judul_tugas;
        }
      }

      // Hanya aktivitas yang wajib diisi oleh user
      if (!rawAktivitas || String(rawAktivitas).trim() === "") {
        await conn.rollback();
        conn.release();
        return NextResponse.json(
          { success: false, message: "Aktivitas wajib diisi." },
          { status: 400 },
        );
      }

      const finalTanggal = tanggal || formatDateYMD(new Date());
      const finalWaktuMulai = normalizeTime(rawWaktuMulai);
      const finalWaktuSelesai = normalizeTime(rawWaktuSelesai);
      const finalKategori = normalizeKategori(String(rawKategori));
      const finalAktivitas = String(rawAktivitas).trim();

      const [insertResult]: any = await conn.query(
        `INSERT INTO log_book (peserta_magang_id, tanggal, waktu_mulai, waktu_selesai, kategori, aktivitas)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pesertaMagangId ? Number(pesertaMagangId) : null,
          finalTanggal,
          finalWaktuMulai,
          finalWaktuSelesai,
          finalKategori,
          finalAktivitas,
        ],
      );

      const insertedId = Number(insertResult.insertId);

      // Cari tugas yang terkait untuk diselesaikan:
      // 1. Jika ada linkedTugasId langsung dari body
      // 2. Atau jika ada tugas BELUM_DIKERJAKAN milik peserta magang ini yang judulnya cocok
      let resolvedTugasId = linkedTugasId;

      if (!resolvedTugasId && pesertaMagangId) {
        const [candidateTasks]: any = await conn.query(
          `SELECT id, judul_tugas
           FROM \`tugas\`
           WHERE peserta_magang_id = ?
             AND status_pengerjaan = 'BELUM_DIKERJAKAN'
             AND log_book_id IS NULL
             AND (
               LOWER(TRIM(judul_tugas)) = LOWER(TRIM(?))
               OR ? LIKE CONCAT('%', judul_tugas, '%')
               OR judul_tugas LIKE CONCAT('%', ?, '%')
             )
           ORDER BY id DESC
           LIMIT 1`,
          [
            Number(pesertaMagangId),
            finalAktivitas,
            finalAktivitas,
            finalAktivitas,
          ],
        );
        if (candidateTasks && candidateTasks.length > 0) {
          resolvedTugasId = Number(candidateTasks[0].id);
        }
      }

      // Saat si magang mengisi log-book untuk tugas tersebut -> tugas baru dianggap SELESAI
      if (resolvedTugasId) {
        await conn.query(
          "UPDATE `tugas` SET `log_book_id` = ?, `status_pengerjaan` = 'SELESAI' WHERE `id` = ?",
          [insertedId, resolvedTugasId],
        );
        console.log(`[LOG_BOOK] ID: ${insertedId} berhasil disimpan.`);
        console.log(
          `[TUGAS] ID: ${resolvedTugasId} status_pengerjaan diperbarui: SELESAI`,
        );
        console.log(`[TUGAS] log_book_id berhasil disimpan: ${insertedId}`);
      }

      await conn.commit();
      conn.release();

      const durasiMenit = calculateDurationMinutes(
        finalWaktuMulai,
        finalWaktuSelesai,
      );

      let userInfo: any = {};
      if (pesertaMagangId) {
        try {
          const [pmRows]: any = await mysqlPool.query(
            "SELECT id, name, institution, study_program, divisi, avatar FROM peserta_magang WHERE id = ? LIMIT 1",
            [pesertaMagangId],
          );
          if (pmRows && pmRows.length > 0) userInfo = pmRows[0];
        } catch {
          // ignore
        }
      }

      const createdRecord = {
        id: insertedId,
        peserta_magang_id: pesertaMagangId ? Number(pesertaMagangId) : null,
        pesertaMagangId: pesertaMagangId ? Number(pesertaMagangId) : null,
        user_nama: userInfo.name || null,
        userName: userInfo.name || null,
        user_role: "ANAK_MAGANG",
        userRole: "ANAK_MAGANG",
        user_institution: userInfo.institution || null,
        user_sekolah: userInfo.institution || null,
        user_study_program: userInfo.study_program || null,
        user_divisi: userInfo.divisi || null,
        userDivisi: userInfo.divisi || null,
        divisi: userInfo.divisi || null,
        user_avatar: userInfo.avatar || null,
        tanggal: finalTanggal,
        waktu_mulai: finalWaktuMulai,
        waktu_selesai: finalWaktuSelesai,
        waktuMulai: finalWaktuMulai,
        waktuSelesai: finalWaktuSelesai,
        durasi_menit: durasiMenit,
        kategori: finalKategori,
        aktivitas: finalAktivitas,
        tugas_id: resolvedTugasId,
        tugasId: resolvedTugasId,
      };

      return NextResponse.json(
        {
          success: true,
          message: resolvedTugasId
            ? "Data log-book berhasil disimpan dan tugas terkait ditandai SELESAI."
            : "Data log-book berhasil disimpan.",
          data: createdRecord,
          record: createdRecord,
        },
        { status: 201 },
      );
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }
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
 * PUT / PATCH /api/log-book
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

    const [updatedRows]: any = await mysqlPool.query(
      `
      SELECT
        lb.id,
        lb.peserta_magang_id,
        DATE_FORMAT(lb.tanggal, '%Y-%m-%d') AS tanggal_formatted,
        DATE_FORMAT(lb.waktu_mulai, '%H:%i:%s') AS waktu_mulai_formatted,
        DATE_FORMAT(lb.waktu_selesai, '%H:%i:%s') AS waktu_selesai_formatted,
        lb.kategori,
        lb.aktivitas,
        DATE_FORMAT(lb.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_formatted,
        pm.name          AS pm_name,
        pm.avatar        AS pm_avatar,
        pm.institution   AS pm_institution,
        pm.study_program AS pm_study_program,
        t.id             AS tugas_id
      FROM log_book lb
      LEFT JOIN peserta_magang pm ON pm.id = lb.peserta_magang_id
      LEFT JOIN tugas t ON t.log_book_id = lb.id
      WHERE lb.id = ? LIMIT 1
      `,
      [Number(id)],
    );

    const updated = updatedRows[0];
    const tanggal = updated.tanggal_formatted || formatDateYMD(updated.tanggal);
    const waktuMulai =
      updated.waktu_mulai_formatted || normalizeTime(updated.waktu_mulai);
    const waktuSelesai =
      updated.waktu_selesai_formatted || normalizeTime(updated.waktu_selesai);
    const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);

    const formattedUpdated = {
      id: Number(updated.id),
      peserta_magang_id: updated.peserta_magang_id
        ? Number(updated.peserta_magang_id)
        : null,
      pesertaMagangId: updated.peserta_magang_id
        ? Number(updated.peserta_magang_id)
        : null,
      user_nama: updated.pm_name || "Peserta Magang",
      userName: updated.pm_name || "Peserta Magang",
      user_role: "ANAK_MAGANG",
      userRole: "ANAK_MAGANG",
      user_institution: updated.pm_institution || "",
      user_sekolah: updated.pm_institution || "",
      user_study_program: updated.pm_study_program || "",
      user_avatar: updated.pm_avatar || null,
      tanggal,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai,
      waktuMulai,
      waktuSelesai,
      durasi_menit: durasiMenit,
      kategori: updated.kategori,
      aktivitas: updated.aktivitas,
      created_at: updated.created_at_formatted,
      createdAt: updated.created_at_formatted,
      tugas_id: updated.tugas_id ? Number(updated.tugas_id) : null,
      tugasId: updated.tugas_id ? Number(updated.tugas_id) : null,
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
 * DELETE /api/log-book
 * Menghapus log-book dengan transaksi aman terhadap tugas.log_book_id
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
        // ignore
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

    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      // Lepaskan tautan log_book_id pada tabel tugas agar tidak dangling
      await conn.query(
        "UPDATE `tugas` SET `log_book_id` = NULL WHERE `log_book_id` = ?",
        [Number(id)],
      );

      const [result]: any = await conn.query(
        "DELETE FROM log_book WHERE id = ?",
        [Number(id)],
      );

      if (result.affectedRows === 0) {
        await conn.rollback();
        return NextResponse.json(
          {
            success: false,
            message: "Data log-book tidak ditemukan atau sudah dihapus.",
          },
          { status: 404 },
        );
      }

      await conn.commit();
    } catch (delErr) {
      await conn.rollback();
      throw delErr;
    } finally {
      conn.release();
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
