"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModalPortal } from "@/components/ui/ModalPortal";
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
  Clock,
  Check,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

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
      return "status-hadir";

    case "akta kematian":
      return "bg-muted text-foreground border-border";

    case "tambah bio data":
      return "status-izin";

    case "pindah keluar":
      return "status-terlambat";

    case "pindah datang":
      return "status-pending";

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
  const [internSearchQuery, setInternSearchQuery] = useState<string>("");
  const [isInternDropdownOpen, setIsInternDropdownOpen] =
    useState<boolean>(false);
  const internComboboxRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedTugas, setSelectedTugas] = useState<TugasItem | null>(null);

  const [formData, setFormData] = useState({
    peserta_magang_id: "",
    log_book_id: "",
    judul_tugas: "",
    deskripsi: "",
    kategori: "programmer",
    status_pengerjaan: "BELUM_DIKERJAKAN",
  });

  const [selectedCreateInternIds, setSelectedCreateInternIds] = useState<
    string[]
  >([]);
  const [internSearchModal, setInternSearchModal] = useState<string>("");
  const [isModalInternDropdownOpen, setIsModalInternDropdownOpen] =
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        internComboboxRef.current &&
        !internComboboxRef.current.contains(event.target as Node)
      ) {
        setIsInternDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      if (selectedStatus !== "ALL") {
        params.append("status_pengerjaan", selectedStatus);
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
  }, [selectedInternId, selectedCategory, selectedStatus, debounceSearch]);

  useEffect(() => {
    fetchTugasList();
  }, [fetchTugasList]);

  const handleToggleStatus = async (task: TugasItem) => {
    try {
      const current = (
        task.status_pengerjaan ||
        task.statusPengerjaan ||
        ""
      ).toUpperCase();

      const newStatus = current === "SELESAI" ? "BELUM_DIKERJAKAN" : "SELESAI";

      const res = await fetch("/api/tugas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          status_pengerjaan: newStatus,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMessage(
          json.message ||
            `Status tugas #${task.id} diperbarui menjadi ${
              newStatus === "SELESAI"
                ? "Selesai (Tercatat di Log Book)"
                : "Belum Dikerjakan"
            }.`,
        );

        fetchTugasList();

        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Gagal memperbarui status tugas:", err);
    }
  };

  const displayedTugas = useMemo(() => {
    const list = [...tugasList];

    list.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();

      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [tugasList, sortOrder]);

  const stats = useMemo(() => {
    const total = tugasList.length;

    const selesai = tugasList.filter((t) => {
      const s = (t.status_pengerjaan || t.statusPengerjaan || "").toUpperCase();
      return s === "SELESAI";
    }).length;

    const belum = total - selesai;

    const todayStr = new Date().toISOString().split("T")[0];
    const today = tugasList.filter((t) => {
      if (!t.created_at) return false;
      return t.created_at.startsWith(todayStr);
    }).length;

    return {
      total,
      selesai,
      belum,
      today,
    };
  }, [tugasList]);

  const selectedInternObj = useMemo(() => {
    if (selectedInternId === "ALL") return null;
    return (
      interns.find((i) => String(i.id) === String(selectedInternId)) || null
    );
  }, [selectedInternId, interns]);

  const resetForm = () => {
    setSelectedCreateInternIds(
      interns.length > 0 ? [String(interns[0].id)] : [],
    );
    setInternSearchModal("");
    setIsModalInternDropdownOpen(false);
    setFormData({
      peserta_magang_id: interns.length > 0 ? String(interns[0].id) : "",
      log_book_id: "",
      judul_tugas: "",
      deskripsi: "",
      kategori: "programmer",
      status_pengerjaan: "BELUM_DIKERJAKAN",
    });

    setErrorMessage(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

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

      status_pengerjaan:
        item.status_pengerjaan || item.statusPengerjaan || "BELUM_DIKERJAKAN",
    });

    setErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = (item: TugasItem) => {
    setSelectedTugas(item);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (item: TugasItem) => {
    setSelectedTugas(item);
    setErrorMessage(null);
    setIsDeleteModalOpen(true);
  };

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

        status_pengerjaan: formData.status_pengerjaan,

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
        setSuccessMessage(json.message || "Tugas berhasil diperbarui.");

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

  if (isDenied) {
    return (
      <DashboardLayout>
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-card">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border hover:border-primary/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Total Tugas
              </span>
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

          <div className="bg-card border border-border hover:border-status-terlambat/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-terlambat uppercase tracking-wider">
                Belum Dikerjakan
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-terlambat">
                {stats.belum}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Tugas dalam proses
            </span>
          </div>

          <div className="bg-card border border-border hover:border-status-hadir/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-hadir uppercase tracking-wider">
                Selesai
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-hadir">
                {stats.selesai}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Tugas rampung
            </span>
          </div>

          <div className="bg-card border border-border hover:border-status-izin/40 rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-izin uppercase tracking-wider">
                Tugas Hari Ini
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-izin">
                {stats.today}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Dibuat hari ini
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

              <input
                type="text"
                placeholder="Cari tugas"
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

            <div className="relative" ref={internComboboxRef}>
              <div className="relative">
                <input
                  type="text"
                  value={
                    isInternDropdownOpen
                      ? internSearchQuery
                      : selectedInternObj
                        ? selectedInternObj.name ||
                          selectedInternObj.nama ||
                          "Peserta Terpilih"
                        : "Semua Peserta"
                  }
                  onChange={(e) => {
                    setInternSearchQuery(e.target.value);
                    if (!isInternDropdownOpen) setIsInternDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setInternSearchQuery("");
                    setIsInternDropdownOpen(true);
                  }}
                  placeholder="Cari peserta..."
                  className="w-full pl-3 pr-8 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setIsInternDropdownOpen((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isInternDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {isInternDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/60 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInternId("ALL");
                      setInternSearchQuery("");
                      setIsInternDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/60 transition-colors cursor-pointer ${
                      selectedInternId === "ALL"
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground font-semibold"
                    }`}
                  >
                    <span>Semua Peserta</span>
                    {selectedInternId === "ALL" && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                  {interns
                    .filter((intern) => {
                      if (!internSearchQuery.trim()) return true;
                      const q = internSearchQuery.toLowerCase();
                      const name = (
                        intern.name ||
                        intern.nama ||
                        ""
                      ).toLowerCase();
                      const inst = (
                        intern.institution ||
                        intern.sekolah_kampus ||
                        ""
                      ).toLowerCase();
                      return name.includes(q) || inst.includes(q);
                    })
                    .map((intern) => {
                      const isSelected =
                        String(intern.id) === String(selectedInternId);
                      const displayName =
                        intern.name || intern.nama || "Peserta";
                      const displayInst =
                        intern.institution || intern.sekolah_kampus || "Magang";
                      return (
                        <button
                          key={intern.id}
                          type="button"
                          onClick={() => {
                            setSelectedInternId(String(intern.id));
                            setInternSearchQuery("");
                            setIsInternDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/60 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground font-semibold"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate">{displayName}</p>
                            <p className="text-[10px] text-muted-foreground font-normal truncate">
                              {displayInst}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  {interns.filter((intern) => {
                    if (!internSearchQuery.trim()) return true;
                    const q = internSearchQuery.toLowerCase();
                    const name = (
                      intern.name ||
                      intern.nama ||
                      ""
                    ).toLowerCase();
                    const inst = (
                      intern.institution ||
                      intern.sekolah_kampus ||
                      ""
                    ).toLowerCase();
                    return name.includes(q) || inst.includes(q);
                  }).length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Tidak ada peserta ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none capitalize"
              >
                <option value="ALL">Semua Kategori</option>

                {KATEGORI_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="BELUM_DIKERJAKAN">Belum Dikerjakan</option>
                <option value="SELESAI">Selesai</option>
              </select>

              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <button
              type="button"
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

            {(searchQuery ||
              selectedInternId !== "ALL" ||
              selectedCategory !== "ALL" ||
              selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedInternId("ALL");
                  setInternSearchQuery("");
                  setIsInternDropdownOpen(false);
                  setSelectedCategory("ALL");
                  setSelectedStatus("ALL");
                }}
                className="text-primary hover:underline font-bold text-xs cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4 w-12 text-center">ID</th>

                  <th className="py-3.5 px-4">Peserta Magang</th>

                  <th className="py-3.5 px-4">Judul & Deskripsi Tugas</th>

                  <th className="py-3.5 px-4">Kategori</th>

                  <th className="py-3.5 px-4">Status Pengerjaan</th>

                  <th className="py-3.5 px-4">Logbook Terkait</th>

                  <th className="py-3.5 px-4">Tanggal Dibuat</th>

                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : displayedTugas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center space-y-2">
                      <p className="text-foreground text-xs">
                        Tidak ada tugas ditemukan
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedTugas.slice(0, itemsPerPage).map((task) => {
                    const katLabel = task.kategori || "Umum";

                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-accent/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-muted-foreground text-center">
                          #{task.id}
                        </td>

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

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(task)}
                            title="Klik untuk ubah status pengerjaan"
                            className="cursor-pointer"
                          >
                            {(
                              task.status_pengerjaan ||
                              task.statusPengerjaan ||
                              ""
                            ).toUpperCase() === "SELESAI" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold status-hadir border hover:opacity-85 transition-all">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Selesai</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold status-terlambat border hover:opacity-85 transition-all">
                                <Clock className="w-3 h-3" />
                                <span>Belum Dikerjakan</span>
                              </span>
                            )}
                          </button>
                        </td>

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

          {!isLoading && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {displayedTugas.length}
                </strong>{" "}
                data tugas
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Number of rows:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="
                    bg-card
                    border border-border
                    rounded-lg
                    px-2.5 py-1.5
                    text-xs font-bold
                    text-foreground
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary/40
                    transition-all
                    cursor-pointer
                  "
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {isCreateModalOpen && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
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
        animate-in zoom-in-95
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
      "
              >
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold text-foreground flex items-center gap-1">
                          <span>Peserta Magang</span>

                          <span className="text-status-tolak">*</span>

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

                      <button
                        type="button"
                        onClick={() =>
                          setIsModalInternDropdownOpen((prev) => !prev)
                        }
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
                              Pilih Peserta Magang
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
                                {selectedCreateInternIds.length ===
                                interns.length
                                  ? `Semua Peserta (${interns.length}) Dipilih`
                                  : `${selectedCreateInternIds.length} Peserta Dipilih`}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-muted-foreground shrink-0 ml-1">
                          {isModalInternDropdownOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {isModalInternDropdownOpen && (
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
                              placeholder="Cari peserta"
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
                                        {i.institution ||
                                          i.sekolah_kampus ||
                                          ""}
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

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-foreground">
                        Kategori Tugas{" "}
                        <span className="text-status-tolak">*</span>
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

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-extrabold text-foreground">
                        Judul Tugas <span className="text-status-tolak">*</span>
                      </label>

                      <input
                        type="text"
                        placeholder="Masukkan judul tugas"
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

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-extrabold text-foreground">
                        Deskripsi &amp; Rincian Instruksi
                      </label>

                      <textarea
                        rows={3}
                        placeholder="Masukkan deskripsi tugas"
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
                      {isSubmitting && <Spinner size="sm" />}

                      <span>Simpan Tugas</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

        {isEditModalOpen && selectedTugas && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-foreground text-sm">
                        Ubah Data Tugas
                      </h3>

                      <p className="text-[11px] text-muted-foreground">
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
                  <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />

                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
                      Peserta Magang{" "}
                      <span className="text-status-tolak">*</span>
                    </label>

                    <select
                      value={formData.peserta_magang_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          peserta_magang_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-foreground">
                        Kategori Tugas
                        <span className="text-status-tolak">*</span>
                      </label>

                      <select
                        value={formData.kategori}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kategori: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 capitalize cursor-pointer"
                      >
                        {KATEGORI_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-foreground">
                        Status Pengerjaan
                      </label>

                      <select
                        value={formData.status_pengerjaan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status_pengerjaan: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="BELUM_DIKERJAKAN">
                          Belum Dikerjakan
                        </option>
                        <option value="SELESAI">Selesai</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
                      Judul Tugas <span className="text-status-tolak">*</span>
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
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
                      Deskripsi & Rincian Instruksi
                    </label>

                    <textarea
                      rows={2}
                      value={formData.deskripsi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deskripsi: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
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
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Tidak Dihubungkan ke Logbook</option>

                      {logbooks.map((lb) => (
                        <option key={lb.id} value={lb.id}>
                          #{lb.id} • {lb.user_nama || "Peserta"} • {lb.kategori}{" "}
                          • {lb.aktivitas?.slice(0, 45)}
                          ...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-95 transition-all shadow-card cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isSubmitting && <Spinner size="sm" />}

                      <span>Perbarui Tugas</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

        {isDetailModalOpen && selectedTugas && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-foreground text-sm">
                        Detail Penugasan
                      </h3>

                      <p className="text-[11px] text-muted-foreground">
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

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5">
                  {selectedTugas.user_avatar ? (
                    <img
                      src={selectedTugas.user_avatar}
                      alt={selectedTugas.user_nama || "Avatar"}
                      className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground border border-border shrink-0 flex items-center justify-center text-xs font-black">
                      {getInitial(selectedTugas.user_nama)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-black text-foreground text-xs">
                      {selectedTugas.user_nama || "Belum Ditentukan"}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      {selectedTugas.user_institution || "Peserta Magang"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Judul Tugas
                    </span>

                    <p className="text-xs font-black text-foreground mt-0.5">
                      {selectedTugas.judul_tugas ||
                        selectedTugas.judulTugas ||
                        "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Kategori Pekerjaan
                      </span>

                      <div className="mt-0.5">
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
                        Status Pengerjaan
                      </span>

                      <div className="mt-0.5">
                        {(
                          selectedTugas.status_pengerjaan ||
                          selectedTugas.statusPengerjaan ||
                          ""
                        ).toUpperCase() === "SELESAI" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold status-hadir border">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold status-terlambat border">
                            <Clock className="w-3 h-3" />
                            <span>Belum Dikerjakan</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Deskripsi Tugas
                    </span>

                    <p className="text-xs text-foreground/90 font-medium leading-relaxed bg-input/50 p-2.5 rounded-xl border border-border mt-0.5">
                      {selectedTugas.deskripsi || "Tidak ada deskripsi rinci."}
                    </p>
                  </div>

                  {selectedTugas.log_book_aktivitas && (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Logbook Terkait
                      </span>

                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 mt-0.5 space-y-1">
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

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border">
                    <span>Waktu Dibuat:</span>

                    <span className="font-semibold text-foreground">
                      {formatTanggalIndo(selectedTugas.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1.5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted cursor-pointer transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {isDeleteModalOpen && selectedTugas && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-2xl space-y-4">
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
                    {isSubmitting && <Spinner size="sm" />}

                    <span>Ya, Hapus Tugas</span>
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </div>
    </DashboardLayout>
  );
}