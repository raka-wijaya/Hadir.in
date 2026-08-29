import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());

    const conditions: string[] = ["a.tanggal = ?"];
    const params: any[] = [today];

    if (role && role !== "ALL" && role !== "SUPERADMIN" && role !== "SUPER_ADMIN") {
      if (role === "ADMIN_MAGANG" || role === "ANAK_MAGANG") {
        conditions.push("a.peserta_magang_id IS NOT NULL");
      } else if (role === "ADMIN_OS" || role === "KARYAWAN_OS") {
        conditions.push("a.karyawan_os_id IS NOT NULL");
      }
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        COUNT(CASE WHEN a.status = 'HADIR' AND (a.status_masuk = 'TEPAT_WAKTU' OR a.status_masuk IS NULL) THEN 1 END) AS hadir,
        COUNT(CASE WHEN a.status_masuk = 'TERLAMBAT' THEN 1 END) AS terlambat,
        COUNT(CASE WHEN a.status IN ('IZIN', 'SAKIT') THEN 1 END) AS izinSakit,
        COUNT(CASE WHEN a.status = 'ALPA' THEN 1 END) AS alpa
      FROM absensi a
      ${whereClause}
      `,
      params
    );

    const stat = rows?.[0] || { hadir: 0, terlambat: 0, izinSakit: 0, alpa: 0 };

    return NextResponse.json({
      success: true,
      today: {
        hadir: Number(stat.hadir || 0),
        terlambat: Number(stat.terlambat || 0),
        izinSakit: Number(stat.izinSakit || 0),
        alpa: Number(stat.alpa || 0),
      },
    });
  } catch (error: any) {
    console.error("GET /api/statistics error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengambil data statistik." },
      { status: 500 }
    );
  }
}
