"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PhotoModal } from "@/components/attendance/PhotoModal";
import { Absensi } from "@/types";
import {
  Printer,
  Search,
  Filter,
  Camera,
  Calendar,
  Clock,
  User,
  Users,
  RefreshCw,
  X,
  Loader2,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function formatWaktu(timeStr?: string | null): string {
  if (!timeStr) return "—";
  return timeStr.slice(0, 5);
}

export default function RekapKehadiranPage() {
  const [records, setRecords] = useState<Absensi[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [debounceSearch, setDebounceSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Modals
  const [selectedPhoto, setSelectedPhoto] = useState<Absensi | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Print Settings State
  const [printSupervisorName, setPrintSupervisorName] = useState<string>("Pembimbing Lapangan");
  const [printSupervisorNip, setPrintSupervisorNip] = useState<string>("-");
  const [printLocation, setPrintLocation] = useState<string>("Jakarta");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (debounceSearch) params.set("q", debounceSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/absensi?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setRecords(data.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Gagal memuat rekap kehadiran:", err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [debounceSearch, roleFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Client-side sort
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const dateA = new Date(a.tanggal || a.attendanceDate || 0).getTime();
      const dateB = new Date(b.tanggal || b.attendanceDate || 0).getTime();
      return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
    });
  }, [records, sortOrder]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = sortedRecords.length;
    let hadirTepat = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    let pulangCepat = 0;

    sortedRecords.forEach((r) => {
      const rawStatus = (r.status || "").toUpperCase();
      const statusMasuk = (r.status_masuk || r.statusMasuk || "").toUpperCase();
      const statusPulang = (r.status_pulang || r.statusPulang || "").toUpperCase();

      if (rawStatus === "HADIR") {
        if (statusMasuk === "TERLAMBAT" || (r.menit_terlambat || 0) > 0) {
          terlambat++;
        } else {
          hadirTepat++;
        }
      } else if (rawStatus === "TERLAMBAT") {
        terlambat++;
      } else if (rawStatus === "IZIN") {
        izin++;
      } else if (rawStatus === "SAKIT") {
        sakit++;
      } else if (rawStatus === "ALPA") {
        alpa++;
      }

      if (statusPulang === "PULANG_CEPAT") {
        pulangCepat++;
      }
    });

    return { total, hadirTepat, terlambat, izin, sakit, alpa, pulangCepat };
  }, [sortedRecords]);

  const handleExecutePrint = () => {
    window.print();
  };

  // Helper to determine the effective display status for a record
  const getRecordStatus = (rec: Absensi) => {
    const rawStatus = (rec.status || "").toUpperCase();
    const statusMasuk = (rec.status_masuk || rec.statusMasuk || "").toUpperCase();

    if (rawStatus === "HADIR") {
      if (statusMasuk === "TERLAMBAT" || (rec.menit_terlambat || rec.lateMinutes || 0) > 0) {
        return "TERLAMBAT";
      }
      return "HADIR";
    }
    return rec.status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:hidden">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Rekap Kehadiran & Presensi
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Laporan terpusat pemantauan presensi dan absensi harian mahasiswa
              magang & pegawai OS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={loadRecords}
              title="Segarkan Data"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`}
              />
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={sortedRecords.length === 0}
              title="Cetak Laporan sebagai PDF"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak sebagai PDF</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Total Presensi
              </span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">
              {stats.total}
            </p>
            <p className="text-[11px] text-muted-foreground">Catatan terekam</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Tepat Waktu
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.hadirTepat}
            </p>
            <p className="text-[11px] text-muted-foreground">Hadir disiplin</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Terlambat
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.terlambat}
            </p>
            <p className="text-[11px] text-muted-foreground">Masuk lewat jam</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Izin / Sakit / Alpa
              </span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">
              {stats.izin + stats.sakit + stats.alpa}{" "}
              <span className="text-xs font-semibold text-muted-foreground">
                ({stats.izin}I / {stats.sakit}S / {stats.alpa}A)
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">Ketidakhadiran</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search Input Box as requested */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari NIP, nama, vendor, atau divisi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Role</option>
                <option value="ANAK_MAGANG">Anak Magang</option>
                <option value="KARYAWAN_OS">Pegawai OS</option>
              </select>
              <Users className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="HADIR">Hadir</option>
                <option value="TERLAMBAT">Terlambat</option>
                <option value="IZIN">Izin</option>
                <option value="SAKIT">Sakit</option>
                <option value="ALPA">Alpa</option>
                <option value="PULANG_CEPAT">Pulang Cepat</option>
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            {/* Date Filter: Tanggal Mulai */}
            <div className="relative">
              <input
                type="date"
                title="Tanggal Mulai"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
              {startDate && (
                <button
                  onClick={() => setStartDate("")}
                  title="Hapus tanggal mulai"
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <button
              onClick={() =>
                setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")
              }
              className="inline-flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
              <span>
                Urutan:{" "}
                {sortOrder === "DESC" ? "Terbaru (DESC)" : "Terlama (ASC)"}
              </span>
            </button>

            {(startDate ||
              endDate ||
              roleFilter !== "ALL" ||
              statusFilter !== "ALL" ||
              search) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setRoleFilter("ALL");
                  setStatusFilter("ALL");
                  setSearch("");
                }}
                className="text-primary hover:underline font-bold text-xs cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-foreground">
                Daftar Rekapitulasi Presensi Kehadiran
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {sortedRecords.length} data
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">
                Memuat rekapitulasi presensi...
              </p>
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Tidak ada data presensi
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Belum ada data kehadiran yang sesuai dengan kriteria pencarian
                dan filter yang dipilih.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[200px]">
                      Pengguna / Pegawai
                    </th>
                    <th className="py-3 px-4 min-w-[150px]">Role & Instansi</th>
                    <th className="py-3 px-4 min-w-[130px]">Tanggal</th>
                    <th className="py-3 px-4 min-w-[110px]">Masuk</th>
                    <th className="py-3 px-4 min-w-[110px]">Pulang</th>
                    <th className="py-3 px-4 min-w-[140px]">
                      Status Kehadiran
                    </th>
                    <th className="py-3 px-4 text-center w-24">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {sortedRecords.map((rec, index) => {
                    const effectiveStatus = getRecordStatus(rec);
                    const isLate =
                      (rec.menit_terlambat || rec.lateMinutes || 0) > 0 ||
                      (rec.status_masuk || "").toUpperCase() === "TERLAMBAT";
                    const isEarlyDeparture =
                      (rec.status_pulang || "").toUpperCase() ===
                      "PULANG_CEPAT";

                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                rec.user_avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  rec.user_nama || rec.userName || "P",
                                )}&background=f59e0b&color=000000&bold=true`
                              }
                              alt={rec.user_nama || "Avatar"}
                              className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground truncate">
                                {rec.user_nama || rec.userName || "Peserta"}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">
                                {rec.user_identity_number ||
                                  rec.userIdentityNumber ||
                                  "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-muted text-foreground border border-border">
                              {rec.user_role === "KARYAWAN_OS"
                                ? "Pegawai OS"
                                : "Anak Magang"}
                            </span>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {rec.user_institution || rec.user_sekolah || "—"}
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              {formatTanggalIndo(
                                rec.tanggal || rec.attendanceDate,
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-500 shrink-0" />
                            <span>
                              {formatWaktu(rec.jam_masuk || rec.checkIn)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>
                              {formatWaktu(
                                rec.jam_keluar ||
                                  rec.jam_pulang ||
                                  rec.checkOut,
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <StatusBadge status={effectiveStatus} />
                            {isLate && (
                              <span className="block text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                +{rec.menit_terlambat || rec.lateMinutes || 1}{" "}
                                mnt terlambat
                              </span>
                            )}
                            {isEarlyDeparture && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Pulang Cepat
                              </span>
                            )}
                            {(rec.keterangan || rec.alasan) &&
                              (rec.status === "IZIN" ||
                                rec.status === "SAKIT") && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
                                  &quot;{rec.keterangan || rec.alasan}&quot;
                                </p>
                              )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {rec.foto_masuk ||
                          rec.checkInPhoto ||
                          rec.foto_keluar ||
                          rec.fotoKeluar ||
                          rec.checkOutPhoto ||
                          rec.foto_pulang_cepat ? (
                            <button
                              onClick={() => setSelectedPhoto(rec)}
                              title="Lihat Foto Bukti"
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <PhotoModal
          isOpen={Boolean(selectedPhoto)}
          onClose={() => setSelectedPhoto(null)}
          fotoMasuk={
            selectedPhoto.foto_masuk ||
            selectedPhoto.fotoMasuk ||
            selectedPhoto.checkInPhoto ||
            null
          }
          fotoPulang={
            selectedPhoto.foto_keluar ||
            selectedPhoto.fotoKeluar ||
            selectedPhoto.checkOutPhoto ||
            selectedPhoto.foto_pulang_cepat ||
            selectedPhoto.foto_pulang ||
            selectedPhoto.fotoPulang ||
            null
          }
          jamMasuk={
            selectedPhoto.jam_masuk ||
            selectedPhoto.jamMasuk ||
            selectedPhoto.checkIn ||
            null
          }
          jamPulang={
            selectedPhoto.jam_pulang ||
            selectedPhoto.jam_keluar ||
            selectedPhoto.jamKeluar ||
            selectedPhoto.checkOut ||
            null
          }
          initialType={selectedPhoto.foto_masuk ? "MASUK" : "PULANG"}
          userName={
            selectedPhoto.user_nama || selectedPhoto.userName || "Peserta"
          }
          userRole={
            selectedPhoto.user_role || selectedPhoto.userRole || "ANAK_MAGANG"
          }
          attendanceDate={
            selectedPhoto.tanggal || selectedPhoto.attendanceDate || ""
          }
          status={selectedPhoto.status}
          lateMinutes={
            selectedPhoto.menit_terlambat || selectedPhoto.lateMinutes || 0
          }
        />
      )}

      {/* PRINT PREVIEW / CETAK PDF MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base md:text-lg font-black text-foreground">
                    Pratinjau & Cetak Laporan PDF Rekap Kehadiran
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {sortedRecords.length} catatan presensi siap dicetak ke
                    format laporan resmi A4.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Controls Setting */}
            <div className="p-4 border-b border-border bg-muted/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Nama Pejabat / Pembimbing
                </label>
                <input
                  type="text"
                  value={printSupervisorName}
                  onChange={(e) => setPrintSupervisorName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-input border border-border rounded-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Contoh: Budi Santoso, S.Kom"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">
                  NIP / Jabatan
                </label>
                <input
                  type="text"
                  value={printSupervisorNip}
                  onChange={(e) => setPrintSupervisorNip(e.target.value)}
                  className="w-full px-3 py-1.5 bg-input border border-border rounded-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Contoh: 19850712 201001 1 008"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Kota / Lokasi Surat
                </label>
                <input
                  type="text"
                  value={printLocation}
                  onChange={(e) => setPrintLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-input border border-border rounded-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Contoh: Jakarta"
                />
              </div>
            </div>

            {/* Document Preview Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-900/10 dark:bg-black/40">
              <div className="bg-white text-black p-8 rounded-lg shadow-md max-w-3xl mx-auto space-y-6 text-xs font-sans">
                {/* Kop Dokumen */}
                <div className="border-b-2 border-black pb-3 text-center space-y-1">
                  <h2 className="text-base font-black uppercase tracking-wider text-black">
                    DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL
                  </h2>
                  <h3 className="text-xs font-bold text-neutral-800 uppercase">
                    SISTEM INFORMASI PRESENSI & KEHADIRAN (HADIR.IN)
                  </h3>
                  <p className="text-[10px] text-neutral-600">
                    Jl. Sultan Agung No.23 Gajah Timur, Magersari, Kec.
                    Sidoarjo, Telp: (031) 8960188, Email:
                    disdukcapil@layanan.go.id
                  </p>
                </div>

                {/* Judul Laporan */}
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-black uppercase underline tracking-wide">
                    LEMBAR LAPORAN REKAPITULASI KEHADIRAN & PRESENSI
                  </h4>
                  <p className="text-[11px] text-neutral-700">
                    Periode: {startDate ? formatTanggalIndo(startDate) : "Awal"}{" "}
                    s/d {endDate ? formatTanggalIndo(endDate) : "Sekarang"}
                    {roleFilter !== "ALL" &&
                      ` • Kategori: ${roleFilter === "KARYAWAN_OS" ? "Pegawai OS" : "Anak Magang"}`}
                  </p>
                </div>

                {/* Rekapitulasi Statistik Box */}
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
                    <span className="block text-neutral-600 font-medium">
                      Total Data
                    </span>
                    <strong className="text-sm text-black">
                      {stats.total}
                    </strong>
                  </div>
                  <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
                    <span className="block text-neutral-600 font-medium">
                      Tepat Waktu
                    </span>
                    <strong className="text-sm text-emerald-600">
                      {stats.hadirTepat}
                    </strong>
                  </div>
                  <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
                    <span className="block text-neutral-600 font-medium">
                      Terlambat
                    </span>
                    <strong className="text-sm text-amber-600">
                      {stats.terlambat}
                    </strong>
                  </div>
                  <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
                    <span className="block text-neutral-600 font-medium">
                      Izin / Sakit / Alpa
                    </span>
                    <strong className="text-sm text-rose-600">
                      {stats.izin + stats.sakit + stats.alpa}
                    </strong>
                  </div>
                </div>

                {/* Tabel Rekapitulasi */}
                <table className="w-full border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
                      <th className="border border-black p-1.5 w-8">No</th>
                      <th className="border border-black p-1.5 min-w-[120px]">
                        Nama Pegawai / Siswa
                      </th>
                      <th className="border border-black p-1.5 w-24">
                        NIP / NIM
                      </th>
                      <th className="border border-black p-1.5 w-24">
                        Role / Instansi
                      </th>
                      <th className="border border-black p-1.5 w-24">
                        Tanggal
                      </th>
                      <th className="border border-black p-1.5 w-16">Masuk</th>
                      <th className="border border-black p-1.5 w-16">Pulang</th>
                      <th className="border border-black p-1.5 w-20">Status</th>
                      <th className="border border-black p-1.5 text-left">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((item, idx) => {
                      const effectiveStatus = getRecordStatus(item);
                      const isLate =
                        (item.menit_terlambat || item.lateMinutes || 0) > 0 ||
                        (item.status_masuk || "").toUpperCase() === "TERLAMBAT";
                      const isEarly =
                        (item.status_pulang || "").toUpperCase() ===
                        "PULANG_CEPAT";

                      let ketText = item.keterangan || item.alasan || "—";
                      if (isLate) {
                        ketText = `Terlambat ${item.menit_terlambat || item.lateMinutes || 1} mnt`;
                      } else if (isEarly) {
                        ketText = `Pulang lebih awal`;
                      }

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-neutral-400"
                        >
                          <td className="border border-black p-1.5 text-center font-semibold">
                            {idx + 1}
                          </td>
                          <td className="border border-black p-1.5 font-bold text-black">
                            {item.user_nama || item.userName || "Peserta"}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono text-[9px]">
                            {item.user_identity_number ||
                              item.userIdentityNumber ||
                              "—"}
                          </td>
                          <td className="border border-black p-1.5 text-center">
                            {item.user_role === "KARYAWAN_OS"
                              ? "Pegawai OS"
                              : "Magang"}
                            <span className="block text-[9px] text-neutral-500">
                              {item.user_institution || item.user_sekolah || ""}
                            </span>
                          </td>
                          <td className="border border-black p-1.5 text-center font-medium">
                            {formatTanggalIndo(
                              item.tanggal || item.attendanceDate,
                            )}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">
                            {formatWaktu(item.jam_masuk || item.checkIn)}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">
                            {formatWaktu(
                              item.jam_keluar ||
                                item.jam_pulang ||
                                item.checkOut,
                            )}
                          </td>
                          <td className="border border-black p-1.5 text-center font-bold">
                            {effectiveStatus === "HADIR"
                              ? "HADIR"
                              : effectiveStatus}
                          </td>
                          <td className="border border-black p-1.5 text-left text-[9px]">
                            {ketText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Lembar Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
                  <div className="space-y-16">
                    <p className="font-semibold">
                      Petugas Rekapitulasi Presensi,
                    </p>
                    <div>
                      <p className="font-bold underline uppercase">
                        ( Administrator Presensi )
                      </p>
                      <p className="text-[10px] text-neutral-600">
                        Admin Sistem Hadir.in
                      </p>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <p className="font-semibold">
                      {printLocation},{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date())}
                      <br />
                      Mengetahui, Penanggung Jawab / Pembimbing
                    </p>
                    <div>
                      <p className="font-bold underline uppercase">
                        {printSupervisorName}
                      </p>
                      <p className="text-[10px] text-neutral-600">
                        NIP: {printSupervisorNip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">
                Tip: Pilih opsi <strong>Save as PDF</strong> pada jendela cetak
                browser.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleExecutePrint}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PRINTABLE CONTAINER (Only visible when printing) */}
      <div className="hidden print:block text-black bg-white p-6 space-y-6 text-xs font-sans">
        {/* Kop Dokumen */}
        <div className="border-b-2 border-black pb-3 text-center space-y-1">
          <h2 className="text-base font-black uppercase tracking-wider text-black">
            DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL
          </h2>
          <h3 className="text-xs font-bold text-neutral-800 uppercase">
            SISTEM INFORMASI PRESENSI & KEHADIRAN (HADIR.IN)
          </h3>
          <p className="text-[10px] text-neutral-600">
            Jl. Sultan Agung No.23 Gajah Timur, Magersari, Kec. Sidoarjo, Telp:
            (031) 8960188, Email: disdukcapil@layanan.go.id
          </p>
        </div>

        {/* Judul Laporan */}
        <div className="text-center space-y-0.5">
          <h4 className="text-sm font-black uppercase underline tracking-wide">
            LEMBAR LAPORAN REKAPITULASI KEHADIRAN & PRESENSI
          </h4>
          <p className="text-[11px] text-neutral-700">
            Periode: {startDate ? formatTanggalIndo(startDate) : "Awal"} s/d{" "}
            {endDate ? formatTanggalIndo(endDate) : "Sekarang"}
            {roleFilter !== "ALL" &&
              ` • Kategori: ${roleFilter === "KARYAWAN_OS" ? "Pegawai OS" : "Anak Magang"}`}
          </p>
        </div>

        {/* Rekapitulasi Statistik Box */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
            <span className="block text-neutral-600 font-medium">
              Total Data
            </span>
            <strong className="text-sm text-black">{stats.total}</strong>
          </div>
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
            <span className="block text-neutral-600 font-medium">
              Tepat Waktu
            </span>
            <strong className="text-sm text-emerald-600">
              {stats.hadirTepat}
            </strong>
          </div>
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
            <span className="block text-neutral-600 font-medium">
              Terlambat
            </span>
            <strong className="text-sm text-amber-600">
              {stats.terlambat}
            </strong>
          </div>
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50">
            <span className="block text-neutral-600 font-medium">
              Izin / Sakit / Alpa
            </span>
            <strong className="text-sm text-rose-600">
              {stats.izin + stats.sakit + stats.alpa}
            </strong>
          </div>
        </div>

        {/* Tabel Rekapitulasi */}
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 min-w-[120px]">
                Nama Pegawai / Siswa
              </th>
              <th className="border border-black p-1.5 w-24">NIP / NIM</th>
              <th className="border border-black p-1.5 w-24">
                Role / Instansi
              </th>
              <th className="border border-black p-1.5 w-24">Tanggal</th>
              <th className="border border-black p-1.5 w-16">Masuk</th>
              <th className="border border-black p-1.5 w-16">Pulang</th>
              <th className="border border-black p-1.5 w-20">Status</th>
              <th className="border border-black p-1.5 text-left">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((item, idx) => {
              const effectiveStatus = getRecordStatus(item);
              const isLate =
                (item.menit_terlambat || item.lateMinutes || 0) > 0 ||
                (item.status_masuk || "").toUpperCase() === "TERLAMBAT";
              const isEarly =
                (item.status_pulang || "").toUpperCase() === "PULANG_CEPAT";

              let ketText = item.keterangan || item.alasan || "—";
              if (isLate) {
                ketText = `Terlambat ${item.menit_terlambat || item.lateMinutes || 1} mnt`;
              } else if (isEarly) {
                ketText = `Pulang lebih awal`;
              }

              return (
                <tr key={item.id} className="border-b border-neutral-400">
                  <td className="border border-black p-1.5 text-center font-semibold">
                    {idx + 1}
                  </td>
                  <td className="border border-black p-1.5 font-bold text-black">
                    {item.user_nama || item.userName || "Peserta"}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono text-[9px]">
                    {item.user_identity_number ||
                      item.userIdentityNumber ||
                      "—"}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {item.user_role === "KARYAWAN_OS" ? "Pegawai OS" : "Magang"}
                    <span className="block text-[9px] text-neutral-500">
                      {item.user_institution || item.user_sekolah || ""}
                    </span>
                  </td>
                  <td className="border border-black p-1.5 text-center font-medium">
                    {formatTanggalIndo(item.tanggal || item.attendanceDate)}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {formatWaktu(item.jam_masuk || item.checkIn)}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {formatWaktu(
                      item.jam_keluar || item.jam_pulang || item.checkOut,
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center font-bold">
                    {effectiveStatus === "HADIR" ? "HADIR" : effectiveStatus}
                  </td>
                  <td className="border border-black p-1.5 text-left text-[9px]">
                    {ketText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Lembar Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
          <div className="space-y-16">
            <p className="font-semibold">Petugas Rekapitulasi Presensi,</p>
            <div>
              <p className="font-bold underline uppercase">
                ( Administrator Presensi )
              </p>
              <p className="text-[10px] text-neutral-600">
                Admin Sistem Hadir.in
              </p>
            </div>
          </div>

          <div className="space-y-16">
            <p className="font-semibold">
              {printLocation},{" "}
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              }).format(new Date())}
              <br />
              Mengetahui, Penanggung Jawab / Pembimbing
            </p>
            <div>
              <p className="font-bold underline uppercase">
                {printSupervisorName}
              </p>
              <p className="text-[10px] text-neutral-600">
                NIP: {printSupervisorNip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

