"use client";

import React from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { AlertTriangle, BookOpen, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface LogBookLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export function LogBookLogoutModal({
  isOpen,
  onClose,
  onConfirmLogout,
}: LogBookLogoutModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToLogbook = () => {
    onClose();
    router.push("/magang/log-book");
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">
                  Peringatan Log Book
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Aktivitas harian magang
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Kamu <strong className="text-foreground">belum mengisi log book</strong> untuk aktivitas hari ini.
            </p>
            <p>
              Sebagai peserta magang, disarankan untuk melengkapi catatan aktivitas harian sebelum keluar dari aplikasi.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleGoToLogbook}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition-all shadow-card flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Isi Log Book Dulu</span>
            </button>

            <button
              type="button"
              onClick={onConfirmLogout}
              className="px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Tetap Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
