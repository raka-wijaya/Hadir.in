import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

// ============================================================
// INTERFACES
// ============================================================

interface HariLibur {
  tanggal: string;   // Disimpan di DB sebagai YYYY-MM-DD
  keterangan: string;
  tipe: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_HARI_KERJA: string[] = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
];

// Format YYYY-MM-DD (untuk kolom date di MySQL)
const DEFAULT_TANGGAL_BUKA_DB  = "2026-08-01";
const DEFAULT_TANGGAL_TUTUP_DB = "2026-08-31";

// ============================================================
// DATE HELPERS
// ============================================================

/**
 * Konversi nilai dari DB (YYYY-MM-DD atau Date object)
 * menjadi format tampilan DD-MM-YYYY yang dikirim ke frontend.
 *
 * Input:  "2026-08-17" | Date
 * Output: "17-08-2026"
 */
function formatTanggalDisplay(val: unknown): string {
  if (!val) return "";

  let iso: string;

  if (val instanceof Date) {
    // Ambil tanggal lokal dari Date object
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    iso = `${y}-${m}-${d}`;
  } else {
    iso = String(val).trim().slice(0, 10);
  }

  // Sudah DD-MM-YYYY? kembalikan apa adanya
  if (/^\d{2}-\d{2}-\d{4}$/.test(iso)) {
    return iso;
  }

  // Dari YYYY-MM-DD → DD-MM-YYYY
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }

  return iso;
}

/**
 * Konversi input dari frontend (DD-MM-YYYY atau YYYY-MM-DD)
 * menjadi YYYY-MM-DD untuk disimpan di kolom date MySQL.
 *
 * Input:  "17-08-2026" | "2026-08-17"
 * Output: "2026-08-17"
 */
function toDbDate(val: unknown): string {
  if (!val) return "";

  const s = String(val).trim();

  // Sudah YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s.slice(0, 10);
  }

  // DD-MM-YYYY → YYYY-MM-DD
  const match = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return s.slice(0, 10);
}

/**
 * Validasi apakah tanggal YYYY-MM-DD valid.
 */
function isValidDbDate(tanggal: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return false;

  const [year, month, day] = tanggal.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth()    === month - 1 &&
    date.getUTCDate()     === day
  );
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function formatTime(val: unknown, defaultValue: string): string {
  if (!val) return defaultValue;
  return String(val).trim().slice(0, 5);
}

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (!value) return fallback;

  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
      return fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

// ============================================================
// GET /api/settings
// ============================================================

