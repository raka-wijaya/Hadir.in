"use client";

import React, { useState } from "react";
import { X, Clock, Calendar, CheckCircle, Camera, LogIn, LogOut } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  photoUrl?: string | null;
  fotoMasuk?: string | null;
  fotoPulang?: string | null;
  jamMasuk?: string | null;
  jamPulang?: string | null;
  initialType?: "MASUK" | "PULANG";
  userName: string;
  userRole: string;
  attendanceDate: string;
  time?: string;
  status: string;
  lateMinutes?: number;
}

export function PhotoModal({
  isOpen,
  onClose,
  title,
  photoUrl,
  fotoMasuk,
  fotoPulang,
  jamMasuk,
  jamPulang,
  initialType = "MASUK",
  userName,
  userRole,
  attendanceDate,
  time,
  status,
  lateMinutes = 0,
}: PhotoModalProps) {
  const [activeType, setActiveType] = useState<"MASUK" | "PULANG">(initialType);
  const [imgError, setImgError] = useState(false);

  if (!isOpen) return null;

  const hasBoth = Boolean(fotoMasuk && fotoPulang);
  const currentPhoto =
    photoUrl !== undefined && photoUrl !== null && !hasBoth
      ? photoUrl
      : activeType === "PULANG"
      ? fotoPulang || photoUrl || fotoMasuk
      : fotoMasuk || photoUrl || fotoPulang;

  const currentTime =
    activeType === "PULANG" && jamPulang
      ? jamPulang
      : activeType === "MASUK" && jamMasuk
      ? jamMasuk
      : time || "--:--";

  const modalTitle =
    title ||
    (activeType === "PULANG"
      ? "Bukti Presensi Swafoto Pulang"
      : "Bukti Presensi Swafoto Masuk");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-input/50">
          <h3 className="font-bold text-sm text-foreground">
            {modalTitle}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasBoth && (
          <div className="px-4 pt-3">
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => {
                  setActiveType("MASUK");
                  setImgError(false);
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeType === "MASUK"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Foto Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveType("PULANG");
                  setImgError(false);
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeType === "PULANG"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                Foto Pulang
              </button>
            </div>
          </div>
        )}

        <div className="p-3 space-y-3">

          <div className="relative rounded-xl overflow-hidden border border-border aspect-video aspect-[4/3] bg-black shadow-inner flex items-center justify-center">
            {currentPhoto && !imgError ? (
              <img
                src={currentPhoto}
                alt="Bukti Presensi"
                className="w-full h-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                <Camera className="w-8 h-8 mb-1.5 opacity-40 text-primary" />
                <p className="text-[11px] font-bold text-foreground">
                  Foto {activeType === "PULANG" ? "Pulang" : "Masuk"} Tidak Tersedia
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Belum ada foto yang tersimpan.
                </p>
              </div>
            )}
          </div>

          <div className="bg-input/60 rounded-xl p-3 border border-border space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-border gap-3">
              <span className="text-muted-foreground font-medium shrink-0">
                Pengguna
              </span>
              <span className="font-semibold text-foreground text-right truncate">
                {userName} ({userRole})
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Tanggal
              </span>
              <span className="font-medium text-foreground">
                {(() => {
                  const parts = (attendanceDate || "")
                    .slice(0, 10)
                    .split("-");
                  if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                  return attendanceDate;
                })()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Waktu {activeType === "PULANG" ? "Pulang" : "Masuk"}
              </span>
              <span className="font-mono font-bold text-foreground">
                {currentTime} WIB
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                Status
              </span>
              <StatusBadge status={status} />
            </div>

            {lateMinutes > 0 && activeType === "MASUK" && (
              <div className="flex justify-between items-center text-status-terlambat font-semibold pt-1">
                <span>Durasi Keterlambatan</span>
                <span>{lateMinutes} Menit</span>
              </div>
            )}

          </div>
        </div>
        <div className="px-4 py-3 border-t border-border bg-input/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-all shadow-sm cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>

      </div>
    </div>
  );
}
