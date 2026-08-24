import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  
  // Format formatted time strings for Asia/Jakarta (WIB)
  const formatterTime = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formatterDate = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatterISO = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeString = formatterTime.format(now);
  const dateString = formatterDate.format(now);
  const dateISO = formatterISO.format(now); // YYYY-MM-DD

  return NextResponse.json({
    success: true,
    serverTimestamp: now.getTime(),
    serverTime: timeString, // e.g. "08:42:17"
    serverDateFormatted: dateString, // e.g. "Rabu, 12 Agustus 2026"
    serverDateISO: dateISO, // e.g. "2026-08-12"
    timezone: "Asia/Jakarta (WIB)"
  });
}
