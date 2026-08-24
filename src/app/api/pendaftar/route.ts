import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { saveBase64File } from "@/lib/storage";

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
// AUTO-MIGRATION: Pastikan kolom portfolio_file ada di tabel pendaftaran
// ============================================================
let isTableAltered = false;
async function ensurePortfolioColumn() {
  if (isTableAltered) return;
  try {
    const [cols]: any = await mysqlPool.query(
      `SHOW COLUMNS FROM pendaftaran LIKE 'portfolio_file'`
    );
    if (!cols || cols.length === 0) {
      await mysqlPool.query(
        `ALTER TABLE pendaftaran ADD COLUMN portfolio_file VARCHAR(500) NULL AFTER file_cv`
      );
      console.log("Berhasil menambahkan kolom portfolio_file ke tabel pendaftaran");
    }
    isTableAltered = true;
  } catch (err) {
    console.warn("Auto-migration check portfolio_file:", err);
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
    user_id: row.user_id ? String(row.user_id) : null,
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

    // Relasi user (jika ada)
    user_email: row.user_email || null,
    user_name: row.user_name || null,

    // Aliases untuk kompatibilitas frontend lama
    name: row.nama || "",
    institution: row.sekolah_kampus || "",
    studyProgram: row.study_program || "",
    jurusan: row.study_program || "",
    periodStart: startDate,
    periodEnd: endDate,
    createdAt: formatDateTime(row.tanggal_daftar || row.created_at),
  };
}

// Helper query field list (Kolom Database + Join User)
const SELECT_COLUMNS = `
  p.id,
  p.pengaturan_id,
  p.kode_pendaftaran,
  p.user_id,
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
  u.email as user_email,
  u.name as user_name
`;

