"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { LogBook, LOGBOOK_CATEGORIES, LOGBOOK_CATEGORY_LABELS, LogBookCategory, User } from "@/types";
import {
  NotebookPen,
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
  RefreshCw,
  Printer,
  Users,
  ShieldAlert,
  FileDown,
} from "lucide-react";
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

function formatWaktu(timeStr?: string | null): string {
  if (!timeStr) return "—";
  return timeStr.slice(0, 5);
}

function getKategoriIcon(kategori: string) {
  const k = (kategori || "").toLowerCase();
  if (k === "programmer") return <Code className="w-3.5 h-3.5" />;
  if (k === "media") return <ImageIcon className="w-3.5 h-3.5" />;
  if (k === "tambah bio data") return <UserPlus className="w-3.5 h-3.5" />;
  if (k === "pindah keluar") return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (k === "pindah datang") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  if (k === "tambah bio data") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  if (k === "akta kematian") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  if (k === "akta kelahiran") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

function getKategoriBadgeClass(kategori: string): string {
  const k = (kategori || "").toLowerCase();
  switch (k) {
    case "akta kelahiran":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "akta kematian":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "tambah bio data":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "pindah keluar":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "pindah datang":
      return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
    case "media":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    case "programmer":
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
    default:
      return "bg-primary/15 text-primary border-primary/30";
  }
}

export default function AdminLogBookPage() {
  const { user } = useAuth();
  const [logbooks, setLogbooks] = useState<LogBook[]>([]);
  const [interns, setInterns] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedInternId, setSelectedInternId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [debounceSearch, setDebounceSearch] = useState('');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedLogbook, setSelectedLogbook] = useState<LogBook | null>(null);

  // Print Settings State
  const [printSupervisorName, setPrintSupervisorName] = useState<string>("Pembimbing Lapangan");
  const [printSupervisorNip, setPrintSupervisorNip] = useState<string>("-");
  const [printLocation, setPrintLocation] = useState<string>("Jakarta");

  // Form State for Edit
  const [formData, setFormData] = useState({
    tanggal: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
    waktu_mulai: "08:00",
    waktu_selesai: "16:00",
    kategori: "programmer",
    aktivitas: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check role: ADMIN_OS is not allowed
  const effectiveRole = String(user?.role || "").toUpperCase();
  const isDenied = effectiveRole === "ADMIN_OS";

  // Fetch daftar mahasiswa / anak magang
  useEffect(() => {
    async function fetchInterns() {
      try {
        const res = await fetch("/api/users/peserta_magang", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          setInterns(data.data);
        }
      } catch (err) {
        console.error("Gagal mengambil data anak magang:", err);
      }
    }
    fetchInterns();
  }, []);

  const fetchLogbooks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedInternId !== "ALL") params.append("peserta_magang_id", selectedInternId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedCategory !== "ALL") params.append("kategori", selectedCategory);
      if (debounceSearch) params.append("q", debounceSearch);
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
      console.error("Gagal mengambil data logbook admin:", err);
      setLogbooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInternId, startDate, endDate, selectedCategory, debounceSearch, sortOrder]);

  useEffect(() => {
    fetchLogbooks();
  }, [fetchLogbooks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

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

      setSuccessMessage("Data logbook berhasil dihapus dari sistem.");
      setIsDeleteModalOpen(false);
      setSelectedLogbook(null);
      fetchLogbooks();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat menghapus.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecutePrint = () => {
    window.print();
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

    return { totalCount, totalHours, todayCount, topCat, catMap };
  }, [logbooks]);

  // Selected intern details for print report
  const selectedInternObj = useMemo(() => {
    if (selectedInternId === "ALL") return null;
    return interns.find((i) => String(i.id) === String(selectedInternId)) || null;
  }, [selectedInternId, interns]);

  if (isDenied) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-foreground">Akses Dibatasi</h2>
          <p className="text-sm text-muted-foreground">
            Role Admin OS tidak memiliki akses ke Manajemen Logbook. Halaman ini khusus untuk manajemen aktivitas siswa/mahasiswa magang.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 print:hidden">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Manajemen Logbook Magang
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Pantau, evaluasi, dan cetak seluruh catatan kegiatan harian serta capaian kerja mahasiswa magang.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchLogbooks}
              title="Segarkan Data"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={logbooks.length === 0}
              title="Cetak Laporan sebagai PDF"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak sebagai PDF</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-3 text-xs md:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
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
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3 text-xs md:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Entri Logbook</span>
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.totalCount}</p>
            <p className="text-[11px] text-muted-foreground">Aktivitas terdata</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Akumulasi Waktu</span>
              <Clock className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.totalHours} <span className="text-sm font-bold text-muted-foreground">Jam</span></p>
            <p className="text-[11px] text-muted-foreground">Total jam kerja tercatat</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Aktivitas Hari Ini</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.todayCount}</p>
            <p className="text-[11px] text-muted-foreground">Entri hari ini</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Kategori Terbanyak</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-base md:text-lg font-black text-foreground truncate">{stats.topCat}</p>
            <p className="text-[11px] text-muted-foreground">Frekuensi tertinggi</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama peserta, aktivitas, atau kategori..."
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

            {/* Intern / Siswa Magang Filter */}
            <div className="relative">
              <select
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Siswa</option>
                {interns.map((intern) => (
                  <option key={intern.id} value={intern.id}>
                    {intern.name || intern.nama} ({intern.institution || intern.sekolah_kampus || "Magang"})
                  </option>
                ))}
              </select>
              <Users className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            {/* Category */}
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

            {/* Date Range: Dari */}
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
              onClick={() => setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")}
              className="inline-flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
              <span>Urutan: {sortOrder === "DESC" ? "Terbaru (DESC)" : "Terlama (ASC)"}</span>
            </button>

            {(startDate || endDate || selectedCategory !== "ALL" || selectedInternId !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedInternId("ALL");
                  setSelectedCategory("ALL");
                  setSearchQuery("");
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
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <h2 className="text-sm md:text-base font-extrabold text-foreground flex items-center gap-2">
              Daftar Logbook Mahasiswa Magang
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {logbooks.length} data
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Memuat logbook sistem...</p>
            </div>
          ) : logbooks.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <NotebookPen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground">Tidak ada data logbook</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Belum ada data aktivitas yang sesuai dengan kriteria filter pencarian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[180px]">Nama Peserta</th>
                    <th className="py-3 px-4 min-w-[130px]">Tanggal</th>
                    <th className="py-3 px-4 min-w-[140px]">Waktu & Durasi</th>
                    <th className="py-3 px-4 min-w-[140px]">Kategori</th>
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
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                item.user_avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  item.user_nama || item.userName || "M"
                                )}&background=72e3ad&color=1e2723&bold=true`
                              }
                              alt={item.user_nama || "Avatar"}
                              className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground truncate">
                                {item.user_nama || item.userName || "Mahasiswa Magang"}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {item.user_institution || item.user_sekolah || "Peserta Magang"}
                              </p>
                            </div>
                          </div>
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
                              className="p-1.5 rounded-lg bg-card border border-border text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
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

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedLogbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h3 className="text-base md:text-lg font-black text-foreground">
                  Edit Catatan Logbook
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
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedLogbook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <Info className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-foreground">
                  Rincian Aktivitas Logbook
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Peserta Magang</span>
                <p className="font-extrabold text-foreground text-sm">
                  {selectedLogbook.user_nama || selectedLogbook.userName || "Mahasiswa Magang"}
                </p>
                <p className="text-muted-foreground">
                  {selectedLogbook.user_institution || selectedLogbook.user_sekolah || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Tanggal</span>
                  <p className="font-extrabold text-foreground">{formatTanggalIndo(selectedLogbook.tanggal)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Waktu & Durasi</span>
                  <p className="font-extrabold text-foreground">
                    {formatWaktu(selectedLogbook.waktu_mulai)} - {formatWaktu(selectedLogbook.waktu_selesai)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Kategori</span>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${getKategoriBadgeClass(selectedLogbook.kategori)}`}>
                    {getKategoriIcon(selectedLogbook.kategori)}
                    <span className="capitalize">{LOGBOOK_CATEGORY_LABELS[selectedLogbook.kategori as LogBookCategory] || selectedLogbook.kategori}</span>
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Uraian Aktivitas</span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedLogbook.aktivitas}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-foreground">Hapus Entri Logbook?</h3>
              <p className="text-xs text-muted-foreground">
                Tindakan ini tidak dapat dibatalkan. Data logbook aktivitas ini akan dihapus permanen.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 text-xs font-bold shadow-md"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / CETAK PDF MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-base md:text-lg font-black text-foreground">
                    Pratinjau & Cetak Laporan PDF Logbook
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {logbooks.length} aktivitas siap dicetak ke format laporan resmi A4.
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
                <label className="block font-bold text-foreground mb-1">Nama Pembimbing Lapangan</label>
                <input
                  type="text"
                  value={printSupervisorName}
                  onChange={(e) => setPrintSupervisorName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-input border border-border rounded-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Contoh: Budi Santoso, S.Kom"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">NIP / Jabatan</label>
                <input
                  type="text"
                  value={printSupervisorNip}
                  onChange={(e) => setPrintSupervisorNip(e.target.value)}
                  className="w-full px-3 py-1.5 bg-input border border-border rounded-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Contoh: 19850712 201001 1 008"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">Kota / Lokasi Surat</label>
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
                    SISTEM INFORMASI PRESENSI & LOGBOOK MAGANG (HADIR.IN)
                  </h3>
                  <p className="text-[10px] text-neutral-600">
                    Jl. Sultan Agung No.23 Gajah Timur, Magersari, Kec. Sidoarjo, Telp: (031) 8960188, Email: disdukcapil@layanan.go.id
                  </p>
                </div>

                {/* Judul Laporan */}
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-black uppercase underline tracking-wide">
                    LEMBAR LAPORAN AKTIVITAS LOGBOOK MAGANG
                  </h4>
                  <p className="text-[11px] text-neutral-700">
                    Periode: {startDate ? formatTanggalIndo(startDate) : "Awal"} s/d {endDate ? formatTanggalIndo(endDate) : "Sekarang"}
                  </p>
                </div>

                {/* Info Peserta jika difilter per individu */}
                {selectedInternObj && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg border border-neutral-300 bg-neutral-50 text-[11px]">
                    <div>
                      <span className="font-semibold text-neutral-600">Nama Mahasiswa: </span>
                      <strong className="text-black">{selectedInternObj.name || selectedInternObj.nama}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-600">Instansi / Kampus: </span>
                      <strong className="text-black">{selectedInternObj.institution || selectedInternObj.sekolah_kampus || "-"}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-600">Program Studi / Divisi: </span>
                      <strong className="text-black">{selectedInternObj.study_program || selectedInternObj.studyProgram || selectedInternObj.bagian || "-"}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-600">No. Identitas / NIM: </span>
                      <strong className="text-black">{selectedInternObj.identityNumber || selectedInternObj.identity_number || "-"}</strong>
                    </div>
                  </div>
                )}

                {/* Tabel Aktivitas */}
                <table className="w-full border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
                      <th className="border border-black p-1.5 w-8">No</th>
                      {!selectedInternObj && <th className="border border-black p-1.5 min-w-[100px]">Peserta</th>}
                      <th className="border border-black p-1.5 w-24">Tanggal</th>
                      <th className="border border-black p-1.5 w-24">Waktu (Jam)</th>
                      <th className="border border-black p-1.5 w-24">Kategori</th>
                      <th className="border border-black p-1.5 text-left">Uraian Aktivitas & Capaian Pekerjaan</th>
                      <th className="border border-black p-1.5 w-16">Durasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logbooks.map((item, idx) => {
                      const durasiJam = item.durasi_menit ? `${Math.floor(item.durasi_menit / 60)}j ${item.durasi_menit % 60}m` : "—";
                      const kat = LOGBOOK_CATEGORY_LABELS[item.kategori as LogBookCategory] || item.kategori;
                      return (
                        <tr key={item.id} className="border-b border-neutral-400">
                          <td className="border border-black p-1.5 text-center font-semibold">{idx + 1}</td>
                          {!selectedInternObj && (
                            <td className="border border-black p-1.5 font-bold">
                              {item.user_nama || item.userName || "Mahasiswa Magang"}
                            </td>
                          )}
                          <td className="border border-black p-1.5 text-center font-medium">
                            {formatTanggalIndo(item.tanggal)}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono">
                            {formatWaktu(item.waktu_mulai)} - {formatWaktu(item.waktu_selesai)}
                          </td>
                          <td className="border border-black p-1.5 text-center capitalize font-semibold">{kat}</td>
                          <td className="border border-black p-1.5 text-left whitespace-pre-wrap">{item.aktivitas}</td>
                          <td className="border border-black p-1.5 text-center font-bold">{durasiJam}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Ringkasan Total */}
                <div className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold">
                  <span>Total Aktivitas Tercatat: {stats.totalCount} kegiatan</span>
                  <span>Total Akumulasi Waktu: {stats.totalHours} Jam</span>
                </div>

                {/* Lembar Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
                  <div className="space-y-16">
                    <p className="font-semibold">
                      Mahasiswa / Siswa Magang,
                    </p>
                    <div>
                      <p className="font-bold underline uppercase">
                        {selectedInternObj?.name || selectedInternObj?.nama || "( ........................................ )"}
                      </p>
                      <p className="text-[10px] text-neutral-600">Peserta Magang</p>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <p className="font-semibold">
                      {printLocation}, {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}
                      <br />
                      Mengetahui, Pembimbing Lapangan
                    </p>
                    <div>
                      <p className="font-bold underline uppercase">{printSupervisorName}</p>
                      <p className="text-[10px] text-neutral-600">NIP: {printSupervisorNip}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">
                Tip: Pilih opsi <strong>Save as PDF</strong> pada jendela cetak browser.
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
                  onClick={handleExecutePrint}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md"
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
            SISTEM INFORMASI PRESENSI & LOGBOOK MAGANG (HADIR.IN)
          </h3>
          <p className="text-[10px] text-neutral-600">
            Jl. Sultan Agung No.23 Gajah Timur, Magersari, Kec. Sidoarjo, Telp: (031) 8960188, Email: disdukcapil@layanan.go.id
          </p>
        </div>

        {/* Judul Laporan */}
        <div className="text-center space-y-0.5">
          <h4 className="text-sm font-black uppercase underline tracking-wide">
            LEMBAR LAPORAN AKTIVITAS LOGBOOK MAGANG
          </h4>
          <p className="text-[11px] text-neutral-700">
            Periode: {startDate ? formatTanggalIndo(startDate) : "Awal"} s/d {endDate ? formatTanggalIndo(endDate) : "Sekarang"}
          </p>
        </div>

        {/* Info Peserta jika difilter per individu */}
        {selectedInternObj && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg border border-neutral-300 bg-neutral-50 text-[11px]">
            <div>
              <span className="font-semibold text-neutral-600">Nama Mahasiswa: </span>
              <strong className="text-black">{selectedInternObj.name || selectedInternObj.nama}</strong>
            </div>
            <div>
              <span className="font-semibold text-neutral-600">Instansi / Kampus: </span>
              <strong className="text-black">{selectedInternObj.institution || selectedInternObj.sekolah_kampus || "-"}</strong>
            </div>
            <div>
              <span className="font-semibold text-neutral-600">Program Studi / Divisi: </span>
              <strong className="text-black">{selectedInternObj.study_program || selectedInternObj.studyProgram || selectedInternObj.bagian || "-"}</strong>
            </div>
            <div>
              <span className="font-semibold text-neutral-600">No. Identitas / NIM: </span>
              <strong className="text-black">{selectedInternObj.identityNumber || selectedInternObj.identity_number || "-"}</strong>
            </div>
          </div>
        )}

        {/* Tabel Aktivitas */}
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
              <th className="border border-black p-1.5 w-8">No</th>
              {!selectedInternObj && <th className="border border-black p-1.5 min-w-[100px]">Peserta</th>}
              <th className="border border-black p-1.5 w-24">Tanggal</th>
              <th className="border border-black p-1.5 w-24">Waktu (Jam)</th>
              <th className="border border-black p-1.5 w-24">Kategori</th>
              <th className="border border-black p-1.5 text-left">Uraian Aktivitas & Capaian Pekerjaan</th>
              <th className="border border-black p-1.5 w-16">Durasi</th>
            </tr>
          </thead>
          <tbody>
            {logbooks.map((item, idx) => {
              const durasiJam = item.durasi_menit ? `${Math.floor(item.durasi_menit / 60)}j ${item.durasi_menit % 60}m` : "—";
              const kat = LOGBOOK_CATEGORY_LABELS[item.kategori as LogBookCategory] || item.kategori;
              return (
                <tr key={item.id} className="border-b border-neutral-400">
                  <td className="border border-black p-1.5 text-center font-semibold">{idx + 1}</td>
                  {!selectedInternObj && (
                    <td className="border border-black p-1.5 font-bold">
                      {item.user_nama || item.userName || "Mahasiswa Magang"}
                    </td>
                  )}
                  <td className="border border-black p-1.5 text-center font-medium">
                    {formatTanggalIndo(item.tanggal)}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {formatWaktu(item.waktu_mulai)} - {formatWaktu(item.waktu_selesai)}
                  </td>
                  <td className="border border-black p-1.5 text-center capitalize font-semibold">{kat}</td>
                  <td className="border border-black p-1.5 text-left whitespace-pre-wrap">{item.aktivitas}</td>
                  <td className="border border-black p-1.5 text-center font-bold">{durasiJam}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Ringkasan Total */}
        <div className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold">
          <span>Total Aktivitas Tercatat: {stats.totalCount} kegiatan</span>
          <span>Total Akumulasi Waktu: {stats.totalHours} Jam</span>
        </div>

        {/* Lembar Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
          <div className="space-y-16">
            <p className="font-semibold">
              Mahasiswa / Siswa Magang,
            </p>
            <div>
              <p className="font-bold underline uppercase">
                {selectedInternObj?.name || selectedInternObj?.nama || "( ........................................ )"}
              </p>
              <p className="text-[10px] text-neutral-600">Peserta Magang</p>
            </div>
          </div>

          <div className="space-y-16">
            <p className="font-semibold">
              {printLocation}, {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}
              <br />
              Mengetahui, Pembimbing Lapangan
            </p>
            <div>
              <p className="font-bold underline uppercase">{printSupervisorName}</p>
              <p className="text-[10px] text-neutral-600">NIP: {printSupervisorNip}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
