import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { saveStorageFile } from "@/lib/storage";

const TIMEZONE = "Asia/Jakarta";
const DEFAULT_JAM_MASUK = "07:30:00";
const DEFAULT_JAM_PULANG = "16:00:00";
const DEFAULT_JAM_PULANG_JUMAT = "14:00:00";

function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
  }).format(new Date());
}

function getCurrentTimeJakarta(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

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

function timeToSeconds(time: string): number {
  if (!time) return 0;
  const [hour = 0, minute = 0, second = 0] = time.split(":").map(Number);
  return hour * 3600 + minute * 60 + second;
}

function getLateMinutes(
  actualTime: string,
  targetTime: string,
  toleransiMenit: number = 1
): number {
  const actual = timeToSeconds(actualTime);
  const target = timeToSeconds(targetTime);
  const targetWithTolerance = target + toleransiMenit * 60;
  if (actual <= targetWithTolerance) return 0;
  return Math.floor((actual - target) / 60);
}

function getStatusMasuk(
  jamMasuk: string,
  jamMasukSetting: string,
  toleransiMenit: number = 1
): "TEPAT_WAKTU" | "TERLAMBAT" {
  const actual = timeToSeconds(jamMasuk);
  const target = timeToSeconds(jamMasukSetting);
  const targetWithTolerance = target + toleransiMenit * 60;
  if (actual <= targetWithTolerance) {
    return "TEPAT_WAKTU";
  }
  return "TERLAMBAT";
}

function getStatusPulang(
  jamKeluar: string,
  jamPulangSetting: string
): "TEPAT_WAKTU" | "PULANG_CEPAT" {
  const actual = timeToSeconds(jamKeluar);
  const target = timeToSeconds(jamPulangSetting);
  if (actual >= target) {
    return "TEPAT_WAKTU";
  }
  return "PULANG_CEPAT";
}

async function getActiveSetting() {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT
        id,
        jam_masuk_standar,
        jam_pulang_standar,
        jam_pulang_jumat,
        batas_toleransi_menit
      FROM pengaturan_sistem
      ORDER BY id ASC
      LIMIT 1
    `);
    if (rows && rows.length > 0) {
      return {
        id: Number(rows[0].id || 1),
        jam_masuk_standar: normalizeTime(rows[0].jam_masuk_standar) || DEFAULT_JAM_MASUK,
        jam_pulang_standar: normalizeTime(rows[0].jam_pulang_standar) || DEFAULT_JAM_PULANG,
        jam_pulang_jumat: normalizeTime(rows[0].jam_pulang_jumat) || DEFAULT_JAM_PULANG_JUMAT,
        batas_toleransi_menit: Number(rows[0].batas_toleransi_menit ?? 15),
      };
    }
  } catch (err) {
    console.warn("Gagal mengambil pengaturan_sistem:", err);
  }
  return {
    id: 1,
    jam_masuk_standar: DEFAULT_JAM_MASUK,
    jam_pulang_standar: DEFAULT_JAM_PULANG,
    jam_pulang_jumat: DEFAULT_JAM_PULANG_JUMAT,
    batas_toleransi_menit: 15,
  };
}

/**
 * GET: Mengambil data absensi
 * Kolom tabel absensi:
 *   id (bigint), user_id (bigint), pengaturan_sistem_id (int),
 *   tanggal (date), jam_masuk (time), jam_keluar (time),
 *   status enum(HADIR|IZIN|SAKIT|ALPA),
 *   status_masuk enum(TEPAT_WAKTU|TERLAMBAT),
 *   status_pulang enum(TEPAT_WAKTU|PULANG_CEPAT),
 *   foto_masuk varchar(500), foto_keluar varchar(500),
 *   foto_pulang_cepat varchar(500), keterangan text,
 *   created_at timestamp, updated_at timestamp
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("user_id");
    const role = searchParams.get("role");
    const startDate = searchParams.get("startDate") || searchParams.get("start_date");
    const endDate = searchParams.get("endDate") || searchParams.get("end_date");
    const tanggalParam = searchParams.get("tanggal") || searchParams.get("date");
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const idParam = searchParams.get("id");
    const searchParam = searchParams.get("q") || searchParams.get("search");

    const conditions: string[] = [];
    const params: any[] = [];

    if (idParam) {
      conditions.push("a.id = ?");
      params.push(idParam);
    }
    if (userId) {
      conditions.push("a.user_id = ?");
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
    if (tanggalParam) {
      conditions.push("a.tanggal = ?");
      params.push(tanggalParam);
    }
    if (startDate) {
      conditions.push("a.tanggal >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.tanggal <= ?");
      params.push(endDate);
    }

    if (typeParam === "izin") {
      conditions.push("a.status IN ('IZIN', 'SAKIT')");
    } else if (statusParam && statusParam !== "ALL") {
      const s = statusParam.toUpperCase().trim();
      if (s === "TERLAMBAT" || s === "LATE") {
        conditions.push("(a.status_masuk = 'TERLAMBAT' OR a.status = 'TERLAMBAT')");
      } else if (s === "TEPAT_WAKTU" || s === "HADIR_TEPAT_WAKTU") {
        conditions.push("(a.status = 'HADIR' AND (a.status_masuk = 'TEPAT_WAKTU' OR a.status_masuk IS NULL))");
      } else if (s === "HADIR" || s === "PRESENT") {
        conditions.push("a.status = 'HADIR'");
      } else if (s === "PULANG_CEPAT") {
        conditions.push("a.status_pulang = 'PULANG_CEPAT'");
      } else if (s === "IZIN" || s === "PERMITTED") {
        conditions.push("a.status = 'IZIN'");
      } else if (s === "SAKIT" || s === "SICK") {
        conditions.push("a.status = 'SAKIT'");
      } else if (s === "ALPA" || s === "ABSENT") {
        conditions.push("a.status = 'ALPA'");
      } else {
        conditions.push("a.status = ?");
        params.push(s);
      }
    }

    if (searchParam && searchParam.trim()) {
      const q = `%${searchParam.trim()}%`;
      conditions.push(`(
        u.name LIKE ? OR 
        u.email LIKE ? OR 
        u.identity_number LIKE ? OR 
        u.institution LIKE ? OR 
        u.study_program LIKE ? OR 
        a.keterangan LIKE ?
      )`);
      params.push(q, q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        a.id,
        a.user_id,
        a.pengaturan_sistem_id,
        a.tanggal,
        a.jam_masuk,
        a.jam_keluar,
        a.status,
        a.status_masuk,
        a.status_pulang,
        a.foto_masuk,
        a.foto_keluar,
        a.foto_pulang_cepat,
        a.keterangan,
        a.created_at,
        a.updated_at,
        u.name AS user_name,
        u.name AS user_nama,
        u.role AS user_role,
        u.avatar AS user_avatar,
        u.institution AS user_institution,
        u.institution AS user_sekolah,
        u.study_program AS user_study_program,
        u.study_program AS user_jurusan,
        u.identity_number AS user_identity_number,
        u.identity_number AS user_nip
      FROM absensi a
      LEFT JOIN users u ON u.id = a.user_id
      ${whereClause}
      ORDER BY a.tanggal DESC, a.created_at DESC
      `,
      params
    );

    const setting = await getActiveSetting();

    const formattedData = (rows as any[]).map((row) => {
      const tanggal = formatDateYMD(row.tanggal);
      const jamMasuk = normalizeTime(row.jam_masuk);
      const jamKeluar = normalizeTime(row.jam_keluar);
      const fotoMasuk = row.foto_masuk || null;
      const fotoKeluar = row.foto_keluar || null;
      const fotoPulangCepat = row.foto_pulang_cepat || null;

      const statusMasuk =
        row.status_masuk ||
        (jamMasuk ? getStatusMasuk(jamMasuk, setting.jam_masuk_standar, setting.batas_toleransi_menit) : null);
      const statusPulang =
        row.status_pulang ||
        (jamKeluar ? getStatusPulang(jamKeluar, setting.jam_pulang_standar) : null);

      const lateMinutes =
        jamMasuk && statusMasuk === "TERLAMBAT"
          ? getLateMinutes(jamMasuk, setting.jam_masuk_standar, setting.batas_toleransi_menit)
          : 0;

      const rawKeterangan = row.keterangan || "";
      let jenisIzin = row.status === "SAKIT" ? "Sakit" : "Izin";
      let alasan = rawKeterangan;
      let catatanAdmin = "";

      if (rawKeterangan.includes("|| Catatan Admin:")) {
        const parts = rawKeterangan.split("|| Catatan Admin:");
        alasan = parts[0]?.trim() || "";
        catatanAdmin = parts[1]?.trim() || "";
      }
      if (alasan.startsWith("[") && alasan.includes("]")) {
        const match = alasan.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          jenisIzin = match[1];
          alasan = match[2];
        }
      }

      const userName = row.user_name || row.user_nama || "Peserta";
      const userRole = row.user_role || "ANAK_MAGANG";
      const userAvatar = row.user_avatar || null;
      const userInstitution = row.user_institution || row.user_sekolah || "";
      const userIdentityNumber = row.user_identity_number || row.user_nip || "";
      const userStudyProgram = row.user_study_program || row.user_jurusan || "";
      const createdTime = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
      const updatedTime = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();

      return {
        id: String(row.id),
        user_id: String(row.user_id),
        userId: String(row.user_id),
        pengaturan_sistem_id: row.pengaturan_sistem_id,
        tanggal,
        attendanceDate: tanggal,
        jam_masuk: jamMasuk,
        checkIn: jamMasuk,
        jam_keluar: jamKeluar,
        checkOut: jamKeluar,
        foto_masuk: fotoMasuk,
        checkInPhoto: fotoMasuk,
        foto_keluar: fotoKeluar,
        checkOutPhoto: fotoKeluar,
        foto_pulang_cepat: fotoPulangCepat,
        status_masuk: statusMasuk,
        statusMasuk,
        status_pulang: statusPulang,
        statusPulang,
        status: row.status,
        menit_terlambat: lateMinutes,
        lateMinutes,
        keterangan: alasan,
        keteranganIzin: alasan,
        alasan,
        catatanAdmin,
        jenis: jenisIzin,
        user_nama: userName,
        userName,
        user_role: userRole,
        userRole,
        user_avatar: userAvatar,
        userAvatar,
        user_sekolah: userInstitution,
        userInstitution,
        user_identity_number: userIdentityNumber,
        userIdentityNumber,
        user_study_program: userStudyProgram,
        userStudyProgram,
        createdAt: createdTime,
        updatedAt: updatedTime,
        created_at: createdTime,
        updated_at: updatedTime,
      };
    });

    const formattedIzin = formattedData
      .filter((item) => item.status === "IZIN" || item.status === "SAKIT")
      .map((item) => ({
        id: item.id,
        userId: item.userId,
        absensiId: item.id,
        userName: item.userName,
        userRole: item.userRole,
        userAvatar: item.userAvatar,
        userInstitution: item.userInstitution,
        jenis: item.jenis,
        tanggalMulai: item.tanggal,
        tanggalSelesai: item.tanggal,
        alasan: item.alasan || item.keterangan || "",
        catatanAdmin: item.catatanAdmin || "",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      izin: formattedIzin,
      leaves: formattedIzin,
      total: formattedData.length,
    });
  } catch (error: any) {
    console.error("API Absensi GET Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data absensi" },
      { status: 500 }
    );
  }
}

