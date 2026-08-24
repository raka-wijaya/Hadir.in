import React from "react";
import { CheckCircle2, Clock, AlertCircle, XCircle, Ban, ArrowDownLeft } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const raw = String(status || "").trim();
  const norm = raw.toLowerCase().replace(/_/g, " ").trim();

  // 1. Hadir / Tepat Waktu / Lolos / Diterima / Aktif / Disetujui / Approved (Success - Green)
  if (["hadir", "present", "tepat waktu", "tepat_waktu", "lolos", "diterima", "aktif", "active", "disetujui", "approved"].includes(norm)) {
    let label = "Hadir";
    if (norm === "tepat waktu" || norm === "tepat_waktu") label = "Tepat Waktu";
    if (norm === "active" || norm === "aktif") label = "Aktif";
    if (norm === "lolos" || norm === "diterima") label = "Diterima";
    if (norm === "approved" || norm === "disetujui") label = "Disetujui";

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold status-hadir border ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }

  // 2. Terlambat / Pending / Menunggu (Warning - Amber / Yellow)
  if (["terlambat", "late", "pending", "menunggu"].includes(norm)) {
    let label = "Terlambat";
    let statusClass = "status-terlambat";
    if (norm === "menunggu" || norm === "pending") {
      label = "Pending";
      statusClass = "status-pending";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${statusClass} border ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }

  // 3. Pulang Cepat (Indigo / Cyan)
  if (["pulang cepat", "pulang_cepat", "early departure"].includes(norm)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold status-izin border ${className}`}>
        <ArrowDownLeft className="w-3.5 h-3.5" />
        <span>Pulang Cepat</span>
      </span>
    );
  }

  // 4. Izin (Info - Blue)
  if (["izin", "permitted", "leave"].includes(norm)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold status-izin border ${className}`}>
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Izin</span>
      </span>
    );
  }

  // 5. Sakit (Orange / Rose)
  if (["sakit", "sick"].includes(norm)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold status-sakit border ${className}`}>
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Sakit</span>
      </span>
    );
  }

  // 6. Alpa / Tidak Lolos / Ditolak / Rejected / Nonaktif / Absent (Destructive - Red)
  if (["alpa", "tidak lolos", "tidak_lolos", "nonaktif", "inactive", "ditolak", "rejected", "absent"].includes(norm)) {
    let label = "Alpa";
    let statusClass = "status-alpa";
    if (norm === "tidak_lolos" || norm === "tidak lolos" || norm === "ditolak" || norm === "rejected") {
      label = "Ditolak";
      statusClass = "status-tidak-lolos";
    }
    if (norm === "inactive" || norm === "nonaktif") {
      label = "Nonaktif";
      statusClass = "status-nonaktif";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${statusClass} border ${className}`}>
        <XCircle className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }

  // 7. Dibatalkan (Gray / Muted)
  if (["dibatalkan", "cancelled", "canceled"].includes(norm)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold status-nonaktif border ${className}`}>
        <Ban className="w-3.5 h-3.5" />
        <span>Dibatalkan</span>
      </span>
    );
  }

  // Fallback
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border ${className}`}>
      <span>{raw || "—"}</span>
    </span>
  );
}

