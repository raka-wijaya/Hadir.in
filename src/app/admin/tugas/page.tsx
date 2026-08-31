"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { TugasItem, User, LogBook } from "@/types";
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Layers,
  ArrowUpDown,
  BookOpen,
  Code,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  Image as ImageIcon,
  RefreshCw,
  Users,
  Eye,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const KATEGORI_OPTIONS = [
  "programmer",
  "media",
  "tambah bio data",
  "akta kelahiran",
  "akta kematian",
  "pindah keluar",
  "pindah datang",
  "Umum",
] as const;

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

function getKategoriIcon(kategori: string) {
  const k = (kategori || "").toLowerCase();

  if (k === "programmer") {
    return <Code className="w-3.5 h-3.5" />;
  }

  if (k === "media") {
    return <ImageIcon className="w-3.5 h-3.5" />;
  }

  if (k === "tambah bio data") {
    return <UserPlus className="w-3.5 h-3.5" />;
  }

  if (k === "pindah keluar") {
    return <ArrowUpRight className="w-3.5 h-3.5" />;
  }

  if (k === "pindah datang") {
    return <ArrowDownLeft className="w-3.5 h-3.5" />;
  }

  return <Briefcase className="w-3.5 h-3.5" />;
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

    case "umum":
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}

function getInitial(name?: string | null): string {
  return (name || "P").trim().charAt(0).toUpperCase();
}

