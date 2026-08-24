import { NextRequest, NextResponse } from "next/server";
import { POST as absensiPost } from "@/app/api/absensi/route";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.set("action", "MASUK");

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
          action: "MASUK",
          jam_masuk: body.jam_masuk || body.checkIn || body.jamMasuk,
          foto_masuk: body.foto_masuk || body.photo || body.foto || body.checkInPhoto,
        }),
      });

      return await absensiPost(modifiedReq);
    }
  } catch (error: any) {
    console.error("Attendance Check-In Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal melakukan absensi masuk." },
      { status: 500 }
    );
  }
}
