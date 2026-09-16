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
import { LogBook, User } from "@/types";
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
  Sparkles,
  Layers,
  ArrowUpDown,
  BookOpen,
  Info,
  RefreshCw,
  Printer,
  Users,
  ShieldAlert,
  FileDown,
  ChevronDown,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";

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


export default function AdminLogBookPage() {
  const { user } = useAuth();
  const [logbooks, setLogbooks] = useState<LogBook[]>([]);
  const [interns, setInterns] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedInternId, setSelectedInternId] = useState<string>("ALL");
  const [internSearchQuery, setInternSearchQuery] = useState<string>("");
  const [isInternDropdownOpen, setIsInternDropdownOpen] =
    useState<boolean>(false);
  const internComboboxRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [debounceSearch, setDebounceSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedLogbook, setSelectedLogbook] = useState<LogBook | null>(null);

  const [printSupervisorName, setPrintSupervisorName] = useState<string>("Pembimbing Lapangan");
  const [printSupervisorNip, setPrintSupervisorNip] = useState<string>("-");
  const [printLocation, setPrintLocation] = useState<string>("Jakarta");

  const [formData, setFormData] = useState({
    tanggal: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
    aktivitas: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const effectiveRole = String(user?.role || "").toUpperCase();
  const isDenied = effectiveRole === "ADMIN_OS";

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
      if (selectedInternId !== "ALL")
        params.append("peserta_magang_id", selectedInternId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
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
  }, [selectedInternId, startDate, endDate, debounceSearch, sortOrder]);

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

  const handleOpenEdit = (item: LogBook) => {
    setSelectedLogbook(item);
    setFormData({
      tanggal: item.tanggal,
      aktivitas: item.aktivitas,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogbook) return;
    if (!formData.aktivitas.trim()) {
      setErrorMessage("Judul logbook wajib diisi.");
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
          aktivitas: formData.aktivitas.trim(),
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

    const todayStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    const todayCount = logbooks.filter(
      (item) => item.tanggal === todayStr,
    ).length;

    const assignedIds = new Set(
      logbooks
        .map((l) => l.peserta_magang_id || l.pesertaMagangId)
        .filter(Boolean),
    );
    const activeInternsCount = assignedIds.size;
    const totalInterns = interns.length;

    const totalMinutes = logbooks.reduce(
      (acc, item) => acc + (item.durasi_menit || 0),
      0,
    );
    const totalHours = Math.round(totalMinutes / 60);

    return {
      totalCount,
      todayCount,
      activeInternsCount,
      totalInterns,
      totalHours,
    };
  }, [logbooks, interns]);

  const selectedInternObj = useMemo(() => {
    if (selectedInternId === "ALL") return null;
    return interns.find((i) => String(i.id) === String(selectedInternId)) || null;
  }, [selectedInternId, interns]);

  if (isDenied) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-foreground">Akses Dibatasi</h2>
          <p className="text-sm text-muted-foreground">
            Role Admin OS tidak memiliki akses ke Manajemen Logbook. Halaman ini
            khusus untuk manajemen aktivitas siswa/mahasiswa magang.
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Manajemen Logbook Magang
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Pantau, evaluasi, dan cetak seluruh catatan kegiatan harian serta
              capaian kerja mahasiswa magang.
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
              title="Cetak Laporan sebagai PDF"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak sebagai PDF</span>
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl status-hadir border flex items-center justify-between gap-3 text-xs md:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="hover:opacity-70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-between gap-3 text-xs md:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="hover:opacity-70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Total Logbook
              </span>
            </div>

            <p className="text-2xl font-black text-primary">
              {stats.totalCount}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground">
              Entri tercatat
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 hover:border-status-hadir/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-hadir uppercase tracking-wider">
                Logbook Hari Ini
              </span>
            </div>

            <p className="text-2xl font-black text-status-hadir">
              {stats.todayCount}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground">
              Dibuat hari ini
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 hover:border-status-izin/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-izin uppercase tracking-wider">
                Peserta Mengisi
              </span>
            </div>

            <p className="text-2xl font-black text-status-izin">
              {stats.activeInternsCount}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground">
              Peserta aktif mengisi
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-foreground uppercase tracking-wider">
                Total Peserta Magang
              </span>
            </div>

            <p className="text-2xl font-black text-foreground">
              {stats.totalInterns}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground">
              Peserta terdaftar
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari judul logbook atau nama peserta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                          "Siswa Terpilih"
                        : "Semua Siswa"
                  }
                  onChange={(e) => {
                    setInternSearchQuery(e.target.value);
                    if (!isInternDropdownOpen) setIsInternDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setInternSearchQuery("");
                    setIsInternDropdownOpen(true);
                  }}
                  placeholder="Cari siswa..."
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
                    <span>Semua Siswa</span>
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
                      const displayName = intern.name || intern.nama;
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
                            <p className="truncate">{displayName}{intern.divisi ? <span className="font-normal text-muted-foreground"> - {intern.divisi}</span> : null}</p>
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
                      Tidak ada siswa ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  type="button"
                  onClick={() => setStartDate("")}
                  title="Hapus tanggal mulai"
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="date"
                title="Tanggal Selesai"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate("")}
                  title="Hapus tanggal selesai"
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
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

            {(startDate ||
              endDate ||
              selectedInternId !== "ALL" ||
              searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedInternId("ALL");
                  setInternSearchQuery("");
                  setIsInternDropdownOpen(false);
                  setSearchQuery("");
                }}
                className="text-primary hover:underline font-bold text-xs cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="font-extrabold text-foreground mt-0.5 text-[15px] md:text-lg">
                  Daftar Logbook Mahasiswa Magang
                </h2>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Spinner size="lg" />
            </div>
          ) : logbooks.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-xs text-foreground">Tidak ada data logbook</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[180px]">Nama Peserta</th>
                    <th className="py-3 px-4 min-w-[130px]">Tanggal</th>
                    <th className="py-3 px-4">Judul</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logbooks.slice(0, itemsPerPage).map((item, index) => {
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
                                  item.user_nama || item.userName || "M",
                                )}&background=72e3ad&color=1e2723&bold=true`
                              }
                              alt={item.user_nama || "Avatar"}
                              className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground truncate">
                                {item.user_nama ||
                                  item.userName ||
                                  "Mahasiswa Magang"}
                                {(item.user_divisi || item.userDivisi || item.divisi) ? (
                                  <span className="font-normal text-muted-foreground"> - {item.user_divisi || item.userDivisi || item.divisi}</span>
                                ) : null}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {item.user_institution ||
                                  item.user_sekolah ||
                                  "Peserta Magang"}
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

          {!isLoading && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {logbooks.length}
                </strong>{" "}
                data log book
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
      </div>

      {isEditModalOpen && selectedLogbook && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] md:text-lg font-black text-foreground">
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
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>



                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Rincian Aktivitas
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
                      "Simpan Perubahan"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {isDetailModalOpen && selectedLogbook && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-black text-foreground">
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
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Peserta Magang
                  </span>
                  <p className="font-extrabold text-foreground text-sm">
                    {selectedLogbook.user_nama ||
                      selectedLogbook.userName ||
                      "Mahasiswa Magang"}
                    {(selectedLogbook.user_divisi || selectedLogbook.userDivisi || selectedLogbook.divisi) ? (
                      <span className="font-normal text-sm"> - {selectedLogbook.user_divisi || selectedLogbook.userDivisi || selectedLogbook.divisi}</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedLogbook.user_institution ||
                      selectedLogbook.user_sekolah ||
                      "-"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tanggal
                  </span>
                  <p className="font-extrabold text-foreground">
                    {formatTanggalIndo(selectedLogbook.tanggal)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Uraian Aktivitas
                  </span>
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
        </ModalPortal>
      )}

      {isDeleteModalOpen && selectedLogbook && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
            <div className="bg-card border border-border rounded-2xl max-w-sm w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-[16px] font-black text-foreground">
                  Hapus Entri Logbook?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tindakan ini tidak dapat dibatalkan. Data logbook aktivitas
                  ini akan dihapus permanen.
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
                  onClick={handleDeleteSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menghapus" : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isPrintModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
            <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 md:p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="text-[16px] md:text-lg font-black text-foreground">
                      Pratinjau & Cetak Laporan PDF Logbook
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {logbooks.length} aktivitas siap dicetak ke format laporan
                      resmi A4.
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

              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-900/10 dark:bg-black/40">
                <div className="bg-white text-black p-8 rounded-lg shadow-md max-w-3xl mx-auto space-y-6 text-xs font-sans">
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

                  <div className="text-center space-y-0.5">
                    <h4 className="text-sm font-black uppercase underline tracking-wide">
                      LEMBAR LAPORAN AKTIVITAS LOGBOOK MAGANG
                    </h4>
                    <p className="text-[11px] text-neutral-700">
                      Periode:{" "}
                      {startDate ? formatTanggalIndo(startDate) : "Awal"} s/d{" "}
                      {endDate ? formatTanggalIndo(endDate) : "Sekarang"}
                    </p>
                  </div>

                  {selectedInternObj && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg border border-neutral-300 bg-neutral-50 text-[11px]">
                      <div>
                        <span className="font-semibold text-neutral-600">
                          Nama Mahasiswa:{" "}
                        </span>
                        <strong className="text-black">
                          {selectedInternObj.name || selectedInternObj.nama}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-600">
                          Instansi / Kampus:{" "}
                        </span>
                        <strong className="text-black">
                          {selectedInternObj.institution ||
                            selectedInternObj.sekolah_kampus ||
                            "-"}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-600">
                          Program Studi / Divisi:{" "}
                        </span>
                        <strong className="text-black">
                          {selectedInternObj.study_program ||
                            selectedInternObj.studyProgram ||
                            selectedInternObj.bagian ||
                            "-"}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-600">
                          No. Identitas / NIM:{" "}
                        </span>
                        <strong className="text-black">
                          {selectedInternObj.identityNumber ||
                            selectedInternObj.identity_number ||
                            "-"}
                        </strong>
                      </div>
                    </div>
                  )}

                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
                        <th className="border border-black p-1.5 w-8">No</th>
                        {!selectedInternObj && (
                          <th className="border border-black p-1.5 min-w-[100px]">
                            Peserta
                          </th>
                        )}
                        <th className="border border-black p-1.5 w-28">
                          Tanggal
                        </th>
                        <th className="border border-black p-1.5 text-left">
                          Uraian Aktivitas & Capaian Pekerjaan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logbooks.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="border-b border-neutral-400"
                        >
                          <td className="border border-black p-1.5 text-center font-semibold">
                            {idx + 1}
                          </td>
                          {!selectedInternObj && (
                            <td className="border border-black p-1.5 font-bold">
                              {item.user_nama ||
                                item.userName ||
                                "Mahasiswa Magang"}
                            </td>
                          )}
                          <td className="border border-black p-1.5 text-center font-medium">
                            {formatTanggalIndo(item.tanggal)}
                          </td>
                          <td className="border border-black p-1.5 text-left whitespace-pre-wrap">
                            {item.aktivitas}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold">
                    <span>
                      Total Aktivitas Tercatat: {stats.totalCount} kegiatan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
                    <div className="space-y-16">
                      <p className="font-semibold">Mahasiswa / Siswa Magang,</p>
                      <div>
                        <p className="font-bold underline uppercase">
                          {selectedInternObj?.name ||
                            selectedInternObj?.nama ||
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

              <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  Tip: Pilih opsi <strong>Save as PDF</strong> pada jendela
                  cetak browser.
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
        </ModalPortal>
      )}

      <div className="hidden print:block text-black bg-white p-6 space-y-6 text-xs font-sans">
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

        <div className="text-center space-y-0.5">
          <h4 className="text-sm font-black uppercase underline tracking-wide">
            LEMBAR LAPORAN AKTIVITAS LOGBOOK MAGANG
          </h4>
          <p className="text-[11px] text-neutral-700">
            Periode: {startDate ? formatTanggalIndo(startDate) : "Awal"} s/d{" "}
            {endDate ? formatTanggalIndo(endDate) : "Sekarang"}
          </p>
        </div>

        {selectedInternObj && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg border border-neutral-300 bg-neutral-50 text-[11px]">
            <div>
              <span className="font-semibold text-neutral-600">
                Nama Mahasiswa:{" "}
              </span>
              <strong className="text-black">
                {selectedInternObj.name || selectedInternObj.nama}
              </strong>
            </div>
            <div>
              <span className="font-semibold text-neutral-600">
                Instansi / Kampus:{" "}
              </span>
              <strong className="text-black">
                {selectedInternObj.institution ||
                  selectedInternObj.sekolah_kampus ||
                  "-"}
              </strong>
            </div>
            <div>
              <span className="font-semibold text-neutral-600">
                Program Studi / Divisi:{" "}
              </span>
              <strong className="text-black">
                {selectedInternObj.study_program ||
                  selectedInternObj.studyProgram ||
                  selectedInternObj.bagian ||
                  "-"}
              </strong>
            </div>
            <div>
              <span className="font-semibold text-neutral-600">
                No. Identitas / NIM:{" "}
              </span>
              <strong className="text-black">
                {selectedInternObj.identityNumber ||
                  selectedInternObj.identity_number ||
                  "-"}
              </strong>
            </div>
          </div>
        )}

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-neutral-200 border-b border-black text-black font-bold uppercase text-center">
              <th className="border border-black p-1.5 w-8">No</th>
              {!selectedInternObj && (
                <th className="border border-black p-1.5 min-w-[100px]">
                  Peserta
                </th>
              )}
              <th className="border border-black p-1.5 w-28">Tanggal</th>
              <th className="border border-black p-1.5 text-left">
                Uraian Aktivitas & Capaian Pekerjaan
              </th>
            </tr>
          </thead>
          <tbody>
            {logbooks.map((item, idx) => (
              <tr key={item.id} className="border-b border-neutral-400">
                <td className="border border-black p-1.5 text-center font-semibold">
                  {idx + 1}
                </td>
                {!selectedInternObj && (
                  <td className="border border-black p-1.5 font-bold">
                    {item.user_nama || item.userName || "Mahasiswa Magang"}
                  </td>
                )}
                <td className="border border-black p-1.5 text-center font-medium">
                  {formatTanggalIndo(item.tanggal)}
                </td>
                <td className="border border-black p-1.5 text-left whitespace-pre-wrap">
                  {item.aktivitas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold">
          <span>Total Aktivitas Tercatat: {stats.totalCount} kegiatan</span>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-center">
          <div className="space-y-16">
            <p className="font-semibold">Mahasiswa / Siswa Magang,</p>
            <div>
              <p className="font-bold underline uppercase">
                {selectedInternObj?.name ||
                  selectedInternObj?.nama ||
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