export default function AdminTugasPage() {
  const { user } = useAuth();

  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [interns, setInterns] = useState<User[]>([]);
  const [logbooks, setLogbooks] = useState<LogBook[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debounceSearch, setDebounceSearch] = useState<string>("");
  const [selectedInternId, setSelectedInternId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedTugas, setSelectedTugas] = useState<TugasItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    peserta_magang_id: "",
    log_book_id: "",
    judul_tugas: "",
    deskripsi: "",
    kategori: "programmer",
  });

  const [selectedCreateInternIds, setSelectedCreateInternIds] = useState<
    string[]
  >([]);
  const [internSearchModal, setInternSearchModal] = useState<string>("");
  const [isInternDropdownOpen, setIsInternDropdownOpen] =
    useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredInternsInModal = useMemo(() => {
    if (!internSearchModal.trim()) return interns;
    const q = internSearchModal.toLowerCase().trim();
    return interns.filter((i) => {
      const name = (i.name || i.nama || "").toLowerCase();
      const inst = (i.institution || i.sekolah_kampus || "").toLowerCase();
      return name.includes(q) || inst.includes(q);
    });
  }, [interns, internSearchModal]);

  const effectiveRole = String(user?.role || "").toUpperCase();
  const isDenied = effectiveRole === "ADMIN_OS";

  // =========================================================
  // DEBOUNCE SEARCH
  // =========================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // =========================================================
  // FETCH INTERNS
  // =========================================================

  useEffect(() => {
    async function fetchInterns() {
      try {
        const res = await fetch("/api/users/peserta_magang", {
          cache: "no-store",
        });

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

  // =========================================================
  // FETCH LOGBOOK
  // =========================================================

  useEffect(() => {
    async function fetchLogbooksList() {
      try {
        const res = await fetch("/api/log-book", {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.data)) {
          setLogbooks(data.data);
        }
      } catch (err) {
        console.error("Gagal mengambil data logbook:", err);
      }
    }

    fetchLogbooksList();
  }, []);

  // =========================================================
  // FETCH TUGAS
  // =========================================================

  const fetchTugasList = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();

      if (selectedInternId !== "ALL") {
        params.append("peserta_magang_id", selectedInternId);
      }

      if (selectedCategory !== "ALL") {
        params.append("kategori", selectedCategory);
      }

      if (debounceSearch) {
        params.append("q", debounceSearch);
      }

      const res = await fetch(`/api/tugas?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.data)) {
        setTugasList(data.data);
      } else {
        setTugasList([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data tugas:", err);

      setTugasList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInternId, selectedCategory, debounceSearch]);

  useEffect(() => {
    fetchTugasList();
  }, [fetchTugasList]);

  // =========================================================
  // SORT
  // =========================================================

  const displayedTugas = useMemo(() => {
    const list = [...tugasList];

    list.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();

      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [tugasList, sortOrder]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const stats = useMemo(() => {
    const total = tugasList.length;

    const prog = tugasList.filter(
      (t) => (t.kategori || "").toLowerCase() === "programmer",
    ).length;

    const media = tugasList.filter(
      (t) => (t.kategori || "").toLowerCase() === "media",
    ).length;

    const lainnya = total - (prog + media);

    return {
      total,
      prog,
      media,
      lainnya,
    };
  }, [tugasList]);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setSelectedCreateInternIds(
      interns.length > 0 ? [String(interns[0].id)] : [],
    );
    setInternSearchModal("");
    setIsInternDropdownOpen(false);
    setFormData({
      peserta_magang_id: interns.length > 0 ? String(interns[0].id) : "",
      log_book_id: "",
      judul_tugas: "",
      deskripsi: "",
      kategori: "programmer",
    });

    setErrorMessage(null);
  };

  // =========================================================
  // CREATE MODAL
  // =========================================================

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // =========================================================
  // EDIT MODAL
  // =========================================================

  const handleOpenEdit = (item: TugasItem) => {
    setSelectedTugas(item);

    setFormData({
      peserta_magang_id: String(
        item.peserta_magang_id || item.pesertaMagangId || "",
      ),

      log_book_id: item.log_book_id ? String(item.log_book_id) : "",

      judul_tugas: item.judul_tugas || item.judulTugas || "",

      deskripsi: item.deskripsi || "",

      kategori: item.kategori || "programmer",
    });

    setErrorMessage(null);
    setIsEditModalOpen(true);
  };

  // =========================================================
  // DETAIL MODAL
  // =========================================================

  const handleOpenDetail = (item: TugasItem) => {
    setSelectedTugas(item);
    setIsDetailModalOpen(true);
  };

  // =========================================================
  // DELETE MODAL
  // =========================================================

  const handleOpenDelete = (item: TugasItem) => {
    setSelectedTugas(item);
    setErrorMessage(null);
    setIsDeleteModalOpen(true);
  };

  // =========================================================
  // CREATE
  // =========================================================

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);

    if (selectedCreateInternIds.length === 0) {
      setErrorMessage("Silakan pilih minimal 1 peserta magang.");
      return;
    }

    if (!formData.judul_tugas.trim()) {
      setErrorMessage("Judul tugas wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        judul_tugas: formData.judul_tugas.trim(),

        deskripsi: formData.deskripsi.trim(),

        kategori: formData.kategori,

        peserta_magang_ids: selectedCreateInternIds.map(Number),

        log_book_id: formData.log_book_id ? Number(formData.log_book_id) : null,
      };

      const res = await fetch("/api/tugas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMessage(
          json.message ||
            (selectedCreateInternIds.length > 1
              ? `Tugas berhasil dibagikan kepada ${selectedCreateInternIds.length} peserta magang.`
              : "Tugas berhasil ditambahkan."),
        );

        setIsCreateModalOpen(false);

        fetchTugasList();

        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(json.message || "Gagal menambahkan tugas.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Terjadi kesalahan saat menyimpan tugas.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // EDIT
  // =========================================================

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTugas) return;

    setErrorMessage(null);

    if (!formData.judul_tugas.trim()) {
      setErrorMessage("Judul tugas wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        id: selectedTugas.id,

        judul_tugas: formData.judul_tugas.trim(),

        deskripsi: formData.deskripsi.trim(),

        kategori: formData.kategori,

        peserta_magang_id: formData.peserta_magang_id
          ? Number(formData.peserta_magang_id)
          : null,

        log_book_id: formData.log_book_id ? Number(formData.log_book_id) : null,
      };

      const res = await fetch("/api/tugas", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMessage("Tugas berhasil diperbarui.");

        setIsEditModalOpen(false);

        fetchTugasList();

        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(json.message || "Gagal memperbarui tugas.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Terjadi kesalahan saat memperbarui tugas.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDeleteSubmit = async () => {
    if (!selectedTugas) return;

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/tugas?id=${selectedTugas.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMessage("Tugas berhasil dihapus.");

        setIsDeleteModalOpen(false);

        fetchTugasList();

        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(json.message || "Gagal menghapus tugas.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Terjadi kesalahan saat menghapus tugas.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // ACCESS DENIED
  // =========================================================

  if (isDenied) {
    return (
      <DashboardLayout>
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-card">
          <div className="w-12 h-12 rounded-full bg-status-alpa/10 text-status-alpa flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h2 className="text-lg font-black text-foreground">
            Akses Tidak Tersedia
          </h2>

          <p className="text-xs text-muted-foreground">
            Modul Manajemen Tugas khusus diperuntukkan bagi Super Admin dan
            Admin Pembimbing Magang.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Manajemen Tugas
              </h1>
            </div>

            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Kelola, delegasikan, dan pantau seluruh instruksi penugasan kerja
              anak magang
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTugasList}
              disabled={isLoading}
              className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading ? "animate-spin text-primary" : ""
                }`}
              />

              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-95 transition-all shadow-card inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />

              <span>Tambah Tugas</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUCCESS MESSAGE */}
        {/* ========================================================= */}

        {successMessage && (
          <div className="p-4 rounded-xl status-hadir border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />

              <span>{successMessage}</span>
            </div>

            <button
              onClick={() => setSuccessMessage(null)}
              className="cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* QUICK STATS */}
        {/* ========================================================= */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Tugas - Primary / Amber */}
          <div className="bg-card border border-border hover:border-primary/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Total Tugas
              </span>

              <Briefcase className="w-4 h-4 text-primary" />
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-primary">{stats.total}</p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Tugas tercatat
            </span>
          </div>

          {/* Programmer - Blue (status-izin) */}
          <div className="bg-card border border-border hover:border-status-izin/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-izin uppercase tracking-wider">
                Programmer
              </span>

              <Code className="w-4 h-4 text-status-izin" />
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-izin">
                {stats.prog}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Tugas koding &amp; IT
            </span>
          </div>

          {/* Media & Desain - Purple / Violet */}
          <div className="bg-card border border-border hover:border-purple-500/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Media &amp; Desain
              </span>

              <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {stats.media}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Tugas konten &amp; grafis
            </span>
          </div>

          {/* Kategori Lain - Green (status-hadir) */}
          <div className="bg-card border border-border hover:border-status-hadir/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-hadir uppercase tracking-wider">
                Kategori Lain
              </span>

              <Layers className="w-4 h-4 text-status-hadir" />
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-hadir">
                {stats.lainnya}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Administrasi &amp; umum
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEARCH & FILTER */}
        {/* ========================================================= */}

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative md:max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

              <input
                type="text"
                placeholder="Cari judul tugas, deskripsi, nama peserta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Intern */}
              <div className="flex items-center gap-1.5 bg-input border border-border rounded-xl px-2.5 py-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />

                <select
                  value={selectedInternId}
                  onChange={(e) => setSelectedInternId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Peserta</option>

                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name || i.nama || "Peserta"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex items-center gap-1.5 bg-input border border-border rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>

                  {KATEGORI_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <button
                type="button"
                onClick={() =>
                  setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")
                }
                className="flex items-center gap-1 px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted cursor-pointer transition-all"
                title="Urutkan Tanggal"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />

                <span>{sortOrder === "DESC" ? "Terbaru" : "Terlama"}</span>
              </button>

              {/* Reset */}
              {(searchQuery ||
                selectedInternId !== "ALL" ||
                selectedCategory !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedInternId("ALL");
                    setSelectedCategory("ALL");
                  }}
                  className="px-2.5 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABLE */}
        {/* ========================================================= */}

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4 w-12 text-center">ID</th>

                  <th className="py-3.5 px-4">Peserta Magang</th>

                  <th className="py-3.5 px-4">Judul & Deskripsi Tugas</th>

                  <th className="py-3.5 px-4">Kategori</th>

                  <th className="py-3.5 px-4">Logbook Terkait</th>

                  <th className="py-3.5 px-4">Tanggal Dibuat</th>

                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />

                        <span className="font-semibold text-xs">
                          Memuat data tugas...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : displayedTugas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <Briefcase className="w-6 h-6" />
                      </div>

                      <p className="font-extrabold text-foreground text-sm">
                        Tidak ada tugas ditemukan
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Silakan buat tugas baru atau sesuaikan kata kunci
                        pencarian Anda.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedTugas.map((task) => {
                    const katLabel = task.kategori || "Umum";

                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-accent/40 transition-colors"
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-muted-foreground text-center">
                          #{task.id}
                        </td>

                        {/* Participant */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-[160px]">
                            {task.user_avatar ? (
                              <img
                                src={task.user_avatar}
                                alt={task.user_nama || "Avatar"}
                                className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground border border-border shrink-0 flex items-center justify-center text-[10px] font-black">
                                {getInitial(task.user_nama)}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground truncate">
                                {task.user_nama || "Belum Ditentukan"}
                              </p>

                              <p className="text-[10px] text-muted-foreground truncate">
                                {task.user_institution || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Title */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="space-y-1">
                            <p className="font-black text-foreground text-xs leading-snug">
                              {task.judul_tugas || task.judulTugas || "—"}
                            </p>

                            {task.deskripsi && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {task.deskripsi}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getKategoriBadgeClass(
                              katLabel,
                            )}`}
                          >
                            {getKategoriIcon(katLabel)}

                            <span className="capitalize">{katLabel}</span>
                          </span>
                        </td>

                        {/* Logbook */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          {task.log_book_aktivitas ? (
                            <div className="space-y-0.5 text-[10px]">
                              <span className="inline-flex items-center gap-1 font-bold text-primary">
                                <BookOpen className="w-3 h-3" />

                                <span>Logbook #{task.log_book_id}</span>
                              </span>

                              <p className="text-muted-foreground truncate">
                                {task.log_book_aktivitas}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              —
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-0.5 text-[11px]">
                            <p className="font-bold text-foreground">
                              {formatTanggalIndo(task.created_at)}
                            </p>

                            <p className="text-[10px] text-muted-foreground font-mono">
                              {task.created_at
                                ? new Date(task.created_at).toLocaleTimeString(
                                    "id-ID",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )
                                : ""}{" "}
                              WIB
                            </p>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(task)}
                              className="p-1.5 rounded-lg border border-border bg-input hover:bg-accent text-foreground transition-all cursor-pointer"
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="p-1.5 rounded-lg border border-border bg-input hover:bg-accent text-foreground transition-all cursor-pointer"
                              title="Ubah Tugas"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenDelete(task)}
                              className="p-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
                              title="Hapus Tugas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CREATE MODAL */}
        {/* ========================================================= */}

        {isCreateModalOpen && (
          <div
            className="
      fixed inset-0 z-50
      bg-black/60 dark:bg-black/70
      backdrop-blur-xs
      flex items-center justify-center
      p-3
      overflow-y-auto
      animate-in fade-in
    "
          >
            <div
              className="
        bg-card
        border border-border
        rounded-2xl
        max-w-3xl
        w-full
        p-4 md:p-5
        shadow-2xl
        space-y-3
        my-4
        animate-in zoom-in-95
        max-h-[90vh]
        overflow-y-auto
      "
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h3 className="font-extrabold text-foreground text-sm leading-tight">
                    Tambah Tugas Baru
                  </h3>

                  <p className="text-[10px] text-muted-foreground">
                    Berikan penugasan kepada peserta magang
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="
            p-1
            rounded-lg
            hover:bg-muted
            text-muted-foreground
            hover:text-foreground
            cursor-pointer
          "
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ERROR */}
              {errorMessage && (
                <div
                  className="
            p-2
            rounded-xl
            bg-destructive/15
            border border-destructive/30
            text-destructive
            text-[10px]
            font-bold
            flex items-center gap-1.5
          "
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                {/* ========================================= */}
                {/* GRID UTAMA */}
                {/* ========================================= */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* ===================================== */}
                  {/* PESERTA MAGANG - FULL WIDTH */}
                  {/* ===================================== */}

                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-foreground flex items-center gap-1">
                        <span>Peserta Magang</span>

                        <span className="text-destructive">*</span>

                        <span
                          className="
                    text-[9px]
                    font-black
                    px-1.5 py-0.5
                    rounded-md
                    bg-primary/10
                    text-primary
                    border border-primary/20
                  "
                        >
                          {selectedCreateInternIds.length} Dipilih
                        </span>
                      </label>

                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCreateInternIds(
                              interns.map((i) => String(i.id)),
                            )
                          }
                          className="
                    text-primary
                    hover:underline
                    font-bold
                    cursor-pointer
                  "
                        >
                          Semua ({interns.length})
                        </button>

                        <span className="text-muted-foreground">•</span>

                        <button
                          type="button"
                          onClick={() => setSelectedCreateInternIds([])}
                          className="
                    text-muted-foreground
                    hover:text-destructive
                    font-bold
                    cursor-pointer
                  "
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* DROPDOWN TRIGGER */}
                    <button
                      type="button"
                      onClick={() => setIsInternDropdownOpen((prev) => !prev)}
                      className="
                w-full
                flex items-center justify-between
                px-2.5 py-2
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                hover:border-primary/40
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
                cursor-pointer
                transition-all
                text-left
              "
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {selectedCreateInternIds.length === 0 ? (
                          <span className="text-muted-foreground text-[11px]">
                            Pilih Peserta Magang...
                          </span>
                        ) : selectedCreateInternIds.length === 1 ? (
                          (() => {
                            const selected = interns.find(
                              (i) =>
                                String(i.id) === selectedCreateInternIds[0],
                            );

                            return (
                              <div className="flex items-center gap-1.5 truncate">
                                {selected?.avatar ? (
                                  <img
                                    src={selected.avatar}
                                    alt="avatar"
                                    className="
                              w-4 h-4
                              rounded-full
                              object-cover
                              border border-border
                              shrink-0
                            "
                                  />
                                ) : (
                                  <div
                                    className="
                              w-4 h-4
                              rounded-full
                              bg-primary
                              text-primary-foreground
                              flex items-center justify-center
                              text-[7px]
                              font-black
                              shrink-0
                            "
                                  >
                                    {getInitial(
                                      selected?.name || selected?.nama,
                                    )}
                                  </div>
                                )}

                                <span
                                  className="
                            truncate
                            text-[11px]
                            font-bold
                            text-foreground
                          "
                                >
                                  {selected?.name || selected?.nama}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex items-center gap-1.5 truncate">
                            <Users className="w-3.5 h-3.5 text-primary shrink-0" />

                            <span className="font-bold text-foreground text-[11px]">
                              {selectedCreateInternIds.length === interns.length
                                ? `Semua Peserta (${interns.length}) Dipilih`
                                : `${selectedCreateInternIds.length} Peserta Dipilih`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-muted-foreground shrink-0 ml-1">
                        {isInternDropdownOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {/* DROPDOWN MENU */}
                    {isInternDropdownOpen && (
                      <div
                        className="
                  p-1.5
                  bg-card
                  border border-border
                  rounded-xl
                  shadow-lg
                  space-y-1
                  mt-1
                  animate-in fade-in
                  duration-150
                "
                      >
                        <div className="relative">
                          <Search
                            className="
                      w-3 h-3
                      absolute left-2
                      top-1/2
                      -translate-y-1/2
                      text-muted-foreground
                    "
                          />

                          <input
                            type="text"
                            placeholder="Cari peserta..."
                            value={internSearchModal}
                            onChange={(e) =>
                              setInternSearchModal(e.target.value)
                            }
                            className="
                      w-full
                      pl-6 pr-5 py-1.5
                      bg-input
                      border border-border
                      rounded-lg
                      text-[10px]
                      font-semibold
                      text-foreground
                      placeholder:text-muted-foreground
                      focus:outline-none
                      focus:ring-1
                      focus:ring-primary/50
                    "
                          />

                          {internSearchModal && (
                            <button
                              type="button"
                              onClick={() => setInternSearchModal("")}
                              className="
                        absolute right-1.5
                        top-1/2
                        -translate-y-1/2
                        text-muted-foreground
                        hover:text-foreground
                        cursor-pointer
                      "
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div
                          className="
                    max-h-32
                    overflow-y-auto
                    rounded-lg
                    border border-border
                    bg-input/20
                    divide-y divide-border/40
                    p-0.5
                    space-y-0.5
                  "
                        >
                          {filteredInternsInModal.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-2">
                              Peserta tidak ditemukan
                            </p>
                          ) : (
                            filteredInternsInModal.map((i) => {
                              const idStr = String(i.id);

                              const isChecked =
                                selectedCreateInternIds.includes(idStr);

                              return (
                                <div
                                  key={i.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedCreateInternIds(
                                        selectedCreateInternIds.filter(
                                          (x) => x !== idStr,
                                        ),
                                      );
                                    } else {
                                      setSelectedCreateInternIds([
                                        ...selectedCreateInternIds,
                                        idStr,
                                      ]);
                                    }
                                  }}
                                  className={`
                            flex items-center
                            gap-2
                            px-1.5 py-1
                            rounded-md
                            cursor-pointer
                            transition-all
                            ${
                              isChecked
                                ? "bg-primary/15 font-bold"
                                : "hover:bg-muted/70 text-foreground/80"
                            }
                          `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="
                              rounded
                              text-primary
                              focus:ring-primary
                              h-3 w-3
                              cursor-pointer
                              accent-primary
                              shrink-0
                            "
                                  />

                                  {i.avatar ? (
                                    <img
                                      src={i.avatar}
                                      alt={i.name || i.nama || "Avatar"}
                                      className="
                                w-4 h-4
                                rounded-full
                                object-cover
                                border border-border
                                shrink-0
                              "
                                    />
                                  ) : (
                                    <div
                                      className="
                                w-4 h-4
                                rounded-full
                                bg-primary
                                text-primary-foreground
                                flex items-center
                                justify-center
                                text-[7px]
                                font-black
                                shrink-0
                              "
                                    >
                                      {getInitial(i.name || i.nama)}
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                                    <span className="text-[10px] text-foreground truncate">
                                      {i.name || i.nama || "Peserta"}
                                    </span>

                                    <span className="text-[8px] text-muted-foreground truncate max-w-[140px]">
                                      {i.institution || i.sekolah_kampus || ""}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ===================================== */}
                  {/* KATEGORI */}
                  {/* ===================================== */}

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-foreground">
                      Kategori Tugas <span className="text-destructive">*</span>
                    </label>

                    <select
                      value={formData.kategori}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kategori: e.target.value,
                        })
                      }
                      className="
                w-full
                px-2.5 py-2
                bg-input
                border border-border
                rounded-xl
                text-[11px]
                font-semibold
                text-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
                capitalize
                cursor-pointer
              "
                    >
                      {KATEGORI_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* LOGBOOK */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-foreground">
                      Tautkan Logbook (Opsional)
                    </label>

                    <select
                      value={formData.log_book_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          log_book_id: e.target.value,
                        })
                      }
                      className="
                w-full
                px-2.5 py-2
                bg-input
                border border-border
                rounded-xl
                text-[11px]
                font-semibold
                text-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
                cursor-pointer
              "
                    >
                      <option value="">Tidak Ditautkan</option>

                      {logbooks.map((lb) => (
                        <option key={lb.id} value={lb.id}>
                          #{lb.id} • {lb.user_nama || "Peserta"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===================================== */}
                  {/* JUDUL - FULL WIDTH */}
                  {/* ===================================== */}

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-extrabold text-foreground">
                      Judul Tugas <span className="text-destructive">*</span>
                    </label>

                    <input
                      type="text"
                      placeholder="Contoh: Pembuatan Modul Cetak PDF Presensi"
                      value={formData.judul_tugas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          judul_tugas: e.target.value,
                        })
                      }
                      className="
                w-full
                px-2.5 py-2
                bg-input
                border border-border
                rounded-xl
                text-[11px]
                font-semibold
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
              "
                      required
                    />
                  </div>

                  {/* ===================================== */}
                  {/* DESKRIPSI - FULL WIDTH */}
                  {/* ===================================== */}

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-extrabold text-foreground">
                      Deskripsi &amp; Rincian Instruksi
                    </label>

                    <textarea
                      rows={3}
                      placeholder="Jelaskan detail instruksi atau poin pekerjaan yang harus diselesaikan..."
                      value={formData.deskripsi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deskripsi: e.target.value,
                        })
                      }
                      className="
                w-full
                px-2.5 py-2
                bg-input
                border border-border
                rounded-xl
                text-[11px]
                font-semibold
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
                resize-none
              "
                    />
                  </div>
                </div>

                {/* BUTTON */}
                <div
                  className="
            flex items-center
            justify-end
            gap-2
            pt-3
            border-t border-border
          "
                >
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="
              px-4 py-2
              rounded-xl
              border border-border
              text-[11px]
              font-bold
              text-muted-foreground
              hover:text-foreground
              hover:bg-muted
              cursor-pointer
              transition-all
            "
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="
              px-4 py-2
              rounded-xl
              bg-primary
              text-primary-foreground
              text-[11px]
              font-black
              hover:opacity-95
              transition-all
              shadow-card
              cursor-pointer
              disabled:opacity-50
              inline-flex
              items-center
              gap-1.5
            "
                  >
                    {isSubmitting && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}

                    <span>Simpan Tugas</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* EDIT MODAL */}
        {/* ========================================================= */}

        {isEditModalOpen && selectedTugas && (
          <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Edit3 className="w-4 h-4" />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-foreground text-base">
                      Ubah Data Tugas
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      ID Tugas #{selectedTugas.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />

                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Participant */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground">
                    Peserta Magang <span className="text-destructive">*</span>
                  </label>

                  <select
                    value={formData.peserta_magang_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        peserta_magang_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Pilih Peserta Magang</option>

                    {interns.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name || i.nama} (
                        {i.institution || i.sekolah_kampus || "Anak Magang"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground">
                    Kategori Tugas <span className="text-destructive">*</span>
                  </label>

                  <select
                    value={formData.kategori}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategori: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 capitalize"
                  >
                    {KATEGORI_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground">
                    Judul Tugas <span className="text-destructive">*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.judul_tugas}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        judul_tugas: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground">
                    Deskripsi & Rincian Instruksi
                  </label>

                  <textarea
                    rows={3}
                    value={formData.deskripsi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deskripsi: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                {/* Logbook */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground">
                    Tautkan ke Logbook (Opsional)
                  </label>

                  <select
                    value={formData.log_book_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        log_book_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Tidak Dihubungkan ke Logbook</option>

                    {logbooks.map((lb) => (
                      <option key={lb.id} value={lb.id}>
                        #{lb.id} • {lb.user_nama || "Peserta"} • {lb.kategori} •{" "}
                        {lb.aktivitas?.slice(0, 45)}
                        ...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-95 transition-all shadow-card cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}

                    <span>Perbarui Tugas</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DETAIL MODAL */}
        {/* ========================================================= */}

        {isDetailModalOpen && selectedTugas && (
          <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Briefcase className="w-4 h-4" />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-foreground text-base">
                      Detail Penugasan
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      ID Tugas #{selectedTugas.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Participant */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
                {selectedTugas.user_avatar ? (
                  <img
                    src={selectedTugas.user_avatar}
                    alt={selectedTugas.user_nama || "Avatar"}
                    className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground border border-border shrink-0 flex items-center justify-center text-xs font-black">
                    {getInitial(selectedTugas.user_nama)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-black text-foreground text-sm">
                    {selectedTugas.user_nama || "Belum Ditentukan"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {selectedTugas.user_institution || "Peserta Magang"}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Judul Tugas
                  </span>

                  <p className="text-sm font-black text-foreground mt-0.5">
                    {selectedTugas.judul_tugas ||
                      selectedTugas.judulTugas ||
                      "—"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Kategori Pekerjaan
                  </span>

                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getKategoriBadgeClass(
                        selectedTugas.kategori,
                      )}`}
                    >
                      {getKategoriIcon(selectedTugas.kategori)}

                      <span className="capitalize">
                        {selectedTugas.kategori}
                      </span>
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Deskripsi Tugas
                  </span>

                  <p className="text-xs text-foreground/90 font-medium leading-relaxed bg-input/50 p-3 rounded-xl border border-border mt-1">
                    {selectedTugas.deskripsi || "Tidak ada deskripsi rinci."}
                  </p>
                </div>

                {selectedTugas.log_book_aktivitas && (
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Logbook Terkait
                    </span>

                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-1 space-y-1">
                      <div className="flex items-center gap-1 text-primary font-bold text-xs">
                        <BookOpen className="w-3.5 h-3.5" />

                        <span>Logbook #{selectedTugas.log_book_id}</span>
                      </div>

                      <p className="text-xs text-foreground/80">
                        {selectedTugas.log_book_aktivitas}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Waktu Dibuat:</span>

                  <span className="font-semibold text-foreground">
                    {formatTanggalIndo(selectedTugas.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted cursor-pointer transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DELETE MODAL */}
        {/* ========================================================= */}

        {isDeleteModalOpen && selectedTugas && (
          <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-3 rounded-2xl bg-destructive/10">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-extrabold text-foreground text-base">
                    Hapus Tugas Ini?
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Apakah Anda yakin ingin menghapus tugas{" "}
                <span className="font-bold text-foreground">
                  &ldquo;
                  {selectedTugas.judul_tugas || selectedTugas.judulTugas}
                  &rdquo;
                </span>{" "}
                (ID #{selectedTugas.id})?
              </p>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />

                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-black hover:opacity-90 cursor-pointer transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}

                  <span>Ya, Hapus Tugas</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}