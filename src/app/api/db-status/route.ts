import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [rows]: any = await mysqlPool.query("SELECT COUNT(*) as userCount FROM users");
    const userCount = rows[0]?.userCount ?? 0;
    return NextResponse.json({
      connected: true,
      message: "Terhubung ke Database MySQL",
      userCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      message: "Database MySQL belum aktif atau tidak dapat dijangkau. Pastikan XAMPP/MySQL sudah berjalan.",
      error: error?.message || String(error),
    }, { status: 500 });
  }
}
