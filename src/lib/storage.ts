import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Konversi tanggal ke format DD-MM-YYYY (hari-bulan-tahun)
 * Contoh: "2026-08-19" -> "19-08-2026"
 */
export function toDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const d = new Date();
    const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "2-digit" }).format(d);
    const month = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", month: "2-digit" }).format(d);
    const year = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "numeric" }).format(d);
    return `${day}-${month}-${year}`;
  }

  if (dateInput instanceof Date) {
    const day = String(dateInput.getDate()).padStart(2, "0");
    const month = String(dateInput.getMonth() + 1).padStart(2, "0");
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const s = String(dateInput).trim();

  // Sudah format DD-MM-YYYY?
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s;
  }

  // Format YYYY-MM-DD?
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}-${m}-${y}`;
  }

  return toDDMMYYYY();
}

/**
 * Simpan file dari File / Blob / Base64 string ke storage filesystem lokal (public/uploads/...)
 * dan kembalikan relative URL string untuk disimpan di database MySQL.
 *
 * Folder & format nama file menggunakan DD-MM-YYYY (contoh: 19-08-2026)
 */
export async function saveStorageFile(
  fileOrBase64: any,
  category: "absensi" | "izin" | "pendaftar" | "avatars" = "absensi",
  prefix: string = "foto",
  userIdOrIdentifier?: string | number,
  dateInput?: string | Date
): Promise<string | null> {
  if (!fileOrBase64) return null;

  // Folder berformat DD-MM-YYYY (contoh: 19-08-2026)
  const folderDate = toDDMMYYYY(dateInput);
  const uploadDir = path.join(process.cwd(), "public", "uploads", category, folderDate);
  await fs.mkdir(uploadDir, { recursive: true });

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/:/g, "");

  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const idTag = userIdOrIdentifier ? `_${String(userIdOrIdentifier).replace(/[^a-zA-Z0-9_-]/g, "")}` : "";

  // 1. Kasus Objek File / Blob (dari FormData)
  if (typeof fileOrBase64 === "object" && typeof fileOrBase64.arrayBuffer === "function") {
    try {
      const arrayBuffer = await fileOrBase64.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0) return null;

      let extension = "jpg";
      const fileNameRaw = fileOrBase64.name || "";
      const extMatch = fileNameRaw.split(".").pop();
      if (extMatch && extMatch.length <= 5) {
        extension = extMatch.toLowerCase();
      } else {
        const mimeType = fileOrBase64.type || "";
        if (mimeType.includes("png")) extension = "png";
        else if (mimeType.includes("webp")) extension = "webp";
        else if (mimeType.includes("pdf")) extension = "pdf";
        else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
      }

      const fileName = `${prefix}${idTag}_${folderDate}_${timeStr}_${randomSuffix}.${extension}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);

      return `/uploads/${category}/${folderDate}/${fileName}`;
    } catch (err) {
      console.error("Gagal menyimpan File buffer ke storage:", err);
      return null;
    }
  }

  // 2. Kasus String (Base64 atau URL yang sudah ada)
  if (typeof fileOrBase64 === "string") {
    const trimmed = fileOrBase64.trim();
    if (!trimmed) return null;

    if (
      trimmed.startsWith("/uploads/") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    let extension = "jpg";
    let base64Data = trimmed;

    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1].toLowerCase();
      base64Data = matches[2];

      if (mimeType.includes("png")) extension = "png";
      else if (mimeType.includes("webp")) extension = "webp";
      else if (mimeType.includes("pdf")) extension = "pdf";
      else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
    } else {
      if (trimmed.length < 100 && !trimmed.includes(",")) {
        return trimmed;
      }
    }

    try {
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length === 0) return null;

      const fileName = `${prefix}${idTag}_${folderDate}_${timeStr}_${randomSuffix}.${extension}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);

      return `/uploads/${category}/${folderDate}/${fileName}`;
    } catch (err) {
      console.error("Gagal menyimpan base64 string ke storage:", err);
      return null;
    }
  }

  return null;
}

export const saveBase64File = saveStorageFile;
