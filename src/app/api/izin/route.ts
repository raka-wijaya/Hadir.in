import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { saveStorageFile } from "@/lib/storage";

const TIMEZONE = "Asia/Jakarta";

/**
 * Helper: Ambil tanggal hari ini dalam format YYYY-MM-DD di zona waktu Asia/Jakarta
 */
function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
  }).format(new Date());
}

/**
 * Helper: Format value tanggal menjadi string YYYY-MM-DD
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
 * Helper: Ambil ID pengaturan_sistem yang aktif
 */
async function getActiveSettingId(): Promise<number> {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT id FROM pengaturan_sistem ORDER BY id ASC LIMIT 1
    `);
    if (rows && rows.length > 0) {
      return Number(rows[0].id || 1);
    }
  } catch (err) {
    console.warn("Gagal mengambil pengaturan_sistem id:", err);
  }
  return 1;
}

/**
 * Memastikan tabel `izin` tersedia di database MySQL sesuai skema:
 *  1. id (BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
 *  2. absensi_id (BIGINT UNSIGNED NULL)
 *  3. peserta_magang_id (BIGINT UNSIGNED NULL)
 *  4. karyawan_os_id (BIGINT UNSIGNED NULL)
 *  5. jenis (VARCHAR(100) NOT NULL)
 *  6. tanggal_mulai (DATE NOT NULL)
 *  7. tanggal_selesai (DATE NOT NULL)
 *  8. alasan (TEXT NOT NULL)
 *  9. attachment (VARCHAR(500) NULL)
 * 10. created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
 * 11. updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
 */
async function ensureIzinTableExists() {
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`izin\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`absensi_id\` BIGINT UNSIGNED DEFAULT NULL,
        \`peserta_magang_id\` BIGINT UNSIGNED DEFAULT NULL,
        \`karyawan_os_id\` BIGINT UNSIGNED DEFAULT NULL,
        \`jenis\` VARCHAR(100) NOT NULL,
        \`tanggal_mulai\` DATE NOT NULL,
        \`tanggal_selesai\` DATE NOT NULL,
        \`alasan\` TEXT NOT NULL,
        \`attachment\` VARCHAR(500) DEFAULT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_izin_peserta_magang_id\` (\`peserta_magang_id\`),
        KEY \`idx_izin_karyawan_os_id\` (\`karyawan_os_id\`),
        KEY \`idx_izin_absensi_id\` (\`absensi_id\`),
        KEY \`idx_izin_tanggal\` (\`tanggal_mulai\`, \`tanggal_selesai\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrasi aman: tambah kolom baru jika tabel lama hanya punya user_id
    try {
      const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM \`izin\``);
      const existingCols = new Set(cols.map((c: any) => c.Field.toLowerCase()));

      if (existingCols.has("user_id") && !existingCols.has("peserta_magang_id")) {
        await mysqlPool.query(`ALTER TABLE \`izin\` ADD COLUMN \`peserta_magang_id\` BIGINT UNSIGNED DEFAULT NULL AFTER \`absensi_id\``);
      }
      if (existingCols.has("user_id") && !existingCols.has("karyawan_os_id")) {
        await mysqlPool.query(`ALTER TABLE \`izin\` ADD COLUMN \`karyawan_os_id\` BIGINT UNSIGNED DEFAULT NULL AFTER \`peserta_magang_id\``);
      }
    } catch (migErr) {
      console.warn("Migrasi kolom izin:", migErr);
    }
  } catch (err) {
    console.warn("ensureIzinTableExists error:", err);
  }
}

/**
 * ============================================================
 * GET: Mengambil daftar pengajuan izin
 * ============================================================
 * Query Params:
 *  - id: ID izin spesifik
 *  - peserta_magang_id / pesertaMagangId: filter berdasarkan peserta magang
 *  - karyawan_os_id / karyawanOsId: filter berdasarkan karyawan OS
 *  - startDate / start_date / tanggal_mulai: filter tanggal mulai
 *  - endDate / end_date / tanggal_selesai: filter tanggal selesai
 *  - tanggal / date: filter tanggal berada dalam rentang izin
 *  - jenis: filter jenis izin (SAKIT, KEPERLUAN_PRIBADI, LAINNYA, dll)
 *  - q / search: pencarian nama, email, institusi, atau alasan
 */
