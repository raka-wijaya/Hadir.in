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
  Sparkles,
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
  Printer,
  RefreshCw,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { ModalPortal } from "@/components/ui/ModalPortal";


// Helper: Format tanggal Indonesia
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

// Helper: Format waktu HH:mm
function formatWaktu(timeStr?: string | null): string {
  if (!timeStr) return "—";
  return timeStr.slice(0, 5);
}

// Helper: Get Icon per kategori
function getKategoriIcon(kategori: string) {
  const k = kategori.toLowerCase();
  if (k === "programmer") return <Code className="w-3.5 h-3.5" />;
  if (k === "media") return <ImageIcon className="w-3.5 h-3.5" />;
  if (k === "tambah bio data") return <UserPlus className="w-3.5 h-3.5" />;
  if (k === "pindah keluar") return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (k === "pindah datang") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

// Helper: Badge Style per kategori
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

export default function MagangLogBookPage() {
  const { user } = useAuth();
  const [logbooks, setLogbooks] = useState<LogBook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Tugas pending milik user ini
  const [pendingTugas, setPendingTugas] = useState<
    { id: number; judul_tugas: string }[]
  >([]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedLogbook, setSelectedLogbook] = useState<LogBook | null>(null);

  // Print Settings State
  const [printSupervisorName, setPrintSupervisorName] = useState<string>(
    "Pembimbing Lapangan",
  );
  const [printSupervisorNip, setPrintSupervisorNip] = useState<string>("-");
  const [printLocation, setPrintLocation] = useState<string>("Jakarta");

  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
    aktivitas: "",
  });
  // Tugas terpilih & pencarian tugas untuk dikaitkan saat tambah logbook
  const [selectedTugasId, setSelectedTugasId] = useState<string>("");
  const [tugasSearchQuery, setTugasSearchQuery] = useState<string>("");
  const [isTugasDropdownOpen, setIsTugasDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter tugas berdasarkan query pencarian
  const filteredPendingTugas = useMemo(() => {
    if (!tugasSearchQuery.trim()) return pendingTugas;
    const q = tugasSearchQuery.toLowerCase();
    return pendingTugas.filter(
      (t) =>
        t.judul_tugas.toLowerCase().includes(q) ||
        String(t.id).includes(q),
    );
  }, [pendingTugas, tugasSearchQuery]);

  const selectedTugasObj = useMemo(() => {
    return (
      pendingTugas.find((t) => String(t.id) === String(selectedTugasId)) || null
    );
  }, [pendingTugas, selectedTugasId]);

  // Fetch tugas BELUM_DIKERJAKAN milik user
  const fetchPendingTugas = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/tugas?peserta_magang_id=${user.id}&status_pengerjaan=BELUM_DIKERJAKAN`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setPendingTugas(
          json.data.map((t: any) => ({
            id: t.id,
            judul_tugas: t.judul_tugas || t.judulTugas || `Tugas #${t.id}`,
          })),
        );
      } else {
        setPendingTugas([]);
      }
    } catch {
      setPendingTugas([]);
    }
  }, [user?.id]);

  // Fetch Logbook data (scoped to current user)
  const fetchLogbooks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      // Filter by current logged-in user (peserta_magang_id)
      if (user?.id) {
        params.append("peserta_magang_id", String(user.id));
      }
      if (selectedDate) params.append("tanggal", selectedDate);
      if (selectedCategory !== "ALL")
        params.append("kategori", selectedCategory);
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
      console.error("Gagal mengambil data logbook:", err);
      setLogbooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.id,
    user?.role,
    selectedDate,
    selectedCategory,
    searchQuery,
    sortOrder,
  ]);

  useEffect(() => {
    fetchLogbooks();
  }, [fetchLogbooks]);

  useEffect(() => {
    fetchPendingTugas();
  }, [fetchPendingTugas]);

  // Alert Auto-hide
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Form Reset
  const resetForm = () => {
    setFormData({
      tanggal: new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
      }).format(new Date()),
      aktivitas: "",
    });
    setSelectedTugasId("");
    setTugasSearchQuery("");
    setIsTugasDropdownOpen(false);
    setErrorMessage(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: LogBook) => {
    setSelectedLogbook(item);
    setFormData({
      tanggal: item.tanggal,
      aktivitas: item.aktivitas,
    });
    setIsEditModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aktivitas.trim()) {
      setErrorMessage("Deskripsi aktivitas wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: Record<string, any> = {
        tanggal: formData.tanggal,
        aktivitas: formData.aktivitas,
        peserta_magang_id: user?.id,
      };

      // Jika ada tugas yang dipilih, kirimkan tugas_id agar API menandai tugas tersebut SELESAI
      if (selectedTugasId) {
        payload.tugas_id = Number(selectedTugasId);
      }

      const res = await fetch("/api/log-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menyimpan logbook.");
      }

      const linked = result.data?.tugas_id || result.record?.tugas_id;
      setSuccessMessage(
        linked
          ? "Logbook berhasil disimpan & tugas terkait ditandai Selesai!"
          : "Logbook berhasil ditambahkan!",
      );
      setIsCreateModalOpen(false);
      resetForm();
      fetchLogbooks();
      fetchPendingTugas(); // refresh daftar tugas pending
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
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
          tanggal: formData.tanggal,
          aktivitas: formData.aktivitas,
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

  // Submit Delete
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

  // Export CSV
  const handleExportCSV = () => {
    if (logbooks.length === 0) return;
    const headers = [
      "No",
      "Tanggal",
      "Aktivitas",
      "Dibuat Pada",
    ];
    const rows = logbooks.map((item, idx) => [
      idx + 1,
      item.tanggal,
      `"${item.aktivitas.replace(/"/g, '""')}"`,
      item.created_at,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Logbook_Magang_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const totalCount = logbooks.length;
    const todayStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    const todayCount = logbooks.filter(
      (item) => item.tanggal === todayStr,
    ).length;

    const thisMonthStr = todayStr.slice(0, 7);
    const thisMonthCount = logbooks.filter((item) =>
      item.tanggal?.startsWith(thisMonthStr),
    ).length;

    return { totalCount, todayCount, thisMonthCount };
  }, [logbooks]);

  return (
    <DashboardLayout>
      <div className="space-y-6 print:hidden">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Logbook Aktivitas Magang
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Catat dan pantau seluruh kegiatan harian, tugas, dan capaian
              magang Anda secara transparan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchLogbooks}
              title="Segarkan Data"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`}
              />
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={logbooks.length === 0}
              title="Cetak Logbook sebagai PDF"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-primary" />
              Cetak PDF
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
            <button
              onClick={() => setSuccessMessage(null)}
              className="hover:opacity-70"
            >
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
            <button
              onClick={() => setErrorMessage(null)}
              className="hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Total Entri
              </span>
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">
              {stats.totalCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Semua aktivitas tercatat
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Hari Ini
              </span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">
              {stats.todayCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Entri hari ini</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Bulan Ini
              </span>
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">
              {stats.thisMonthCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Entri bulan berjalan
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari catatan aktivitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Filter */}
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
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() =>
                setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-input border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
              <span>
                Urutan: {sortOrder === "DESC" ? "Terbaru" : "Terlama"}
              </span>
            </button>
          </div>
        </div>

        {/* Logbook List / Table */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="font-extrabold text-foreground mt-0.5 text-[15px] md:text-lg">
                  Daftar Riwayat Logbook
                </h2>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20 shrink-0">
              {logbooks.length} Data
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Spinner size="lg" />
            </div>
          ) : logbooks.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <NotebookPen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Belum ada catatan logbook
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Anda belum memiliki logbook yang sesuai dengan filter. Klik
                tombol &ldquo;Catat Logbook&rdquo; untuk mulai mencatat
                kegiatan.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Logbook Sekarang
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[140px]">Tanggal</th>
                    <th className="py-3 px-4">Deskripsi Aktivitas</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logbooks.map((item, index) => {
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
                        <td className="py-3.5 px-4 text-foreground/90 font-medium">
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
                              className="p-1.5 rounded-lg bg-card border border-border text-blue-500 hover:bg-blue-500/10 transition-all cursor-pointer"
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

      {/* MODAL: Tambah Logbook */}
      {isCreateModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] md:text-lg font-black text-foreground">
                  Catat Logbook Baru
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
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>


              {/* Fitur Cari Tugas untuk Ditandai Selesai */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Kaitkan Tugas untuk Diselesaikan{" "}
                  <span className="font-normal text-muted-foreground">
                    (opsional / gunakan pencarian)
                  </span>
                </label>

                {selectedTugasObj ? (
                  /* Card Tugas Terpilih */
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          #{selectedTugasObj.id} · {selectedTugasObj.judul_tugas}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span>✓</span> Status tugas otomatis jadi SELESAI saat logbook disimpan
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTugasId("");
                        setTugasSearchQuery("");
                      }}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-all cursor-pointer shrink-0 ml-2"
                      title="Batalkan / Ganti Tugas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Input Pencarian Tugas */
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={tugasSearchQuery}
                        onChange={(e) => {
                          setTugasSearchQuery(e.target.value);
                          setIsTugasDropdownOpen(true);
                        }}
                        onFocus={() => setIsTugasDropdownOpen(true)}
                        placeholder={
                          pendingTugas.length > 0
                            ? `Cari dari ${pendingTugas.length} tugas yang belum selesai...`
                            : "Tidak ada tugas yang belum selesai"
                        }
                        disabled={pendingTugas.length === 0}
                        className="w-full pl-9 pr-8 py-2.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground disabled:opacity-50"
                      />
                      {tugasSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTugasSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Popover / List Hasil Pencarian */}
                    {isTugasDropdownOpen && pendingTugas.length > 0 && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsTugasDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-card border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto p-1.5 text-xs divide-y divide-border/40 animate-in fade-in zoom-in-95">
                          <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Pilih tugas yang ingin diselesaikan</span>
                            <span>{filteredPendingTugas.length} ditemukan</span>
                          </div>

                          {filteredPendingTugas.length === 0 ? (
                            <div className="p-3 text-center text-muted-foreground text-[11px]">
                              Tidak ada tugas yang cocok dengan &quot;{tugasSearchQuery}&quot;
                            </div>
                          ) : (
                            filteredPendingTugas.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTugasId(String(t.id));
                                  setIsTugasDropdownOpen(false);
                                  setTugasSearchQuery("");
                                  // Auto-fill aktivitas jika masih kosong
                                  if (!formData.aktivitas.trim()) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      aktivitas: t.judul_tugas,
                                    }));
                                  }
                                }}
                                className="w-full text-left p-2.5 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                    #{t.id} · {t.judul_tugas}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Klik untuk menautkan & menandai tugas ini Selesai
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                  Belum Selesai
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Rincian Aktivitas / Kegiatan
                </label>
                <textarea
                  rows={4}
                  value={formData.aktivitas}
                  onChange={(e) =>
                    setFormData({ ...formData, aktivitas: e.target.value })
                  }
                  placeholder="Tuliskan secara detail apa yang Anda kerjakan, capaian tugas, atau kendala yang dihadapi..."
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
                      <Spinner size="sm" />
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
        </ModalPortal>
      )}

      {/* MODAL: Edit Logbook */}
      {isEditModalOpen && selectedLogbook && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h3 className="text-[16px] md:text-lg font-black text-foreground">
                  Edit Logbook Aktivitas
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
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>



              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Rincian Aktivitas / Kegiatan
                </label>
                <textarea
                  rows={4}
                  value={formData.aktivitas}
                  onChange={(e) =>
                    setFormData({ ...formData, aktivitas: e.target.value })
                  }
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
                      <Spinner size="sm" />
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
        </ModalPortal>
      )}

      {/* MODAL: Detail Logbook */}
      {isDetailModalOpen && selectedLogbook && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="w-5 h-5" />
                </span>
                <h3 className="text-[16px] md:text-lg font-black text-foreground">
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
              <div className="p-3 bg-muted/30 border border-border rounded-xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Tanggal Kegiatan
                </span>
                <p className="font-extrabold text-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {formatTanggalIndo(selectedLogbook.tanggal)}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Rincian Aktivitas
                </span>
                <div className="mt-1 p-3.5 bg-input border border-border rounded-xl text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedLogbook.aktivitas}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground pt-2 border-t border-border flex items-center justify-between">
                <span>
                  Dibuat:{" "}
                  {selectedLogbook.created_at
                    ? new Date(selectedLogbook.created_at).toLocaleString(
                        "id-ID",
                      )
                    : "—"}
                </span>
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
        </ModalPortal>
      )}

      {/* MODAL: Hapus Logbook */}
      {isDeleteModalOpen && selectedLogbook && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-black text-foreground">
                Hapus Catatan Logbook?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Aktivitas pada tanggal{" "}
                <span className="font-bold text-foreground">
                  {formatTanggalIndo(selectedLogbook.tanggal)}
                </span>{" "}
                akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
                {isSubmitting ? <Spinner size="sm" /> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* PRINT PREVIEW / CETAK PDF MODAL */}
      {isPrintModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-[16px] md:text-lg font-black text-foreground">
                    Pratinjau & Cetak Logbook Magang
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {logbooks.length} aktivitas siap dicetak. Gunakan Save as
                    PDF di jendela cetak browser.
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
                  Nama Pembimbing Lapangan
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
                  NIP / Jabatan Pembimbing
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

            {/* Document Preview Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-900/10 dark:bg-black/40">
              <div className="bg-white text-black p-8 rounded-lg shadow-md max-w-3xl mx-auto space-y-6 text-xs font-sans">
                {/* Kop Dokumen */}
                <div className="border-b-2 border-black pb-3 text-center space-y-1">
                  <h2 className="text-[16px] font-black uppercase tracking-wider text-black">
                    DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL
                  </h2>
                  <h3 className="text-xs font-bold text-neutral-800 uppercase">
                    SISTEM INFORMASI PRESENSI & LOGBOOK MAGANG (HADIR.IN)
                  </h3>
                  <p className="text-[10px] text-neutral-600">
                    Jl. Sultan Agung No.23 Gajah Timur, Magersari, Kec.
                    Sidoarjo, Telp: (031) 8960188, Email:
                    disdukcapil@layanan.go.id
                  </p>
                </div>

                {/* Judul & Identitas Mahasiswa */}
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-black uppercase underline tracking-wide">
                    LEMBAR LAPORAN AKTIVITAS LOGBOOK MAGANG
                  </h4>
                </div>

                {/* Data Identitas Peserta */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg border border-neutral-300 bg-neutral-50 text-[11px]">
                  <div>
                    <span className="font-semibold text-neutral-600">
                      Nama Mahasiswa / Siswa:{" "}
                    </span>
                    <strong className="text-black">
                      {user?.name || user?.nama || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-600">
                      Instansi / Kampus / Sekolah:{" "}
                    </span>
                    <strong className="text-black">
                      {user?.institution || user?.sekolah_kampus || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-600">
                      Program Studi / Jurusan:{" "}
                    </span>
                    <strong className="text-black">
                      {user?.study_program || user?.studyProgram || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-600">
                      No. Identitas / NIM / NIS:{" "}
                    </span>
                    <strong className="text-black">
                      {user?.identity_number || user?.identityNumber || "—"}
                    </strong>
                  </div>
                </div>

                {/* Tabel Aktivitas */}
                <table className="w-full border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
                      <th className="border border-black p-1.5 w-8">No</th>
                      <th className="border border-black p-1.5 w-28">
                        Tanggal
                      </th>
                      <th className="border border-black p-1.5 text-left">
                        Uraian Aktivitas & Capaian Pekerjaan
                      </th>
                      <th className="border border-black p-1.5 w-24 text-center">
                        Paraf Pembimbing
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logbooks.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-b border-neutral-400 align-top"
                      >
                        <td className="border border-black p-1.5 text-center font-semibold">
                          {idx + 1}
                        </td>
                        <td className="border border-black p-1.5 text-center font-medium whitespace-nowrap">
                          {formatTanggalIndo(item.tanggal)}
                        </td>
                        <td className="border border-black p-1.5 text-left whitespace-pre-wrap">
                          {item.aktivitas}
                        </td>
                        <td className="border border-black p-1.5"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total */}
                <div className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold">
                  <span>
                    Total Aktivitas Tercatat: {stats.totalCount} kegiatan
                  </span>
                  <span>Dokumen Resmi Logbook Magang</span>
                </div>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
                  <div className="space-y-16">
                    <p className="font-semibold">Mahasiswa / Siswa Magang,</p>
                    <div>
                      <p className="font-bold underline uppercase">
                        {user?.name ||
                          user?.nama ||
                          "( ........................................ )"}
                      </p>
                      <p className="text-[10px] text-neutral-600">
                        Peserta Magang
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
                      Mengetahui, Pembimbing Lapangan
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
                browser untuk menyimpan sebagai PDF.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-bold transition-all"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Download PDF</span>
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* DEDICATED PRINTABLE CONTAINER (Only visible when printing) */}
      <div className="hidden print:block text-black bg-white p-6 space-y-6 text-xs font-sans">
        {/* Kop Dokumen */}
        <div className="border-b-2 border-black pb-3 text-center space-y-1">
          <h2 className="text-[16px] font-black uppercase tracking-wider text-black">
            DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL
          </h2>
          <h3 className="text-xs font-bold text-neutral-800 uppercase">
            SISTEM INFORMASI PRESENSI & LOGBOOK MAGANG (HADIR.IN)
          </h3>
          <p className="text-[10px] text-neutral-600">
            Jl. Sultan Agung No.23 Gajah Timur, Magersari, Kec. Sidoarjo, Telp:
            (031) 8960188, Email: disdukcapil@layanan.go.id
          </p>
        </div>

        {/* Judul */}
        <div className="text-center">
          <h4 className="text-sm font-black uppercase underline tracking-wide">
            LEMBAR LAPORAN AKTIVITAS LOGBOOK MAGANG
          </h4>
        </div>

        {/* Data Identitas Peserta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg border border-neutral-300 bg-neutral-50 text-[11px]">
          <div>
            <span className="font-semibold text-neutral-600">
              Nama Mahasiswa / Siswa:{" "}
            </span>
            <strong className="text-black">
              {user?.name || user?.nama || "—"}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-neutral-600">
              Instansi / Kampus / Sekolah:{" "}
            </span>
            <strong className="text-black">
              {user?.institution || user?.sekolah_kampus || "—"}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-neutral-600">
              Program Studi / Jurusan:{" "}
            </span>
            <strong className="text-black">
              {user?.study_program || user?.studyProgram || "—"}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-neutral-600">
              No. Identitas / NIM / NIS:{" "}
            </span>
            <strong className="text-black">
              {user?.identity_number || user?.identityNumber || "—"}
            </strong>
          </div>
        </div>

        {/* Tabel Aktivitas */}
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 w-28">Tanggal</th>
              <th className="border border-black p-1.5 text-left">
                Uraian Aktivitas & Capaian Pekerjaan
              </th>
              <th className="border border-black p-1.5 w-24 text-center">Paraf Pembimbing</th>
            </tr>
          </thead>
          <tbody>
            {logbooks.map((item, idx) => (
              <tr key={item.id} className="border-b border-neutral-400 align-top">
                <td className="border border-black p-1.5 text-center font-semibold">
                  {idx + 1}
                </td>
                <td className="border border-black p-1.5 text-center font-medium whitespace-nowrap">
                  {formatTanggalIndo(item.tanggal)}
                </td>
                <td className="border border-black p-1.5 text-left whitespace-pre-wrap">
                  {item.aktivitas}
                </td>
                <td className="border border-black p-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold">
          <span>Total Aktivitas Tercatat: {stats.totalCount} kegiatan</span>
          <span>Dokumen Resmi Logbook Magang</span>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
          <div className="space-y-16">
            <p className="font-semibold">Mahasiswa / Siswa Magang,</p>
            <div>
              <p className="font-bold underline uppercase">
                {user?.name ||
                  user?.nama ||
                  "( ........................................ )"}
              </p>
              <p className="text-[10px] text-neutral-600">Peserta Magang</p>
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
              Mengetahui, Pembimbing Lapangan
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
