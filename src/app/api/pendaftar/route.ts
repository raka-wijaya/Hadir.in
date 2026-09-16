import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { saveStorageFile, saveBase64File } from "@/lib/storage";
import { hashPassword } from "@/lib/auth/password";

// ============================================================
// STATUS ENUM
// Database ENUM: 'PENDING', 'DITERIMA', 'DITOLAK'
// ============================================================
export type PendaftaranStatus = "PENDING" | "DITERIMA" | "DITOLAK";

export function normalizeStatus(statusInput?: string): PendaftaranStatus {
  const s = String(statusInput || "")
    .trim()
    .toUpperCase();
  if (s === "DITERIMA" || s === "LOLOS" || s === "AKTIF" || s === "APPROVED") {
    return "DITERIMA";
  }
  if (
    s === "DITOLAK" ||
    s === "TIDAK_LOLOS" ||
    s === "TIDAK LOLOS" ||
    s === "REJECTED"
  ) {
    return "DITOLAK";
  }
  return "PENDING";
}

function formatDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(val);
}

function formatDateTime(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString();
  }
  return String(val);
}

function formatSqlDateTime(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================
// AUTO-MIGRATION / VALIDASI SKEMA TABEL PENDAFTARAN
// ============================================================
let isTableChecked = false;
async function ensurePendaftaranSchema() {
  if (isTableChecked) return;
  try {
    const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM pendaftaran`);
    const existing = new Set(cols.map((c: any) => c.Field.toLowerCase()));

    if (!existing.has("portfolio_file")) {
      await mysqlPool.query(
        `ALTER TABLE pendaftaran ADD COLUMN portfolio_file VARCHAR(500) NULL AFTER file_cv`
      );
    }
    if (!existing.has("peserta_magang_id")) {
      await mysqlPool.query(
        `ALTER TABLE pendaftaran ADD COLUMN peserta_magang_id BIGINT(20) UNSIGNED NULL AFTER kode_pendaftaran`
      );
    } else {
      try {
        await mysqlPool.query(
          `ALTER TABLE pendaftaran MODIFY COLUMN peserta_magang_id BIGINT(20) UNSIGNED NULL DEFAULT NULL`
        );
      } catch {
        // Abaikan jika sudah sesuai
      }
    }
    isTableChecked = true;
  } catch (err) {
    console.warn("Auto-migration check pendaftaran schema:", err);
  }
}

function transformRow(row: any) {
  if (!row) return null;
  const startDate = formatDate(row.periode_mulai);
  const endDate = formatDate(row.periode_selesai);

  return {
    id: String(row.id),
    pengaturan_id:
      row.pengaturan_id !== null && row.pengaturan_id !== undefined
        ? Number(row.pengaturan_id)
        : null,
    kode_pendaftaran: row.kode_pendaftaran || "",
    peserta_magang_id: row.peserta_magang_id ? String(row.peserta_magang_id) : null,
    pesertaMagangId: row.peserta_magang_id ? String(row.peserta_magang_id) : null,
    nama: row.nama || "",
    email: row.email || "",
    no_hp: row.no_hp || "",
    sekolah_kampus: row.sekolah_kampus || "",
    study_program: row.study_program || "",
    bagian: row.bagian || "",
    alamat: row.alamat || "",
    periode_mulai: startDate,
    periode_selesai: endDate,
    file_cv: row.file_cv || null,
    portfolio_file: row.portfolio_file || null,
    status: (row.status || "PENDING") as PendaftaranStatus,
    catatan_admin: row.catatan_admin || null,
    tanggal_daftar: formatDateTime(row.tanggal_daftar),
    created_at: formatDateTime(row.created_at),
    updated_at: formatDateTime(row.updated_at),

    // Relasi peserta_magang jika ada
    peserta_email: row.peserta_email || null,
    peserta_name: row.peserta_name || null,

    // Aliases untuk kompatibilitas frontend
    name: row.nama || "",
    institution: row.sekolah_kampus || "",
    studyProgram: row.study_program || "",
    jurusan: row.study_program || "",
    periodStart: startDate,
    periodEnd: endDate,
    createdAt: formatDateTime(row.tanggal_daftar || row.created_at),
  };
}

// Kolom tabel pendaftaran sesuai skema:
// id, pengaturan_id, kode_pendaftaran, peserta_magang_id, nama, email, no_hp,
// sekolah_kampus, study_program, bagian, alamat, periode_mulai, periode_selesai,
// file_cv, portfolio_file, status, catatan_admin, tanggal_daftar, created_at, updated_at
const SELECT_COLUMNS = `
  p.id,
  p.pengaturan_id,
  p.kode_pendaftaran,
  p.peserta_magang_id,
  p.nama,
  p.email,
  p.no_hp,
  p.sekolah_kampus,
  p.study_program,
  p.bagian,
  p.alamat,
  p.periode_mulai,
  p.periode_selesai,
  p.file_cv,
  p.portfolio_file,
  p.status,
  p.catatan_admin,
  p.tanggal_daftar,
  p.created_at,
  p.updated_at,
  pm.email as peserta_email,
  pm.name as peserta_name
`;

// Helper untuk generate kode pendaftaran unik
async function generateUniqueKode(customCode?: string): Promise<string> {
  if (customCode && customCode.trim()) {
    const clean = customCode.trim().toUpperCase();
    const [existing]: any = await mysqlPool.query(
      `SELECT id FROM pendaftaran WHERE LOWER(kode_pendaftaran) = LOWER(?) LIMIT 1`,
      [clean]
    );
    if (existing && existing.length > 0) {
      throw new Error("Kode pendaftaran tersebut sudah terdaftar di sistem.");
    }
    return clean;
  }

  const now = new Date();
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");
  const yearStr = now.getFullYear().toString().slice(-2);
  const prefix = `REG-${monthStr}${yearStr}`;

  const [countRows]: any = await mysqlPool.query(
    `SELECT COUNT(*) as total FROM pendaftaran WHERE kode_pendaftaran LIKE ?`,
    [`${prefix}-%`]
  );
  let nextSeq = (Number(countRows?.[0]?.total) || 0) + 1;

  let codeCandidate = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const [chk]: any = await mysqlPool.query(
      `SELECT id FROM pendaftaran WHERE kode_pendaftaran = ? LIMIT 1`,
      [codeCandidate]
    );
    if (!chk || chk.length === 0) {
      isUnique = true;
    } else {
      attempts++;
      nextSeq++;
      const randomPart = Math.floor(100 + Math.random() * 900);
      codeCandidate = `${prefix}-${randomPart}`;
    }
  }

  return codeCandidate;
}

// ============================================================
// GET: Mengambil Data Pendaftar (Filter, Search, Pagination, Detail)
// ============================================================
export async function GET(req: Request) {
  try {
    await ensurePendaftaranSchema();
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const kodePendaftaran =
      searchParams.get("kode_pendaftaran") ||
      searchParams.get("kodePendaftaran") ||
      searchParams.get("kode");
    const email = searchParams.get("email");
    const status = searchParams.get("status");
    const bagian = searchParams.get("bagian");
    const q = searchParams.get("q") || searchParams.get("search");
    const pesertaMagangId = searchParams.get("peserta_magang_id") || searchParams.get("pesertaMagangId");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const offset = (page - 1) * limit;

    // 1. Detail berdasarkan ID
    if (id) {
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
          WHERE p.id = ?
          LIMIT 1
        `,
        [id]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Data pendaftar tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transformRow(rows[0]),
      });
    }

    // 2. Detail berdasarkan Kode Pendaftaran
    if (kodePendaftaran) {
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
          WHERE LOWER(p.kode_pendaftaran) = LOWER(?)
          LIMIT 1
        `,
        [kodePendaftaran.trim()]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Kode pendaftaran tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transformRow(rows[0]),
      });
    }

    // 3. Detail / Filter berdasarkan Email
    if (email) {
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
          WHERE LOWER(p.email) = LOWER(?)
          ORDER BY p.tanggal_daftar DESC, p.created_at DESC
        `,
        [email.trim()]
      );

      return NextResponse.json({
        success: true,
        data: rows.map(transformRow),
        total: rows.length,
      });
    }

    // 4. Detail / Filter berdasarkan Peserta Magang ID
    if (pesertaMagangId) {
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
          WHERE p.peserta_magang_id = ?
          LIMIT 1
        `,
        [pesertaMagangId]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Data pendaftaran untuk peserta ini tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transformRow(rows[0]),
      });
    }

    // 5. Query List dengan Filter, Search, Pagination
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== "ALL" && status !== "SEMUA") {
      conditions.push("p.status = ?");
      params.push(normalizeStatus(status));
    }

    if (bagian && bagian !== "ALL" && bagian !== "SEMUA") {
      conditions.push("p.bagian = ?");
      params.push(bagian.trim());
    }

    if (q && q.trim()) {
      const searchPattern = `%${q.trim()}%`;
      conditions.push(
        `(p.nama LIKE ? OR p.email LIKE ? OR p.kode_pendaftaran LIKE ? OR p.sekolah_kampus LIKE ? OR p.study_program LIKE ? OR p.bagian LIKE ?)`
      );
      params.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Hitung total data
    const [countResult]: any = await mysqlPool.query(
      `SELECT COUNT(*) as total FROM pendaftaran p ${whereClause}`,
      params
    );
    const total = Number(countResult?.[0]?.total || 0);

    // Ambil data halaman aktif
    const [rows]: any = await mysqlPool.query(
      `
        SELECT ${SELECT_COLUMNS}
        FROM pendaftaran p
        LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
        ${whereClause}
        ORDER BY p.tanggal_daftar DESC, p.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: rows.map(transformRow),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/pendaftar error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil data pendaftar.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST: Pendaftaran Baru (Form Publik / Admin)
// ============================================================
export async function POST(req: Request) {
  try {
    await ensurePendaftaranSchema();
    
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawObj: any = {};
      for (const [key, value] of formData.entries()) {
        rawObj[key] = value;
      }
      body = rawObj;
    } else {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const nama = String(body.nama || body.name || "").trim().slice(0, 150);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 150);
    const noHp = String(body.no_hp || body.phone || body.noHp || "").trim().slice(0, 20);
    const sekolahKampus = String(
      body.sekolah_kampus ||
        body.sekolahKampus ||
        body.institution ||
        body.universitas ||
        ""
    ).trim().slice(0, 200);
    const studyProgram = String(
      body.study_program ||
        body.studyProgram ||
        body.jurusan ||
        body.program_studi ||
        body.programStudi ||
        ""
    ).trim().slice(0, 150);
    const bagian = String(body.bagian || body.divisi || "").trim().slice(0, 100);
    const alamat = String(body.alamat || body.address || "").trim();

    const periodeMulai = body.periode_mulai || body.periodeMulai || body.periodStart || null;
    const periodeSelesai = body.periode_selesai || body.periodeSelesai || body.periodEnd || null;

    const pengaturanId =
      body.pengaturan_id !== undefined && body.pengaturan_id !== null
        ? Number(body.pengaturan_id)
        : 1;

    const pesertaMagangId =
      body.peserta_magang_id !== undefined && body.peserta_magang_id !== null
        ? String(body.peserta_magang_id).trim()
        : null;

    const rawKode = body.kode_pendaftaran || body.kodePendaftaran || null;

    // Handle upload file CV (File object or base64 or url string)
    let fileCv: string | null = null;
    const rawCv = body.file_cv || body.cv;
    if (rawCv) {
      if (typeof rawCv === "string" && rawCv.startsWith("/uploads")) {
        fileCv = rawCv.slice(0, 500);
      } else {
        fileCv = await saveStorageFile(rawCv, "pendaftar", "cv", nama);
      }
    }

    // Handle upload file Portfolio (File object or base64 or url string)
    let portfolioFile: string | null = null;
    const rawPortfolio = body.portfolio_file || body.portfolio;
    if (rawPortfolio) {
      if (typeof rawPortfolio === "string" && rawPortfolio.startsWith("/uploads")) {
        portfolioFile = rawPortfolio.slice(0, 500);
      } else {
        portfolioFile = await saveStorageFile(rawPortfolio, "pendaftar", "portfolio", nama);
      }
    }

    const status = normalizeStatus(body.status);
    const catatanAdmin = body.catatan_admin
      ? String(body.catatan_admin).trim()
      : null;
    const tanggalDaftar = body.tanggal_daftar
      ? formatSqlDateTime(new Date(body.tanggal_daftar))
      : formatSqlDateTime(new Date());

    // Validasi Field Wajib
    if (!nama) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap wajib diisi." },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email wajib diisi." },
        { status: 400 }
      );
    }
    if (!noHp) {
      return NextResponse.json(
        { success: false, message: "Nomor handphone/WhatsApp wajib diisi." },
        { status: 400 }
      );
    }
    if (!sekolahKampus) {
      return NextResponse.json(
        { success: false, message: "Sekolah atau Universitas wajib diisi." },
        { status: 400 }
      );
    }
    if (!studyProgram) {
      return NextResponse.json(
        { success: false, message: "Jurusan / Program Studi wajib diisi." },
        { status: 400 }
      );
    }
    if (!bagian) {
      return NextResponse.json(
        { success: false, message: "Divisi / Bagian pilihan wajib diisi." },
        { status: 400 }
      );
    }
    if (!alamat) {
      return NextResponse.json(
        { success: false, message: "Alamat domisili lengkap wajib diisi." },
        { status: 400 }
      );
    }

    // Validasi Periode jika diisi
    if (periodeMulai && periodeSelesai) {
      const start = new Date(periodeMulai);
      const end = new Date(periodeSelesai);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json(
          { success: false, message: "Format tanggal periode tidak valid." },
          { status: 400 }
        );
      }
      if (end < start) {
        return NextResponse.json(
          {
            success: false,
            message: "Periode selesai tidak boleh mendahului periode mulai.",
          },
          { status: 400 }
        );
      }
    }

    // Validasi Peserta Magang ID jika disediakan
    if (pesertaMagangId) {
      const [pmChk]: any = await mysqlPool.query(
        `SELECT id FROM peserta_magang WHERE id = ? LIMIT 1`,
        [pesertaMagangId]
      );
      if (!pmChk || pmChk.length === 0) {
        return NextResponse.json(
          { success: false, message: "Peserta magang terkait tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    // Generate kode pendaftaran unik
    const finalKodePendaftaran = await generateUniqueKode(rawKode);

    // Insert 18 Kolom ke database sesuai tabel pendaftaran
    let insertResult: any;
    try {
      const [res]: any = await mysqlPool.query(
        `
          INSERT INTO pendaftaran (
            pengaturan_id,
            kode_pendaftaran,
            peserta_magang_id,
            nama,
            email,
            no_hp,
            sekolah_kampus,
            study_program,
            bagian,
            alamat,
            periode_mulai,
            periode_selesai,
            file_cv,
            portfolio_file,
            status,
            catatan_admin,
            tanggal_daftar
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          pengaturanId,
          finalKodePendaftaran,
          pesertaMagangId || null,
          nama,
          email,
          noHp,
          sekolahKampus,
          studyProgram,
          bagian,
          alamat,
          periodeMulai ? formatDate(periodeMulai) : null,
          periodeSelesai ? formatDate(periodeSelesai) : null,
          fileCv ? fileCv.slice(0, 500) : null,
          portfolioFile ? portfolioFile.slice(0, 500) : null,
          status,
          catatanAdmin,
          tanggalDaftar,
        ]
      );
      insertResult = res;
    } catch (insertErr: any) {
      if (
        insertErr?.code === "ER_BAD_NULL_ERROR" ||
        insertErr?.message?.includes("peserta_magang_id")
      ) {
        try {
          await mysqlPool.query(
            `ALTER TABLE pendaftaran MODIFY COLUMN peserta_magang_id BIGINT(20) UNSIGNED NULL DEFAULT NULL`
          );
          const [res2]: any = await mysqlPool.query(
            `
              INSERT INTO pendaftaran (
                pengaturan_id,
                kode_pendaftaran,
                peserta_magang_id,
                nama,
                email,
                no_hp,
                sekolah_kampus,
                study_program,
                bagian,
                alamat,
                periode_mulai,
                periode_selesai,
                file_cv,
                portfolio_file,
                status,
                catatan_admin,
                tanggal_daftar
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              pengaturanId,
              finalKodePendaftaran,
              null,
              nama,
              email,
              noHp,
              sekolahKampus,
              studyProgram,
              bagian,
              alamat,
              periodeMulai ? formatDate(periodeMulai) : null,
              periodeSelesai ? formatDate(periodeSelesai) : null,
              fileCv ? fileCv.slice(0, 500) : null,
              portfolioFile ? portfolioFile.slice(0, 500) : null,
              status,
              catatanAdmin,
              tanggalDaftar,
            ]
          );
          insertResult = res2;
        } catch {
          throw insertErr;
        }
      } else {
        throw insertErr;
      }
    }

    // Ambil data yang baru saja disimpan
    const [newRows]: any = await mysqlPool.query(
      `
        SELECT ${SELECT_COLUMNS}
        FROM pendaftaran p
        LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [insertResult.insertId]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pendaftaran berhasil disimpan.",
        data: transformRow(newRows[0]),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/pendaftar error:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "Kode pendaftaran atau data sudah terdaftar.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menyimpan pendaftaran.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH: Update Data Pendaftar (Status, Catatan Admin, Field Lain)
// ============================================================
export async function PATCH(req: Request) {
  try {
    await ensurePendaftaranSchema();
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID pendaftaran wajib disertakan." },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    const targetStatus = body.status !== undefined ? normalizeStatus(body.status) : null;
    let autoCreatedPmId: any = null;

    // Jika admin mengubah status menjadi DITERIMA, otomatis buat record peserta_magang
    if (targetStatus === "DITERIMA") {
      try {
        const [currRows]: any = await mysqlPool.query(
          `SELECT id, nama, email, no_hp, sekolah_kampus, study_program, periode_mulai, periode_selesai, peserta_magang_id FROM pendaftaran WHERE id = ? LIMIT 1`,
          [id]
        );
        if (currRows && currRows.length > 0) {
          const p = currRows[0];
          let pmId = p.peserta_magang_id;

          // Cek apakah sudah ada peserta_magang dengan email ini
          if (!pmId && p.email) {
            const [exPm]: any = await mysqlPool.query(
              `SELECT id FROM peserta_magang WHERE LOWER(email) = LOWER(?) LIMIT 1`,
              [p.email.trim()]
            );
            if (exPm && exPm.length > 0) {
              pmId = exPm[0].id;
            }
          }

          // Jika belum ada, otomatis INSERT ke tabel peserta_magang
          if (!pmId) {
            const defaultPassword = await hashPassword("magang123");
            const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=72e3ad&color=1e2723&bold=true`;
            const cleanDivisi = p.bagian ? String(p.bagian).trim().slice(0, 150) : null;
            
            const [insertPmRes]: any = await mysqlPool.query(
              `INSERT INTO peserta_magang (name, email, password, status, phone, identity_number, institution, study_program, divisi, avatar, start_date, end_date)
               VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                p.nama,
                p.email ? p.email.toLowerCase().trim() : "",
                defaultPassword,
                p.no_hp || null,
                null,
                p.sekolah_kampus || null,
                p.study_program || null,
                cleanDivisi,
                avatar,
                p.periode_mulai ? formatDate(p.periode_mulai) : null,
                p.periode_selesai ? formatDate(p.periode_selesai) : null,
              ]
            );
            pmId = insertPmRes.insertId;
          }

          if (pmId) {
            autoCreatedPmId = pmId;
          }
        }
      } catch (pmErr) {
        console.error("Gagal sinkronisasi peserta_magang saat status DITERIMA:", pmErr);
      }
    }

    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(targetStatus);
    }

    if (body.catatan_admin !== undefined) {
      updates.push("catatan_admin = ?");
      values.push(
        body.catatan_admin ? String(body.catatan_admin).trim() : null
      );
    }

    if (autoCreatedPmId) {
      updates.push("peserta_magang_id = ?");
      values.push(autoCreatedPmId);
    } else if (body.peserta_magang_id !== undefined || body.pesertaMagangId !== undefined) {
      const pmId = body.peserta_magang_id || body.pesertaMagangId;
      updates.push("peserta_magang_id = ?");
      values.push(pmId ? String(pmId).trim() : null);
    }

    if (body.pengaturan_id !== undefined) {
      updates.push("pengaturan_id = ?");
      values.push(
        body.pengaturan_id !== null ? Number(body.pengaturan_id) : null
      );
    }

    if (body.nama !== undefined) {
      updates.push("nama = ?");
      values.push(String(body.nama).trim().slice(0, 150));
    }

    if (body.email !== undefined) {
      updates.push("email = ?");
      values.push(String(body.email).trim().toLowerCase().slice(0, 150));
    }

    if (body.no_hp !== undefined) {
      updates.push("no_hp = ?");
      values.push(String(body.no_hp).trim().slice(0, 20));
    }

    if (body.sekolah_kampus !== undefined) {
      updates.push("sekolah_kampus = ?");
      values.push(String(body.sekolah_kampus).trim().slice(0, 200));
    }

    if (
      body.study_program !== undefined ||
      body.studyProgram !== undefined ||
      body.jurusan !== undefined ||
      body.program_studi !== undefined
    ) {
      const val =
        body.study_program ??
        body.studyProgram ??
        body.jurusan ??
        body.program_studi;
      updates.push("study_program = ?");
      values.push(String(val).trim().slice(0, 150));
    }

    if (body.bagian !== undefined) {
      updates.push("bagian = ?");
      values.push(String(body.bagian).trim().slice(0, 100));
    }

    if (body.alamat !== undefined) {
      updates.push("alamat = ?");
      values.push(String(body.alamat).trim());
    }

    if (body.periode_mulai !== undefined) {
      updates.push("periode_mulai = ?");
      values.push(body.periode_mulai ? formatDate(body.periode_mulai) : null);
    }

    if (body.periode_selesai !== undefined) {
      updates.push("periode_selesai = ?");
      values.push(
        body.periode_selesai ? formatDate(body.periode_selesai) : null
      );
    }

    if (body.file_cv !== undefined) {
      const fileCv = body.file_cv?.startsWith?.("/uploads")
        ? body.file_cv.slice(0, 500)
        : await saveBase64File(
            body.file_cv,
            "pendaftar",
            "cv",
            body.nama || "cv"
          );
      updates.push("file_cv = ?");
      values.push(fileCv ? fileCv.slice(0, 500) : null);
    }

    if (body.portfolio_file !== undefined || body.portfolio !== undefined) {
      const pRaw = body.portfolio_file ?? body.portfolio;
      const filePorto = pRaw?.startsWith?.("/uploads")
        ? pRaw.slice(0, 500)
        : await saveBase64File(
            pRaw,
            "pendaftar",
            "portfolio",
            body.nama || "portfolio"
          );
      updates.push("portfolio_file = ?");
      values.push(filePorto ? filePorto.slice(0, 500) : null);
    }

    if (body.tanggal_daftar !== undefined) {
      updates.push("tanggal_daftar = ?");
      values.push(
        body.tanggal_daftar
          ? formatSqlDateTime(new Date(body.tanggal_daftar))
          : formatSqlDateTime(new Date())
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada field data yang diubah." },
        { status: 400 }
      );
    }

    values.push(id);

    const [updateResult]: any = await mysqlPool.query(
      `
        UPDATE pendaftaran
        SET ${updates.join(", ")}
        WHERE id = ?
      `,
      values
    );

    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pendaftar tidak ditemukan atau tidak ada perubahan.",
        },
        { status: 404 }
      );
    }

    const [updatedRows]: any = await mysqlPool.query(
      `
        SELECT ${SELECT_COLUMNS}
        FROM pendaftaran p
        LEFT JOIN peserta_magang pm ON pm.id = p.peserta_magang_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: "Data pendaftar berhasil diperbarui.",
      data: transformRow(updatedRows[0]),
    });
  } catch (error: any) {
    console.error("PATCH /api/pendaftar error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal memperbarui data pendaftar.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: Hapus Data Pendaftar
// ============================================================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID pendaftar wajib disertakan." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      `DELETE FROM pendaftaran WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pendaftar tidak ditemukan atau sudah dihapus.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pendaftar berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("DELETE /api/pendaftar error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menghapus data pendaftar.",
      },
      { status: 500 }
    );
  }
}