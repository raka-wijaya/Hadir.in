"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TugasItem, LOGBOOK_CATEGORY_LABELS, LogBookCategory } from "@/types";
import {
  Briefcase,
  Calendar,
  Code,
  Image as ImageIcon,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  NotebookPen,
  Layers,
  BookOpen,
  Sparkles,
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
  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kategoriFilter, setKategoriFilter] = useState<string>("ALL");

  const fetchTugas = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/jobdesk", { cache: "no-store" });
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
  };

  useEffect(() => {
    fetchTugas();
  }, []);

  const filteredList = tugasList.filter((item) => {
    if (kategoriFilter === "ALL") return true;
    return item.kategori?.toLowerCase() === kategoriFilter.toLowerCase();
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

          <div className="flex items-center gap-2">
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="rounded-xl border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold"
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
              return (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-4.5 space-y-3 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header: Kategori & ID */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getKategoriBadgeClass(
                          katLabel
                        )}`}
                      >
                        {getKategoriIcon(katLabel)}
                        <span className="capitalize">{katLabel}</span>
                      </span>

                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
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

                    {item.user_nama && (
                      <span className="font-bold text-foreground text-[10px] truncate max-w-[120px]">
                        {item.user_nama}
                      </span>
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
