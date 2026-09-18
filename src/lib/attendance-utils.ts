/**
 * Utility fungsi untuk perhitungan dan pemformatan durasi keterlambatan presensi.
 * Mengikuti zona waktu Asia/Jakarta dan aturan pemformatan jam/menit.
 */

/**
 * Format durasi keterlambatan dalam menit menjadi string yang user-friendly:
 * - < 60 menit: "X menit"
 * - >= 60 menit tanpa sisa: "X jam"
 * - >= 60 menit dengan sisa: "X jam Y menit"
 * 
 * @param totalMinutes Jumlah total menit keterlambatan (number)
 * @param options Opsi format tambahan
 *   - withSuffix: jika true, menambahkan akhiran " terlambat" (contoh: "1 jam 15 menit terlambat")
 *   - withPrefixPlus: jika true, menambahkan awalan "+" (contoh: "+1 jam 15 menit")
 *   - short: jika true, gunakan singkatan "mnt" untuk menit jika diinginkan
 */
export function formatLateDuration(
  totalMinutes: number | null | undefined,
  options?: {
    withSuffix?: boolean;
    withPrefixPlus?: boolean;
    short?: boolean;
  }
): string {
  const minutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  if (minutes <= 0) return "0 menit";

  const minuteLabel = options?.short ? "mnt" : "menit";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let formatted = "";
  if (hours === 0) {
    formatted = `${remainingMinutes} ${minuteLabel}`;
  } else if (remainingMinutes === 0) {
    formatted = `${hours} jam`;
  } else {
    formatted = `${hours} jam ${remainingMinutes} ${minuteLabel}`;
  }

  if (options?.withPrefixPlus) {
    formatted = `+${formatted}`;
  }

  if (options?.withSuffix) {
    formatted = `${formatted} terlambat`;
  }

  return formatted;
}

/**
 * Menghitung selisih keterlambatan antara jam masuk aktual dan jam masuk target/standar
 * berdasarkan waktu Asia/Jakarta (format string "HH:mm" atau "HH:mm:ss").
 *
 * @param actualTime Jam masuk aktual (contoh "08:45:00" atau "08:45")
 * @param targetTime Jam masuk target standar (contoh "07:30:00" atau "07:30")
 * @param toleransiMenit Batas toleransi menit keterlambatan (default 0 jika tidak ada)
 * @returns Total menit keterlambatan (number)
 */
export function calculateLateMinutes(
  actualTime: string,
  targetTime: string,
  toleransiMenit: number = 0
): number {
  if (!actualTime || !targetTime) return 0;

  const parseToSeconds = (timeStr: string): number => {
    const [h = 0, m = 0, s = 0] = timeStr.split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  };

  const actualSec = parseToSeconds(actualTime);
  const targetSec = parseToSeconds(targetTime);
  const toleranceSec = toleransiMenit * 60;

  if (actualSec <= targetSec + toleranceSec) {
    return 0;
  }

  return Math.floor((actualSec - targetSec) / 60);
}
