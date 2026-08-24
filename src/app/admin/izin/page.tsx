"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Alert, AlertModal } from "@/components/ui/Alert";
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
  Search,
  Filter,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface Izin {
  id: string;
  userId: string;
  absensiId?: string;

  userName: string;
  userRole: string;
  userAvatar: string | null;
  userInstitution: string;
  userStudyProgram?: string;

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
  name: string;
  email: string;
  role: string;
  institution?: string;
  study_program?: string;
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

function formatJenisIzin(jenis?: string | null): string {
  if (!jenis) return "Izin";
  const j = jenis.toUpperCase();
  if (j === "KEPERLUAN_PRIBADI" || j === "KEPERLUAN PRIBADI") return "Keperluan Pribadi";
  if (j === "SAKIT") return "Sakit";
  if (j === "LAINNYA") return "Lainnya";
  return jenis;
}

function getJenisBadgeClass(jenis?: string | null): string {
  const j = String(jenis || "").toUpperCase();
  if (j.includes("SAKIT")) {
    return "status-sakit border";
  }
  if (j.includes("PRIBADI") || j.includes("KEPERLUAN")) {
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
        : "Server mengirim respons yang tidak valid."
    );
  }
  return res.json();
}

export default function AdminIzinPage() {
  const [izinList, setIzinList] = useState<Izin[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [debounceSearch, setDebounceSearch] = useState("");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedIzin, setSelectedIzin] = useState<Izin | null>(null);
  const [adminNote, setAdminNote] = useState("");

  // Form State for Create & Edit
  const [formData, setFormData] = useState({
    userId: "",
    jenis: "Sakit",
    tanggalMulai: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
    tanggalSelesai: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
    alasan: "",
    catatanAdmin: "",
  });

  // Alerts
  const [bannerAlert, setBannerAlert] = useState<{
    title: string;
    message: string;
    color: "red" | "green" | "blue" | "yellow";
  } | null>(null);

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

  const showAlert = (message: string, title = "Peringatan", color: "red" | "green" | "blue" | "yellow" = "red") => {
    setModalAlert({
      isOpen: true,
      title,
      message,
      color,
    });
  };

  // Load Izin
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
        throw new Error(data.message || "Gagal mengambil data izin.");
      }

      const list = Array.isArray(data.izin)
        ? data.izin
        : Array.isArray(data.data)
        ? data.data
        : [];
      setIzinList(list);
    } catch (err: any) {
      console.error("Gagal memuat data izin:", err);
      showAlert(err?.message || "Gagal memuat data izin.", "Gagal Memuat Izin", "red");
    } finally {
      setIsLoading(false);
    }
  }, [filterRole, filterJenis, filterStartDate, filterEndDate, debounceSearch]);

  // Load Users for dropdown
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await readJsonResponse(res);
      if (res.ok && data.success && Array.isArray(data.data)) {
        setUserOptions(
          data.data.map((u: any) => ({
            id: String(u.id),
            name: u.name || u.nama || "User",
            email: u.email,
            role: u.role,
            institution: u.institution,
            study_program: u.study_program,
          }))
        );
      }
    } catch (err) {
      console.warn("Gagal memuat daftar user untuk dropdown izin:", err);
    }
  }, []);

  useEffect(() => {
    loadIzin();
    loadUsers();
  }, [loadIzin, loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => { //agar search tidak jebol
      setDebounceSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer); //membersihkan timer jika ada perubahan
  }, [searchQuery]);

  // Reset form
  const resetForm = () => {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
    setFormData({
      userId: userOptions[0]?.id || "",
      jenis: "Sakit",
      tanggalMulai: today,
      tanggalSelesai: today,
      alasan: "",
      catatanAdmin: "",
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: Izin) => {
    setSelectedIzin(item);
    setFormData({
      userId: item.userId,
      jenis: item.jenis,
      tanggalMulai: item.tanggalMulai,
      tanggalSelesai: item.tanggalSelesai,
      alasan: item.alasan,
      catatanAdmin: item.catatanAdmin || "",
    });
    setIsEditModalOpen(true);
  };

  // Open Quick Note Modal
  const openNoteModal = (item: Izin) => {
    setSelectedIzin(item);
    setAdminNote(item.catatanAdmin || "");
    setIsNoteModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (item: Izin) => {
    setSelectedIzin(item);
    setIsDeleteModalOpen(true);
  };

  // Submit Create (POST)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      showAlert("Silakan pilih peserta / user terlebih dahulu.", "Validasi Form", "red");
      return;
    }
    if (!formData.alasan.trim()) {
      showAlert("Alasan pengajuan izin wajib diisi.", "Validasi Form", "red");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/izin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal membuat pengajuan izin.");
      }

      setBannerAlert({
        title: "Izin Berhasil Dibuat",
        message: "Data pengajuan izin baru telah berhasil disimpan dan disinkronkan ke presensi.",
        color: "green",
      });

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

  // Submit Edit (PATCH/PUT)
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
        throw new Error(data.message || "Gagal memperbarui data pengajuan izin.");
      }

      setBannerAlert({
        title: "Izin Diperbarui",
        message: "Data pengajuan izin berhasil diperbarui.",
        color: "green",
      });

      setIsEditModalOpen(false);
      setSelectedIzin(null);
      loadIzin();
    } catch (err: any) {
      console.error("Gagal edit izin:", err);
      showAlert(err?.message || "Gagal memperbarui data izin.", "Gagal Simpan", "red");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Quick Note (PATCH)
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
            : item
        )
      );

      setBannerAlert({
        title: "Catatan Disimpan",
        message: "Catatan admin untuk pengajuan izin berhasil disimpan.",
        color: "green",
      });

      setIsNoteModalOpen(false);
      setSelectedIzin(null);
    } catch (err: any) {
      console.error("Gagal memperbarui catatan:", err);
      showAlert(err?.message || "Gagal memperbarui catatan admin.", "Gagal Menyimpan Catatan", "red");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Delete (DELETE)
  const handleDeleteSubmit = async () => {
    if (!selectedIzin) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/izin?id=${selectedIzin.id}`, {
        method: "DELETE",
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus pengajuan izin.");
      }

      setBannerAlert({
        title: "Izin Dihapus",
        message: "Data pengajuan izin berhasil dihapus dari sistem.",
        color: "green",
      });

      setIsDeleteModalOpen(false);
      setSelectedIzin(null);
      loadIzin();
    } catch (err: any) {
      console.error("Gagal menghapus izin:", err);
      showAlert(err?.message || "Gagal menghapus data izin.", "Gagal Hapus", "red");
    } finally {
      setIsSaving(false);
    }
  };

  // Export CSV
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
    link.setAttribute("download", `Rekap_Izin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = izinList.length;
    const sakit = izinList.filter((i) => String(i.jenis).toUpperCase().includes("SAKIT")).length;
    const pribadi = izinList.filter(
      (i) =>
        String(i.jenis).toUpperCase().includes("PRIBADI") ||
        String(i.jenis).toUpperCase().includes("KEPERLUAN")
    ).length;
    const lainnya = total - sakit - pribadi;

    const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
    const activeToday = izinList.filter(
      (i) => i.tanggalMulai <= todayStr && i.tanggalSelesai >= todayStr
    ).length;

    return { total, sakit, pribadi, lainnya, activeToday };
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

        {bannerAlert && (
          <Alert
            variant="light"
            color={bannerAlert.color}
            title={bannerAlert.title}
            withCloseButton
            onClose={() => setBannerAlert(null)}
          >
            {bannerAlert.message}
          </Alert>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Manajemen Pengajuan Izin
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Kelola, verifikasi, buat pengajuan baru, dan berikan catatan admin untuk izin magang &amp; pegawai OS.
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
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Izin</span>
              <FileCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.total}</p>
            <p className="text-[11px] text-muted-foreground">Semua permohonan</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Izin Sakit</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400">{stats.sakit}</p>
            <p className="text-[11px] text-muted-foreground">Alasan kesehatan</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Keperluan Pribadi</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">{stats.pribadi}</p>
            <p className="text-[11px] text-muted-foreground">Urusan personal / keluarga</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Izin Hari Ini</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">{stats.activeToday}</p>
            <p className="text-[11px] text-muted-foreground">Sedang berlangsung</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, institusi, atau alasan..."
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
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Jenis Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Keperluan Pribadi">Keperluan Pribadi</option>
                <option value="Lainnya">Lainnya</option>
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
          {(searchQuery || filterJenis !== "ALL" || filterRole !== "ALL" || filterStartDate || filterEndDate) && (
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
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-7 h-7 animate-spin mb-3 text-primary" />
            <p className="text-sm font-semibold">Memuat data izin...</p>
          </div>
        )}
        {!isLoading && izinList.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <FileCheck className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-foreground text-base">
              Belum Ada Pengajuan Izin
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Belum terdapat data pengajuan izin yang masuk atau sesuai dengan kriteria filter pencarian.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Pengajuan Izin Baru
            </button>
          </div>
        )}
        {!isLoading && izinList.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {izinList.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4 hover:border-primary/50 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden border border-border font-bold">
                      {item.userAvatar ? (
                        <img
                          src={item.userAvatar}
                          alt={item.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-foreground truncate">
                        {item.userName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-bold px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px]">
                          {item.userRole}
                        </span>
                        {item.userInstitution && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {item.userInstitution}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${getJenisBadgeClass(
                        item.jenis
                      )}`}
                    >
                      {formatJenisIzin(item.jenis)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm bg-input/40 p-4 rounded-xl border border-border">
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Periode Izin
                    </span>
                    <p className="font-bold text-foreground">
                      {fmtDate(item.tanggalMulai)}
                      {" s/d "}
                      {fmtDate(item.tanggalSelesai)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      Alasan Pengajuan
                    </span>
                    <p className="font-medium text-foreground leading-relaxed">
                      {item.alasan || "—"}
                    </p>
                  </div>
                </div>
                {item.attachment && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        Lampiran Berkas / Surat Keterangan
                      </span>
                    </div>
                    <a
                      href={item.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-primary hover:underline shrink-0 flex items-center gap-1"
                    >
                      Lihat Lampiran
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-muted/50 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      Catatan Admin
                    </span>
                    <button
                      type="button"
                      onClick={() => openNoteModal(item)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      {item.catatanAdmin ? "Ubah Catatan" : "+ Tambah Catatan"}
                    </button>
                  </div>
                  <div className="p-3.5">
                    {item.catatanAdmin ? (
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {item.catatanAdmin}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Belum ada catatan admin.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-border/60">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Diajukan pada {fmtDate(item.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openNoteModal(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      Catatan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs hover:bg-blue-500/20 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: Tambah Izin Baru (CREATE) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-4 md:p-5 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                    <Plus className="w-4 h-4" />
                  </span>
                    <h3 className="font-black text-base text-foreground">
                      Tambah Pengajuan Izin Baru
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      Pilih Peserta / User *
                    </label>
                    <select
                      value={formData.userId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          userId: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih Pengaju Izin --
                      </option>
                      {userOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role}){" "}
                          {u.institution ? `- ${u.institution}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      Jenis Izin *
                    </label>
                    <select
                      value={formData.jenis}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          jenis: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="Sakit">Sakit</option>
                      <option value="Keperluan Pribadi">
                        Keperluan Pribadi
                      </option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Tanggal Mulai *
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
                        className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        Tanggal Selesai *
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
                        className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      Alasan Pengajuan Izin *
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
                      placeholder="Tuliskan keterangan atau alasan pengajuan izin..."
                      required
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                  <div>
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
                      placeholder="Tambahkan catatan tindak lanjut dari admin..."
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={isSaving}
                      className="flex-1 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan Pengajuan"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        {/* MODAL: Edit Izin (UPDATE) */}
        {isEditModalOpen && selectedIzin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-4 md:p-5 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-foreground">
                    Edit Data Pengajuan Izin
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2.5 bg-muted/40 border border-border rounded-xl text-xs">
                <span className="text-muted-foreground text-[9px] uppercase font-bold">
                  Pemohon
                </span>
                <p className="font-extrabold text-foreground mt-0.5 text-xs">
                  {selectedIzin.userName} ({selectedIzin.userRole})
                </p>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Jenis Izin *
                  </label>
                  <select
                    value={formData.jenis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jenis: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="Sakit">Sakit</option>
                    <option value="Keperluan Pribadi">
                      Keperluan Pribadi
                    </option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      Tanggal Mulai *
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
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      Tanggal Selesai *
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
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Alasan Pengajuan Izin *
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
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Catatan Admin
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
                    placeholder="Tambahkan catatan tindak lanjut dari admin..."
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSaving}
                    className="flex-1 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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
        )}

        {/* MODAL: Quick Catatan Admin */}
        {isNoteModalOpen && selectedIzin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
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
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Pemohon</span>
                <p className="font-extrabold text-foreground">{selectedIzin.userName}</p>
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
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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
        )}

        {/* MODAL: Hapus Izin (DELETE) */}
        {isDeleteModalOpen && selectedIzin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Hapus Pengajuan Izin?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Pengajuan izin milik <span className="font-bold text-foreground">{selectedIzin.userName}</span> ({fmtDate(selectedIzin.tanggalMulai)}) akan dihapus dari data izin dan presensi. Tindakan ini tidak dapat dibatalkan.
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
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
