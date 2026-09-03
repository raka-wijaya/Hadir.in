"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { TugasItem } from "@/types";
import {
  Briefcase,
  Calendar,
  Code,
  Image as ImageIcon,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  NotebookPen,
  BookOpen,
  CheckCircle2,
  Clock,
} from "lucide-react";

function getKategoriIcon(kategori: string) {
  const k = (kategori || "").toLowerCase();
  if (k === "programmer") return <Code className="w-3.5 h-3.5" />;
  if (k === "media") return <ImageIcon className="w-3.5 h-3.5" />;
  if (k === "tambah bio data") return <UserPlus className="w-3.5 h-3.5" />;
  if (k === "pindah keluar") return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (k === "pindah datang") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  return <NotebookPen className="w-3.5 h-3.5" />;
}

function getKategoriBadgeClass(kategori: string): string {
  const k = (kategori || "").toLowerCase();
  switch (k) {
    case "akta kelahiran":
      return "bg-primary/15 text-primary border-primary/30";
    case "akta kematian":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "tambah bio data":
      return "status-izin";
    case "pindah keluar":
      return "status-terlambat";
    case "pindah datang":
      return "status-hadir";
    case "media":
      return "status-sakit";
    case "programmer":
      return "bg-primary/20 text-primary border-primary/40";
    default:
      return "bg-primary/15 text-primary border-primary/30";
  }
}

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

export default function JobdeskPage() {
  const { user } = useAuth();
  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kategoriFilter, setKategoriFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchTugas = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (user?.id) {
        params.append("peserta_magang_id", String(user.id));
      }
      const res = await fetch(`/api/tugas?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setTugasList(json.data);
      } else {
        setTugasList([]);
      }
    } catch (e) {
      console.error("Gagal memuat tugas:", e);
      setTugasList([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTugas();
  }, [fetchTugas]);

  const handleToggleStatus = async (item: TugasItem) => {
    try {
      const current = (item.status_pengerjaan || item.statusPengerjaan || "").toUpperCase();
      const newStatus = current === "SELESAI" ? "BELUM_DIKERJAKAN" : "SELESAI";

      const res = await fetch("/api/tugas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status_pengerjaan: newStatus,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        fetchTugas();
      }
    } catch (e) {
      console.error("Gagal memperbarui status tugas:", e);
    }
  };

  const filteredList = tugasList.filter((item) => {
    const matchKat =
      kategoriFilter === "ALL" ||
      item.kategori?.toLowerCase() === kategoriFilter.toLowerCase();
    const currentStatus = (item.status_pengerjaan || item.statusPengerjaan || "").toUpperCase();
    const matchStatus =
      statusFilter === "ALL" || currentStatus === statusFilter;
    return matchKat && matchStatus;
  });

  const uniqueCategories = Array.from(
    new Set(tugasList.map((t) => t.kategori).filter(Boolean))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Tugas & Jobdesk Magang
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Daftar penugasan dan aktivitas kerja yang didelegasikan oleh pembimbing lapangan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="BELUM_DIKERJAKAN">Belum Dikerjakan</option>
              <option value="SELESAI">Selesai</option>
            </select>

            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="rounded-xl border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
            >
              <option value="ALL">Semua Kategori ({tugasList.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task Cards Grid */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
            <div className="h-8 w-8 border-3 border-primary border-t-transparent animate-spin rounded-full" />
            <p className="text-xs font-semibold">Memuat daftar tugas...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3 shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-foreground text-sm md:text-base">
              Belum ada tugas tercatat
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Saat pembimbing memberikan penugasan baru, daftar tugas akan otomatis tampil di halaman ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => {
              const katLabel = item.kategori || "Umum";
              const isSelesai = (item.status_pengerjaan || item.statusPengerjaan || "").toUpperCase() === "SELESAI";

              return (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-4.5 space-y-3 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header: Kategori, Status & ID */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getKategoriBadgeClass(
                            katLabel
                          )}`}
                        >
                          {getKategoriIcon(katLabel)}
                          <span className="capitalize">{katLabel}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title="Klik untuk tandai selesai / belum"
                          className="cursor-pointer"
                        >
                          {isSelesai ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Selesai</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Belum</span>
                            </span>
                          )}
                        </button>
                      </div>

                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60 shrink-0">
                        #{item.id}
                      </span>
                    </div>

                    {/* Judul Tugas */}
                    <h3 className="font-black text-sm md:text-base text-foreground leading-snug">
                      {item.judul_tugas || item.judulTugas || "—"}
                    </h3>

                    {/* Deskripsi */}
                    {item.deskripsi && (
                      <p className="text-xs text-muted-foreground leading-relaxed bg-input/50 p-2.5 rounded-xl border border-border/60 line-clamp-4">
                        {item.deskripsi}
                      </p>
                    )}

                    {/* Logbook Terkait */}
                    {item.log_book_aktivitas && (
                      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl p-2.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-primary text-[10px] uppercase tracking-wider">
                            Logbook Terkait
                          </p>
                          <p className="text-foreground/80 line-clamp-2 mt-0.5">
                            {item.log_book_aktivitas}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-2.5 border-t border-border">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {item.log_book_tanggal
                        ? formatTanggalIndo(item.log_book_tanggal)
                        : formatTanggalIndo(item.created_at)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isSelesai
                          ? "bg-muted text-muted-foreground border-border hover:bg-accent"
                          : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs"
                      }`}
                    >
                      {isSelesai ? "Tandai Belum" : "Tandai Selesai"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

