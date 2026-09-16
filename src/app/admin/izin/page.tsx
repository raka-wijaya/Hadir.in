"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertModal,
} from "@/components/ui/Alert";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { Spinner } from "@/components/ui/Spinner";
import {
  FileCheck,
  Calendar,
  MessageSquare,
  RefreshCw,
  User,
  Building2,
  Paperclip,
  X,
  Save,
  Plus,
  Trash2,
  Edit3,
  Pencil,
  GraduationCap,
  Search,
  Filter,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  CheckCircle2Icon,
  AlertCircle,
  AlertTriangleIcon,
  InfoIcon,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Check,
} from "lucide-react";

interface Izin {
  id: string;
  peserta_magang_id?: string | null;
  karyawan_os_id?: string | null;
  pesertaMagangId?: string | null;
  karyawanOsId?: string | null;
  absensiId?: string;

  userName: string;
  userRole: string;
  userAvatar: string | null;
  userInstitution: string;
  userStudyProgram?: string;
  userDivisi?: string;
  user_divisi?: string;
  divisi?: string;

  jenis: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  attachment: string | null;
  catatanAdmin: string;

  createdAt: string;
  updatedAt: string;
}

interface UserOption {
  id: string;
  rawId: string;
  name: string;
  email: string;
  role: string;
  institution?: string;
  study_program?: string;
  divisi?: string;
}

const fmtDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
};

function normalizeJenis(jenis?: string | null): string {
  if (!jenis) return "SAKIT";
  const j = jenis.toUpperCase().trim();
  if (j === "SAKIT") return "SAKIT";
  if (
    j === "IZIN" ||
    j === "KEPERLUAN_PRIBADI" ||
    j === "KEPERLUAN PRIBADI" ||
    j.includes("PRIBADI") ||
    j.includes("IZIN")
  )
    return "IZIN";
  return "SAKIT";
}

function formatJenisIzin(jenis?: string | null): string {
  if (!jenis) return "Sakit";
  const j = jenis.toUpperCase().trim();
  if (j === "SAKIT") return "Sakit";
  if (j === "IZIN" || j === "KEPERLUAN_PRIBADI" || j === "KEPERLUAN PRIBADI")
    return "Izin";
  return jenis;
}

function getJenisBadgeClass(jenis?: string | null): string {
  const j = String(jenis || "").toUpperCase();
  if (j === "SAKIT") {
    return "status-sakit border";
  }
  if (j === "IZIN" || j.includes("PRIBADI") || j.includes("KEPERLUAN")) {
    return "status-izin border";
  }
  return "status-terlambat border";
}

async function readJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      res.status === 404
        ? "Layanan yang diminta tidak ditemukan."
        : "Terjadi kesalahan saat menerima respons dari server.",
    );
  }
  return res.json();
}

