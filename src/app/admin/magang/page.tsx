"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  showNotification,
  showConfirm,
} from "@/components/ui/NotificationProvider";
import { Spinner } from "@/components/ui/Spinner";
import {
  Globe,
  Footprints,
  Briefcase,
  GitMerge,
  Gift,
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Search,
  ExternalLink,
  X,
  ImageIcon,
  Upload,
} from "lucide-react";
import Link from "next/link";

interface FooterData {
  id?: number | string;
  alamat?: string;
  email?: string;
  telepon?: string;
  copyright?: string;
  deskripsi?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter_x?: string;
  jam_operasional?: string;
  [key: string]: any;
}

interface ProgramMagangData {
  id?: number | string;
  judul?: string;
  nama_program?: string;
  title?: string;
  deskripsi?: string;
  description?: string;
  durasi?: string;
  duration?: string;
  kategori?: string;
  tipe?: string;
  kuota?: number | string;
  status?: string;
  gambar?: string;
  gambar1?: string;
  gambar2?: string;
  gambar3?: string;
  [key: string]: any;
}

interface ProsesMagangData {
  id?: number | string;
  step?: number | string;
  langkah?: number | string;
  urutan?: number | string;
  judul?: string;
  title?: string;
  deskripsi?: string;
  description?: string;
  [key: string]: any;
}

interface BenefitMagangData {
  id?: number | string;
  judul?: string;
  title?: string;
  deskripsi?: string;
  description?: string;
  icon?: string;
  [key: string]: any;
}

interface TimelineKegiatanData {
  id?: number | string;
  kegiatan?: string;
  judul?: string;
  title?: string;
  tanggal?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  deskripsi?: string;
  description?: string;
  status?: string;
  urutan?: number | string;
  [key: string]: any;
}

