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
      if (role === "ADMIN_MAGANG") {
        conditions.push("u.role = 'ANAK_MAGANG'");
      } else if (role === "ADMIN_OS") {
        conditions.push("u.role = 'KARYAWAN_OS'");
      } else {
        conditions.push("u.role = ?");
        params.push(role);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        u.id AS user_id,
        u.name AS user_nama,
        u.role AS user_role,
        u.institution AS user_sekolah,
        u.avatar AS user_avatar,
        
        COUNT(CASE WHEN a.status = 'HADIR' AND (a.status_masuk = 'TEPAT_WAKTU' OR a.status_masuk IS NULL) THEN 1 END) AS total_hadir,
        COUNT(CASE WHEN a.status_masuk = 'TERLAMBAT' THEN 1 END) AS total_terlambat,
        COUNT(CASE WHEN a.status IN ('IZIN', 'SAKIT') THEN 1 END) AS total_izin_sakit,
        COUNT(CASE WHEN a.status = 'ALPA' THEN 1 END) AS total_alpa,
        COUNT(a.id) AS total_presensi

      FROM users u
      LEFT JOIN absensi a ON a.user_id = u.id
      ${whereClause}
      GROUP BY u.id, u.name, u.role, u.institution, u.avatar
      ORDER BY total_hadir DESC, total_terlambat ASC, total_presensi DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    const peserta = (rows as any[]).map((row, index) => {
      const hadir = Number(row.total_hadir || 0);
      const terlambat = Number(row.total_terlambat || 0);
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
        userId: String(row.user_id),
        nama: row.user_nama || "—",
        role: row.user_role || "—",
        sekolah: row.user_sekolah || "—",
        avatar: row.user_avatar || "",
        totalHadir: hadir,
        totalTerlambat: terlambat,
        totalIzinSakit: Number(row.total_izin_sakit || 0),
        totalAlpa: alpa,
        totalPresensi: totalPresensi,
        skorKedisiplinan: skor,
        award,
      };
    });

    return NextResponse.json({
      success: true,
      peserta,
    });
  } catch (error: any) {
    console.error("GET /api/statistics/kedisiplinan error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data kedisiplinan." },
      { status: 500 }
    );
  }
}