export default function AdminIzinPage() {
  const [izinList, setIzinList] = useState<Izin[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [debounceSearch, setDebounceSearch] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedIzin, setSelectedIzin] = useState<Izin | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const [formData, setFormData] = useState({
    selectedUserId: "",
    selectedUserRole: "",
    jenis: "SAKIT",
    tanggalMulai: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
    tanggalSelesai: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
    alasan: "",
    catatanAdmin: "",
  });

  const [modalAlert, setModalAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    color: "red" | "green" | "blue" | "yellow";
  }>({
    isOpen: false,
    title: "",
    message: "",
    color: "red",
  });

  const showAlert = (
    message: string,
    title = "Peringatan",
    color: "red" | "green" | "blue" | "yellow" = "red",
  ) => {
    setModalAlert({
      isOpen: true,
      title,
      message,
      color,
    });
  };

  const loadIzin = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterRole !== "ALL") params.append("role", filterRole);
      if (filterJenis !== "ALL") params.append("jenis", filterJenis);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);
      if (debounceSearch) params.append("search", searchQuery);

      const res = await fetch(`/api/izin?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await readJsonResponse(res);

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Data izin tidak dapat dimuat. Silakan coba kembali.",
        );
      }

      const list = Array.isArray(data.izin)
        ? data.izin
        : Array.isArray(data.data)
          ? data.data
          : [];
      setIzinList(list);
    } catch (err: any) {
      console.error("Terjadi kesalahan saat memuat data izin.", err);
      showAlert(
        err?.message || "Data izin tidak dapat dimuat. Silakan coba lagi.",
        "Data izin tidak dapat dimuat. Silakan coba lagi.",
        "red",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filterRole, filterJenis, filterStartDate, filterEndDate, debounceSearch]);

  const loadUsers = useCallback(async () => {
    try {
      const [magangRes, osRes] = await Promise.all([
        fetch("/api/users/peserta_magang", { cache: "no-store" }),
        fetch("/api/users/karyawan_os", { cache: "no-store" }),
      ]);

      const [magangData, osData] = await Promise.all([
        readJsonResponse(magangRes),
        readJsonResponse(osRes),
      ]);

      const allUsers = [
        ...(Array.isArray(magangData?.data)
          ? magangData.data.map((u: any) => ({
              ...u,
              role: "ANAK_MAGANG",
              _prefix: "magang",
            }))
          : []),
        ...(Array.isArray(osData?.data)
          ? osData.data.map((u: any) => ({
              ...u,
              role: "KARYAWAN_OS",
              _prefix: "os",
            }))
          : []),
      ];

      setUserOptions(
        allUsers.map((u: any) => ({
          id: `${u._prefix}-${u.id}`,
          rawId: String(u.id),
          name: u.name || u.nama || "User",
          email: u.email,
          role: u.role,
          institution: u.institution,
          study_program: u.study_program,
        })),
      );
    } catch (err) {
      console.warn("Gagal memuat daftar pengguna untuk pilihan izin.", err);
    }
  }, []);

  useEffect(() => {
    loadIzin();
    loadUsers();
  }, [loadIzin, loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredUserOptions = useMemo(() => {
    if (!debouncedUserSearch.trim()) return userOptions;
    const q = debouncedUserSearch.toLowerCase().trim();
    return userOptions.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.institution?.toLowerCase().includes(q) ||
        u.study_program?.toLowerCase().includes(q),
    );
  }, [userOptions, debouncedUserSearch]);

  const selectedUserOption = useMemo(() => {
    return (
      userOptions.find(
        (u) =>
          u.rawId === formData.selectedUserId &&
          u.role === formData.selectedUserRole,
      ) || userOptions.find((u) => u.rawId === formData.selectedUserId)
    );
  }, [userOptions, formData.selectedUserId, formData.selectedUserRole]);

  const resetForm = () => {
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    setFormData({
      selectedUserId: "",
      selectedUserRole: "",
      jenis: "SAKIT",
      tanggalMulai: today,
      tanggalSelesai: today,
      alasan: "",
      catatanAdmin: "",
    });
    setUserSearchQuery("");
    setDebouncedUserSearch("");
    setIsUserDropdownOpen(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (item: Izin) => {
    setSelectedIzin(item);
    const itemId = item.peserta_magang_id || item.karyawan_os_id || "";
    const itemRole =
      item.userRole || (item.peserta_magang_id ? "ANAK_MAGANG" : "KARYAWAN_OS");
    const normalizedJenis = normalizeJenis(item.jenis);
    setFormData({
      selectedUserId: itemId,
      selectedUserRole: itemRole,
      jenis: normalizedJenis,
      tanggalMulai: item.tanggalMulai,
      tanggalSelesai: item.tanggalSelesai,
      alasan: item.alasan,
      catatanAdmin: item.catatanAdmin || "",
    });
    setIsEditModalOpen(true);
  };

  const openNoteModal = (item: Izin) => {
    setSelectedIzin(item);
    setAdminNote(item.catatanAdmin || "");
    setIsNoteModalOpen(true);
  };

  const handleOpenDelete = (item: Izin) => {
    setSelectedIzin(item);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selectedUserId) {
      showAlert(
        "Silakan pilih peserta atau pengguna terlebih dahulu.",
        "Validasi Form",
        "red",
      );
      return;
    }
    if (!formData.alasan.trim()) {
      showAlert(
        "Alasan pengajuan izin harus diisi terlebih dahulu.",
        "Validasi Form",
        "red",
      );
      return;
    }

    try {
      setIsSaving(true);
      const isKaryawanOs = formData.selectedUserRole === "KARYAWAN_OS";
      const res = await fetch("/api/izin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isKaryawanOs
            ? { karyawan_os_id: formData.selectedUserId }
            : { peserta_magang_id: formData.selectedUserId }),
          jenis: formData.jenis,
          tanggalMulai: formData.tanggalMulai,
          tanggalSelesai: formData.tanggalSelesai,
          alasan: formData.alasan,
        }),
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Pengajuan izin tidak dapat diproses.");
      }

      showAlert(
        "Pengajuan izin telah berhasil disimpan dan data presensi telah diperbarui secara otomatis.",
        "Pengajuan Izin Berhasil Dibuat",
        "green",
      );

      setIsCreateModalOpen(false);
      resetForm();
      loadIzin();
    } catch (err: any) {
      console.error("Gagal menambah izin:", err);
      showAlert(err?.message || "Gagal menambah izin.", "Gagal Simpan", "red");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIzin) return;
    if (!formData.alasan.trim()) {
      showAlert("Alasan pengajuan izin wajib diisi.", "Validasi Form", "red");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/izin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedIzin.id,
          jenis: formData.jenis,
          tanggal_mulai: formData.tanggalMulai,
          tanggal_selesai: formData.tanggalSelesai,
          alasan: formData.alasan.trim(),
          catatanAdmin: formData.catatanAdmin.trim(),
        }),
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            "Pembaruan data pengajuan izin gagal dilakukan. Silakan coba kembali.",
        );
      }

      showAlert(
        "Pengajuan Izin Berhasil Diperbarui",
        "Informasi Izin Berhasil Diperbarui",
        "green",
      );

      setIsEditModalOpen(false);
      setSelectedIzin(null);
      loadIzin();
    } catch (err: any) {
      console.error("Gagal edit izin:", err);
      showAlert(
        err?.message ||
          "Pembaruan data izin gagal dilakukan. Silakan coba kembali.",
        "Gagal Simpan",
        "red",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedIzin) return;

    try {
      setIsSaving(true);
      const res = await fetch("/api/izin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedIzin.id,
          catatanAdmin: adminNote.trim(),
        }),
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memperbarui catatan admin.");
      }

      setIzinList((prev) =>
        prev.map((item) =>
          item.id === selectedIzin.id
            ? { ...item, catatanAdmin: adminNote.trim() }
            : item,
        ),
      );

      showAlert(
        "Catatan admin untuk pengajuan izin berhasil disimpan.",
        "Catatan Disimpan",
        "green",
      );

      setIsNoteModalOpen(false);
      setSelectedIzin(null);
    } catch (err: any) {
      console.error("Gagal memperbarui catatan:", err);
      showAlert(
        err?.message || "Gagal memperbarui catatan admin.",
        "Gagal Menyimpan Catatan",
        "red",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedIzin) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/izin?id=${selectedIzin.id}`, {
        method: "DELETE",
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Pengajuan izin gagal dihapus.");
      }

      showAlert(
        "Data pengajuan izin telah berhasil dihapus dari sistem.",
        "Izin Dihapus",
        "green",
      );

      setIsDeleteModalOpen(false);
      setSelectedIzin(null);
      loadIzin();
    } catch (err: any) {
      console.error("Gagal menghapus izin:", err);
      showAlert(
        err?.message || "Data izin gagal dihapus. Silakan coba kembali.",
        "Gagal Hapus",
        "red",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (izinList.length === 0) return;
    const headers = [
      "No",
      "Nama User",
      "Role",
      "Institusi",
      "Jenis Izin",
      "Tanggal Mulai",
      "Tanggal Selesai",
      "Alasan",
      "Catatan Admin",
      "Tanggal Diajukan",
    ];

    const rows = izinList.map((item, idx) => [
      idx + 1,
      `"${item.userName}"`,
      `"${item.userRole}"`,
      `"${item.userInstitution || ""}"`,
      `"${item.jenis}"`,
      item.tanggalMulai,
      item.tanggalSelesai,
      `"${item.alasan.replace(/"/g, '""')}"`,
      `"${(item.catatanAdmin || "").replace(/"/g, '""')}"`,
      item.createdAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Rekap_Izin_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const total = izinList.length;
    const sakit = izinList.filter(
      (i) => String(i.jenis).toUpperCase() === "SAKIT",
    ).length;
    const izin = izinList.filter(
      (i) =>
        String(i.jenis).toUpperCase() === "IZIN" ||
        String(i.jenis).toUpperCase() === "KEPERLUAN_PRIBADI" ||
        String(i.jenis).toUpperCase().includes("KEPERLUAN"),
    ).length;

    const todayStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    const activeToday = izinList.filter(
      (i) => i.tanggalMulai <= todayStr && i.tanggalSelesai >= todayStr,
    ).length;

    return { total, sakit, izin, activeToday };
  }, [izinList]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AlertModal
          isOpen={modalAlert.isOpen}
          title={modalAlert.title}
          message={modalAlert.message}
          color={modalAlert.color}
          onClose={() => setModalAlert((prev) => ({ ...prev, isOpen: false }))}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Manajemen Pengajuan Izin
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Kelola, verifikasi, buat pengajuan baru, dan berikan catatan admin
              untuk izin magang &amp; pegawai OS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadIzin}
              disabled={isLoading}
              title="Segarkan Data"
              className="p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Izin
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Total Izin
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-primary">{stats.total}</p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Semua Permohonan
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-sakit uppercase tracking-wider">
                Izin Sakit
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-sakit">
                {stats.sakit}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Alasan Kesehatan
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-izin uppercase tracking-wider">
                Izin
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-izin">
                {stats.izin}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Keperluan / Personal
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-terlambat uppercase tracking-wider">
                Izin Hari Ini
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-terlambat">
                {stats.activeToday}
              </p>
            )}

            <span className="text-[10px] font-semibold text-muted-foreground">
              Sedang Berlangsung
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, institusi, atau alasan"
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
            <div className="relative">
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Jenis Izin</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Role</option>
                <option value="ADMIN_MAGANG">Anak Magang</option>
                <option value="ADMIN_OS">Pegawai OS</option>
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <input
                type="date"
                title="Filter tanggal mulai"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
              {filterStartDate && (
                <button
                  onClick={() => setFilterStartDate("")}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {(searchQuery ||
            filterJenis !== "ALL" ||
            filterRole !== "ALL" ||
            filterStartDate ||
            filterEndDate) && (
            <div className="flex justify-end pt-1 border-t border-border/60">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterJenis("ALL");
                  setFilterRole("ALL");
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
                className="text-primary hover:underline font-bold text-xs cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="
                  bg-muted/60
                  border-b border-border
                  text-muted-foreground
                  font-extrabold
                  text-[11px]
                  uppercase
                  tracking-wider
                  whitespace-nowrap
                "
                >
                  <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">
                    Nama
                  </th>
                  <th className="py-3.5 px-4 min-w-[120px] whitespace-nowrap">
                    Role
                  </th>
                  <th className="py-3.5 px-4 min-w-[180px] whitespace-nowrap">
                    Institusi
                  </th>
                  <th className="py-3.5 px-4 min-w-[110px] text-center whitespace-nowrap">
                    Jenis
                  </th>
                  <th className="py-3.5 px-4 min-w-[190px] whitespace-nowrap">
                    Periode Izin
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">
                    Alasan
                  </th>
                  <th className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                    Diajukan
                  </th>
                  <th className="py-3.5 px-4 min-w-[90px] text-right whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-muted-foreground font-semibold"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : izinList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto px-4">
                        <div className="space-y-1">
                          <p className="text-xs text-foreground">
                            Tidak ada data pengajuan izin yang cocok
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  izinList.slice(0, itemsPerPage).map((item, idx) => (
                    <tr
                      key={item.id}
                      className="
                        hover:bg-accent/40
                        transition-colors
                      "
                    >
                      <td className="py-3.5 px-4 text-muted-foreground font-semibold text-center whitespace-nowrap">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {item.userAvatar ? (
                            <img
                              src={item.userAvatar}
                              alt={item.userName}
                              className="
                                w-9 h-9
                                rounded-full
                                object-cover
                                border border-border
                                shrink-0
                              "
                            />
                          ) : (
                            <div
                              className="
                              w-9 h-9
                              rounded-full
                              bg-primary/10
                              border border-primary/10
                              flex items-center justify-center
                              text-primary
                              font-black
                              shrink-0
                            "
                            >
                              {(item.userName || "?").charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div
                              className="
                              font-extrabold
                              text-foreground
                              truncate
                              max-w-[220px]
                            "
                            >
                              {item.userName}
                              {(item.userDivisi || item.user_divisi || item.divisi) ? (
                                <span className="font-normal text-muted-foreground"> - {item.userDivisi || item.user_divisi || item.divisi}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground font-bold text-[10px] uppercase tracking-wide">
                          {item.userRole}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                          <span>{item.userInstitution || "-"}</span>
                        </div>
                        {item.userStudyProgram && (
                          <div className="text-[11px] text-muted-foreground font-normal pl-5.5 mt-0.5 whitespace-nowrap">
                            {item.userStudyProgram}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${getJenisBadgeClass(
                            item.jenis,
                          )}`}
                        >
                          {formatJenisIzin(item.jenis)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {fmtDate(item.tanggalMulai)}
                            {item.tanggalMulai !== item.tanggalSelesai && (
                              <> &ndash; {fmtDate(item.tanggalSelesai)}</>
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <p
                          className="text-foreground font-medium truncate"
                          title={item.alasan}
                        >
                          {item.alasan || "—"}
                        </p>
                        {item.attachment && (
                          <a
                            href={item.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary font-bold hover:underline mt-0.5 text-[11px]"
                          >
                            <Paperclip className="w-3 h-3" />
                            Lampiran
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-medium">
                        {fmtDate(item.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit data"
                            className="
                              p-2
                              rounded-lg
                              text-primary
                              hover:bg-primary/10
                              active:scale-95
                              transition-all
                              cursor-pointer
                            "
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            title="Hapus data"
                            className="
                              p-2
                              rounded-lg
                              text-destructive
                              hover:bg-destructive/10
                              active:scale-95
                              transition-all
                              cursor-pointer
                            "
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && izinList.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {Math.min(itemsPerPage, izinList.length)}
                </strong>{" "}
                data izin
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
                  <option value={100}>100</option>
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
        w-full
        max-w-2xl
        shadow-2xl
        p-4 md:p-6
        space-y-4
        animate-in zoom-in-95
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
      "
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-black text-base text-foreground">
                      Tambah Pengajuan Izin Baru
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      Buat pengajuan izin baru untuk peserta atau pegawai.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="
            p-1.5
            rounded-lg
            text-muted-foreground
            hover:text-foreground
            hover:bg-muted
            transition-all
            cursor-pointer
          "
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" ref={userDropdownRef}>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Pilih Peserta
                        <span className="text-status-tolak">*</span>
                      </label>

                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          {userSearchQuery !== debouncedUserSearch ? (
                            <Spinner size="sm" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value);
                            setIsUserDropdownOpen(true);
                          }}
                          onFocus={() => setIsUserDropdownOpen(true)}
                          placeholder={
                            selectedUserOption
                              ? `Ganti: ${selectedUserOption.name} (${selectedUserOption.role})`
                              : "Cari nama, role, atau instansi peserta"
                          }
                          className="
                          w-full
                          pl-9 pr-8 py-2
                          bg-input
                          border border-border
                          rounded-xl
                          text-xs
                          font-semibold
                          text-foreground
                          placeholder:text-muted-foreground
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary
                        "
                        />
                        {userSearchQuery ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUserSearchQuery("");
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setIsUserDropdownOpen((prev) => !prev)
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isUserDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {selectedUserOption && (
                        <div className="mt-1.5 p-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                              {selectedUserOption.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">
                                {selectedUserOption.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                <span className="font-semibold text-primary">
                                  {selectedUserOption.role}
                                </span>
                                {selectedUserOption.institution
                                  ? ` • ${selectedUserOption.institution}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                selectedUserId: "",
                                selectedUserRole: "",
                              }));
                              setUserSearchQuery("");
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-background/80 transition-colors cursor-pointer"
                            title="Hapus pilihan"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <input
                        type="text"
                        className="sr-only"
                        required
                        value={formData.selectedUserId}
                        onChange={() => {}}
                      />

                      {isUserDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-border/60">
                          <div className="p-2 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {userSearchQuery !== debouncedUserSearch ? (
                                <span className="inline-flex items-center gap-1 text-primary">
                                  <Spinner size="sm" />
                                </span>
                              ) : (
                                <span>
                                  Ditemukan{" "}
                                  <strong className="text-foreground">
                                    {filteredUserOptions.length}
                                  </strong>{" "}
                                  peserta
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {filteredUserOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              Tidak ada peserta yang cocok dengan &quot;
                              {debouncedUserSearch}&quot;
                            </div>
                          ) : (
                            filteredUserOptions.map((u) => {
                              const isSelected =
                                u.rawId === formData.selectedUserId &&
                                u.role === formData.selectedUserRole;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      selectedUserId: u.rawId,
                                      selectedUserRole: u.role,
                                    }));
                                    setUserSearchQuery("");
                                    setIsUserDropdownOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 flex items-center justify-between gap-2 hover:bg-primary/10 transition-colors cursor-pointer ${
                                    isSelected ? "bg-primary/15 font-bold" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-foreground"
                                      }`}
                                    >
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-xs font-bold text-foreground truncate">
                                          {u.name}
                                          {u.divisi ? <span className="font-normal text-muted-foreground"> - {u.divisi}</span> : null}
                                        </p>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                                          {u.role}
                                        </span>
                                      </div>
                                      {(u.institution || u.study_program) && (
                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                          {u.institution}{" "}
                                          {u.study_program
                                            ? `• ${u.study_program}`
                                            : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-primary shrink-0" />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Jenis Izin <span className="text-status-tolak">*</span>
                      </label>

                      <select
                        value={formData.jenis}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            jenis: e.target.value,
                          })
                        }
                        className="
                w-full
                px-3 py-2
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary
                cursor-pointer
              "
                      >
                        <option value="SAKIT">Sakit</option>
                        <option value="IZIN">Izin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Tanggal Mulai
                      </label>

                      <input
                        type="date"
                        value={formData.tanggalMulai}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanggalMulai: e.target.value,
                          })
                        }
                        required
                        className="
                w-full
                px-3 py-2
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary
              "
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Tanggal Selesai
                      </label>

                      <input
                        type="date"
                        value={formData.tanggalSelesai}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanggalSelesai: e.target.value,
                          })
                        }
                        required
                        className="
                w-full
                px-3 py-2
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary
              "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Alasan Pengajuan Izin
                        <span className="text-status-tolak">*</span>
                      </label>

                      <textarea
                        rows={3}
                        value={formData.alasan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            alasan: e.target.value,
                          })
                        }
                        placeholder="Masukkan alasan pengajuan izin"
                        required
                        className="
                w-full
                px-3 py-2
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary
                resize-none
              "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Catatan Admin (Opsional)
                      </label>

                      <textarea
                        rows={3}
                        value={formData.catatanAdmin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            catatanAdmin: e.target.value,
                          })
                        }
                        placeholder="Masukkan catatan admin"
                        className="
                w-full
                px-3 py-2
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary
                resize-none
              "
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={isSaving}
                      className="
              px-5
              py-2.5
              rounded-xl
              border border-border
              bg-card
              text-foreground
              font-bold
              text-xs
              hover:bg-muted
              transition-all
              cursor-pointer
              disabled:opacity-50
            "
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="
              px-5
              py-2.5
              rounded-xl
              bg-primary
              text-primary-foreground
              font-bold
              text-xs
              hover:bg-primary/90
              transition-all
              shadow-md
              flex items-center
              justify-center
              gap-1.5
              cursor-pointer
              disabled:opacity-50
            "
                    >
                      {isSaving ? (
                        <>
                          <Spinner size="sm" />
                        </>
                      ) : (
                        "Simpan Pengajuan"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

        {isEditModalOpen && selectedIzin && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl p-4 space-y-2.5 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-foreground">
                      Edit Data Pengajuan Izin
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="px-3 py-1.5 bg-muted/40 border border-border rounded-xl flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                    Pemohon
                  </span>
                  <p className="font-extrabold text-foreground text-xs">
                    {selectedIzin.userName}{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({selectedIzin.userRole})
                    </span>
                  </p>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Jenis Izin <span className="text-status-tolak">*</span>
                      </label>
                      <select
                        value={formData.jenis}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            jenis: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="SAKIT">Sakit</option>
                        <option value="IZIN">Izin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        value={formData.tanggalMulai}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanggalMulai: e.target.value,
                          })
                        }
                        required
                        className="w-full px-2.5 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Tanggal Selesai
                      </label>
                      <input
                        type="date"
                        value={formData.tanggalSelesai}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanggalSelesai: e.target.value,
                          })
                        }
                        required
                        className="w-full px-2.5 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Alasan Pengajuan Izin
                        <span className="text-status-tolak">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={formData.alasan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            alasan: e.target.value,
                          })
                        }
                        required
                        placeholder="Masukkan alasan pengajuan izin"
                        className="w-full px-2.5 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Catatan Admin (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.catatanAdmin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            catatanAdmin: e.target.value,
                          })
                        }
                        placeholder="Masukkan catatan admin"
                        className="w-full px-2.5 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Spinner size="sm" />
                          Menyimpan...
                        </>
                      ) : (
                        "Perbarui Izin"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

        {isNoteModalOpen && selectedIzin && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                      <MessageSquare className="w-5 h-5" />
                    </span>
                    <h3 className="font-black text-lg text-foreground">
                      Catatan Admin
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Pemohon
                  </span>
                  <p className="font-extrabold text-foreground">
                    {selectedIzin.userName}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {selectedIzin.jenis} • {fmtDate(selectedIzin.tanggalMulai)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Isi Catatan Admin
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Masukkan catatan admin..."
                    className="w-full rounded-xl border border-border bg-input p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none h-28"
                    disabled={isSaving}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateNote}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Spinner size="sm" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Simpan Catatan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {isDeleteModalOpen && selectedIzin && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-2xl max-w-sm w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    Hapus Pengajuan Izin?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Pengajuan izin milik{" "}
                    <span className="font-bold text-foreground">
                      {selectedIzin.userName}
                    </span>{" "}
                    ({fmtDate(selectedIzin.tanggalMulai)}) akan dihapus dari
                    data izin dan presensi. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleDeleteSubmit}
                    className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving ? <Spinner size="sm" /> : "Ya, Hapus"}
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
