"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/auth/context";
import { Absensi } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

export default function KehadiranPage() {
  const { user } = useAuth();

  const [month, setMonth] = useState("08-2026");
  const [records, setRecords] = useState<Absensi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  // FETCH DATA
  // ============================================================

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const absRes = await fetch(
        `/api/absensi?peserta_magang_id=${encodeURIComponent(user.id)}`,
        {
          cache: "no-store",
        }
      );

      if (absRes.ok) {
        const absData = await absRes.json();

        if (
          absData.success &&
          Array.isArray(absData.data)
        ) {
          setRecords(absData.data);
        }
      }
    } catch (err) {
      console.error(
        "Gagal mengambil data kehadiran:",
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // FILTER BULAN
  // ============================================================

  const monthlyRecords = useMemo(() => {
    return records.filter((record) => {
      const tanggal =
        record.tanggal ||
        record.attendanceDate ||
        "";

      if (!tanggal) return false;

      return tanggal.slice(0, 7) === month;
    });
  }, [records, month]);

  // ============================================================
  // STATISTIK
  // ============================================================

  const hadirCount = monthlyRecords.filter(
    (record) => {
      const statusMasuk =
        String(
          record.status_masuk || ""
        ).toUpperCase();

      const status =
        String(
          record.status || ""
        ).toUpperCase();

      return (
        statusMasuk === "TEPAT_WAKTU" ||
        status === "HADIR" ||
        status === "PRESENT"
      );
    }
  ).length;

  const terlambatCount =
    monthlyRecords.filter(
      (record) => {
        const statusMasuk =
          String(
            record.status_masuk || ""
          ).toUpperCase();

        const status =
          String(
            record.status || ""
          ).toUpperCase();

        return (
          statusMasuk === "TERLAMBAT" ||
          status === "TERLAMBAT" ||
          status === "LATE"
        );
      }
    ).length;

  const izinCount =
    monthlyRecords.filter(
      (record) => {
        const status =
          String(
            record.status || ""
          ).toUpperCase();

        return status === "IZIN" || status === "SAKIT";
      }
    ).length;

  const totalHari =
    monthlyRecords.length;

  const persentase =
    totalHari > 0
      ? Math.round(
          ((hadirCount +
            terlambatCount) /
            totalHari) *
            100
        )
      : 0;

  // ============================================================
  // LABEL BULAN
  // ============================================================

  const monthLabel = useMemo(() => {
    const [year, monthNumber] =
      month.split("-");

    const date = new Date(
      Number(year),
      Number(monthNumber) - 1,
      1
    );

    return new Intl.DateTimeFormat(
      "id-ID",
      {
        month: "long",
        year: "numeric",
      }
    ).format(date);
  }, [month]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Kehadiran Saya
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground font-semibold">
              Rekapitulasi persentase &amp; daftar presensi bulanan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-input border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            />
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* HADIR */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-card text-center">
            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">
              Hadir
            </span>

            <div className="text-2xl font-black text-primary">
              {isLoading ? "..." : hadirCount}
            </div>
          </div>

          {/* TERLAMBAT */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-card text-center">
            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">
              Terlambat
            </span>

            <div className="text-2xl font-black text-status-terlambat">
              {isLoading ? "..." : terlambatCount}
            </div>
          </div>

          {/* IZIN */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-card text-center">
            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">
              Izin
            </span>

            <div className="text-2xl font-black text-status-izin">
              {isLoading ? "..." : izinCount}
            </div>
          </div>

          {/* PERSENTASE */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-card text-center">
            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">
              Persentase
            </span>

            <div className="text-2xl font-black text-primary">
              {isLoading ? "..." : `${persentase}%`}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-4 border-b border-border">
            <h2 className="font-black text-sm text-foreground">
              Presensi {monthLabel}
            </h2>

            <p className="text-xs text-muted-foreground mt-1">
              Menampilkan {monthlyRecords.length} data presensi.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold text-xs uppercase">
                  <th className="py-3 px-4">Tanggal</th>

                  <th className="py-3 px-4">Jam Masuk</th>

                  <th className="py-3 px-4">Status Masuk</th>

                  <th className="py-3 px-4">Jam Pulang</th>

                  <th className="py-3 px-4">Status Pulang</th>

                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground font-semibold"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : monthlyRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground font-semibold"
                    >
                      Belum ada data kehadiran bulan ini.
                    </td>
                  </tr>
                ) : (
                  monthlyRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-accent/40 transition-colors"
                    >
                      {/* TANGGAL */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-xs text-foreground">
                        {formatDisplayDate(
                          record.tanggal || record.attendanceDate,
                        )}
                      </td>

                      {/* JAM MASUK */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-foreground">
                        {record.jam_masuk || record.checkIn || "--:--"}
                      </td>

                      {/* STATUS MASUK */}
                      <td className="py-3.5 px-4">
                        {String(record.status_masuk || "").toUpperCase() ===
                        "TEPAT_WAKTU" ? (
                          <span className="font-bold text-status-hadir">
                            Tepat Waktu
                          </span>
                        ) : String(record.status_masuk || "").toUpperCase() ===
                          "TERLAMBAT" ? (
                          <span className="font-bold text-status-terlambat">
                            Terlambat
                            {record.menit_terlambat
                              ? ` (+${record.menit_terlambat} mnt)`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>

                      {/* JAM PULANG */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-foreground">
                        {record.jam_pulang || record.checkOut || "--:--"}
                      </td>

                      {/* STATUS PULANG */}
                      <td className="py-3.5 px-4">
                        {String(record.status_pulang || "").toUpperCase() ===
                        "TEPAT_WAKTU" ? (
                          <span className="font-bold text-status-hadir">
                            Tepat Waktu
                          </span>
                        ) : String(record.status_pulang || "").toUpperCase() ===
                          "PULANG_CEPAT" ? (
                          <span className="font-bold text-status-terlambat">
                            Pulang Cepat
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>

                      {/* STATUS TOTAL */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={record.status} />
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