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

function calculateDurationMinutes(waktuMulai: string, waktuSelesai: string): number {
  if (!waktuMulai || !waktuSelesai) return 0;
  const [h1 = 0, m1 = 0, s1 = 0] = waktuMulai.split(":").map(Number);
  const [h2 = 0, m2 = 0, s2 = 0] = waktuSelesai.split(":").map(Number);
  const sec1 = h1 * 3600 + m1 * 60 + s1;
  const sec2 = h2 * 3600 + m2 * 60 + s2;
  const diff = sec2 - sec1;
  return diff > 0 ? Math.floor(diff / 60) : 0;
}

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

interface RouteParams {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * GET: Mengambil 1 data log-book berdasarkan ID parameter di URL (/api/log-book/[id])
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID log-book tidak valid." },
        { status: 400 }
      );
    }

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        id,
        tanggal,
        waktu_mulai,
        waktu_selesai,
        kategori,
        aktivitas,
        created_at
      FROM log_book
      WHERE id = ?
      LIMIT 1
      `,
      [Number(id)]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data log-book tidak ditemukan." },
        { status: 404 }
      );
    }

    const row = rows[0];
    const tanggal = formatDateYMD(row.tanggal);
    const waktuMulai = normalizeTime(row.waktu_mulai);
    const waktuSelesai = normalizeTime(row.waktu_selesai);
    const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);
    const createdAt = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();

    const data = {
      id: Number(row.id),
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

    return NextResponse.json({
      success: true,
      data,
      item: data,
    });
  } catch (error: any) {
    console.error("API Log-Book [id] GET Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data log-book" },
      { status: 500 }
    );
  }
}

/**
 * PUT / PATCH: Memperbarui data log-book berdasarkan ID parameter di URL
 */
export async function PUT(req: NextRequest, context: RouteParams) {
  return handleParamUpdate(req, context);
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return handleParamUpdate(req, context);
}

async function handleParamUpdate(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID log-book wajib disertakan." },
        { status: 400 }
      );
    }

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
    const queryParams: any[] = [];

    if (body.tanggal !== undefined) {
      updates.push("tanggal = ?");
      queryParams.push(formatDateYMD(body.tanggal));
    }

    if (body.waktu_mulai !== undefined || body.waktuMulai !== undefined || body.start_time !== undefined) {
      const wMulai = body.waktu_mulai || body.waktuMulai || body.start_time;
      updates.push("waktu_mulai = ?");
      queryParams.push(normalizeTime(wMulai));
    }

    if (body.waktu_selesai !== undefined || body.waktuSelesai !== undefined || body.end_time !== undefined) {
      const wSelesai = body.waktu_selesai || body.waktuSelesai || body.end_time;
      updates.push("waktu_selesai = ?");
      queryParams.push(normalizeTime(wSelesai));
    }

    if (body.kategori !== undefined || body.category !== undefined) {
      const kat = body.kategori || body.category;
      updates.push("kategori = ?");
      queryParams.push(normalizeKategori(String(kat)));
    }

    if (body.aktivitas !== undefined || body.activity !== undefined || body.kegiatan !== undefined || body.deskripsi !== undefined) {
      const akt = body.aktivitas || body.activity || body.kegiatan || body.deskripsi;
      updates.push("aktivitas = ?");
      queryParams.push(String(akt).trim());
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diubah." },
        { status: 400 }
      );
    }

    queryParams.push(Number(id));
    await mysqlPool.query(
      `UPDATE log_book SET ${updates.join(", ")} WHERE id = ?`,
      queryParams
    );

    const [updatedRows]: any = await mysqlPool.query(
      "SELECT * FROM log_book WHERE id = ? LIMIT 1",
      [Number(id)]
    );

    const updated = updatedRows[0];
    const tanggal = formatDateYMD(updated.tanggal);
    const waktuMulai = normalizeTime(updated.waktu_mulai);
    const waktuSelesai = normalizeTime(updated.waktu_selesai);
    const durasiMenit = calculateDurationMinutes(waktuMulai, waktuSelesai);
    const createdAt = updated.created_at ? new Date(updated.created_at).toISOString() : new Date().toISOString();

    const formattedUpdated = {
      id: Number(updated.id),
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
    console.error("API Log-Book [id] PUT/PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memperbarui data log-book" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus data log-book berdasarkan ID parameter di URL
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID log-book wajib disertakan." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM log_book WHERE id = ?",
      [Number(id)]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data log-book tidak ditemukan atau sudah dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data log-book berhasil dihapus.",
      id: Number(id),
    });
  } catch (error: any) {
    console.error("API Log-Book [id] DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal menghapus data log-book" },
      { status: 500 }
    );
  }
}