export async function GET() {
  try {
    let [rows]: any = await mysqlPool.query(`
      SELECT
        id,
        jam_masuk_standar,
        jam_pulang_standar,
        jam_pulang_jumat,
        batas_toleransi_menit,
        hari_kerja,
        no_wa_admin_magang,
        no_wa_admin_os,
        tanggal_buka,
        tanggal_tutup,
        aktif_manual,
        hari_libur,
        created_at,
        updated_at
      FROM pengaturan_sistem
      ORDER BY id ASC
      LIMIT 1
    `);

    let pengaturan = rows?.[0];

    // Buat default row jika tabel kosong
    if (!pengaturan) {
      await mysqlPool.query(
        `
          INSERT INTO pengaturan_sistem (
            jam_masuk_standar,
            jam_pulang_standar,
            jam_pulang_jumat,
            batas_toleransi_menit,
            hari_kerja,
            no_wa_admin_magang,
            no_wa_admin_os,
            tanggal_buka,
            tanggal_tutup,
            aktif_manual,
            hari_libur
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          "07:30:00",
          "16:00:00",
          "14:00:00",
          15,
          JSON.stringify(DEFAULT_HARI_KERJA),
          null,
          null,
          DEFAULT_TANGGAL_BUKA_DB,   // YYYY-MM-DD
          DEFAULT_TANGGAL_TUTUP_DB,  // YYYY-MM-DD
          1,
          JSON.stringify([]),
        ]
      );

      [rows] = await mysqlPool.query(`
        SELECT
          id,
          jam_masuk_standar,
          jam_pulang_standar,
          jam_pulang_jumat,
          batas_toleransi_menit,
          hari_kerja,
          no_wa_admin_magang,
          no_wa_admin_os,
          tanggal_buka,
          tanggal_tutup,
          aktif_manual,
          hari_libur,
          created_at,
          updated_at
        FROM pengaturan_sistem
        ORDER BY id ASC
        LIMIT 1
      `);

      pengaturan = rows?.[0];
    }

    const hariKerja = parseJsonArray<string>(
      pengaturan?.hari_kerja,
      DEFAULT_HARI_KERJA
    );

    // hari_libur disimpan di DB sbg JSON array dengan tanggal YYYY-MM-DD
    const hariLiburRaw = parseJsonArray<HariLibur>(
      pengaturan?.hari_libur,
      []
    );

    // Kirim ke frontend dengan format DD-MM-YYYY
    const hariLiburDisplay = hariLiburRaw.map((item: HariLibur) => ({
      tanggal:    formatTanggalDisplay(item.tanggal),
      keterangan: item.keterangan || "",
      tipe:       item.tipe || "",
    }));

    return NextResponse.json({
      success: true,
      settings: {
        id: String(pengaturan.id),

        jam_masuk_standar:    formatTime(pengaturan.jam_masuk_standar,    "07:30"),
        jam_pulang_standar:   formatTime(pengaturan.jam_pulang_standar,   "16:00"),
        jam_pulang_jumat:     formatTime(pengaturan.jam_pulang_jumat,     "14:00"),

        batas_toleransi_menit: Number(pengaturan.batas_toleransi_menit ?? 15),

        hari_kerja: hariKerja,

        no_wa_admin_magang: pengaturan.no_wa_admin_magang || "",
        no_wa_admin_os:     pengaturan.no_wa_admin_os     || "",

        // Kirim ke frontend dalam format DD-MM-YYYY
        tanggal_buka:  formatTanggalDisplay(pengaturan.tanggal_buka  || DEFAULT_TANGGAL_BUKA_DB),
        tanggal_tutup: formatTanggalDisplay(pengaturan.tanggal_tutup || DEFAULT_TANGGAL_TUTUP_DB),

        aktif_manual: Boolean(pengaturan.aktif_manual ?? true),

        hari_libur: hariLiburDisplay,
      },
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil pengaturan sistem.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/settings
// ============================================================

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --------------------------------------------------------
    // JAM KERJA
    // --------------------------------------------------------

    const jamMasukRaw     = String(body.jam_masuk_standar  || "07:30").trim().slice(0, 8);
    const jamPulangRaw    = String(body.jam_pulang_standar || "16:00").trim().slice(0, 8);
    const jamPulangJumat  = String(body.jam_pulang_jumat   || "14:00").trim().slice(0, 8);

    // Pastikan format HH:mm:ss untuk kolom time MySQL
    const toTimeDb = (t: string) => (t.length === 5 ? `${t}:00` : t);

    const jamMasukDB    = toTimeDb(jamMasukRaw);
    const jamPulangDB   = toTimeDb(jamPulangRaw);
    const jamPulangJumatDB = toTimeDb(jamPulangJumat);

    // --------------------------------------------------------
    // TOLERANSI
    // --------------------------------------------------------

    const toleransi = Number(body.batas_toleransi_menit ?? 15);

    if (!Number.isInteger(toleransi) || toleransi < 0) {
      return NextResponse.json(
        { success: false, message: "Batas toleransi harus berupa angka bulat 0 atau lebih." },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // HARI KERJA
    // --------------------------------------------------------

    const hariKerjaArray: string[] = Array.isArray(body.hari_kerja)
      ? body.hari_kerja
      : DEFAULT_HARI_KERJA;

    const hariKerjaJson = JSON.stringify(hariKerjaArray);

    // --------------------------------------------------------
    // WHATSAPP
    // --------------------------------------------------------

    const toWa = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s !== "" ? s.slice(0, 20) : null;
    };

    const noWaMagang = toWa(body.no_wa_admin_magang);
    const noWaOS     = toWa(body.no_wa_admin_os);

    // --------------------------------------------------------
    // PERIODE — konversi ke YYYY-MM-DD untuk kolom date MySQL
    // --------------------------------------------------------

    const tanggalBuka  = toDbDate(body.tanggal_buka  || DEFAULT_TANGGAL_BUKA_DB);
    const tanggalTutup = toDbDate(body.tanggal_tutup || DEFAULT_TANGGAL_TUTUP_DB);

    if (!isValidDbDate(tanggalBuka)) {
      return NextResponse.json(
        { success: false, message: "Format tanggal buka tidak valid. Gunakan DD-MM-YYYY." },
        { status: 400 }
      );
    }

    if (!isValidDbDate(tanggalTutup)) {
      return NextResponse.json(
        { success: false, message: "Format tanggal tutup tidak valid. Gunakan DD-MM-YYYY." },
        { status: 400 }
      );
    }

    if (tanggalTutup < tanggalBuka) {
      return NextResponse.json(
        { success: false, message: "Tanggal tutup pendaftaran tidak boleh lebih awal dari tanggal buka." },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // AKTIF MANUAL
    // --------------------------------------------------------

    const aktifManual = body.aktif_manual !== undefined
      ? Boolean(body.aktif_manual)
      : true;

    // --------------------------------------------------------
    // HARI LIBUR — simpan tanggal sebagai YYYY-MM-DD di DB
    // --------------------------------------------------------

    const hariLiburInput: HariLibur[] = Array.isArray(body.hari_libur)
      ? body.hari_libur
      : [];

    const hariLiburNormalized: HariLibur[] = hariLiburInput.map((item: HariLibur) => {
      const tanggalDb = toDbDate(item.tanggal);
      return {
        tanggal:    tanggalDb,
        keterangan: String(item.keterangan || "").trim(),
        tipe:       String(item.tipe || "").trim(),
      };
    });

    // Validasi setiap hari libur
    for (const libur of hariLiburNormalized) {
      if (!libur.tanggal) {
        return NextResponse.json(
          { success: false, message: "Tanggal hari libur wajib diisi." },
          { status: 400 }
        );
      }

      if (!isValidDbDate(libur.tanggal)) {
        return NextResponse.json(
          {
            success: false,
            message: `Tanggal hari libur "${formatTanggalDisplay(libur.tanggal)}" tidak valid. Gunakan DD-MM-YYYY.`,
          },
          { status: 400 }
        );
      }
    }

    // Deduplikasi berdasarkan tanggal
    const uniqueHariLibur = Array.from(
      new Map<string, HariLibur>(
        hariLiburNormalized.map((item) => [item.tanggal, item])
      ).values()
    );

    const hariLiburJson = JSON.stringify(uniqueHariLibur);

    // --------------------------------------------------------
    // UPSERT ke pengaturan_sistem
    // --------------------------------------------------------

    const [existingRows]: any = await mysqlPool.query(`
      SELECT id FROM pengaturan_sistem ORDER BY id ASC LIMIT 1
    `);

    if (existingRows && existingRows.length > 0) {
      await mysqlPool.query(
        `
          UPDATE pengaturan_sistem
          SET
            jam_masuk_standar     = ?,
            jam_pulang_standar    = ?,
            jam_pulang_jumat      = ?,
            batas_toleransi_menit = ?,
            hari_kerja            = ?,
            no_wa_admin_magang    = ?,
            no_wa_admin_os        = ?,
            tanggal_buka          = ?,
            tanggal_tutup         = ?,
            aktif_manual          = ?,
            hari_libur            = ?,
            updated_at            = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          jamMasukDB,
          jamPulangDB,
          jamPulangJumatDB,
          toleransi,
          hariKerjaJson,
          noWaMagang,
          noWaOS,
          tanggalBuka,
          tanggalTutup,
          aktifManual ? 1 : 0,
          hariLiburJson,
          existingRows[0].id,
        ]
      );
    } else {
      await mysqlPool.query(
        `
          INSERT INTO pengaturan_sistem (
            jam_masuk_standar,
            jam_pulang_standar,
            jam_pulang_jumat,
            batas_toleransi_menit,
            hari_kerja,
            no_wa_admin_magang,
            no_wa_admin_os,
            tanggal_buka,
            tanggal_tutup,
            aktif_manual,
            hari_libur
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          jamMasukDB,
          jamPulangDB,
          jamPulangJumatDB,
          toleransi,
          hariKerjaJson,
          noWaMagang,
          noWaOS,
          tanggalBuka,
          tanggalTutup,
          aktifManual ? 1 : 0,
          hariLiburJson,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pengaturan sistem berhasil disimpan.",
    });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal menyimpan pengaturan sistem.",
      },
      { status: 500 }
    );
  }
}