export default function AdminMagangPage() {
  const { user } = useAuth();

  // Role validation
  const role = String(user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPERADMIN" || role === "SUPER_ADMIN";
  const isAdminMagang = role === "ADMIN_MAGANG";

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "footer" | "program" | "proses" | "benefit" | "timeline"
  >("program");

  // Loading States
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Search filter for tables
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Data States
  const [footerData, setFooterData] = useState<FooterData>({
    alamat: "",
    email: "",
    telepon: "",
    copyright: "",
    deskripsi: "",
    instagram: "",
    linkedin: "",
    facebook: "",
    twitter_x: "",
    jam_operasional: "",
  });

  const [programList, setProgramList] = useState<ProgramMagangData[]>([]);
  const [prosesList, setProsesList] = useState<ProsesMagangData[]>([]);
  const [benefitList, setBenefitList] = useState<BenefitMagangData[]>([]);
  const [timelineList, setTimelineList] = useState<TimelineKegiatanData[]>([]);

  // Modal State
  const [modalType, setModalType] = useState<
    "program" | "proses" | "benefit" | "timeline" | null
  >(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [activeItem, setActiveItem] = useState<any>(null);

  // Gambar file state for program modal — supports up to 3 photos
  const [gambarFiles, setGambarFiles] = useState<(File | null)[]>([null, null, null]);
  const [gambarPreviews, setGambarPreviews] = useState<(string | null)[]>([null, null, null]);
  const gambarInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Helper to reset gambar states
  const resetGambar = () => {
    setGambarFiles([null, null, null]);
    setGambarPreviews([null, null, null]);
    gambarInputRefs.forEach((r) => { if (r.current) r.current.value = ""; });
  };

  // Prevent background scroll when modal open
  useEffect(() => {
    if (modalType) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modalType]);

  // Helper response parser
  const parseApiResponse = (json: any) => {
    if (!json) return null;
    if (json.data !== undefined) return json.data;
    if (json.result !== undefined) return json.result;
    return json;
  };

  // 1. Fetch Footer
  const fetchFooter = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/magang/footer", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const data = parseApiResponse(json);
        if (data && typeof data === "object") {
          setFooterData((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } else {
        showNotification({
          type: "warning",
          title: "Peringatan Footer",
          message: `Gagal memuat footer (Status: ${res.status})`,
        });
      }
    } catch (err: any) {
      console.error("fetchFooter error:", err);
      showNotification({
        type: "error",
        title: "Gagal Memuat Footer",
        message: "Tidak dapat mengambil data footer dari server.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Program Magang
  const fetchProgramMagang = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/magang/program", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const data = parseApiResponse(json);
        setProgramList(Array.isArray(data) ? data : []);
      } else {
        showNotification({
          type: "warning",
          title: "Peringatan Program Magang",
          message: `Gagal memuat program magang (Status: ${res.status})`,
        });
      }
    } catch (err: any) {
      console.error("fetchProgramMagang error:", err);
      showNotification({
        type: "error",
        title: "Gagal Memuat Data",
        message: "Tidak dapat mengambil data program magang.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch Proses Program Magang
  const fetchProsesProgramMagang = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/magang/proses", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const data = parseApiResponse(json);
        setProsesList(Array.isArray(data) ? data : []);
      } else {
        showNotification({
          type: "warning",
          title: "Peringatan Proses Magang",
          message: `Gagal memuat alur/proses (Status: ${res.status})`,
        });
      }
    } catch (err: any) {
      console.error("fetchProsesProgramMagang error:", err);
      showNotification({
        type: "error",
        title: "Gagal Memuat Data",
        message: "Tidak dapat mengambil data proses magang.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Fetch Benefit Program Magang
  const fetchBenefitProgramMagang = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/magang/benefit", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const data = parseApiResponse(json);
        setBenefitList(Array.isArray(data) ? data : []);
      } else {
        showNotification({
          type: "warning",
          title: "Peringatan Benefit Magang",
          message: `Gagal memuat benefit (Status: ${res.status})`,
        });
      }
    } catch (err: any) {
      console.error("fetchBenefitProgramMagang error:", err);
      showNotification({
        type: "error",
        title: "Gagal Memuat Data",
        message: "Tidak dapat mengambil data benefit magang.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. Fetch Timeline Kegiatan
  const fetchTimelineKegiatan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/magang/timeline", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const data = parseApiResponse(json);
        setTimelineList(Array.isArray(data) ? data : []);
      } else {
        showNotification({
          type: "warning",
          title: "Peringatan Timeline",
          message: `Gagal memuat timeline (Status: ${res.status})`,
        });
      }
    } catch (err: any) {
      console.error("fetchTimelineKegiatan error:", err);
      showNotification({
        type: "error",
        title: "Gagal Memuat Data",
        message: "Tidak dapat mengambil data timeline kegiatan.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load based on tab
  useEffect(() => {
    if (activeTab === "footer") fetchFooter();
    else if (activeTab === "program") fetchProgramMagang();
    else if (activeTab === "proses") fetchProsesProgramMagang();
    else if (activeTab === "benefit") fetchBenefitProgramMagang();
    else if (activeTab === "timeline") fetchTimelineKegiatan();
  }, [
    activeTab,
    fetchFooter,
    fetchProgramMagang,
    fetchProsesProgramMagang,
    fetchBenefitProgramMagang,
    fetchTimelineKegiatan,
  ]);

  // Save Footer (POST / PUT)
  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/magang/footer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(footerData),
      });

      if (res.ok) {
        showNotification({
          type: "success",
          title: "Berhasil Menyimpan",
          message: "Data footer landing page berhasil diperbarui.",
        });
        fetchFooter();
      } else {
        const errorJson = await res.json().catch(() => ({}));
        showNotification({
          type: "error",
          title: "Gagal Menyimpan Footer",
          message: errorJson.message || `Server merespon dengan status ${res.status}`,
        });
      }
    } catch (err: any) {
      showNotification({
        type: "error",
        title: "Error Menyimpan",
        message: err.message || "Gagal menyimpan data footer.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Submit Modal Form (Add / Edit for Program, Proses, Benefit, Timeline)
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType || !activeItem) return;

    try {
      setSaving(true);
      let endpoint = "";
      const method = modalMode === "add" ? "POST" : "PUT";

      if (modalType === "program") {
        endpoint = "/api/magang/program";
      } else if (modalType === "proses") {
        endpoint = "/api/magang/proses";
      } else if (modalType === "benefit") {
        endpoint = "/api/magang/benefit";
      } else if (modalType === "timeline") {
        endpoint = "/api/magang/timeline";
      }

      let res: Response;

      // Untuk program dengan file gambar → pakai FormData (support 3 foto)
      const hasNewFile = gambarFiles.some((f) => f !== null);
      if (modalType === "program" && hasNewFile) {
        const fd = new FormData();
        gambarFiles.forEach((file, i) => {
          if (file) fd.append(`gambar${i + 1}`, file);
        });
        // append semua field lain dari activeItem
        for (const [k, v] of Object.entries(activeItem)) {
          if (!k.startsWith("gambar") && v !== undefined && v !== null) {
            fd.append(k, String(v));
          }
        }
        res = await fetch(endpoint, { method, body: fd });
      } else {
        res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(activeItem),
        });
      }

      if (res.ok) {
        showNotification({
          type: "success",
          title: "Berhasil",
          message: `Data ${modalType} berhasil ${
            modalMode === "add" ? "ditambahkan" : "diperbarui"
          }.`,
        });
        setModalType(null);
        setActiveItem(null);
        resetGambar();

        // Refresh data
        if (modalType === "program") fetchProgramMagang();
        else if (modalType === "proses") fetchProsesProgramMagang();
        else if (modalType === "benefit") fetchBenefitProgramMagang();
        else if (modalType === "timeline") fetchTimelineKegiatan();
      } else {
        const errorJson = await res.json().catch(() => ({}));
        showNotification({
          type: "error",
          title: "Operasi Gagal",
          message: errorJson.message || `Gagal menyimpan data (Status ${res.status})`,
        });
      }
    } catch (err: any) {
      showNotification({
        type: "error",
        title: "Error API",
        message: err.message || "Gagal menyimpan data.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Item with Confirmation
  const handleDeleteItem = (
    type: "program" | "proses" | "benefit" | "timeline",
    id: number | string,
    titleText: string
  ) => {
    showConfirm({
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus data "${titleText}"? Data yang dihapus tidak dapat dikembalikan.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      confirmColor: "red",
      onConfirm: async () => {
        try {
          setLoading(true);
          let endpoint = "";
          if (type === "program") endpoint = `/api/magang/program?id=${id}`;
          else if (type === "proses") endpoint = `/api/magang/proses?id=${id}`;
          else if (type === "benefit") endpoint = `/api/magang/benefit?id=${id}`;
          else if (type === "timeline") endpoint = `/api/magang/timeline?id=${id}`;

          let res = await fetch(endpoint, {
            method: "DELETE",
            headers: { Accept: "application/json" },
          });

          if (res.ok) {
            showNotification({
              type: "success",
              title: "Dihapus",
              message: `Data ${type} berhasil dihapus.`,
            });
            if (type === "program") fetchProgramMagang();
            else if (type === "proses") fetchProsesProgramMagang();
            else if (type === "benefit") fetchBenefitProgramMagang();
            else if (type === "timeline") fetchTimelineKegiatan();
          } else {
            showNotification({
              type: "error",
              title: "Gagal Menghapus",
              message: `Status respons: ${res.status}`,
            });
          }
        } catch (err: any) {
          showNotification({
            type: "error",
            title: "Error API",
            message: err.message || "Gagal menghapus data.",
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Landing Page Magang
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-semibold mt-1">
              Kelola 5 data konten landing page: Footer, Program, Proses, Benefit, dan Timeline Magang
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                if (activeTab === "footer") fetchFooter();
                else if (activeTab === "program") fetchProgramMagang();
                else if (activeTab === "proses") fetchProsesProgramMagang();
                else if (activeTab === "benefit") fetchBenefitProgramMagang();
                else if (activeTab === "timeline") fetchTimelineKegiatan();
              }}
              disabled={loading}
              title="Segarkan Data"
              className="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Summary Stat Cards - Aligned with other admin pages, with icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => { setActiveTab("program"); setSearchTerm(""); }}
            className={`bg-card border rounded-2xl p-4 shadow-card transition-all cursor-pointer ${
              activeTab === "program"
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Program Magang
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-primary">{programList.length}</p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Program dibuka
            </span>
          </div>

          <div
            onClick={() => { setActiveTab("proses"); setSearchTerm(""); }}
            className={`bg-card border rounded-2xl p-4 shadow-card transition-all cursor-pointer ${
              activeTab === "proses"
                ? "border-status-pending ring-2 ring-status-pending/20"
                : "border-border hover:border-status-pending/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-status-pending uppercase tracking-wider">
                Tahapan Alur
              </span>
              <div className="w-8 h-8 rounded-xl bg-status-pending/10 flex items-center justify-center text-status-pending shrink-0">
                <GitMerge className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-status-pending">{prosesList.length}</p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Langkah seleksi
            </span>
          </div>

          <div
            onClick={() => { setActiveTab("benefit"); setSearchTerm(""); }}
            className={`bg-card border rounded-2xl p-4 shadow-card transition-all cursor-pointer ${
              activeTab === "benefit"
                ? "border-status-lolos ring-2 ring-status-lolos/20"
                : "border-border hover:border-status-lolos/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-status-lolos uppercase tracking-wider">
                Benefit Magang
              </span>
              <div className="w-8 h-8 rounded-xl bg-status-lolos/10 flex items-center justify-center text-status-lolos shrink-0">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-status-lolos">{benefitList.length}</p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Keuntungan peserta
            </span>
          </div>

          <div
            onClick={() => { setActiveTab("timeline"); setSearchTerm(""); }}
            className={`bg-card border rounded-2xl p-4 shadow-card transition-all cursor-pointer ${
              activeTab === "timeline"
                ? "border-foreground/50 ring-2 ring-foreground/10"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-foreground uppercase tracking-wider">
                Timeline Agenda
              </span>
              <div className="w-8 h-8 rounded-xl bg-foreground/10 flex items-center justify-center text-foreground shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground">{timelineList.length}</p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Jadwal kegiatan
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border">
          {[
            { id: "program", label: "Program Magang", icon: Briefcase, count: programList.length },
            { id: "proses", label: "Proses / Alur", icon: GitMerge, count: prosesList.length },
            { id: "benefit", label: "Benefit Magang", icon: Gift, count: benefitList.length },
            { id: "timeline", label: "Timeline Kegiatan", icon: CalendarDays, count: timelineList.length },
            { id: "footer", label: "Footer Website", icon: Footprints, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchTerm("");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 rounded-md text-[10px] font-mono ${
                      isActive ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Program Magang */}
        {activeTab === "program" && (
          <div className="space-y-5">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari program magang..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary min-w-[220px]"
                  />
                </div>
                {programList.length > 0 && (
                  <span className="shrink-0 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg">
                    {programList.length} Program
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setModalMode("add");
                  resetGambar();
                  setActiveItem({
                    judul: "",
                    deskripsi: "",
                    durasi: "3 Bulan",
                    kategori: "Fulltime",
                    kuota: "Tersedia",
                    status: "Aktif",
                  });
                  setModalType("program");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Program</span>
              </button>
            </div>

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl">
                <Spinner size="md" />
                <span className="text-xs text-muted-foreground">Memuat data...</span>
              </div>
            ) : programList.length === 0 ? (
              <div className="p-16 text-center bg-card border border-border rounded-2xl space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Belum Ada Program Magang</h3>
                <p className="text-xs text-muted-foreground">Mulai tambahkan program magang untuk ditampilkan di halaman publik.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {programList
                  .filter((item) => {
                    const title = item.judul || item.nama_program || item.title || "";
                    const desc = item.deskripsi || item.description || "";
                    return (
                      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      desc.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map((item, idx) => {
                    const statusVal = String(item.status || item.kuota || "").toLowerCase();
                    const isAktif = statusVal.includes("aktif") || statusVal.includes("tersedia") || statusVal.includes("buka");
                    const isTutup = statusVal.includes("tutup") || statusVal.includes("penuh") || statusVal.includes("habis");
                    return (
                      <div
                        key={item.id || idx}
                        className="group bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          {/* Foto */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {[item.gambar1 || item.gambar, item.gambar2, item.gambar3]
                              .filter(Boolean)
                              .slice(0, 3)
                              .map((src, gi) => (
                                <img
                                  key={gi}
                                  src={src}
                                  alt={`Foto ${gi + 1}`}
                                  className="w-14 h-14 object-cover rounded-xl border border-border shadow-sm"
                                />
                              ))}
                            {![item.gambar1 || item.gambar, item.gambar2, item.gambar3].some(Boolean) && (
                              <div className="w-14 h-14 rounded-xl border border-border bg-muted flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-foreground truncate">
                                  {item.judul || item.nama_program || item.title || "Tanpa Judul"}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {item.deskripsi || item.description || "-"}
                                </p>
                              </div>
                              {/* Aksi */}
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setModalMode("edit");
                                    setActiveItem({ ...item });
                                    resetGambar();
                                    setModalType("program");
                                  }}
                                  className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteItem(
                                      "program",
                                      item.id!,
                                      item.judul || item.nama_program || item.title || "Program"
                                    )
                                  }
                                  className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Meta badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <span>⏱</span>
                                {item.durasi || item.duration || "Fleksibel"}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                {item.kategori || item.tipe || "Reguler"}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isTutup
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isTutup ? "bg-red-500" : "bg-emerald-500"}`} />
                                {item.status || item.kuota || "Aktif"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Proses Program Magang */}
        {activeTab === "proses" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari alur/tahapan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary min-w-[220px]"
                  />
                </div>
                {prosesList.length > 0 && (
                  <span className="shrink-0 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg">
                    {prosesList.length} Tahapan
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setModalMode("add");
                  setActiveItem({
                    step: prosesList.length + 1,
                    urutan: prosesList.length + 1,
                    judul: "",
                    deskripsi: "",
                  });
                  setModalType("proses");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tahapan</span>
              </button>
            </div>

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl">
                <Spinner size="md" />
                <span className="text-xs text-muted-foreground">Memuat data...</span>
              </div>
            ) : prosesList.length === 0 ? (
              <div className="p-16 text-center bg-card border border-border rounded-2xl space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <GitMerge className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Belum Ada Tahapan Alur</h3>
                <p className="text-xs text-muted-foreground">Tambahkan langkah-langkah proses pendaftaran magang.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prosesList
                  .filter((item) => {
                    const title = item.judul || item.title || "";
                    const desc = item.deskripsi || item.description || "";
                    return (
                      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      desc.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map((item, idx, arr) => (
                    <div key={item.id || idx} className="flex gap-4">
                      {/* Step indicator */}
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shadow-sm shrink-0">
                          {item.step || item.langkah || item.urutan || idx + 1}
                        </div>
                        {idx < arr.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1 mb-0 min-h-[20px]" />
                        )}
                      </div>

                      {/* Card */}
                      <div className="group flex-1 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-foreground">
                              {item.judul || item.title || "Tahapan"}
                            </h4>
                            {(item.deskripsi || item.description) && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {item.deskripsi || item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setModalMode("edit");
                                setActiveItem({ ...item });
                                setModalType("proses");
                              }}
                              className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteItem(
                                  "proses",
                                  item.id!,
                                  item.judul || item.title || "Tahapan"
                                )
                              }
                              className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Benefit Program Magang */}
        {activeTab === "benefit" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari benefit magang..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary min-w-[220px]"
                  />
                </div>
                {benefitList.length > 0 && (
                  <span className="shrink-0 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg">
                    {benefitList.length} Benefit
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setModalMode("add");
                  setActiveItem({
                    judul: "",
                    deskripsi: "",
                    icon: "Award",
                  });
                  setModalType("benefit");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Benefit</span>
              </button>
            </div>

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl">
                <Spinner size="md" />
                <span className="text-xs text-muted-foreground">Memuat data...</span>
              </div>
            ) : benefitList.length === 0 ? (
              <div className="p-16 text-center bg-card border border-border rounded-2xl space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Belum Ada Benefit Magang</h3>
                <p className="text-xs text-muted-foreground">Tambahkan keuntungan yang didapat peserta program magang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benefitList
                  .filter((item) => {
                    const title = item.judul || item.title || "";
                    const desc = item.deskripsi || item.description || "";
                    return (
                      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      desc.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map((item, idx) => {
                    const colors = [
                      { bg: "bg-primary/10", text: "text-primary" },
                      { bg: "bg-amber-500/10", text: "text-amber-500" },
                      { bg: "bg-emerald-500/10", text: "text-emerald-500" },
                      { bg: "bg-rose-500/10", text: "text-rose-500" },
                      { bg: "bg-violet-500/10", text: "text-violet-500" },
                      { bg: "bg-cyan-500/10", text: "text-cyan-500" },
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={item.id || idx}
                        className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-11 h-11 rounded-xl ${color.bg} ${color.text} flex items-center justify-center shrink-0`}>
                            <Gift className="w-5 h-5" />
                          </div>
                          <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setModalMode("edit");
                                setActiveItem({ ...item });
                                setModalType("benefit");
                              }}
                              className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteItem(
                                  "benefit",
                                  item.id!,
                                  item.judul || item.title || "Benefit"
                                )
                              }
                              className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {item.judul || item.title || "Benefit"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                            {item.deskripsi || item.description || "-"}
                          </p>
                        </div>

                        {item.icon && (
                          <div className="pt-2 border-t border-border/50">
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              {item.icon}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Timeline Kegiatan */}
        {activeTab === "timeline" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari timeline kegiatan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary min-w-[220px]"
                  />
                </div>
                {timelineList.length > 0 && (
                  <span className="shrink-0 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg">
                    {timelineList.length} Kegiatan
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setModalMode("add");
                  setActiveItem({
                    kegiatan: "",
                    tanggal: "",
                    deskripsi: "",
                    status: "Mendatang",
                    urutan: timelineList.length + 1,
                  });
                  setModalType("timeline");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Timeline</span>
              </button>
            </div>

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl">
                <Spinner size="md" />
                <span className="text-xs text-muted-foreground">Memuat data...</span>
              </div>
            ) : timelineList.length === 0 ? (
              <div className="p-16 text-center bg-card border border-border rounded-2xl space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-8 h-8 text-cyan-500" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Belum Ada Timeline Kegiatan</h3>
                <p className="text-xs text-muted-foreground">Tambahkan jadwal penting seperti Pendaftaran, Seleksi, Pengumuman.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {timelineList
                  .filter((item) => {
                    const name = item.kegiatan || item.judul || item.title || "";
                    const desc = item.deskripsi || item.description || "";
                    return (
                      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      desc.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map((item, idx) => {
                    const statusVal = (item.status || "").toLowerCase();
                    const isSelesai = statusVal.includes("selesai") || statusVal.includes("done") || statusVal.includes("lewat");
                    const isBerlangsung = statusVal.includes("berlangsung") || statusVal.includes("aktif") || statusVal.includes("berjalan");
                    const statusClass = isSelesai
                      ? "bg-muted text-muted-foreground"
                      : isBerlangsung
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400";
                    return (
                      <div
                        key={item.id || idx}
                        className="group bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-foreground">
                                {item.kegiatan || item.judul || item.title || "Kegiatan"}
                              </h4>
                              {(item.deskripsi || item.description) && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {item.deskripsi || item.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {(item.tanggal || item.tanggal_mulai) && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                                    <CalendarDays className="w-3 h-3" />
                                    {item.tanggal || item.tanggal_mulai}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                                  {item.status || "Mendatang"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setModalMode("edit");
                                setActiveItem({ ...item });
                                setModalType("timeline");
                              }}
                              className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteItem(
                                  "timeline",
                                  item.id!,
                                  item.kegiatan || item.judul || item.title || "Kegiatan"
                                )
                              }
                              className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Footer Management */}
        {activeTab === "footer" && (
          <form onSubmit={handleSaveFooter} className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Pengaturan Footer Website</h3>
                  <p className="text-xs text-muted-foreground">
                    Data dikirim langsung ke endpoint Laravel: /api/footer
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? "Menyimpan..." : "Simpan Perubahan Footer"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Alamat Kantor</label>
                  <textarea
                    rows={3}
                    value={footerData.alamat || ""}
                    onChange={(e) =>
                      setFooterData({ ...footerData, alamat: e.target.value })
                    }
                    placeholder="Contoh: Jl. Pahlawan No. 123, Surabaya, Jawa Timur"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Deskripsi Singkat Footer</label>
                  <textarea
                    rows={3}
                    value={footerData.deskripsi || ""}
                    onChange={(e) =>
                      setFooterData({ ...footerData, deskripsi: e.target.value })
                    }
                    placeholder="Deskripsi tentang platform presensi dan pendaftaran magang..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Email Kontak</label>
                  <input
                    type="email"
                    value={footerData.email || ""}
                    onChange={(e) =>
                      setFooterData({ ...footerData, email: e.target.value })
                    }
                    placeholder="kontak@hadir.in"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={footerData.telepon || ""}
                    onChange={(e) =>
                      setFooterData({ ...footerData, telepon: e.target.value })
                    }
                    placeholder="+62 812-3456-7890"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Jam Operasional</label>
                  <input
                    type="text"
                    value={footerData.jam_operasional || ""}
                    onChange={(e) =>
                      setFooterData({ ...footerData, jam_operasional: e.target.value })
                    }
                    placeholder="Senin - Jumat: 08.00 - 17.00 WIB"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Teks Hak Cipta (Copyright)</label>
                  <input
                    type="text"
                    value={footerData.copyright || ""}
                    onChange={(e) =>
                      setFooterData({ ...footerData, copyright: e.target.value })
                    }
                    placeholder="© 2026 Hadir.in. All Rights Reserved."
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Social Media Links */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                  Tautan Media Sosial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Instagram URL</label>
                    <input
                      type="url"
                      value={footerData.instagram || ""}
                      onChange={(e) =>
                        setFooterData({ ...footerData, instagram: e.target.value })
                      }
                      placeholder="https://instagram.com/hadir.in"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">LinkedIn URL</label>
                    <input
                      type="url"
                      value={footerData.linkedin || ""}
                      onChange={(e) =>
                        setFooterData({ ...footerData, linkedin: e.target.value })
                      }
                      placeholder="https://linkedin.com/company/hadirin"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Facebook URL</label>
                    <input
                      type="url"
                      value={footerData.facebook || ""}
                      onChange={(e) =>
                        setFooterData({ ...footerData, facebook: e.target.value })
                      }
                      placeholder="https://facebook.com/hadirin"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Twitter / X URL</label>
                    <input
                      type="url"
                      value={footerData.twitter_x || ""}
                      onChange={(e) =>
                        setFooterData({ ...footerData, twitter_x: e.target.value })
                      }
                      placeholder="https://x.com/hadirin"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? "Menyimpan ke Laravel..." : "Simpan Perubahan Footer"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Generic Modal Portal */}
        {modalType && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div
                className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-foreground">
                    {modalMode === "add" ? "Tambah" : "Edit"}{" "}
                    {modalType === "program" && "Program Magang"}
                    {modalType === "proses" && "Tahapan / Alur Pendaftaran"}
                    {modalType === "benefit" && "Benefit Magang"}
                    {modalType === "timeline" && "Timeline Kegiatan"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setModalType(null);
                      setActiveItem(null);
                      resetGambar();
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleModalSubmit} className="p-5 space-y-4 overflow-y-auto">
                  {/* Form for Program Magang */}
                  {modalType === "program" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Judul Program *</label>
                        <input
                          type="text"
                          required
                          value={activeItem?.judul || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, judul: e.target.value })
                          }
                          placeholder="Contoh: Frontend Web Developer"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Deskripsi Program</label>
                        <textarea
                          rows={3}
                          value={activeItem?.deskripsi || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, deskripsi: e.target.value })
                          }
                          placeholder="Deskripsi tugas, kualifikasi, atau gambaran magang..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Durasi</label>
                          <input
                            type="text"
                            value={activeItem?.durasi || ""}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, durasi: e.target.value })
                            }
                            placeholder="Contoh: 3 Bulan / 6 Bulan"
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Tipe / Kategori</label>
                          <select
                            value={activeItem?.kategori || "Fulltime"}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, kategori: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="Fulltime">Fulltime (WFO)</option>
                            <option value="Remote">Remote (WFH)</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Kuota / Status</label>
                          <input
                            type="text"
                            value={activeItem?.kuota || ""}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, kuota: e.target.value })
                            }
                            placeholder="Contoh: 5 Kursi / Terbuka"
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Status Aktif</label>
                          <select
                            value={activeItem?.status || "Aktif"}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, status: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="Aktif">Aktif (Tampil)</option>
                            <option value="Tutup">Pendaftaran Ditutup</option>
                          </select>
                        </div>
                      </div>

                      {/* Gambar Upload — 3 Foto */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground">Foto Program (Maks. 3 Foto)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map((i) => {
                            const preview = gambarPreviews[i];
                            const existingUrl = activeItem?.[i === 0 ? (activeItem?.gambar1 ? "gambar1" : "gambar") : `gambar${i + 1}`];
                            const hasImage = preview || existingUrl;
                            return (
                              <div key={i} className="space-y-1">
                                <input
                                  ref={gambarInputRefs[i]}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 5 * 1024 * 1024) {
                                      showNotification({ type: "warning", message: "Ukuran file gambar maksimal 5MB." });
                                      return;
                                    }
                                    const newFiles = [...gambarFiles];
                                    const newPreviews = [...gambarPreviews];
                                    newFiles[i] = file;
                                    newPreviews[i] = URL.createObjectURL(file);
                                    setGambarFiles(newFiles);
                                    setGambarPreviews(newPreviews);
                                    const key = i === 0 ? "gambar1" : `gambar${i + 1}`;
                                    setActiveItem({ ...activeItem, [key]: undefined });
                                  }}
                                />
                                <div
                                  onClick={() => gambarInputRefs[i].current?.click()}
                                  className="relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors aspect-square flex items-center justify-center bg-muted/30"
                                >
                                  {preview ? (
                                    <>
                                      <img src={preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity gap-1">
                                        <Upload className="w-4 h-4 text-white" />
                                        <span className="text-white text-[10px] font-bold">Ganti</span>
                                      </div>
                                    </>
                                  ) : existingUrl ? (
                                    <>
                                      <img src={existingUrl} alt={`Foto ${i + 1} saat ini`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity gap-1">
                                        <Upload className="w-4 h-4 text-white" />
                                        <span className="text-white text-[10px] font-bold">Ganti</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground p-2">
                                      <ImageIcon className="w-5 h-5" />
                                      <span className="text-[10px] font-semibold text-center">
                                        Foto {i + 1}{i === 0 ? " *" : ""}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {hasImage && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFiles = [...gambarFiles];
                                      const newPreviews = [...gambarPreviews];
                                      newFiles[i] = null;
                                      newPreviews[i] = null;
                                      setGambarFiles(newFiles);
                                      setGambarPreviews(newPreviews);
                                      const key = i === 0 ? "gambar1" : `gambar${i + 1}`;
                                      setActiveItem({ ...activeItem, [key]: null, ...(i === 0 ? { gambar: null } : {}) });
                                      if (gambarInputRefs[i].current) gambarInputRefs[i].current!.value = "";
                                    }}
                                    className="w-full text-[10px] text-destructive hover:underline text-center"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP — Maks 5MB per foto</p>
                      </div>
                    </>
                  )}

                  {/* Form for Proses Magang */}
                  {modalType === "proses" && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1 space-y-1">
                          <label className="text-xs font-bold text-foreground">Langkah Ke-</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={activeItem?.step || activeItem?.urutan || 1}
                            onChange={(e) =>
                              setActiveItem({
                                ...activeItem,
                                step: Number(e.target.value),
                                urutan: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-foreground">Judul Tahapan *</label>
                          <input
                            type="text"
                            required
                            value={activeItem?.judul || ""}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, judul: e.target.value })
                            }
                            placeholder="Contoh: Pengisian Formulir Online"
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Penjelasan / Deskripsi *</label>
                        <textarea
                          rows={3}
                          required
                          value={activeItem?.deskripsi || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, deskripsi: e.target.value })
                          }
                          placeholder="Jelaskan apa yang harus dilakukan pendaftar pada tahap ini..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </>
                  )}

                  {/* Form for Benefit Magang */}
                  {modalType === "benefit" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Judul Keuntungan / Benefit *</label>
                        <input
                          type="text"
                          required
                          value={activeItem?.judul || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, judul: e.target.value })
                          }
                          placeholder="Contoh: Sertifikat Industri Resmi"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Deskripsi Benefit</label>
                        <textarea
                          rows={3}
                          value={activeItem?.deskripsi || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, deskripsi: e.target.value })
                          }
                          placeholder="Uraian manfaat yang diperoleh peserta..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Kode Icon / Simbol</label>
                        <input
                          type="text"
                          value={activeItem?.icon || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, icon: e.target.value })
                          }
                          placeholder="Contoh: Award, Users, BookOpen, Clock"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </>
                  )}

                  {/* Form for Timeline Kegiatan */}
                  {modalType === "timeline" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Nama Kegiatan / Agenda *</label>
                        <input
                          type="text"
                          required
                          value={activeItem?.kegiatan || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, kegiatan: e.target.value })
                          }
                          placeholder="Contoh: Pembukaan Pendaftaran Magang Batch 1"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Tanggal / Rentang Waktu *</label>
                          <input
                            type="text"
                            required
                            value={activeItem?.tanggal || ""}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, tanggal: e.target.value })
                            }
                            placeholder="Contoh: 1 - 15 Oktober 2026"
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Status Kegiatan</label>
                          <select
                            value={activeItem?.status || "Mendatang"}
                            onChange={(e) =>
                              setActiveItem({ ...activeItem, status: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="Mendatang">Akan Datang</option>
                            <option value="Berlangsung">Sedang Berlangsung</option>
                            <option value="Selesai">Selesai</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Keterangan / Deskripsi</label>
                        <textarea
                          rows={3}
                          value={activeItem?.deskripsi || ""}
                          onChange={(e) =>
                            setActiveItem({ ...activeItem, deskripsi: e.target.value })
                          }
                          placeholder="Detail informasi agenda kegiatan..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </>
                  )}

                  {/* Modal Footer Buttons */}
                  <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalType(null);
                        setActiveItem(null);
                        resetGambar();
                      }}
                      className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving && <Spinner size="sm" />}
                      <span>{saving ? "Menyimpan..." : "Simpan ke Laravel"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}
      </div>
    </DashboardLayout>
  );
}
