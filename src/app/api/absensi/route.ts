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
  toleransiMenit: number = 15
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
  toleransiMenit: number = 15
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

async function resolveUserTarget(userId: string | number, explicitRole?: string | null) {
  const cleanId = String(userId);
  const roleUpper = (explicitRole || "").toUpperCase();

  if (roleUpper === "ANAK_MAGANG") {
    const [rows]: any = await mysqlPool.query(
      "SELECT id, name, email, phone, identity_number, institution, study_program, avatar, 'ANAK_MAGANG' as role FROM peserta_magang WHERE id = ? LIMIT 1",
      [cleanId]
    );
    if (rows && rows.length > 0) {
      return { type: "peserta_magang" as const, id: rows[0].id, data: rows[0] };
    }
  }

  if (roleUpper === "KARYAWAN_OS") {
    const [rows]: any = await mysqlPool.query(
      "SELECT id, name, email, phone, identity_number, avatar, 'KARYAWAN_OS' as role FROM karyawan_os WHERE id = ? LIMIT 1",
      [cleanId]
    );
    if (rows && rows.length > 0) {
      return { type: "karyawan_os" as const, id: rows[0].id, data: rows[0] };
    }
  }

  const [magangRows]: any = await mysqlPool.query(
    "SELECT id, name, email, phone, identity_number, institution, study_program, avatar, 'ANAK_MAGANG' as role FROM peserta_magang WHERE id = ? LIMIT 1",
    [cleanId]
  );
  if (magangRows && magangRows.length > 0) {
    return { type: "peserta_magang" as const, id: magangRows[0].id, data: magangRows[0] };
  }

  const [osRows]: any = await mysqlPool.query(
    "SELECT id, name, email, phone, identity_number, avatar, 'KARYAWAN_OS' as role FROM karyawan_os WHERE id = ? LIMIT 1",
    [cleanId]
  );
  if (osRows && osRows.length > 0) {
    return { type: "karyawan_os" as const, id: osRows[0].id, data: osRows[0] };
  }

  try {
    const [userRows]: any = await mysqlPool.query(
      "SELECT id, name, role, email, phone, identity_number, institution, study_program, avatar FROM users WHERE id = ? LIMIT 1",
      [cleanId],
    );
    if (userRows && userRows.length > 0) {
      const u = userRows[0];
      if (u.role === "KARYAWAN_OS") {
        return { type: "karyawan_os" as const, id: u.id, data: u };
      }
      return { type: "peserta_magang" as const, id: u.id, data: u };
    }
  } catch {}

  return { type: "peserta_magang" as const, id: cleanId, data: null };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const karyawanOsId = searchParams.get("karyawan_os_id") || searchParams.get("karyawanOsId");
    const pesertaMagangId = searchParams.get("peserta_magang_id") || searchParams.get("pesertaMagangId");
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

    if (karyawanOsId) {
      conditions.push("a.karyawan_os_id = ?");
      params.push(karyawanOsId);
    } else if (pesertaMagangId) {
      conditions.push("a.peserta_magang_id = ?");
      params.push(pesertaMagangId);
    }

    if (role && role !== "ALL" && role !== "SUPERADMIN" && role !== "SUPER_ADMIN") {
      if (role === "ADMIN_MAGANG" || role === "ANAK_MAGANG") {
        conditions.push("a.peserta_magang_id IS NOT NULL");
      } else if (role === "ADMIN_OS" || role === "KARYAWAN_OS") {
        conditions.push("a.karyawan_os_id IS NOT NULL");
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
        conditions.push("a.status_masuk = 'TERLAMBAT'");
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
        pm.name LIKE ? OR 
        pm.email LIKE ? OR 
        pm.identity_number LIKE ? OR 
        pm.institution LIKE ? OR 
        pm.study_program LIKE ? OR 
        ko.name LIKE ? OR 
        ko.email LIKE ? OR 
        ko.identity_number LIKE ? OR 
        a.keterangan LIKE ?
      )`);
      params.push(q, q, q, q, q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        a.id,
        a.karyawan_os_id,
        a.peserta_magang_id,
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
        COALESCE(pm.name, ko.name) AS user_name,
        COALESCE(pm.email, ko.email) AS user_email,
        IF(a.peserta_magang_id IS NOT NULL, 'ANAK_MAGANG', 'KARYAWAN_OS') AS user_role,
        COALESCE(pm.avatar, ko.avatar) AS user_avatar,
        pm.institution AS user_institution,
        pm.study_program AS user_study_program,
        COALESCE(pm.identity_number, ko.identity_number) AS user_identity_number
      FROM absensi a
      LEFT JOIN peserta_magang pm ON pm.id = a.peserta_magang_id
      LEFT JOIN karyawan_os ko ON ko.id = a.karyawan_os_id
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

      const userName = row.user_name || "Peserta";
      const userRole = row.user_role || (row.peserta_magang_id ? "ANAK_MAGANG" : "KARYAWAN_OS");
      const userAvatar = row.user_avatar || null;
      const userInstitution = row.user_institution || "";
      const userIdentityNumber = row.user_identity_number || "";
      const userStudyProgram = row.user_study_program || "";
      const effectiveUserId = String(row.peserta_magang_id || row.karyawan_os_id || "");
      const createdTime = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
      const updatedTime = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();

      return {
        // Skema Database Sesuai Gambar
        id: String(row.id),
        karyawan_os_id: row.karyawan_os_id ? String(row.karyawan_os_id) : null,
        karyawanOsId: row.karyawan_os_id ? String(row.karyawan_os_id) : null,
        peserta_magang_id: row.peserta_magang_id ? String(row.peserta_magang_id) : null,
        pesertaMagangId: row.peserta_magang_id ? String(row.peserta_magang_id) : null,
        pengaturan_sistem_id: row.pengaturan_sistem_id ? Number(row.pengaturan_sistem_id) : null,
        tanggal,
        jam_masuk: jamMasuk,
        jam_keluar: jamKeluar,
        status: row.status,
        status_masuk: statusMasuk,
        status_pulang: statusPulang,
        foto_masuk: fotoMasuk,
        foto_keluar: fotoKeluar,
        foto_pulang_cepat: fotoPulangCepat,
        keterangan: rawKeterangan,
        created_at: createdTime,
        updated_at: updatedTime,

        // Alias kompatibilitas frontend & mobile UI
        attendanceDate: tanggal,
        jamMasuk,
        checkIn: jamMasuk,
        jamPulang: jamKeluar,
        jamKeluar,
        checkOut: jamKeluar,
        fotoMasuk,
        checkInPhoto: fotoMasuk,
        fotoPulang: fotoKeluar,
        fotoKeluar,
        checkOutPhoto: fotoKeluar,
        fotoPulangCepat,
        statusMasuk,
        statusPulang,
        menit_terlambat: lateMinutes,
        lateMinutes,
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
      };
    });

    const formattedIzin = formattedData
      .filter((item) => item.status === "IZIN" || item.status === "SAKIT")
      .map((item) => ({
        id: item.id,
        karyawan_os_id: item.karyawan_os_id,
        peserta_magang_id: item.peserta_magang_id,
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
 * Sesuai skema tabel absensi:
 *   karyawan_os_id bigint(20) unsigned | NULL
 *   peserta_magang_id bigint(20) unsigned | NULL
 *   pengaturan_sistem_id int(10) unsigned
 *   tanggal date
 *   jam_masuk time | NULL
 *   jam_keluar time | NULL
 *   status enum('HADIR','IZIN','SAKIT','ALPA')
 *   status_masuk enum('TEPAT_WAKTU','TERLAMBAT') | NULL
 *   status_pulang enum('TEPAT_WAKTU','PULANG_CEPAT') | NULL
 *   foto_masuk varchar(500) | NULL
 *   foto_keluar varchar(500) | NULL
 *   foto_pulang_cepat varchar(500) | NULL
 *   keterangan text | NULL
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
          key === "foto" ||
          key === "checkInPhoto" ||
          key === "checkOutPhoto"
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

    const pesertaMagangId = body.peserta_magang_id || body.pesertaMagangId || (body.role === "ANAK_MAGANG" ? body.id : null);
    const karyawanOsId = body.karyawan_os_id || body.karyawanOsId || (body.role === "KARYAWAN_OS" ? body.id : null);

    if (!pesertaMagangId && !karyawanOsId) {
      return NextResponse.json(
        { success: false, message: "ID peserta_magang_id atau karyawan_os_id wajib disertakan." },
        { status: 400 }
      );
    }

    const isMagang = Boolean(pesertaMagangId);
    const targetId = pesertaMagangId || karyawanOsId;

    const setting = await getActiveSetting();
    const today = getTodayJakarta();
    const currentTime = getCurrentTimeJakarta();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PENGAJUAN IZIN / SAKIT
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
        const checkSql = isMagang
          ? "SELECT id FROM absensi WHERE peserta_magang_id = ? AND tanggal = ? LIMIT 1"
          : "SELECT id FROM absensi WHERE karyawan_os_id = ? AND tanggal = ? LIMIT 1";
        const checkParam = isMagang ? pesertaMagangId : karyawanOsId;

        const [existing]: any = await mysqlPool.query(checkSql, [checkParam, tgl]);
        if (existing && existing.length > 0) {
          const existingId = existing[0].id;
          await mysqlPool.query(
            `UPDATE absensi 
             SET status = ?, keterangan = ?, pengaturan_sistem_id = ?,
                 peserta_magang_id = COALESCE(?, peserta_magang_id),
                 karyawan_os_id = COALESCE(?, karyawan_os_id)
             WHERE id = ?`,
            [statusAbsensi, notesFormatted, setting.id, pesertaMagangId, karyawanOsId, existingId]
          );
          insertedIds.push(existingId);
        } else {
          const [insertResult]: any = await mysqlPool.query(
            `INSERT INTO absensi (peserta_magang_id, karyawan_os_id, pengaturan_sistem_id, tanggal, status, keterangan)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [pesertaMagangId, karyawanOsId, setting.id, tgl, statusAbsensi, notesFormatted]
          );
          insertedIds.push(insertResult.insertId);
        }
      }

      const primaryId = String(insertedIds[0] || "");
      const userTarget = await resolveUserTarget(targetId, isMagang ? "ANAK_MAGANG" : "KARYAWAN_OS");
      const u = userTarget.data || {};

      const izinObject = {
        id: primaryId,
        peserta_magang_id: pesertaMagangId ? String(pesertaMagangId) : null,
        karyawan_os_id: karyawanOsId ? String(karyawanOsId) : null,
        absensiId: primaryId,
        userName: u.name || u.nama || "Peserta",
        userRole: isMagang ? "ANAK_MAGANG" : "KARYAWAN_OS",
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
    if (action === "MASUK" || body.checkIn || body.foto_masuk || (!action && !body.foto_keluar && !body.checkOut && !body.jam_keluar)) {
      const tanggal = body.tanggal || today;
      const waktuMasuk = normalizeTime(body.jam_masuk || body.checkIn) || currentTime;
      const statusMasuk = getStatusMasuk(waktuMasuk, setting.jam_masuk_standar, setting.batas_toleransi_menit);

      // Upload / Simpan Foto Masuk (varchar 500)
      const rawFoto =
        fotoFile && (fotoFile.key === "foto_masuk" || fotoFile.key === "photo" || fotoFile.key === "foto" || fotoFile.key === "checkInPhoto")
          ? fotoFile.file
          : body.foto_masuk || body.checkInPhoto || null;
      let fotoMasukUrl: string | null = null;
      if (rawFoto) {
        const saved = await saveStorageFile(rawFoto, "absensi", "masuk", String(targetId), tanggal);
        fotoMasukUrl = saved ? saved.slice(0, 500) : null;
      }

      const checkSql = isMagang
        ? "SELECT id FROM absensi WHERE peserta_magang_id = ? AND tanggal = ? LIMIT 1"
        : "SELECT id FROM absensi WHERE karyawan_os_id = ? AND tanggal = ? LIMIT 1";
      const checkParam = isMagang ? pesertaMagangId : karyawanOsId;

      const [existing]: any = await mysqlPool.query(checkSql, [checkParam, tanggal]);

      let recordId: number;
      if (existing && existing.length > 0) {
        recordId = existing[0].id;
        await mysqlPool.query(
          `UPDATE absensi
           SET jam_masuk = ?, status_masuk = ?,
               foto_masuk = COALESCE(?, foto_masuk),
               status = 'HADIR', pengaturan_sistem_id = ?,
               peserta_magang_id = COALESCE(?, peserta_magang_id),
               karyawan_os_id = COALESCE(?, karyawan_os_id)
           WHERE id = ?`,
          [waktuMasuk, statusMasuk, fotoMasukUrl, setting.id, pesertaMagangId, karyawanOsId, recordId]
        );
      } else {
        const [insertResult]: any = await mysqlPool.query(
          `INSERT INTO absensi (peserta_magang_id, karyawan_os_id, pengaturan_sistem_id, tanggal, jam_masuk, status, status_masuk, foto_masuk)
           VALUES (?, ?, ?, ?, ?, 'HADIR', ?, ?)`,
          [pesertaMagangId, karyawanOsId, setting.id, tanggal, waktuMasuk, statusMasuk, fotoMasukUrl]
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
          peserta_magang_id: pesertaMagangId ? String(pesertaMagangId) : null,
          pesertaMagangId: pesertaMagangId ? String(pesertaMagangId) : null,
          karyawan_os_id: karyawanOsId ? String(karyawanOsId) : null,
          karyawanOsId: karyawanOsId ? String(karyawanOsId) : null,
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
    if (action === "PULANG" || body.checkOut || body.foto_keluar || body.jam_keluar || body.jam_pulang) {
      const tanggal = body.tanggal || today;
      const waktuPulang = normalizeTime(body.jam_keluar || body.jam_pulang || body.checkOut) || currentTime;
      const statusPulang = getStatusPulang(waktuPulang, setting.jam_pulang_standar);

      // foto_keluar: varchar(500)
      const rawFotoKeluar =
        fotoFile && (fotoFile.key === "foto_keluar" || fotoFile.key === "checkOutPhoto")
          ? fotoFile.file
          : body.foto_keluar || body.checkOutPhoto || body.foto_pulang || null;
      let fotoKeluarUrl: string | null = null;
      if (rawFotoKeluar) {
        const saved = await saveStorageFile(rawFotoKeluar, "absensi", "pulang", String(targetId), tanggal);
        fotoKeluarUrl = saved ? saved.slice(0, 500) : null;
      }

      // foto_pulang_cepat: varchar(500)
      const rawFotoCepat =
        fotoFile && fotoFile.key === "foto_pulang_cepat"
          ? fotoFile.file
          : body.foto_pulang_cepat || null;
      let fotoPulangCepatUrl: string | null = null;
      if (rawFotoCepat) {
        const saved = await saveStorageFile(rawFotoCepat, "absensi", "pulang_cepat", String(targetId), tanggal);
        fotoPulangCepatUrl = saved ? saved.slice(0, 500) : null;
      }

      // keterangan: text
      let extraKeterangan: string | null = body.keterangan || null;
      if (body.alasan_pulang_cepat || body.tugas_dikerjakan) {
        const pcInfo: string[] = [];
        if (body.alasan_pulang_cepat) pcInfo.push(`Alasan Pulang Cepat: ${body.alasan_pulang_cepat}`);
        if (body.tugas_dikerjakan) pcInfo.push(`Tugas: ${body.tugas_dikerjakan}`);
        extraKeterangan = pcInfo.join(" | ");
      }

      const checkSql = isMagang
        ? "SELECT id, keterangan FROM absensi WHERE peserta_magang_id = ? AND tanggal = ? LIMIT 1"
        : "SELECT id, keterangan FROM absensi WHERE karyawan_os_id = ? AND tanggal = ? LIMIT 1";
      const checkParam = isMagang ? pesertaMagangId : karyawanOsId;

      const [existing]: any = await mysqlPool.query(checkSql, [checkParam, tanggal]);

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
               keterangan = ?, status = 'HADIR', pengaturan_sistem_id = ?,
               peserta_magang_id = COALESCE(?, peserta_magang_id),
               karyawan_os_id = COALESCE(?, karyawan_os_id)
           WHERE id = ?`,
          [waktuPulang, statusPulang, fotoKeluarUrl, fotoPulangCepatUrl, combinedKeterangan, setting.id, pesertaMagangId, karyawanOsId, recordId]
        );
      } else {
        const [insertResult]: any = await mysqlPool.query(
          `INSERT INTO absensi
             (peserta_magang_id, karyawan_os_id, pengaturan_sistem_id, tanggal, jam_keluar, status, status_pulang,
              foto_keluar, foto_pulang_cepat, keterangan)
           VALUES (?, ?, ?, ?, ?, 'HADIR', ?, ?, ?, ?)`,
          [pesertaMagangId, karyawanOsId, setting.id, tanggal, waktuPulang, statusPulang, fotoKeluarUrl, fotoPulangCepatUrl, extraKeterangan]
        );
        recordId = insertResult.insertId;
      }

      return NextResponse.json({
        success: true,
        message: "Presensi pulang berhasil dicatat.",
        record: {
          id: String(recordId),
          peserta_magang_id: pesertaMagangId ? String(pesertaMagangId) : null,
          pesertaMagangId: pesertaMagangId ? String(pesertaMagangId) : null,
          karyawan_os_id: karyawanOsId ? String(karyawanOsId) : null,
          karyawanOsId: karyawanOsId ? String(karyawanOsId) : null,
          tanggal,
          attendanceDate: tanggal,
          jam_keluar: waktuPulang,
          jamKeluar: waktuPulang,
          jamPulang: waktuPulang,
          checkOut: waktuPulang,
          foto_keluar: fotoKeluarUrl,
          fotoKeluar: fotoKeluarUrl,
          fotoPulang: fotoKeluarUrl,
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
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // ============================================================
    // KOREKSI KEDISIPLINAN (SERING TERLAMBAT -> PALING RAJIN)
    // Khusus Admin ID: 1, 4, 6, 7, 8
    // ============================================================
    if (body.action === "KOREKSI_TERLAMBAT") {
      const { adminId, userId, userRole, targetJamMasuk } = body;
      const ALLOWED_ADMIN_IDS = [1, 4, 6, 7, 8];

      if (!adminId || !ALLOWED_ADMIN_IDS.includes(Number(adminId))) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Akses ditolak: Admin ID tidak memiliki izin untuk melakukan koreksi kedisiplinan.",
          },
          { status: 403 }
        );
      }

      if (!userId) {
        return NextResponse.json(
          { success: false, message: "User ID wajib disertakan." },
          { status: 400 }
        );
      }

      let jamMasukBaru = (targetJamMasuk || "07:15:00").trim();
      if (jamMasukBaru.length === 5) {
        jamMasukBaru += ":00";
      }

      const roleUpper = (userRole || "").toUpperCase();
      const isMagang = roleUpper.includes("MAGANG");
      const idColumn = isMagang ? "peserta_magang_id" : "karyawan_os_id";

      // Update seluruh record absensi yang TERLAMBAT di bulan berjalan
      const [updateResult]: any = await mysqlPool.query(
        `UPDATE absensi
         SET status_masuk = 'TEPAT_WAKTU',
             jam_masuk = ?,
             keterangan = CONCAT(COALESCE(keterangan, ''), ' [Koreksi Jam oleh Admin ID: ', ?, ']')
         WHERE ${idColumn} = ?
           AND status_masuk = 'TERLAMBAT'
           AND MONTH(tanggal) = MONTH(CURRENT_DATE())
           AND YEAR(tanggal) = YEAR(CURRENT_DATE())`,
        [jamMasukBaru, String(adminId), String(userId)]
      );

      return NextResponse.json({
        success: true,
        message: `Berhasil mengoreksi keterlambatan menjadi Tepat Waktu (${jamMasukBaru}).`,
        affectedRows: updateResult.affectedRows || 0,
      });
    }

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
