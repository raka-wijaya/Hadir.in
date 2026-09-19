"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { TugasItem } from "@/types";
import {
  Briefcase,
  Calendar,
  NotebookPen,
  BookOpen,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

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

  const filteredList = tugasList.filter((item) => {
    const currentStatus = (item.status_pengerjaan || item.statusPengerjaan || "").toUpperCase();
    return statusFilter === "ALL" || currentStatus === statusFilter;
  });

  const belumCount = tugasList.filter(
    (t) => (t.status_pengerjaan || t.statusPengerjaan || "").toUpperCase() === "BELUM_DIKERJAKAN"
  ).length;

  const selesaiCount = tugasList.filter(
    (t) => (t.status_pengerjaan || t.statusPengerjaan || "").toUpperCase() === "SELESAI"
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Tugas &amp; Jobdesk Magang
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Daftar penugasan yang diberikan oleh pembimbing lapangan. Selesaikan tugas dengan mengisi log-book.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchTugas}
              title="Segarkan Data"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="BELUM_DIKERJAKAN">Belum Dikerjakan</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>

        {/* Stats Mini */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3.5 space-y-1 shadow-card">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Total Tugas</p>
            <p className="text-2xl font-black text-foreground">{tugasList.length}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-1 shadow-card">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Belum Selesai</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{belumCount}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1 shadow-card">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Selesai</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selesaiCount}</p>
          </div>
        </div>

        {/* Info Banner */}
        {belumCount > 0 && (
          <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <NotebookPen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">Cara Menyelesaikan Tugas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Untuk menandai tugas sebagai <strong>Selesai</strong>, Anda perlu mengisi log-book harian.
                Pilih tugas terkait saat mengisi log-book, dan tugas akan otomatis ditandai selesai.
              </p>
              <Link
                href="/magang/log-book"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Isi Log-Book Sekarang
              </Link>
            </div>
          </div>
        )}

        {/* Task Cards Grid */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
            <Spinner size="lg" />
            <p className="text-xs font-semibold">Memuat daftar tugas...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3 shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-foreground text-sm md:text-base">
              {statusFilter === "ALL" ? "Belum ada tugas tercatat" : `Tidak ada tugas dengan status "${statusFilter}"`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {statusFilter === "ALL"
                ? "Saat pembimbing memberikan penugasan baru, daftar tugas akan otomatis tampil di halaman ini."
                : "Coba ubah filter status untuk melihat tugas lainnya."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => {
              const isSelesai = (item.status_pengerjaan || item.statusPengerjaan || "").toUpperCase() === "SELESAI";

              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-2xl p-4 space-y-3 shadow-card flex flex-col justify-between transition-all ${
                    isSelesai
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: Status & ID */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status badge — read only, no toggle */}
                        {isSelesai ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Belum Dikerjakan</span>
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60 shrink-0">
                        #{item.id}
                      </span>
                    </div>

                    {/* Judul Tugas */}
                    <h3 className="font-black text-sm md:text-base text-foreground leading-snug">
                      {item.judul_tugas || item.judulTugas || "—"}
                    </h3>

                    {/* Logbook Terkait — shown when SELESAI */}
                    {isSelesai && item.log_book_aktivitas && (
                      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider">
                            Log-Book Terkait
                          </p>
                          <p className="text-foreground/80 line-clamp-2 mt-0.5">
                            {item.log_book_aktivitas}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CTA isi logbook — shown when BELUM_DIKERJAKAN */}
                    {!isSelesai && (
                      <div className="flex items-start gap-1.5 text-[11px] bg-primary/5 border border-primary/15 rounded-xl p-2.5">
                        <NotebookPen className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-muted-foreground">
                          Isi log-book harian dan pilih tugas ini untuk menandainya selesai.
                        </p>
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

                    {/* Link ke halaman log-book jika belum selesai */}
                    {!isSelesai && (
                      <Link
                        href="/magang/log-book"
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-xs transition-all inline-flex items-center gap-1"
                      >
                        <NotebookPen className="w-3 h-3" />
                        Isi Log-Book
                      </Link>
                    )}
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