// Helper untuk generate kode pendaftaran unik
async function generateUniqueKode(customCode?: string): Promise<string> {
  if (customCode && customCode.trim()) {
    const clean = customCode.trim().toUpperCase();
    const [existing]: any = await mysqlPool.query(
      `SELECT id FROM pendaftaran WHERE LOWER(kode_pendaftaran) = LOWER(?) LIMIT 1`,
      [clean],
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

  // Hitung jumlah pendaftar bulan ini untuk sequential number
  const [countRows]: any = await mysqlPool.query(
    `SELECT COUNT(*) as total FROM pendaftaran WHERE kode_pendaftaran LIKE ?`,
    [`${prefix}-%`],
  );
  let nextSeq = (Number(countRows?.[0]?.total) || 0) + 1;

  let codeCandidate = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const [chk]: any = await mysqlPool.query(
      `SELECT id FROM pendaftaran WHERE kode_pendaftaran = ? LIMIT 1`,
      [codeCandidate],
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
// GET: Ambil Data Pendaftar (Kode Pendaftaran, ID, Search, List)
// ============================================================
export async function GET(req: Request) {
  try {
    await ensurePortfolioColumn();
    const { searchParams } = new URL(req.url);
    const kode = searchParams.get("kode_pendaftaran")?.trim();
    const id = searchParams.get("id")?.trim();
    const email = searchParams.get("email")?.trim();
    const noHp = searchParams.get("no_hp")?.trim();
    const statusParam = searchParams.get("status")?.trim();
    const q = searchParams.get("q")?.trim();

    // 1. Pencarian SPESIFIK berdasarkan kode_pendaftaran
    if (kode) {
      const cleanKode = kode.toLowerCase();
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN users u ON u.id = p.user_id
          WHERE LOWER(TRIM(p.kode_pendaftaran)) = ?
          LIMIT 1
        `,
        [cleanKode],
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Kode pendaftaran tidak ditemukan.",
            data: null,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Data pendaftaran ditemukan.",
        data: transformRow(rows[0]),
      });
    }

    // 2. Pencarian berdasarkan ID pendaftaran
    if (id) {
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN users u ON u.id = p.user_id
          WHERE p.id = ?
          LIMIT 1
        `,
        [id],
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Data pendaftaran tidak ditemukan.",
            data: null,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: transformRow(rows[0]),
      });
    }

    // 3. Pencarian SPESIFIK berdasarkan Email saja
    if (email && !q) {
      const cleanEmail = email.toLowerCase();
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN users u ON u.id = p.user_id
          WHERE LOWER(TRIM(p.email)) = ?
          ORDER BY p.tanggal_daftar DESC
        `,
        [cleanEmail],
      );

      const transformed = (rows || []).map(transformRow);
      return NextResponse.json({
        success: true,
        data: transformed[0] || null,
        list: transformed,
      });
    }

    // 4. Pencarian SPESIFIK berdasarkan Nomor HP saja
    if (noHp && !q) {
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN users u ON u.id = p.user_id
          WHERE TRIM(p.no_hp) = ?
          ORDER BY p.tanggal_daftar DESC
        `,
        [noHp],
      );

      const transformed = (rows || []).map(transformRow);
      return NextResponse.json({
        success: true,
        data: transformed[0] || null,
        list: transformed,
      });
    }

    // 5. Pencarian Publik / Umum (q: kode, email, no_hp, atau nama)
    if (q) {
      const cleanQ = q.toLowerCase();
      const [rows]: any = await mysqlPool.query(
        `
          SELECT ${SELECT_COLUMNS}
          FROM pendaftaran p
          LEFT JOIN users u ON u.id = p.user_id
          WHERE LOWER(TRIM(p.kode_pendaftaran)) = ?
             OR LOWER(TRIM(p.email)) = ?
             OR TRIM(p.no_hp) = ?
             OR LOWER(p.nama) LIKE ?
             OR LOWER(p.sekolah_kampus) LIKE ?
          ORDER BY p.tanggal_daftar DESC
        `,
        [cleanQ, cleanQ, q, `%${cleanQ}%`, `%${cleanQ}%`],
      );

      const transformed = (rows || []).map(transformRow);
      return NextResponse.json({
        success: true,
        data: transformed[0] || null,
        list: transformed,
      });
    }

    // 6. Ambil Semua Data / Filter berdasarkan Status (Untuk Admin)
    let querySql = `
      SELECT ${SELECT_COLUMNS}
      FROM pendaftaran p
      LEFT JOIN users u ON u.id = p.user_id
    `;
    const queryParams: any[] = [];

    if (statusParam) {
      const normStatus = normalizeStatus(statusParam);
      querySql += ` WHERE p.status = ? `;
      queryParams.push(normStatus);
    }

    querySql += ` ORDER BY p.tanggal_daftar DESC, p.id DESC `;

    const [rows]: any = await mysqlPool.query(querySql, queryParams);
    const data = (rows || []).map(transformRow);

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/pendaftar error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil data pendaftaran.",
      },
      { status: 500 },
    );
  }
}

