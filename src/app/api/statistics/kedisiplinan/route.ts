import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

type AwardTier = "emas" | "perak" | "perunggu" | "bintang" | "reguler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const limit = Number(searchParams.get("limit") || 10);

    const conditions: string[] = [];
    const params: any[] = [];

    if (role && role !== "ALL" && role !== "SUPERADMIN" && role !== "SUPER_ADMIN") {
      if (role === "ADMIN_MAGANG" || role === "ANAK_MAGANG") {
        conditions.push("a.peserta_magang_id IS NOT NULL");
      } else if (role === "ADMIN_OS" || role === "KARYAWAN_OS") {
        conditions.push("a.karyawan_os_id IS NOT NULL");
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        COALESCE(a.peserta_magang_id, a.karyawan_os_id) AS id,
        a.peserta_magang_id,
        a.karyawan_os_id,
        COALESCE(pm.name, ko.name) AS user_nama,
        IF(a.peserta_magang_id IS NOT NULL, 'ANAK_MAGANG', 'KARYAWAN_OS') AS user_role,
        COALESCE(pm.institution, '') AS user_sekolah,
        COALESCE(pm.avatar, ko.avatar) AS user_avatar,
        
        COUNT(CASE WHEN a.status = 'HADIR' AND (a.status_masuk = 'TEPAT_WAKTU' OR a.status_masuk IS NULL) THEN 1 END) AS total_hadir,
        COUNT(CASE WHEN a.status_masuk = 'TERLAMBAT' THEN 1 END) AS total_terlambat,
        COUNT(CASE WHEN a.status IN ('IZIN', 'SAKIT') THEN 1 END) AS total_izin_sakit,
        COUNT(CASE WHEN a.status = 'ALPA' THEN 1 END) AS total_alpa,
        COUNT(a.id) AS total_presensi

      FROM absensi a
      LEFT JOIN peserta_magang pm ON pm.id = a.peserta_magang_id
      LEFT JOIN karyawan_os ko ON ko.id = a.karyawan_os_id
      ${whereClause}
      GROUP BY a.peserta_magang_id, a.karyawan_os_id, pm.name, ko.name, pm.institution, pm.avatar, ko.avatar
      `,
      params
    );

    const peserta = (rows as any[]).map((row, index) => {
      const hadir = Number(row.total_hadir || 0);
      const terlambat = Number(row.total_terlambat || 0);
      const izinSakit = Number(row.total_izin_sakit || 0);
      const alpa = Number(row.total_alpa || 0);
      const totalPresensi = Number(row.total_presensi || 0);

      const denominator = Math.max(1, hadir + terlambat + alpa);
      const skor = Math.round((hadir / denominator) * 100);

      let award: AwardTier = "reguler";
      if (skor >= 95) award = "emas";
      else if (skor >= 85) award = "perak";
      else if (skor >= 75) award = "perunggu";
      else if (skor >= 60) award = "bintang";

      return {
        rank: index + 1,
        id: String(row.id),
        peserta_magang_id: row.peserta_magang_id ? String(row.peserta_magang_id) : null,
        karyawan_os_id: row.karyawan_os_id ? String(row.karyawan_os_id) : null,
        nama: row.user_nama || "—",
        role: row.user_role || "—",
        sekolah: row.user_sekolah || "—",
        avatar: row.user_avatar || "",
        totalHadir: hadir,
        totalTerlambat: terlambat,
        totalIzinSakit: izinSakit,
        totalAlpa: alpa,
        totalPresensi: totalPresensi,
        skorKedisiplinan: skor,
        award,
      };
    });

    // Generate 4 categories data
    const rajinItems = [...peserta]
      .filter((p) => p.totalHadir > 0)
      .sort((a, b) => b.totalHadir - a.totalHadir || a.totalTerlambat - b.totalTerlambat)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        nama: p.nama,
        role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
        count: p.totalHadir,
        avatar: p.avatar,
      }));

    const terlambatItems = [...peserta]
      .filter((p) => p.totalTerlambat > 0)
      .sort((a, b) => b.totalTerlambat - a.totalTerlambat)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        nama: p.nama,
        role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
        count: p.totalTerlambat,
        avatar: p.avatar,
      }));

    const izinSakitItems = [...peserta]
      .filter((p) => p.totalIzinSakit > 0)
      .sort((a, b) => b.totalIzinSakit - a.totalIzinSakit)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        nama: p.nama,
        role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
        count: p.totalIzinSakit,
        avatar: p.avatar,
      }));

    const alpaItems = [...peserta]
      .filter((p) => p.totalAlpa > 0)
      .sort((a, b) => b.totalAlpa - a.totalAlpa)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        nama: p.nama,
        role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
        count: p.totalAlpa,
        avatar: p.avatar,
      }));

    const categories = {
      palingRajin: {
        title: "PALING RAJIN",
        totalOrang: rajinItems.length,
        emptyText: "Belum ada data presensi tepat waktu bulan ini.",
        items: rajinItems,
      },
      seringTerlambat: {
        title: "SERING TERLAMBAT",
        totalOrang: terlambatItems.length,
        emptyText: "Tidak ada catatan terlambat bulan ini.",
        items: terlambatItems,
      },
      seringIzinSakit: {
        title: "SERING IZIN / SAKIT",
        totalOrang: izinSakitItems.length,
        emptyText: "Tidak ada catatan izin/sakit bulan ini.",
        items: izinSakitItems,
      },
      tanpaKeterangan: {
        title: "TANPA KETERANGAN",
        totalOrang: alpaItems.length,
        emptyText: "Tidak ada catatan alpa bulan ini.",
        items: alpaItems,
      },
    };

    return NextResponse.json({
      success: true,
      peserta,
      categories,
    });
  } catch (error: any) {
    console.error("GET /api/statistics/kedisiplinan error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data kedisiplinan." },
      { status: 500 }
    );
  }
}

