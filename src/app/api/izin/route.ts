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
 *  3. user_id (BIGINT UNSIGNED NOT NULL)
 *  4. jenis (VARCHAR(100) NOT NULL)
 *  5. tanggal_mulai (DATE NOT NULL)
 *  6. tanggal_selesai (DATE NOT NULL)
 *  7. alasan (TEXT NOT NULL)
 *  8. attachment (VARCHAR(500) NULL)
 *  9. created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
 * 10. updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
 */
async function ensureIzinTableExists() {
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`izin\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`absensi_id\` BIGINT UNSIGNED DEFAULT NULL,
        \`user_id\` BIGINT UNSIGNED NOT NULL,
        \`jenis\` VARCHAR(100) NOT NULL,
        \`tanggal_mulai\` DATE NOT NULL,
        \`tanggal_selesai\` DATE NOT NULL,
        \`alasan\` TEXT NOT NULL,
        \`attachment\` VARCHAR(500) DEFAULT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_izin_user_id\` (\`user_id\`),
        KEY \`idx_izin_absensi_id\` (\`absensi_id\`),
        KEY \`idx_izin_tanggal\` (\`tanggal_mulai\`, \`tanggal_selesai\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
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
 *  - userId / user_id: filter berdasarkan user
 *  - role: filter role (ADMIN_MAGANG -> ANAK_MAGANG, ADMIN_OS -> KARYAWAN_OS)
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
    const userId = searchParams.get("userId") || searchParams.get("user_id");
    const role = searchParams.get("role");
    const startDate = searchParams.get("startDate") || searchParams.get("start_date") || searchParams.get("tanggal_mulai");
    const endDate = searchParams.get("endDate") || searchParams.get("end_date") || searchParams.get("tanggal_selesai");
    const tanggalParam = searchParams.get("tanggal") || searchParams.get("date");
    const jenisParam = searchParams.get("jenis");
    const search = searchParams.get("q") || searchParams.get("search");

    const conditions: string[] = [];
    const params: any[] = [];

    if (idParam) {
      conditions.push("i.id = ?");
      params.push(idParam);
    }

    if (userId) {
      conditions.push("i.user_id = ?");
      params.push(userId);
    }

    if (role && role !== "ALL" && role !== "SUPERADMIN" && role !== "SUPER_ADMIN") {
      if (role === "ADMIN_MAGANG") {
        conditions.push("u.role = 'ANAK_MAGANG'");
      } else if (role === "ADMIN_OS") {
        conditions.push("u.role = 'KARYAWAN_OS'");
      } else {
        conditions.push("u.role = ?");
        params.push(role);
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
      conditions.push("(u.name LIKE ? OR u.email LIKE ? OR u.institution LIKE ? OR i.alasan LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        i.id,
        i.absensi_id,
        i.user_id,
        i.jenis,
        i.tanggal_mulai,
        i.tanggal_selesai,
        i.alasan,
        i.attachment,
        i.created_at,
        i.updated_at,
        u.name AS user_name,
        u.name AS user_nama,
        u.role AS user_role,
        u.avatar AS user_avatar,
        u.institution AS user_institution,
        u.institution AS user_sekolah,
        u.study_program AS user_study_program,
        a.keterangan AS absensi_keterangan,
        a.status AS absensi_status
      FROM izin i
      LEFT JOIN users u ON u.id = i.user_id
      LEFT JOIN absensi a ON a.id = i.absensi_id
      ${whereClause}
      ORDER BY i.created_at DESC, i.tanggal_mulai DESC
      `,
      params
    );

    const formattedData = (rows as any[]).map((row) => {
      const tanggalMulai = formatDateYMD(row.tanggal_mulai);
      const tanggalSelesai = formatDateYMD(row.tanggal_selesai);
      const createdTime = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
      const updatedTime = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();

      let alasanClean = row.alasan || "";
      let catatanAdmin = "";

      // Ekstrak catatan admin jika ada pada string alasan atau keterangan absensi
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

      const userName = row.user_name || row.user_nama || "Peserta";
      const userRole = row.user_role || "ANAK_MAGANG";
      const userAvatar = row.user_avatar || null;
      const userInstitution = row.user_institution || row.user_sekolah || "";
      const userStudyProgram = row.user_study_program || "";

      return {
        // Skema tabel izin (10 kolom)
        id: String(row.id),
        absensi_id: row.absensi_id ? String(row.absensi_id) : null,
        user_id: String(row.user_id),
        jenis: row.jenis,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: alasanClean,
        attachment: row.attachment || null,
        created_at: createdTime,
        updated_at: updatedTime,

        // Alias camelCase & relasi user untuk kompatibilitas frontend
        absensiId: row.absensi_id ? String(row.absensi_id) : null,
        userId: String(row.user_id),
        tanggalMulai,
        tanggalSelesai,
        keterangan: alasanClean,
        catatanAdmin,
        userName,
        user_nama: userName,
        userRole,
        user_role: userRole,
        userAvatar,
        user_avatar: userAvatar,
        userInstitution,
        user_institution: userInstitution,
        userStudyProgram,
        user_study_program: userStudyProgram,
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
 *   3. user_id
 *   4. jenis
 *   5. tanggal_mulai
 *   6. tanggal_selesai
 *   7. alasan
 *   8. attachment
 *   9. created_at
 *  10. updated_at
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
        if (key === "attachment" || key === "file" || key === "dokumen" || key === "lampiran") {
          attachmentFile = value;
        } else {
          rawBody[key] = value;
        }
      }
      body = rawBody;
    } else {
      body = await req.json();
    }

    const userId = body.userId || body.user_id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID wajib disertakan." },
        { status: 400 }
      );
    }

    const today = getTodayJakarta();
    const jenisRaw = String(body.jenis || body.status || "IZIN").trim();
    const tanggalMulai = formatDateYMD(body.tanggal_mulai || body.tanggalMulai || today);
    const tanggalSelesai = formatDateYMD(body.tanggal_selesai || body.tanggalSelesai || tanggalMulai);
    const alasan = String(body.alasan || body.keterangan || body.reason || "").trim();

    if (!alasan) {
      return NextResponse.json(
        { success: false, message: "Alasan pengajuan izin wajib diisi." },
        { status: 400 }
      );
    }

    if (tanggalSelesai < tanggalMulai) {
      return NextResponse.json(
        { success: false, message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." },
        { status: 400 }
      );
    }

    // 1. Simpan attachment file jika ada
    let attachmentUrl: string | null = null;
    const rawAttachment = attachmentFile || body.attachment || body.file || null;
    if (rawAttachment) {
      const saved = await saveStorageFile(rawAttachment, "izin", "lampiran", userId, tanggalMulai);
      attachmentUrl = saved ? saved.slice(0, 500) : null;
    }

    // 2. Sinkronkan ke tabel `absensi` untuk setiap tanggal dalam rentang izin
    const settingId = await getActiveSettingId();
    const isSakit = jenisRaw.toUpperCase().includes("SAKIT");
    const statusAbsensi: "SAKIT" | "IZIN" = isSakit ? "SAKIT" : "IZIN";
    const notesFormatted = `[${jenisRaw}] ${alasan}`;

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

    let primaryAbsensiId: number | null = body.absensi_id || body.absensiId ? Number(body.absensi_id || body.absensiId) : null;

    for (const tgl of dateList) {
      try {
        const [existing]: any = await mysqlPool.query(
          "SELECT id FROM absensi WHERE user_id = ? AND tanggal = ? LIMIT 1",
          [userId, tgl]
        );
        if (existing && existing.length > 0) {
          const existingId = Number(existing[0].id);
          if (!primaryAbsensiId) primaryAbsensiId = existingId;
          await mysqlPool.query(
            `UPDATE absensi SET status = ?, keterangan = ?, pengaturan_sistem_id = ? WHERE id = ?`,
            [statusAbsensi, notesFormatted, settingId, existingId]
          );
        } else {
          const [insertAbs]: any = await mysqlPool.query(
            `INSERT INTO absensi (user_id, pengaturan_sistem_id, tanggal, status, keterangan)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, settingId, tgl, statusAbsensi, notesFormatted]
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
        user_id,
        jenis,
        tanggal_mulai,
        tanggal_selesai,
        alasan,
        attachment
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        primaryAbsensiId,
        userId,
        jenisRaw,
        tanggalMulai,
        tanggalSelesai,
        alasan,
        attachmentUrl,
      ]
    );

    const insertedIzinId = insertResult.insertId;

    // 4. Ambil data user untuk respons lengkap
    const [userRows]: any = await mysqlPool.query(
      "SELECT id, name, role, avatar, institution, study_program FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const u = userRows?.[0] || {};
    const nowIso = new Date().toISOString();

    const izinObject = {
      id: String(insertedIzinId),
      absensi_id: primaryAbsensiId ? String(primaryAbsensiId) : null,
      absensiId: primaryAbsensiId ? String(primaryAbsensiId) : null,
      user_id: String(userId),
      userId: String(userId),
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
      userName: u.name || "Peserta",
      user_nama: u.name || "Peserta",
      userRole: u.role || "ANAK_MAGANG",
      user_role: u.role || "ANAK_MAGANG",
      userAvatar: u.avatar || null,
      user_avatar: u.avatar || null,
      userInstitution: u.institution || "",
      user_institution: u.institution || "",
      userStudyProgram: u.study_program || "",
      user_study_program: u.study_program || "",
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
      { success: false, message: error?.message || "Gagal memproses pengajuan izin." },
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
      "SELECT id, absensi_id, user_id, jenis, tanggal_mulai, tanggal_selesai, alasan, attachment FROM izin WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data pengajuan izin tidak ditemukan." },
        { status: 404 }
      );
    }

    const currentIzin = rows[0];
    const adminNoteVal = catatanAdmin !== undefined ? catatanAdmin : catatan_admin;

    const fields: string[] = [];
    const params: any[] = [];

    if (jenis !== undefined) {
      fields.push("jenis = ?");
      params.push(jenis);
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
            baseReason = currentNotes.split("|| Catatan Admin:")[0]?.trim() || "";
          }
          const updatedNotes = adminNoteVal
            ? `${baseReason} || Catatan Admin: ${String(adminNoteVal).trim()}`
            : baseReason;

          await mysqlPool.query("UPDATE absensi SET keterangan = ? WHERE id = ?", [
            updatedNotes,
            currentIzin.absensi_id,
          ]);
        }
      } catch (absErr) {
        console.warn("Gagal memperbarui catatan admin di absensi:", absErr);
      }
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    if (fields.length > 1) {
      await mysqlPool.query(`UPDATE izin SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    return NextResponse.json({
      success: true,
      message: "Data pengajuan izin berhasil diperbarui.",
      data: {
        id: String(id),
        catatanAdmin: adminNoteVal !== undefined ? String(adminNoteVal).trim() : "",
      },
    });
  } catch (error: any) {
    console.error("API Izin PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memperbarui data izin." },
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
        { success: false, message: "ID izin wajib disertakan untuk menghapus." },
        { status: 400 }
      );
    }

    // Ambil info izin sebelum dihapus
    const [rows]: any = await mysqlPool.query(
      "SELECT id, absensi_id, user_id, tanggal_mulai, tanggal_selesai FROM izin WHERE id = ? LIMIT 1",
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
      { success: false, message: error?.message || "Gagal menghapus data pengajuan izin." },
      { status: 500 }
    );
  }
}
