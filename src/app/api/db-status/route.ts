import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [[adminCount]]: any = await mysqlPool.query("SELECT COUNT(*) as total FROM admin");
    const [[osCount]]: any = await mysqlPool.query("SELECT COUNT(*) as total FROM karyawan_os");
    const [[magangCount]]: any = await mysqlPool.query("SELECT COUNT(*) as total FROM peserta_magang");

    const totalUsers = (adminCount?.total || 0) + (osCount?.total || 0) + (magangCount?.total || 0);

    return NextResponse.json({
      connected: true,
      message: "Terhubung ke Database MySQL",
      userCount: totalUsers,
      counts: {
        admin: adminCount?.total || 0,
        karyawan_os: osCount?.total || 0,
        peserta_magang: magangCount?.total || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      message: "Database MySQL belum aktif atau tidak dapat dijangkau. Pastikan XAMPP/MySQL sudah berjalan.",
      error: error?.message || String(error),
    }, { status: 500 });
  }
}