export async function GET(req: NextRequest) {
  try {
    await ensureIzinTableExists();

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const pesertaMagangId =
      searchParams.get("peserta_magang_id") ||
      searchParams.get("pesertaMagangId");
    const karyawanOsId =
      searchParams.get("karyawan_os_id") ||
      searchParams.get("karyawanOsId");
    const startDate =
      searchParams.get("startDate") ||
      searchParams.get("start_date") ||
      searchParams.get("tanggal_mulai");
    const endDate =
      searchParams.get("endDate") ||
      searchParams.get("end_date") ||
      searchParams.get("tanggal_selesai");
    const tanggalParam =
      searchParams.get("tanggal") || searchParams.get("date");
    const jenisParam = searchParams.get("jenis");
    const search = searchParams.get("q") || searchParams.get("search");
    const role = searchParams.get("role");

    const conditions: string[] = [];
    const params: any[] = [];

    if (idParam) {
      conditions.push("i.id = ?");
      params.push(idParam);
    }

    if (pesertaMagangId) {
      conditions.push("i.peserta_magang_id = ?");
      params.push(pesertaMagangId);
    }

    if (karyawanOsId) {
      conditions.push("i.karyawan_os_id = ?");
      params.push(karyawanOsId);
    }

    if (role && role !== "ALL" && role !== "SUPERADMIN" && role !== "SUPER_ADMIN") {
      if (role === "ADMIN_MAGANG" || role === "ANAK_MAGANG") {
        conditions.push("i.peserta_magang_id IS NOT NULL");
      } else if (role === "ADMIN_OS" || role === "KARYAWAN_OS") {
        conditions.push("i.karyawan_os_id IS NOT NULL");
      }
    }

    if (startDate) {
      conditions.push("i.tanggal_selesai >= ?");
      params.push(startDate);
    }

    if (endDate) {
      conditions.push("i.tanggal_mulai <= ?");
      params.push(endDate);
    }

    if (tanggalParam) {
      conditions.push("(? BETWEEN i.tanggal_mulai AND i.tanggal_selesai)");
      params.push(tanggalParam);
    }

    if (jenisParam) {
      conditions.push("LOWER(i.jenis) = LOWER(?)");
      params.push(jenisParam);
    }

    if (search) {
      conditions.push(
        `(
          pm.name LIKE ? OR pm.email LIKE ? OR pm.institution LIKE ? OR pm.divisi LIKE ? OR
          ko.name LIKE ? OR ko.email LIKE ? OR
          i.alasan LIKE ?
        )`
      );
      const pat = `%${search}%`;
      params.push(pat, pat, pat, pat, pat, pat, pat);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        i.id,
        i.absensi_id,
        i.peserta_magang_id,
        i.karyawan_os_id,
        i.jenis,
        i.tanggal_mulai,
        i.tanggal_selesai,
        i.alasan,
        i.attachment,
        i.created_at,
        i.updated_at,
        pm.name  AS pm_name,
        pm.email AS pm_email,
        pm.avatar AS pm_avatar,
        pm.institution AS pm_institution,
        pm.study_program AS pm_study_program,
        pm.divisi AS pm_divisi,
        ko.name  AS ko_name,
        ko.email AS ko_email,
        ko.avatar AS ko_avatar,
        a.keterangan AS absensi_keterangan,
        a.status     AS absensi_status
      FROM izin i
      LEFT JOIN peserta_magang pm ON pm.id = i.peserta_magang_id
      LEFT JOIN karyawan_os    ko ON ko.id = i.karyawan_os_id
      LEFT JOIN absensi a ON a.id = i.absensi_id
      ${whereClause}
      ORDER BY i.created_at DESC, i.tanggal_mulai DESC
      `,
      params
    );

    const formattedData = (rows as any[]).map((row) => {
      const tanggalMulai = formatDateYMD(row.tanggal_mulai);
      const tanggalSelesai = formatDateYMD(row.tanggal_selesai);
      const createdTime = row.created_at
        ? new Date(row.created_at).toISOString()
        : new Date().toISOString();
      const updatedTime = row.updated_at
        ? new Date(row.updated_at).toISOString()
        : new Date().toISOString();

      let alasanClean = row.alasan || "";
      let catatanAdmin = "";

      const rawKeterangan = row.absensi_keterangan || row.alasan || "";
      if (rawKeterangan.includes("|| Catatan Admin:")) {
        const parts = rawKeterangan.split("|| Catatan Admin:");
        if (row.alasan && row.alasan.includes("|| Catatan Admin:")) {
          alasanClean = parts[0]?.trim() || "";
        }
        catatanAdmin = parts[1]?.trim() || "";
      }

      if (alasanClean.startsWith("[") && alasanClean.includes("]")) {
        const match = alasanClean.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          alasanClean = match[2];
        }
      }

      // Tentukan data user: peserta_magang atau karyawan_os
      const isPeserta = !!row.peserta_magang_id;
      const userName = isPeserta
        ? row.pm_name || "Peserta Magang"
        : row.ko_name || "Karyawan OS";
      const userEmail = isPeserta ? row.pm_email : row.ko_email;
      const userAvatar = isPeserta ? row.pm_avatar : row.ko_avatar;
      const userRole = isPeserta ? "ANAK_MAGANG" : "KARYAWAN_OS";
      const userInstitution = isPeserta ? row.pm_institution || "" : "";
      const userStudyProgram = isPeserta ? row.pm_study_program || "" : "";
      const userDivisi = isPeserta ? row.pm_divisi || "" : "";

      return {
        // Kolom tabel izin
        id: String(row.id),
        absensi_id: row.absensi_id ? String(row.absensi_id) : null,
        peserta_magang_id: row.peserta_magang_id
          ? String(row.peserta_magang_id)
          : null,
        karyawan_os_id: row.karyawan_os_id
          ? String(row.karyawan_os_id)
          : null,
        jenis: row.jenis,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: alasanClean,
        attachment: row.attachment || null,
        created_at: createdTime,
        updated_at: updatedTime,

        // Alias camelCase & relasi user untuk kompatibilitas frontend
        absensiId: row.absensi_id ? String(row.absensi_id) : null,
        pesertaMagangId: row.peserta_magang_id
          ? String(row.peserta_magang_id)
          : null,
        karyawanOsId: row.karyawan_os_id
          ? String(row.karyawan_os_id)
          : null,
        tanggalMulai,
        tanggalSelesai,
        keterangan: alasanClean,
        catatanAdmin,
        userName,
        user_nama: userName,
        userEmail,
        user_email: userEmail,
        userRole,
        user_role: userRole,
        userAvatar,
        user_avatar: userAvatar,
        userInstitution,
        user_institution: userInstitution,
        userStudyProgram,
        user_study_program: userStudyProgram,
        userDivisi,
        user_divisi: userDivisi,
        divisi: userDivisi,
        createdAt: createdTime,
        updatedAt: updatedTime,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
      izin: formattedData,
      leaves: formattedData,
      total: formattedData.length,
    });
  } catch (error: any) {
    console.error("API Izin GET Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data izin." },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * POST: Mengajukan Izin Baru
 * ============================================================
 * Mendukung request JSON maupun multipart/form-data (upload file).
 * Kolom yang diisi ke tabel `izin`:
 *   1. id (auto_increment)
 *   2. absensi_id (relasi ke absensi jika sinkronisasi dibuat)
 *   3. peserta_magang_id (null jika karyawan OS)
 *   4. karyawan_os_id (null jika peserta magang)
 *   5. jenis
 *   6. tanggal_mulai
 *   7. tanggal_selesai
 *   8. alasan
 *   9. attachment
 *  10. created_at
 *  11. updated_at
 */
export async function POST(req: NextRequest) {
  try {
    await ensureIzinTableExists();

    const contentType = req.headers.get("content-type") || "";
    let body: any = {};
    let attachmentFile: any = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawBody: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        if (
          key === "attachment" ||
          key === "file" ||
          key === "dokumen" ||
          key === "lampiran"
        ) {
          attachmentFile = value;
        } else {
          rawBody[key] = value;
        }
      }
      body = rawBody;
    } else {
      body = await req.json();
    }

    // Ambil identifier: peserta_magang_id atau karyawan_os_id
    const pesertaMagangId =
      body.peserta_magang_id || body.pesertaMagangId || null;
    const karyawanOsId =
      body.karyawan_os_id || body.karyawanOsId || null;

    if (!pesertaMagangId && !karyawanOsId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "peserta_magang_id atau karyawan_os_id wajib disertakan.",
        },
        { status: 400 }
      );
    }

    const today = getTodayJakarta();
    const jenisRaw = String(body.jenis || body.status || "SAKIT").trim().toUpperCase();
    // Normalisasi jenis ke dua nilai standar: SAKIT atau IZIN
    const jenisFinal =
      jenisRaw === "SAKIT"
        ? "SAKIT"
        : "IZIN"; // IZIN, KEPERLUAN_PRIBADI, KEPERLUAN PRIBADI, dan lainnya → IZIN
    const tanggalMulai = formatDateYMD(
      body.tanggal_mulai || body.tanggalMulai || today
    );
    const tanggalSelesai = formatDateYMD(
      body.tanggal_selesai || body.tanggalSelesai || tanggalMulai
    );
    const alasan = String(
      body.alasan || body.keterangan || body.reason || ""
    ).trim();

    if (!alasan) {
      return NextResponse.json(
        { success: false, message: "Alasan pengajuan izin wajib diisi." },
        { status: 400 }
      );
    }

    if (tanggalSelesai < tanggalMulai) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
        },
        { status: 400 }
      );
    }

    // Identifier untuk nama file
    const fileIdentifier = pesertaMagangId || karyawanOsId;

    // 1. Simpan attachment file jika ada
    let attachmentUrl: string | null = null;
    const rawAttachment =
      attachmentFile || body.attachment || body.file || null;
    if (rawAttachment) {
      const saved = await saveStorageFile(
        rawAttachment,
        "izin",
        "lampiran",
        fileIdentifier,
        tanggalMulai
      );
      attachmentUrl = saved ? saved.slice(0, 500) : null;
    }

    // 2. Sinkronkan ke tabel `absensi` untuk setiap tanggal dalam rentang izin
    const settingId = await getActiveSettingId();
    const isSakit = jenisFinal === "SAKIT";
    const statusAbsensi: "SAKIT" | "IZIN" = isSakit ? "SAKIT" : "IZIN";
    const notesFormatted = `[${jenisFinal}] ${alasan}`;

    const startDateObj = new Date(tanggalMulai);
    const endDateObj = new Date(tanggalSelesai);
    const dateList: string[] = [];
    for (
      let d = new Date(startDateObj);
      d <= endDateObj;
      d.setDate(d.getDate() + 1)
    ) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dateList.push(`${y}-${m}-${day}`);
    }

    let primaryAbsensiId: number | null =
      body.absensi_id || body.absensiId
        ? Number(body.absensi_id || body.absensiId)
        : null;

    for (const tgl of dateList) {
      try {
        // Cari absensi yang cocok
        let absensiWhere = "";
        let absensiParams: any[] = [tgl];

        if (pesertaMagangId) {
          absensiWhere = "peserta_magang_id = ? AND tanggal = ?";
          absensiParams = [pesertaMagangId, tgl];
        } else {
          absensiWhere = "karyawan_os_id = ? AND tanggal = ?";
          absensiParams = [karyawanOsId, tgl];
        }

        const [existing]: any = await mysqlPool.query(
          `SELECT id FROM absensi WHERE ${absensiWhere} LIMIT 1`,
          absensiParams
        );

        if (existing && existing.length > 0) {
          const existingId = Number(existing[0].id);
          if (!primaryAbsensiId) primaryAbsensiId = existingId;
          await mysqlPool.query(
            `UPDATE absensi SET status = ?, keterangan = ?, pengaturan_sistem_id = ? WHERE id = ?`,
            [statusAbsensi, notesFormatted, settingId, existingId]
          );
        } else {
          // Insert absensi baru
          const absFields = pesertaMagangId
            ? "(peserta_magang_id, pengaturan_sistem_id, tanggal, status, keterangan)"
            : "(karyawan_os_id, pengaturan_sistem_id, tanggal, status, keterangan)";
          const absId = pesertaMagangId ? pesertaMagangId : karyawanOsId;

          const [insertAbs]: any = await mysqlPool.query(
            `INSERT INTO absensi ${absFields} VALUES (?, ?, ?, ?, ?)`,
            [absId, settingId, tgl, statusAbsensi, notesFormatted]
          );
          if (!primaryAbsensiId) primaryAbsensiId = Number(insertAbs.insertId);
        }
      } catch (absErr) {
        console.warn("Gagal sinkronisasi absensi untuk tanggal", tgl, absErr);
      }
    }

    // 3. Simpan ke tabel `izin`
    const [insertResult]: any = await mysqlPool.query(
      `
      INSERT INTO izin (
        absensi_id,
        peserta_magang_id,
        karyawan_os_id,
        jenis,
        tanggal_mulai,
        tanggal_selesai,
        alasan,
        attachment
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        primaryAbsensiId,
        pesertaMagangId || null,
        karyawanOsId || null,
        jenisFinal,
        tanggalMulai,
        tanggalSelesai,
        alasan,
        attachmentUrl,
      ]
    );

    const insertedIzinId = insertResult.insertId;

    // 4. Ambil data peserta/karyawan untuk respons lengkap
    let userInfo: any = {};
    let userRole = "ANAK_MAGANG";

    if (pesertaMagangId) {
      const [pmRows]: any = await mysqlPool.query(
        "SELECT id, name, avatar, institution, study_program, divisi FROM peserta_magang WHERE id = ? LIMIT 1",
        [pesertaMagangId]
      );
      userInfo = pmRows?.[0] || {};
      userRole = "ANAK_MAGANG";
    } else if (karyawanOsId) {
      const [koRows]: any = await mysqlPool.query(
        "SELECT id, name, avatar FROM karyawan_os WHERE id = ? LIMIT 1",
        [karyawanOsId]
      );
      userInfo = koRows?.[0] || {};
      userRole = "KARYAWAN_OS";
    }

    const nowIso = new Date().toISOString();

    const izinObject = {
      id: String(insertedIzinId),
      absensi_id: primaryAbsensiId ? String(primaryAbsensiId) : null,
      absensiId: primaryAbsensiId ? String(primaryAbsensiId) : null,
      peserta_magang_id: pesertaMagangId ? String(pesertaMagangId) : null,
      pesertaMagangId: pesertaMagangId ? String(pesertaMagangId) : null,
      karyawan_os_id: karyawanOsId ? String(karyawanOsId) : null,
      karyawanOsId: karyawanOsId ? String(karyawanOsId) : null,
      jenis: jenisRaw,
      tanggal_mulai: tanggalMulai,
      tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      tanggalSelesai,
      alasan,
      attachment: attachmentUrl,
      created_at: nowIso,
      createdAt: nowIso,
      updated_at: nowIso,
      updatedAt: nowIso,
      catatanAdmin: "",
      userName: userInfo.name || "Peserta",
      user_nama: userInfo.name || "Peserta",
      userRole,
      user_role: userRole,
      userAvatar: userInfo.avatar || null,
      user_avatar: userInfo.avatar || null,
      userInstitution: userInfo.institution || "",
      user_institution: userInfo.institution || "",
      userStudyProgram: userInfo.study_program || "",
      user_study_program: userInfo.study_program || "",
      userDivisi: userInfo.divisi || "",
      user_divisi: userInfo.divisi || "",
      divisi: userInfo.divisi || "",
    };

    return NextResponse.json(
      {
        success: true,
        message: "Pengajuan izin berhasil dikirim.",
        data: izinObject,
        izin: izinObject,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Izin POST Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal memproses pengajuan izin.",
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * PATCH: Memperbarui Catatan Admin atau Data Pengajuan Izin
 * ============================================================
 */
export async function PUT(req: NextRequest) {
  return PATCH(req);
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureIzinTableExists();

    const body = await req.json();
    const {
      id,
      catatanAdmin,
      catatan_admin,
      jenis,
      tanggal_mulai,
      tanggalMulai,
      tanggal_selesai,
      tanggalSelesai,
      alasan,
      attachment,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID izin wajib disertakan." },
        { status: 400 }
      );
    }

    const [rows]: any = await mysqlPool.query(
      "SELECT id, absensi_id, peserta_magang_id, karyawan_os_id, jenis, tanggal_mulai, tanggal_selesai, alasan, attachment FROM izin WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data pengajuan izin tidak ditemukan." },
        { status: 404 }
      );
    }

    const currentIzin = rows[0];
    const adminNoteVal =
      catatanAdmin !== undefined ? catatanAdmin : catatan_admin;

    const fields: string[] = [];
    const params: any[] = [];

    if (jenis !== undefined) {
      // Normalisasi jenis ke dua nilai standar: SAKIT atau IZIN
      const jenisNorm = String(jenis).trim().toUpperCase();
      const jenisFinal = jenisNorm === "SAKIT" ? "SAKIT" : "IZIN";
      fields.push("jenis = ?");
      params.push(jenisFinal);

      // Update status absensi jika jenis berubah
      if (currentIzin.absensi_id) {
        try {
          const newStatusAbsensi: "SAKIT" | "IZIN" = jenisFinal === "SAKIT" ? "SAKIT" : "IZIN";
          await mysqlPool.query(
            "UPDATE absensi SET status = ? WHERE id = ?",
            [newStatusAbsensi, currentIzin.absensi_id]
          );
        } catch (absStatusErr) {
          console.warn("Gagal update status absensi saat ubah jenis:", absStatusErr);
        }
      }
    }
    if (tanggal_mulai !== undefined || tanggalMulai !== undefined) {
      fields.push("tanggal_mulai = ?");
      params.push(formatDateYMD(tanggal_mulai || tanggalMulai));
    }
    if (tanggal_selesai !== undefined || tanggalSelesai !== undefined) {
      fields.push("tanggal_selesai = ?");
      params.push(formatDateYMD(tanggal_selesai || tanggalSelesai));
    }
    if (alasan !== undefined) {
      fields.push("alasan = ?");
      params.push(alasan);
    }
    if (attachment !== undefined) {
      fields.push("attachment = ?");
      params.push(attachment);
    }

    // Jika ada catatan admin, perbarui keterangan pada tabel absensi terkait
    if (adminNoteVal !== undefined && currentIzin.absensi_id) {
      try {
        const [absRows]: any = await mysqlPool.query(
          "SELECT id, keterangan FROM absensi WHERE id = ? LIMIT 1",
          [currentIzin.absensi_id]
        );
        if (absRows && absRows.length > 0) {
          const currentNotes = absRows[0].keterangan || "";
          let baseReason = currentNotes;
          if (currentNotes.includes("|| Catatan Admin:")) {
            baseReason =
              currentNotes.split("|| Catatan Admin:")[0]?.trim() || "";
          }
          const updatedNotes = adminNoteVal
            ? `${baseReason} || Catatan Admin: ${String(adminNoteVal).trim()}`
            : baseReason;

          await mysqlPool.query(
            "UPDATE absensi SET keterangan = ? WHERE id = ?",
            [updatedNotes, currentIzin.absensi_id]
          );
        }
      } catch (absErr) {
        console.warn("Gagal memperbarui catatan admin di absensi:", absErr);
      }
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    if (fields.length > 1) {
      await mysqlPool.query(
        `UPDATE izin SET ${fields.join(", ")} WHERE id = ?`,
        params
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pengajuan izin berhasil diperbarui.",
      data: {
        id: String(id),
        catatanAdmin:
          adminNoteVal !== undefined ? String(adminNoteVal).trim() : "",
      },
    });
  } catch (error: any) {
    console.error("API Izin PATCH Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal memperbarui data izin.",
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * DELETE: Menghapus Data Pengajuan Izin
 * ============================================================
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureIzinTableExists();

    let id: string | null = null;
    const { searchParams } = new URL(req.url);
    id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id ? String(body.id) : null;
      } catch {
        // Abaikan jika tidak ada body JSON
      }
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID izin wajib disertakan untuk menghapus.",
        },
        { status: 400 }
      );
    }

    // Ambil info izin sebelum dihapus
    const [rows]: any = await mysqlPool.query(
      "SELECT id, absensi_id, peserta_magang_id, karyawan_os_id, tanggal_mulai, tanggal_selesai FROM izin WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data pengajuan izin tidak ditemukan." },
        { status: 404 }
      );
    }

    const izinItem = rows[0];

    // Hapus dari tabel izin
    await mysqlPool.query("DELETE FROM izin WHERE id = ?", [id]);

    // Hapus atau reset record absensi terkait jika statusnya IZIN/SAKIT
    if (izinItem.absensi_id) {
      try {
        await mysqlPool.query(
          "DELETE FROM absensi WHERE id = ? AND status IN ('IZIN', 'SAKIT')",
          [izinItem.absensi_id]
        );
      } catch (absErr) {
        console.warn("Gagal menghapus absensi terkait:", absErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data pengajuan izin berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("API Izin DELETE Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menghapus data pengajuan izin.",
      },
      { status: 500 }
    );
  }
}
