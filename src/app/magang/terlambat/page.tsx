"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/auth/context";
import { Absensi } from "@/types";
import { Clock, AlertTriangle } from "lucide-react";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

export default function TerlambatPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Absensi[]>([]);
  const [jamMasukStandar, setJamMasukStandar] = useState("07:30");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [absRes, setRes] = await Promise.all([
        fetch(`/api/absensi?peserta_magang_id=${user.id}`, { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);

      if (absRes.ok) {
        const absData = await absRes.json();
        if (absData.success && Array.isArray(absData.data)) {
          setRecords(absData.data);
        }
      }

      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.success && setData.settings?.jam_masuk_standar) {
          setJamMasukStandar(setData.settings.jam_masuk_standar);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data keterlambatan:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lateRecords = records.filter(
    (a) =>

      String(a.status || "").toUpperCase() === "TERLAMBAT" ||
      String(a.status_masuk || "").toUpperCase() === "TERLAMBAT" ||
      (a.menit_terlambat ?? a.lateMinutes ?? 0) > 0
  );

  const totalLateMinutes = lateRecords.reduce(
    (acc, curr) => acc + (curr.menit_terlambat ?? curr.lateMinutes ?? 0),
    0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Catatan Keterlambatan Saya
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold">
            Laporan keterlambatan dan durasi menit berdasarkan konfigurasi jam kerja server ({jamMasukStandar} WIB)
          </p>
        </div>

        {/* Total Late Stats Card */}
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 shadow-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Total Akumulasi Keterlambatan
            </span>
            <div className="text-3xl font-black text-primary font-mono">
              {totalLateMinutes} Menit
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-primary/20 text-primary">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold text-xs uppercase">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk Server</th>
                  <th className="py-3 px-4">Durasi Keterlambatan</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lateRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-status-hadir font-extrabold text-xs">
                      ✓ Luar biasa! Anda tidak memiliki catatan keterlambatan bulan ini.
                    </td>
                  </tr>
                ) : (
                  lateRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-extrabold text-xs text-foreground">
                        {formatDisplayDate(r.tanggal || r.attendanceDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-status-terlambat font-extrabold">
                        {r.jam_masuk || r.checkIn} WIB
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-extrabold text-status-alpa">
                        +{r.menit_terlambat ?? r.lateMinutes ?? 0} Menit
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status="terlambat" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
