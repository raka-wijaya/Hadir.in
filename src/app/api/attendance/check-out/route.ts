import { NextRequest, NextResponse } from "next/server";
import { POST as absensiPost } from "@/app/api/absensi/route";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.set("action", "PULANG");

      const modifiedReq = new NextRequest(req.url, {
        method: "POST",
        body: formData,
      });

      return await absensiPost(modifiedReq);
    } else {
      const body = await req.json();
      const modifiedReq = new NextRequest(req.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...body,
          action: "PULANG",
          jam_keluar: body.jam_keluar || body.jam_pulang || body.checkOut || body.jamKeluar,
          foto_keluar: body.foto_keluar || body.photo || body.foto || body.checkOutPhoto,
          foto_pulang_cepat:
            body.foto_pulang_cepat ||
            (body.status === "pulang_cepat" || body.status_pulang === "PULANG_CEPAT"
              ? body.photo || body.foto_keluar || body.foto
              : null),
        }),
      });

      return await absensiPost(modifiedReq);
    }
  } catch (error: any) {
    console.error("Attendance Check-Out Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal melakukan absensi pulang." },
      { status: 500 }
    );
  }
}