// ============================================================
// POST: Input Pendaftaran Baru (FormData atau JSON)
// ============================================================
export async function POST(req: Request) {
  try {
    await ensurePortfolioColumn();

    // Deteksi content-type: FormData vs JSON
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};
    let cvFileRaw: File | null = null;
    let portfolioFileRaw: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      for (const [key, val] of fd.entries()) {
        if (key === "file_cv" && val instanceof File) {
          cvFileRaw = val;
        } else if (key === "portfolio_file" && val instanceof File) {
          portfolioFileRaw = val;
        } else {
          body[key] = val as string;
        }
      }
    } else {
      body = await req.json();
    }

    // 18 Kolom Database
    const pengaturanId =
      body.pengaturan_id !== undefined && body.pengaturan_id !== null
        ? Number(body.pengaturan_id)
        : null;
    const rawKode = body.kode_pendaftaran
      ? String(body.kode_pendaftaran).trim()
      : undefined;
    const userId = body.user_id ? String(body.user_id).trim() : null;
    const nama = String(body.nama || body.name || "")
      .trim()
      .slice(0, 150);
    const email = String(body.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 150);
    const noHp = String(body.no_hp || body.phone || "")
      .trim()
      .slice(0, 20);
    const sekolahKampus = String(body.sekolah_kampus || body.institution || "")
      .trim()
      .slice(0, 200);
    const studyProgram = String(
      body.study_program || body.studyProgram || body.jurusan || body.program_studi || "",
    )
      .trim()
      .slice(0, 150);
    const bagian = String(body.bagian || body.divisi || "")
      .trim()
      .slice(0, 100);
    const alamat = String(body.alamat || "").trim();
    const periodeMulai = body.periode_mulai || body.start_date || null;
    const periodeSelesai = body.periode_selesai || body.end_date || null;

    // Simpan file — gunakan File object jika dari FormData, fallback ke base64 string jika dari JSON
    const fileCv = cvFileRaw
      ? await saveBase64File(cvFileRaw, "pendaftar", "cv", nama)
      : await saveBase64File(body.file_cv ? String(body.file_cv).trim() : null, "pendaftar", "cv", nama);

    const portfolioFile = portfolioFileRaw
      ? await saveBase64File(portfolioFileRaw, "pendaftar", "portfolio", nama)
      : await saveBase64File(
          body.portfolio_file || body.portfolio
            ? String(body.portfolio_file || body.portfolio).trim()
            : null,
          "pendaftar",
          "portfolio",
          nama,
        );

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
        { status: 400 },
      );
    }
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email wajib diisi." },
        { status: 400 },
      );
    }
    if (!noHp) {
      return NextResponse.json(
        { success: false, message: "Nomor handphone/WhatsApp wajib diisi." },
        { status: 400 },
      );
    }
    if (!sekolahKampus) {
      return NextResponse.json(
        { success: false, message: "Sekolah atau Universitas wajib diisi." },
        { status: 400 },
      );
    }
    if (!studyProgram) {
      return NextResponse.json(
        { success: false, message: "Jurusan / Program Studi wajib diisi." },
        { status: 400 },
      );
    }
    if (!bagian) {
      return NextResponse.json(
        { success: false, message: "Divisi / Bagian pilihan wajib diisi." },
        { status: 400 },
      );
    }
    if (!alamat) {
      return NextResponse.json(
        { success: false, message: "Alamat domisili lengkap wajib diisi." },
        { status: 400 },
      );
    }

    // Validasi Periode jika diisi
    if (periodeMulai && periodeSelesai) {
      const start = new Date(periodeMulai);
      const end = new Date(periodeSelesai);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json(
          { success: false, message: "Format tanggal periode tidak valid." },
          { status: 400 },
        );
      }
      if (end < start) {
        return NextResponse.json(
          {
            success: false,
            message: "Periode selesai tidak boleh mendahului periode mulai.",
          },
          { status: 400 },
        );
      }
    }

    // Validasi User ID jika disediakan
    if (userId) {
      const [userChk]: any = await mysqlPool.query(
        `SELECT id FROM users WHERE id = ? LIMIT 1`,
        [userId],
      );
      if (!userChk || userChk.length === 0) {
        return NextResponse.json(
          { success: false, message: "User akun terkait tidak ditemukan." },
          { status: 404 },
        );
      }
    }

    // Generate kode pendaftaran unik
    const finalKodePendaftaran = await generateUniqueKode(rawKode);

    // Insert 18 Kolom ke database
    const [insertResult]: any = await mysqlPool.query(
      `
        INSERT INTO pendaftaran (
          pengaturan_id,
          kode_pendaftaran,
          user_id,
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
        userId,
        nama,
        email,
        noHp,
        sekolahKampus,
        studyProgram,
        bagian,
        alamat,
        periodeMulai ? formatDate(periodeMulai) : null,
        periodeSelesai ? formatDate(periodeSelesai) : null,
        fileCv,
        portfolioFile,
        status,
        catatanAdmin,
        tanggalDaftar,
      ],
    );

    // Ambil data yang baru saja disimpan
    const [newRows]: any = await mysqlPool.query(
      `
        SELECT ${SELECT_COLUMNS}
        FROM pendaftaran p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [insertResult.insertId],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pendaftaran berhasil disimpan.",
        data: transformRow(newRows[0]),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/pendaftar error:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "Kode pendaftaran atau data sudah terdaftar.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menyimpan pendaftaran.",
      },
      { status: 500 },
    );
  }
}

