"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PhotoModal } from "@/components/attendance/PhotoModal";
import { useAuth } from "@/lib/auth/context";
import { Absensi } from "@/types";
import { History, Camera, Calendar } from "lucide-react";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

export default function MagangRiwayatPage() {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<Absensi | null>(null);
  const [userRecords, setUserRecords] = useState<Absensi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/absensi?userId=${user.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setUserRecords(data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat absensi:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Riwayat Absensi Saya
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold">
            Daftar riwayat presensi masuk &amp; pulang harian Anda
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden hidden md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold text-xs uppercase">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Masuk</th>
                <th className="py-3 px-4">Pulang</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Bukti Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {userRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs font-semibold">
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              ) : (
                userRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-extrabold text-foreground">
                      {formatDisplayDate(rec.tanggal || rec.attendanceDate)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-foreground">
                      {rec.jam_masuk || rec.checkIn || "--:--"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-foreground">
                      {rec.jam_pulang || rec.checkOut || "--:--"}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {(rec.foto_masuk || rec.checkInPhoto || rec.foto_keluar || rec.fotoKeluar || rec.checkOutPhoto || rec.foto_pulang_cepat) ? (
                        <button
                          onClick={() => setSelectedPhoto(rec)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-extrabold flex items-center gap-1 hover:bg-primary/20 transition-all cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Foto</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden space-y-3">
          {userRecords.map((rec) => (
            <div key={rec.id} className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-card">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-mono font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {formatDisplayDate(rec.tanggal || rec.attendanceDate)}
                </span>
                <StatusBadge status={rec.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-2.5 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold">Absen Masuk</span>
                  <span className="font-mono font-extrabold text-foreground">
                    {rec.jam_masuk || rec.checkIn || "--:--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold">Absen Pulang</span>
                  <span className="font-mono font-extrabold text-foreground">
                    {rec.jam_pulang || rec.checkOut || "--:--"}
                  </span>
                </div>
              </div>

              {(rec.foto_masuk || rec.checkInPhoto || rec.foto_keluar || rec.fotoKeluar || rec.checkOutPhoto || rec.foto_pulang_cepat) && (
                <button
                  onClick={() => setSelectedPhoto(rec)}
                  className="w-full py-2 rounded-xl bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Lihat Foto Presensi</span>
                </button>
              )}
            </div>
          ))}

          {userRecords.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
              <History className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">Belum ada riwayat absensi.</p>
            </div>
          )}
        </div>

        {selectedPhoto && (
          <PhotoModal
            isOpen={Boolean(selectedPhoto)}
            onClose={() => setSelectedPhoto(null)}
            fotoMasuk={selectedPhoto.foto_masuk || selectedPhoto.fotoMasuk || selectedPhoto.checkInPhoto || null}
            fotoPulang={selectedPhoto.foto_keluar || selectedPhoto.fotoKeluar || selectedPhoto.checkOutPhoto || selectedPhoto.foto_pulang_cepat || selectedPhoto.foto_pulang || selectedPhoto.fotoPulang || null}
            jamMasuk={selectedPhoto.jam_masuk || selectedPhoto.jamMasuk || selectedPhoto.checkIn || null}
            jamPulang={selectedPhoto.jam_pulang || selectedPhoto.jam_keluar || selectedPhoto.jamKeluar || selectedPhoto.checkOut || null}
            initialType={selectedPhoto.foto_masuk ? "MASUK" : "PULANG"}
            userName={selectedPhoto.user_nama || selectedPhoto.userName || user?.nama || user?.name || "Peserta"}
            userRole={selectedPhoto.user_role || selectedPhoto.userRole || user?.role || "ANAK_MAGANG"}
            attendanceDate={selectedPhoto.tanggal || selectedPhoto.attendanceDate || ""}
            status={selectedPhoto.status}
            lateMinutes={selectedPhoto.menit_terlambat || selectedPhoto.lateMinutes || 0}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
