"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { LogBook, LOGBOOK_CATEGORIES, LOGBOOK_CATEGORY_LABELS, LogBookCategory } from "@/types";
import {
  NotebookPen,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  BookOpen,
  Code,
  FileText,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  Image as ImageIcon,
  Info,
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

function getKategoriIcon(kategori: string) {
  const k = kategori.toLowerCase();
  if (k === "programmer") return <Code className="w-3.5 h-3.5" />;
  if (k === "media") return <ImageIcon className="w-3.5 h-3.5" />;
  if (k === "tambah bio data") return <UserPlus className="w-3.5 h-3.5" />;
  if (k === "pindah keluar") return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (k === "pindah datang") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

function getKategoriBadgeClass(kategori: string): string {
  const k = kategori.toLowerCase();
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

export default function PegawaiOsLogBookPage() {
  const { user } = useAuth();
  const [logbooks, setLogbooks] = useState<LogBook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedLogbook, setSelectedLogbook] = useState<LogBook | null>(null);

  // Form
  const [formData, setFormData] = useState({
    tanggal: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
    waktu_mulai: "07:30",
    waktu_selesai: "16:00",
    kategori: "media",
    aktivitas: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchLogbooks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (user?.id) params.append("karyawan_os_id", String(user.id));
      if (selectedDate) params.append("tanggal", selectedDate);
      if (selectedCategory !== "ALL") params.append("kategori", selectedCategory);
      if (searchQuery) params.append("q", searchQuery);
      params.append("sort", sortOrder);

      const res = await fetch(`/api/log-book?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setLogbooks(data.data);
      } else {
        setLogbooks([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data logbook pegawai OS:", err);
      setLogbooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, selectedDate, selectedCategory, searchQuery, sortOrder]);

  useEffect(() => {
    fetchLogbooks();
  }, [fetchLogbooks]);

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const resetForm = () => {
    setFormData({
      tanggal: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
      waktu_mulai: "07:30",
      waktu_selesai: "16:00",
      kategori: "media",
      aktivitas: "",
    });
    setErrorMessage(null);
  };

  const handleOpenEdit = (item: LogBook) => {
    setSelectedLogbook(item);
    setFormData({
      tanggal: item.tanggal,
      waktu_mulai: item.waktu_mulai.slice(0, 5),
      waktu_selesai: item.waktu_selesai.slice(0, 5),
      kategori: item.kategori,
      aktivitas: item.aktivitas,
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aktivitas.trim()) {
      setErrorMessage("Deskripsi aktivitas wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await fetch("/api/log-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          karyawan_os_id: user?.id,
        }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menyimpan logbook.");
      }

      setSuccessMessage("Logbook harian Pegawai OS berhasil dicatat!");
      setIsCreateModalOpen(false);
      resetForm();
      fetchLogbooks();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogbook) return;
    if (!formData.aktivitas.trim()) {
      setErrorMessage("Deskripsi aktivitas wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await fetch("/api/log-book", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLogbook.id,
          ...formData,
        }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui logbook.");
      }

      setSuccessMessage("Logbook berhasil diperbarui!");
      setIsEditModalOpen(false);
      setSelectedLogbook(null);
      fetchLogbooks();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memperbarui.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedLogbook) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/log-book?id=${selectedLogbook.id}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus logbook.");
      }

      setSuccessMessage("Logbook berhasil dihapus.");
      setIsDeleteModalOpen(false);
      setSelectedLogbook(null);
      fetchLogbooks();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat menghapus.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (logbooks.length === 0) return;
    const headers = ["No", "Tanggal", "Waktu Mulai", "Waktu Selesai", "Kategori", "Aktivitas", "Dibuat Pada"];
    const rows = logbooks.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.waktu_mulai,
      item.waktu_selesai,
      `"${item.kategori}"`,
      `"${item.aktivitas.replace(/"/g, '""')}"`,
      item.created_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Logbook_Pegawai_OS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const totalCount = logbooks.length;
    const totalMinutes = logbooks.reduce((acc, item) => acc + (item.durasi_menit || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
    const todayCount = logbooks.filter((item) => item.tanggal === todayStr).length;

    const catMap: Record<string, number> = {};
    logbooks.forEach((item) => {
      catMap[item.kategori] = (catMap[item.kategori] || 0) + 1;
    });
    let topCat = "—";
    let maxCount = 0;
    Object.entries(catMap).forEach(([k, v]) => {
      if (v > maxCount) {
        maxCount = v;
        topCat = LOGBOOK_CATEGORY_LABELS[k as LogBookCategory] || k;
      }
    });

    return { totalCount, totalHours, todayCount, topCat };
  }, [logbooks]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <NotebookPen className="w-5 h-5" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Logbook Aktivitas Pegawai OS
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Catat aktivitas kerja harian, penanganan berkas kependudukan, dan tugas operasional harian.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={logbooks.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Export CSV
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Logbook
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-4 rounded-xl status-hadir border flex items-center justify-between gap-3 text-xs md:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl status-alpa border flex items-center justify-between gap-3 text-xs md:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Entri</span>
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.totalCount}</p>
            <p className="text-[11px] text-muted-foreground">Pekerjaan diselesaikan</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Jam Operasional</span>
              <Clock className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.totalHours} <span className="text-sm font-bold text-muted-foreground">Jam</span></p>
            <p className="text-[11px] text-muted-foreground">Durasi produktif</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Hari Ini</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.todayCount}</p>
            <p className="text-[11px] text-muted-foreground">Catatan hari ini</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Kategori Dominan</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-base md:text-lg font-black text-foreground truncate">{stats.topCat}</p>
            <p className="text-[11px] text-muted-foreground">Fokus pekerjaan utama</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari aktivitas atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Kategori</option>
                {LOGBOOK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {LOGBOOK_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  title="Hapus filter tanggal"
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-input border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
              <span>Urutan: {sortOrder === "DESC" ? "Terbaru" : "Terlama"}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <h2 className="text-sm md:text-base font-extrabold text-foreground flex items-center gap-2">
              <span>Riwayat Aktivitas Pegawai OS</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {logbooks.length} data
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Memuat logbook pegawai OS...</p>
            </div>
          ) : logbooks.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <NotebookPen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground">Belum ada catatan logbook</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Mulai catat aktivitas harian pelayanan dan operasional Anda hari ini.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Logbook
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[130px]">Tanggal</th>
                    <th className="py-3 px-4 min-w-[140px]">Waktu & Durasi</th>
                    <th className="py-3 px-4 min-w-[150px]">Kategori</th>
                    <th className="py-3 px-4">Deskripsi Aktivitas</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logbooks.map((item, index) => {
                    const kategoriLabel = LOGBOOK_CATEGORY_LABELS[item.kategori as LogBookCategory] || item.kategori;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{formatTanggalIndo(item.tanggal)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-extrabold text-foreground">
                              <Clock className="w-3 h-3 text-cyan-500 shrink-0" />
                              <span>
                                {formatWaktu(item.waktu_mulai)} - {formatWaktu(item.waktu_selesai)}
                              </span>
                            </div>
                            {item.durasi_menit !== undefined && item.durasi_menit > 0 && (
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                ({Math.floor(item.durasi_menit / 60)}j {item.durasi_menit % 60}m)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${getKategoriBadgeClass(
                              item.kategori
                            )}`}
                          >
                            {getKategoriIcon(item.kategori)}
                            <span className="capitalize">{kategoriLabel}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-foreground/90 font-medium max-w-md">
                          <p className="line-clamp-2">{item.aktivitas}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedLogbook(item);
                                setIsDetailModalOpen(true);
                              }}
                              title="Lihat Detail"
                              className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Logbook"
                              className="p-1.5 rounded-lg bg-card border border-border text-primary hover:bg-primary/10 transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLogbook(item);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Hapus Logbook"
                              className="p-1.5 rounded-lg bg-card border border-border text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <NotebookPen className="w-5 h-5" />
                </span>
                <h3 className="text-base md:text-lg font-black text-foreground">
                  Catat Logbook Pegawai OS
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Tanggal Kegiatan
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.waktu_mulai}
                    onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.waktu_selesai}
                    onChange={(e) => setFormData({ ...formData, waktu_selesai: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Kategori Pekerjaan
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  {LOGBOOK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {LOGBOOK_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Rincian Aktivitas / Layanan
                </label>
                <textarea
                  rows={4}
                  value={formData.aktivitas}
                  onChange={(e) => setFormData({ ...formData, aktivitas: e.target.value })}
                  placeholder="Contoh: Pemrosesan berkas akta kelahiran 5 berkas, verifikasi data pemohon..."
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Logbook"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedLogbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h3 className="text-base md:text-lg font-black text-foreground">
                  Edit Logbook Pegawai OS
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Tanggal Kegiatan
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.waktu_mulai}
                    onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.waktu_selesai}
                    onChange={(e) => setFormData({ ...formData, waktu_selesai: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Kategori Pekerjaan
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  {LOGBOOK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {LOGBOOK_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Rincian Aktivitas
                </label>
                <textarea
                  rows={4}
                  value={formData.aktivitas}
                  onChange={(e) => setFormData({ ...formData, aktivitas: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memperbarui...
                    </>
                  ) : (
                    "Perbarui Logbook"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedLogbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="w-5 h-5" />
                </span>
                <h3 className="text-base md:text-lg font-black text-foreground">
                  Detail Aktivitas Logbook
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border border-border rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Tanggal</span>
                  <p className="font-extrabold text-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    {formatTanggalIndo(selectedLogbook.tanggal)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Waktu Kerja</span>
                  <p className="font-extrabold text-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-500" />
                    {formatWaktu(selectedLogbook.waktu_mulai)} - {formatWaktu(selectedLogbook.waktu_selesai)}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Kategori</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${getKategoriBadgeClass(
                      selectedLogbook.kategori
                    )}`}
                  >
                    {getKategoriIcon(selectedLogbook.kategori)}
                    <span className="capitalize">
                      {LOGBOOK_CATEGORY_LABELS[selectedLogbook.kategori as LogBookCategory] || selectedLogbook.kategori}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Rincian Aktivitas</span>
                <div className="mt-1 p-3.5 bg-input border border-border rounded-xl text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedLogbook.aktivitas}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground pt-2 border-t border-border flex items-center justify-between">
                <span>Dibuat: {selectedLogbook.created_at ? new Date(selectedLogbook.created_at).toLocaleString("id-ID") : "—"}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && selectedLogbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Hapus Catatan Logbook?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Aktivitas pada tanggal <span className="font-bold text-foreground">{formatTanggalIndo(selectedLogbook.tanggal)}</span> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