/**
 * POST: Presensi Masuk, Pulang, atau Pengajuan Izin / Sakit
 *
 * Sesuai skema tabel absensi:
 *   id bigint(20) UNSIGNED auto_increment
 *   user_id bigint(20) UNSIGNED
 *   pengaturan_sistem_id int(10) UNSIGNED
 *   tanggal date
 *   jam_masuk time (nullable)
 *   jam_keluar time (nullable)
 *   status enum('HADIR','IZIN','SAKIT','ALPA') default HADIR
 *   status_masuk enum('TEPAT_WAKTU','TERLAMBAT') nullable
 *   status_pulang enum('TEPAT_WAKTU','PULANG_CEPAT') nullable
 *   foto_masuk varchar(500) nullable
 *   foto_keluar varchar(500) nullable
 *   foto_pulang_cepat varchar(500) nullable
 *   keterangan text nullable
 *   created_at timestamp
 *   updated_at timestamp
 *
 * CATATAN: Tidak ada kolom "attachment" di tabel ini.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};
    let fotoFile: { key: string; file: any } | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawBody: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        if (
          key === "foto_masuk" ||
          key === "foto_keluar" ||
          key === "foto_pulang_cepat" ||
          key === "photo" ||
          key === "foto"
        ) {
          fotoFile = { key, file: value };
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

    const setting = await getActiveSetting();
    const today = getTodayJakarta();
    const currentTime = getCurrentTimeJakarta();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PENGAJUAN IZIN / SAKIT
    //    Kolom: status (IZIN|SAKIT), keterangan (text)
    //    Tidak ada kolom attachment di tabel absensi
    // ─────────────────────────────────────────────────────────────────────────
    if (
      body.jenis ||
      body.tanggalMulai ||
      body.alasan ||
      body.action === "IZIN" ||
      body.status === "IZIN" ||
      body.status === "SAKIT"
    ) {
      const jenisRaw = String(body.jenis || body.status || "IZIN").toUpperCase();
      const statusAbsensi: "IZIN" | "SAKIT" =
        jenisRaw === "SAKIT" || jenisRaw === "Sakit" ? "SAKIT" : "IZIN";
      const tanggalMulai = body.tanggalMulai || today;
      const tanggalSelesai = body.tanggalSelesai || tanggalMulai;
      const alasan = String(body.alasan || body.keterangan || "").trim();

      if (!alasan) {
        return NextResponse.json(
          { success: false, message: "Alasan pengajuan izin wajib diisi." },
          { status: 400 }
        );
      }

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

      const notesFormatted = `[${body.jenis || (statusAbsensi === "SAKIT" ? "Sakit" : "Izin")}] ${alasan}`;
      const insertedIds: number[] = [];

      for (const tgl of dateList) {
        const [existing]: any = await mysqlPool.query(
          "SELECT id FROM absensi WHERE user_id = ? AND tanggal = ? LIMIT 1",
          [userId, tgl]
        );
        if (existing && existing.length > 0) {
          const existingId = existing[0].id;
          await mysqlPool.query(
            `UPDATE absensi SET status = ?, keterangan = ?, pengaturan_sistem_id = ? WHERE id = ?`,
            [statusAbsensi, notesFormatted, setting.id, existingId]
          );
          insertedIds.push(existingId);
        } else {
          const [insertResult]: any = await mysqlPool.query(
            `INSERT INTO absensi (user_id, pengaturan_sistem_id, tanggal, status, keterangan)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, setting.id, tgl, statusAbsensi, notesFormatted]
          );
          insertedIds.push(insertResult.insertId);
        }
      }

      const primaryId = String(insertedIds[0] || "");
      const [userRows]: any = await mysqlPool.query(
        "SELECT id, name, role, avatar, institution, study_program FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      const u = userRows?.[0] || {};

      const izinObject = {
        id: primaryId,
        userId: String(userId),
        absensiId: primaryId,
        userName: u.name || u.nama || "Peserta",
        userRole: u.role || "ANAK_MAGANG",
        userAvatar: u.avatar || null,
        userInstitution: u.institution || u.sekolah_kampus || "",
        jenis: body.jenis || (statusAbsensi === "SAKIT" ? "Sakit" : "Izin"),
        tanggalMulai,
        tanggalSelesai,
        alasan,
        catatanAdmin: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: "Pengajuan izin berhasil dikirim.",
        izin: izinObject,
        data: izinObject,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PRESENSI MASUK
    //    Kolom: jam_masuk (time), status_masuk enum, foto_masuk varchar(500)
    // ─────────────────────────────────────────────────────────────────────────
    const action = String(body.action || "").toUpperCase();
    if (action === "MASUK" || body.checkIn || body.foto_masuk || (!action && !body.foto_keluar)) {
      const tanggal = body.tanggal || today;
      const waktuMasuk = normalizeTime(body.jam_masuk || body.checkIn) || currentTime;
      const statusMasuk = getStatusMasuk(waktuMasuk, setting.jam_masuk_standar, setting.batas_toleransi_menit);

      // foto_masuk: varchar(500) - potong ke 500 karakter
      const rawFoto =
        fotoFile && (fotoFile.key === "foto_masuk" || fotoFile.key === "photo" || fotoFile.key === "foto")
          ? fotoFile.file
          : body.foto_masuk || body.checkInPhoto || null;
      let fotoMasukUrl: string | null = null;
      if (rawFoto) {
        const saved = await saveStorageFile(rawFoto, "absensi", "masuk", userId, tanggal);
        fotoMasukUrl = saved ? saved.slice(0, 500) : null;
      }

      const [existing]: any = await mysqlPool.query(
        "SELECT id FROM absensi WHERE user_id = ? AND tanggal = ? LIMIT 1",
        [userId, tanggal]
      );

      let recordId: number;
      if (existing && existing.length > 0) {
        recordId = existing[0].id;
        await mysqlPool.query(
          `UPDATE absensi
           SET jam_masuk = ?, status_masuk = ?, foto_masuk = COALESCE(?, foto_masuk),
               status = 'HADIR', pengaturan_sistem_id = ?
           WHERE id = ?`,
          [waktuMasuk, statusMasuk, fotoMasukUrl, setting.id, recordId]
        );
      } else {
        const [insertResult]: any = await mysqlPool.query(
          `INSERT INTO absensi (user_id, pengaturan_sistem_id, tanggal, jam_masuk, status, status_masuk, foto_masuk)
           VALUES (?, ?, ?, ?, 'HADIR', ?, ?)`,
          [userId, setting.id, tanggal, waktuMasuk, statusMasuk, fotoMasukUrl]
        );
        recordId = insertResult.insertId;
      }

      const lateMinutes =
        statusMasuk === "TERLAMBAT"
          ? getLateMinutes(waktuMasuk, setting.jam_masuk_standar, setting.batas_toleransi_menit)
          : 0;

      return NextResponse.json({
        success: true,
        message: "Presensi masuk berhasil dicatat.",
        record: {
          id: String(recordId),
          user_id: String(userId),
          userId: String(userId),
          tanggal,
          attendanceDate: tanggal,
          jam_masuk: waktuMasuk,
          jamMasuk: waktuMasuk,
          checkIn: waktuMasuk,
          foto_masuk: fotoMasukUrl,
          fotoMasuk: fotoMasukUrl,
          checkInPhoto: fotoMasukUrl,
          status: "HADIR",
          status_masuk: statusMasuk,
          statusMasuk,
          menit_terlambat: lateMinutes,
          lateMinutes,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PRESENSI PULANG
    //    Kolom: jam_keluar (time), status_pulang enum,
    //           foto_keluar varchar(500), foto_pulang_cepat varchar(500),
    //           keterangan (text)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "PULANG" || body.checkOut || body.foto_keluar) {
      const tanggal = body.tanggal || today;
      const waktuPulang = normalizeTime(body.jam_keluar || body.checkOut) || currentTime;
      const statusPulang = getStatusPulang(waktuPulang, setting.jam_pulang_standar);

      // foto_keluar: varchar(500)
      const rawFotoKeluar =
        fotoFile && fotoFile.key === "foto_keluar"
          ? fotoFile.file
          : body.foto_keluar || body.checkOutPhoto || null;
      let fotoKeluarUrl: string | null = null;
      if (rawFotoKeluar) {
        const saved = await saveStorageFile(rawFotoKeluar, "absensi", "pulang", userId, tanggal);
        fotoKeluarUrl = saved ? saved.slice(0, 500) : null;
      }

      // foto_pulang_cepat: varchar(500)
      const rawFotoCepat =
        fotoFile && fotoFile.key === "foto_pulang_cepat"
          ? fotoFile.file
          : body.foto_pulang_cepat || null;
      let fotoPulangCepatUrl: string | null = null;
      if (rawFotoCepat) {
        const saved = await saveStorageFile(rawFotoCepat, "absensi", "pulang_cepat", userId, tanggal);
        fotoPulangCepatUrl = saved ? saved.slice(0, 500) : null;
      }

      // keterangan: text (tidak ada batas panjang)
      let extraKeterangan: string | null = body.keterangan || null;
      if (body.alasan_pulang_cepat || body.tugas_dikerjakan) {
        const pcInfo: string[] = [];
        if (body.alasan_pulang_cepat) pcInfo.push(`Alasan Pulang Cepat: ${body.alasan_pulang_cepat}`);
        if (body.tugas_dikerjakan) pcInfo.push(`Tugas: ${body.tugas_dikerjakan}`);
        extraKeterangan = pcInfo.join(" | ");
      }

      const [existing]: any = await mysqlPool.query(
        "SELECT id, keterangan FROM absensi WHERE user_id = ? AND tanggal = ? LIMIT 1",
        [userId, tanggal]
      );

      let recordId: number;
      if (existing && existing.length > 0) {
        recordId = existing[0].id;
        const currentKeterangan = existing[0].keterangan || "";
        const combinedKeterangan = extraKeterangan
          ? currentKeterangan
            ? `${currentKeterangan} | ${extraKeterangan}`
            : extraKeterangan
          : currentKeterangan || null;

        await mysqlPool.query(
          `UPDATE absensi
           SET jam_keluar = ?, status_pulang = ?,
               foto_keluar = COALESCE(?, foto_keluar),
               foto_pulang_cepat = COALESCE(?, foto_pulang_cepat),
               keterangan = ?, status = 'HADIR', pengaturan_sistem_id = ?
           WHERE id = ?`,
          [waktuPulang, statusPulang, fotoKeluarUrl, fotoPulangCepatUrl, combinedKeterangan, setting.id, recordId]
        );
      } else {
        const [insertResult]: any = await mysqlPool.query(
          `INSERT INTO absensi
             (user_id, pengaturan_sistem_id, tanggal, jam_keluar, status, status_pulang,
              foto_keluar, foto_pulang_cepat, keterangan)
           VALUES (?, ?, ?, ?, 'HADIR', ?, ?, ?, ?)`,
          [userId, setting.id, tanggal, waktuPulang, statusPulang, fotoKeluarUrl, fotoPulangCepatUrl, extraKeterangan]
        );
        recordId = insertResult.insertId;
      }

      return NextResponse.json({
        success: true,
        message: "Presensi pulang berhasil dicatat.",
        record: {
          id: String(recordId),
          user_id: String(userId),
          userId: String(userId),
          tanggal,
          attendanceDate: tanggal,
          jam_keluar: waktuPulang,
          jamKeluar: waktuPulang,
          checkOut: waktuPulang,
          foto_keluar: fotoKeluarUrl,
          fotoKeluar: fotoKeluarUrl,
          checkOutPhoto: fotoKeluarUrl,
          foto_pulang_cepat: fotoPulangCepatUrl,
          status: "HADIR",
          status_pulang: statusPulang,
          statusPulang,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Aksi tidak dikenali." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("API Absensi POST Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memproses absensi" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Memperbarui catatan admin atau status pada data absensi
 * Kolom yang diubah: keterangan (text), status enum(HADIR|IZIN|SAKIT|ALPA)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, catatanAdmin, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID absensi wajib disertakan." },
        { status: 400 }
      );
    }

    const [rows]: any = await mysqlPool.query(
      "SELECT id, keterangan, status FROM absensi WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data absensi tidak ditemukan." },
        { status: 404 }
      );
    }

    const currentNotes = rows[0].keterangan || "";
    let baseReason = currentNotes;
    if (currentNotes.includes("|| Catatan Admin:")) {
      baseReason = currentNotes.split("|| Catatan Admin:")[0]?.trim() || "";
    }

    const updatedNotes = catatanAdmin
      ? `${baseReason} || Catatan Admin: ${catatanAdmin.trim()}`
      : baseReason;

    // Validasi status sesuai enum tabel: HADIR | IZIN | SAKIT | ALPA
    const validStatuses = ["HADIR", "IZIN", "SAKIT", "ALPA"];
    const newStatus =
      status && validStatuses.includes(String(status).toUpperCase())
        ? String(status).toUpperCase()
        : rows[0].status;

    await mysqlPool.query(
      `UPDATE absensi SET keterangan = ?, status = ? WHERE id = ?`,
      [updatedNotes, newStatus, id]
    );

    return NextResponse.json({
      success: true,
      message: "Catatan admin berhasil disimpan.",
      data: {
        id: String(id),
        catatanAdmin: catatanAdmin?.trim() || "",
        keterangan: updatedNotes,
        status: newStatus,
      },
    });
  } catch (error: any) {
    console.error("API Absensi PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memperbarui catatan admin." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus data absensi berdasarkan ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID wajib disertakan untuk menghapus." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.query(
      "DELETE FROM absensi WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Data tidak ditemukan atau sudah dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data absensi berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("API Absensi DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal menghapus data" },
      { status: 500 }
    );
  }
}