// ============================================================
// PATCH: Update Data Pendaftar (Status, Catatan Admin, Field Lain)
// ============================================================
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID pendaftaran wajib disertakan." },
        { status: 400 },
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(normalizeStatus(body.status));
    }

    if (body.catatan_admin !== undefined) {
      updates.push("catatan_admin = ?");
      values.push(
        body.catatan_admin ? String(body.catatan_admin).trim() : null,
      );
    }

    if (body.user_id !== undefined) {
      updates.push("user_id = ?");
      values.push(body.user_id ? String(body.user_id).trim() : null);
    }

    if (body.pengaturan_id !== undefined) {
      updates.push("pengaturan_id = ?");
      values.push(
        body.pengaturan_id !== null ? Number(body.pengaturan_id) : null,
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
        body.periode_selesai ? formatDate(body.periode_selesai) : null,
      );
    }

    if (body.file_cv !== undefined) {
      const fileCv = await saveBase64File(
        body.file_cv,
        "pendaftar",
        "cv",
        body.nama || "cv",
      );
      updates.push("file_cv = ?");
      values.push(fileCv);
    }

    if (body.portfolio_file !== undefined || body.portfolio !== undefined) {
      const filePorto = await saveBase64File(
        body.portfolio_file ?? body.portfolio,
        "pendaftar",
        "portfolio",
        body.nama || "portfolio",
      );
      updates.push("portfolio_file = ?");
      values.push(filePorto);
    }

    if (body.tanggal_daftar !== undefined) {
      updates.push("tanggal_daftar = ?");
      values.push(
        body.tanggal_daftar
          ? formatSqlDateTime(new Date(body.tanggal_daftar))
          : formatSqlDateTime(new Date()),
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada field data yang diubah." },
        { status: 400 },
      );
    }

    values.push(id);

    const [updateResult]: any = await mysqlPool.query(
      `
        UPDATE pendaftaran
        SET ${updates.join(", ")}
        WHERE id = ?
      `,
      values,
    );

    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data pendaftaran tidak ditemukan." },
        { status: 404 },
      );
    }

    // Ambil data yang telah diperbarui
    const [rows]: any = await mysqlPool.query(
      `
        SELECT ${SELECT_COLUMNS}
        FROM pendaftaran p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [id],
    );

    return NextResponse.json({
      success: true,
      message: "Data pendaftaran berhasil diperbarui.",
      data: transformRow(rows[0]),
    });
  } catch (error: any) {
    console.error("PATCH /api/pendaftar error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal memperbarui data pendaftaran.",
      },
      { status: 500 },
    );
  }
}

// ============================================================
// DELETE: Hapus Data Pendaftar
// ============================================================
export async function DELETE(req: Request) {
  try {
    let id: string | null = null;

    try {
      const body = await req.json();
      id = body?.id;
    } catch {
      // jika tidak ada body JSON
    }

    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get("id");
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID pendaftaran wajib disertakan." },
        { status: 400 },
      );
    }

    const [delResult]: any = await mysqlPool.query(
      `DELETE FROM pendaftaran WHERE id = ?`,
      [id],
    );

    if (delResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data pendaftaran tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pendaftaran berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("DELETE /api/pendaftar error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menghapus data pendaftaran.",
      },
      { status: 500 }
    );
  }
}