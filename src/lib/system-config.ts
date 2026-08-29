import { SystemSettings } from "@/types";

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  systemName: "hadirin",
  timezone: "Asia/Jakarta",
  checkInTime: "08:00",
  checkOutTime: "16:00",
  lateToleranceMinutes: 15,
  requirePhoto: true,
  allowCheckOut: true,
  detectLate: true,
  enforceServerTime: true,
  workDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
};
