"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  showNotification,
  showConfirm,
} from "@/components/ui/NotificationProvider";
import { Spinner } from "@/components/ui/Spinner";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Building2,
  X,
  FileText,
  ExternalLink,
  Filter,
  RefreshCw,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const API_PENDAFTARAN = `${API_URL}/pendaftaran`;

// Status sesuai ENUM di tabel pendaftaran DB
type PendaftaranStatus =
  | "DRAFT"
  | "TERKIRIM"
  | "PROSES_SELEKSI"
  | "DITERIMA"
  | "DITOLAK"
  | "DIBATALKAN"
  | "DRAFT"; // fallback alias lama

// Interface sesuai kolom aktual tabel pendaftaran
interface Pendaftaran {
  id: number;
  kode_pendaftaran: string;
  peserta_magang_id: number | null;
  nama: string;
  email: string;
  password?: string | null;
  phone: string | null;          // kolom: phone ?? no_hp
  identity_number?: string | null;
  institution: string | null;    // kolom: institution ?? sekolah_kampus
  study_program: string | null;
  semester: number | null;
  divisi: string | null;         // kolom: divisi ?? bagian
  bagian?: string | null;
  alamat: string | null;
  periode_mulai: string | null;
  periode_selesai: string | null;
  file_cv: string | null;
  portfolio_file: string | null;
  portfolio_url: string | null;  // kolom: portfolio_url
  status: PendaftaranStatus;
  catatan_admin: string | null;
  tanggal_daftar: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const showAlert = (
  message: string,
  title = "Peringatan",
  color: "red" | "green" | "blue" | "yellow" = "red"
) => {
  const typeMap: Record<string, "success" | "error" | "warning" | "info"> = {
    green: "success",
    red: "error",
    yellow: "warning",
    blue: "info",
  };
  showNotification({ type: typeMap[color] || "info", title, message });
};

const statusLabel = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "TERKIRIM":
      return "Terkirim";
    case "PROSES_SELEKSI":
      return "Proses Seleksi";
    case "DITERIMA":
      return "Diterima";
    case "DITOLAK":
      return "Ditolak";
    case "DIBATALKAN":
      return "Dibatalkan";
    case "PENDING":
      return "Menunggu Seleksi";
    default:
      return status;
  }
};

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data.errors) {
      return Object.values(data.errors).flat().join(", ");
    }
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

const inputCls =
  "w-full rounded-default border border-border bg-input text-foreground placeholder:text-muted-foreground px-3.5 py-2 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export default function AdminPendaftaranPage() {
  const [list, setList] = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedDetail, setSelectedDetail] = useState<Pendaftaran | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");

  const [showInputModal, setShowInputModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [inputNama, setInputNama] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputPhone, setInputPhone] = useState("");
  const [inputInstitution, setInputInstitution] = useState("");
  const [inputStudyProgram, setInputStudyProgram] = useState("");
  const [inputSemester, setInputSemester] = useState("");
  const [isCustomSemester, setIsCustomSemester] = useState(false);
  const [inputDivisi, setInputDivisi] = useState("Programmer");
  const [inputPassword, setInputPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const total = list.length;
  const prosesCount = list.filter(
    (p) => p.status === "PROSES_SELEKSI" || p.status === "TERKIRIM" || p.status === "DRAFT"
  ).length;
  const diterimaCount = list.filter((p) => p.status === "DITERIMA").length;
  const ditolakCount = list.filter((p) => p.status === "DITOLAK").length;

  const loadPendaftar = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const res = await fetch(API_PENDAFTARAN, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const msg = await parseError(res, `HTTP ${res.status}`);
        throw new Error(msg);
      }

      const result = await res.json();

      const isSuccess = result.success === true || result.status === "success";
      if (!isSuccess) {
        throw new Error(result.message || "Gagal mengambil data pendaftaran");
      }

      setList(Array.isArray(result.data) ? result.data : []);
    } catch (err: any) {
      console.error("Gagal fetch pendaftaran:", err);
      setFetchError(err?.message || "Gagal memuat data dari server.");
      showAlert(
        err?.message || "Gagal memuat data pendaftaran dari server.",
        "Gagal Memuat Data",
        "red"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendaftar();
  }, [loadPendaftar]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounceSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = list.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;

    const q = debounceSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      (item.nama || "").toLowerCase().includes(q) ||
      (item.kode_pendaftaran || "").toLowerCase().includes(q) ||
      (item.institution || "").toLowerCase().includes(q) ||
      (item.divisi || "").toLowerCase().includes(q) ||
      (item.email || "").toLowerCase().includes(q) ||
      (item.semester ? String(item.semester).includes(q) : false)
    );
  });

  const paginatedList = filtered.slice(0, itemsPerPage);

  const updateStatus = async (
    id: number,
    newStatus: "DITERIMA" | "DITOLAK" | "PROSES_SELEKSI",
    note?: string
  ) => {
    try {
      setUpdatingId(id);

      const res = await fetch(`${API_PENDAFTARAN}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          catatan_admin: note || null,
        }),
      });

      if (!res.ok) {
        const msg = await parseError(res, "Gagal memperbarui status pendaftaran");
        throw new Error(msg);
      }

      const result = await res.json();

      const isSuccess = result.success === true || result.status === "success";
      if (!isSuccess) {
        throw new Error(result.message || "Gagal memperbarui status pendaftaran");
      }

      const updatedData: Pendaftaran = result.data;
      setList((prev) =>
        prev.map((item) => (item.id === id ? updatedData : item))
      );

      if (selectedDetail?.id === id) {
        setSelectedDetail(updatedData);
      }

      const labelMap: Record<string, string> = {
        DITERIMA: "Diterima",
        DITOLAK: "Ditolak",
        PROSES_SELEKSI: "Proses Seleksi",
      };

      showAlert(
        `Status pendaftaran berhasil diubah menjadi ${labelMap[newStatus] || newStatus}.`,
        "Status Diperbarui",
        "green"
      );
    } catch (err: any) {
      console.error("Gagal update status:", err);
      showAlert(
        err?.message || "Gagal memperbarui status pendaftaran.",
        "Gagal Update Status",
        "red"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreatePendaftar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const semesterNum = inputSemester ? Number(inputSemester) : null;
    if (!semesterNum || isNaN(semesterNum)) {
      showAlert("Semester wajib diisi.", "Data Tidak Lengkap", "yellow");
      return;
    }

    if (!inputStudyProgram.trim()) {
      showAlert("Program studi wajib diisi.", "Data Tidak Lengkap", "yellow");
      return;
    }

    try {
      setSubmitting(true);

      const body = {
        nama: inputNama.trim(),
        email: inputEmail.trim().toLowerCase(),
        phone: inputPhone.trim(),
        institution: inputInstitution.trim(),
        study_program: inputStudyProgram.trim(),
        semester: semesterNum,
        divisi: inputDivisi,
        password: inputPassword.trim() || null,
        status: "TERKIRIM",
      };

      const res = await fetch(API_PENDAFTARAN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await parseError(res, "Gagal menyimpan pendaftaran");
        throw new Error(msg);
      }

      const result = await res.json();

      const isSuccess = result.success === true || result.status === "success";
      if (!isSuccess) {
        throw new Error(result.message || "Gagal menyimpan pendaftaran");
      }

      if (result.data) {
        setList((prev) => [result.data, ...prev]);
      } else {
        await loadPendaftar();
      }

      closeInputModal();

      showAlert(
        `Data pendaftaran ${inputNama} berhasil disimpan dengan kode ${result.data?.kode_pendaftaran || ""}.`,
        "Pendaftaran Berhasil",
        "green"
      );
    } catch (err: any) {
      console.error("Gagal create pendaftar:", err);
      showAlert(
        err?.message || "Gagal menyimpan pendaftaran.",
        "Gagal Mendaftar",
        "red"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deletePendaftar = async (id: number) => {
    if (deletingId) return;

    try {
      setDeletingId(id);

      const res = await fetch(`${API_PENDAFTARAN}/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const msg = await parseError(res, "Gagal menghapus pendaftar");
        throw new Error(msg);
      }

      const result = await res.json();

      const isSuccess = result.success === true || result.status === "success";
      if (!isSuccess) {
        throw new Error(result.message || "Gagal menghapus pendaftar");
      }

      setList((prev) => prev.filter((item) => item.id !== id));

      if (selectedDetail?.id === id) {
        setSelectedDetail(null);
      }

      showAlert(
        "Data pendaftar telah berhasil dihapus dari sistem.",
        "Data Dihapus",
        "blue"
      );
    } catch (err: any) {
      console.error("Gagal hapus pendaftar:", err);
      showAlert(
        err?.message || "Gagal menghapus data pendaftar.",
        "Gagal Hapus Data",
        "red"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const closeInputModal = () => {
    setShowInputModal(false);
    setInputNama("");
    setInputEmail("");
    setInputPhone("");
    setInputInstitution("");
    setInputStudyProgram("");
    setInputSemester("");
    setIsCustomSemester(false);
    setInputDivisi("Programmer");
    setInputPassword("");
    setShowEditPassword(false);
  };
  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-foreground tracking-tight">
              Pendaftaran Magang
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-sans font-semibold">
              Input pendaftaran baru, seleksi calon peserta, dan atur status kelulusan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowInputModal(true)}
              className="px-4 py-2.5 rounded-default bg-primary text-primary-foreground text-xs md:text-sm font-bold font-sans hover:opacity-95 transition-all flex items-center gap-1.5 shadow-card cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Pendaftaran Magang</span>
            </button>

            <button
              onClick={loadPendaftar}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
  {
    label: "Total Calon Peserta",
    value: total,
    color: "text-primary",
    desc: "Semua pendaftar",
  },
  {
    label: "Proses Seleksi",
    value: prosesCount,
    color: "text-status-terlambat",
    desc: "Sedang ditinjau",
  },
  {
    label: "Diterima Magang",
    value: diterimaCount,
    color: "text-status-lolos",
    desc: "Lolos kualifikasi",
  },
  {
    label: "Pendaftaran Ditolak",
    value: ditolakCount,
    color: "text-status-tolak",
    desc: "Tidak memenuhi syarat",
  },
].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold font-sans uppercase tracking-wider ${stat.color}`}>
                  {stat.label}
                </span>
              </div>
              <p className={`text-[19px] font-sans ${stat.color}`}>
                {stat.value}
              </p>
              <span className="text-[10px] font-sans text-muted-foreground block">
                {stat.desc}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari kode, nama, kampus, divisi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-input border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground whitespace-nowrap shrink-0">
              <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Filter:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 pl-3 pr-8 rounded-xl border border-border bg-card text-foreground text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.6rem_center]"
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="TERKIRIM">Terkirim</option>
              <option value="PROSES_SELEKSI">Proses Seleksi</option>
              <option value="DITERIMA">Diterima</option>
              <option value="DITOLAK">Ditolak</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4">Kampus</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Divisi</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-xs font-semibold text-destructive">{fetchError}</p>
                        <button
                          onClick={loadPendaftar}
                          className="text-xs text-primary underline cursor-pointer"
                        >
                          Coba lagi
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-xs text-foreground">
                          {debounceSearch
                            ? `Tidak ada data pendaftar yang cocok dengan "${debounceSearch}".`
                            : "Tidak ada data pendaftaran."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, idx) => (
                    <tr
                      key={item.kode_pendaftaran ? `${item.kode_pendaftaran}-${item.id ?? idx}` : item.id ?? idx}
                      className="hover:bg-accent/40 transition-colors"
                    >
                
                      <td className="py-3.5 px-4 font-sans text-primary">
                        {item.kode_pendaftaran}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-foreground">
                        <div>{item.nama}</div>
                        <div className="text-[11px] text-muted-foreground font-sans">
                          {item.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-sans text-foreground">
                        {item.institution || "-"}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-foreground">
                        {item.semester ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-sans bg-primary/10 text-primary">
                            Semester {item.semester}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-sans">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-foreground">
                        {item.divisi || "-"}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                     
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetail(item);
                              setAdminNoteInput(item.catatan_admin || "");
                            }}
                            title="Aksi & Detail Pendaftar"
                            className="p-2 rounded-lg text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() =>
                              showConfirm({
                                title: "Hapus Data Pendaftar?",
                                message:
                                  "Apakah Anda yakin ingin menghapus data pendaftar ini? Data yang dihapus tidak dapat dikembalikan.",
                                confirmLabel: "Ya, Hapus",
                                cancelLabel: "Batal",
                                confirmColor: "red",
                                onConfirm: () => deletePendaftar(item.id),
                              })
                            }
                            title="Hapus Data Pendaftar"
                            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === item.id ? (
                              <Spinner className="text-current"/>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && !fetchError && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {Math.min(itemsPerPage, filtered.length)}
                </strong>{" "}
                dari{" "}
                <strong className="text-foreground font-bold">{filtered.length}</strong>{" "}
                data pendaftaran
                {statusFilter !== "ALL" && (
                  <span className="ml-1 text-primary font-bold">
                    ({statusLabel(statusFilter)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Number of rows:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
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

        {showInputModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <form
                onSubmit={handleCreatePendaftar}
                className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-elevated space-y-4 animate-in zoom-in-95"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold font-sans text-lg text-foreground">
                    Input Pendaftaran Magang
                  </h3>
                  <button
                    type="button"
                    onClick={closeInputModal}
                    className="p-1 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

                  <div className="space-y-1">
                    <label className="font-sans text-foreground flex gap-1">
                      Nama Lengkap <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inputNama}
                      onChange={(e) => setInputNama(e.target.value)}
                      placeholder="Masukan nama lengkap"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans text-foreground flex gap-1">
                      Email <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      placeholder="Masukan email"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans text-foreground flex gap-1">
                      No. HP / WhatsApp <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="Masukan no. hp"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans text-foreground flex gap-1">
                      Kampus / Sekolah <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inputInstitution}
                      onChange={(e) => setInputInstitution(e.target.value)}
                      placeholder="Masukan nama kampus / sekolah"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans text-foreground flex gap-1">
                      Program Studi <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inputStudyProgram}
                      onChange={(e) => setInputStudyProgram(e.target.value)}
                      placeholder="Masukan program studi"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-sans text-foreground flex gap-1">
                        Semester <span className="text-status-tolak">*</span>
                      </label>
                      {isCustomSemester && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomSemester(false);
                            setInputSemester("");
                          }}
                          className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Pilih dari daftar
                        </button>
                      )}
                    </div>

                    {!isCustomSemester ? (
                      <select
                        required
                        value={
                          ["1","2","3","4","5","6","7","8"].includes(inputSemester)
                            ? inputSemester
                            : inputSemester === ""
                            ? ""
                            : "custom"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setIsCustomSemester(true);
                            setInputSemester("");
                          } else {
                            setInputSemester(val);
                          }
                        }}
                        className={inputCls}
                      >
                        <option value="">-- Pilih Semester --</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={String(s)}>
                            Semester {s}
                          </option>
                        ))}
                        <option value="custom">Lainnya (Ketik Manual)...</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="14"
                        autoFocus
                        required
                        value={inputSemester}
                        onChange={(e) => setInputSemester(e.target.value)}
                        placeholder="Masukkan semester"
                        className={inputCls}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans text-foreground flex gap-1">
                      Divisi / Bagian <span className="text-status-tolak">*</span>
                    </label>
                    <select
                      required
                      value={inputDivisi}
                      onChange={(e) => setInputDivisi(e.target.value)}
                      className={`${inputCls} font-bold cursor-pointer`}
                    >
                      <option value="Programmer">Programmer</option>
                      <option value="Operator">Operator Layanan Adminduk</option>
                      <option value="Branding Development">Branding Development</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-sans text-foreground flex gap-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="Masukan password"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showEditPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeInputModal}
                    className="flex-1 py-2.5 rounded-default border border-border bg-secondary text-secondary-foreground font-extrabold text-xs hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 cursor-pointer rounded-default bg-primary text-primary-foreground font-black text-xs shadow-card hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Spinner className="text-current" />
                      </>
                    ) : (
                      <>
                        <span className="font-sans">Masuk</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </ModalPortal>
        )}

        {selectedDetail && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-lg shadow-elevated w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 max-h-[calc(100vh-2rem)] overflow-y-auto">

                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <span className="text-xs font-sans font-bold text-primary">
                      {selectedDetail.kode_pendaftaran}
                    </span>
                    <h3 className="text-lg font-black text-foreground">
                      Detail &amp; Verifikasi Pendaftar
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="p-1 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-muted/50 p-3 rounded-default border border-border">
                    {[
                      { label: "Nama", value: selectedDetail.nama },
                      { label: "Email", value: selectedDetail.email },
                      { label: "No. HP", value: selectedDetail.phone || "-" },
                      { label: "Divisi Pilihan", value: selectedDetail.divisi || "-", highlight: true },
                    ].map((row) => (
                      <div key={row.label}>
                        <span className="text-[10px] font-bold text-muted-foreground">{row.label}</span>
                        <p className={`font-extrabold ${row.highlight ? "text-primary" : "text-foreground"}`}>
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/50 p-3 rounded-default border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Kampus, Jurusan &amp; Semester
                    </span>
                    <p className="font-extrabold text-foreground">
                      {selectedDetail.institution || "-"} —{" "}
                      {selectedDetail.study_program || "-"}{" "}
                      {selectedDetail.semester ? (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-primary/15 text-primary">
                          Semester {selectedDetail.semester}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground">Status Saat Ini:</span>
                    <StatusBadge status={selectedDetail.status} />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Dokumen &amp; Berkas Lampiran
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     
                      <div className="p-2.5 rounded-default border border-border bg-muted/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-foreground truncate">
                              Curriculum Vitae (CV)
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {selectedDetail.file_cv
                                ? selectedDetail.file_cv.split("/").pop()
                                : "Tidak dilampirkan"}
                            </p>
                          </div>
                        </div>
                        {selectedDetail.file_cv ? (
                          <a
                            href={selectedDetail.file_cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-[10px] font-bold transition-all inline-flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic shrink-0">-</span>
                        )}
                      </div>

                      <div className="p-2.5 rounded-default border border-border bg-muted/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-foreground truncate">
                              Berkas / Link Portofolio
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {selectedDetail.portfolio_file
                                ? selectedDetail.portfolio_file.split("/").pop()
                                : selectedDetail.portfolio_url
                                ? selectedDetail.portfolio_url
                                : "Tidak dilampirkan"}
                            </p>
                          </div>
                        </div>
                        {selectedDetail.portfolio_file || selectedDetail.portfolio_url ? (
                          <a
                            href={selectedDetail.portfolio_file || selectedDetail.portfolio_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white text-[10px] font-bold transition-all inline-flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic shrink-0">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Catatan Admin
                    </label>
                    <textarea
                      rows={2}
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="Masukkan catatan kelulusan..."
                      className={`${inputCls} text-xs`}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
                
                  <button
                    disabled={updatingId !== null}
                    onClick={async () => {
                      await updateStatus(
                        selectedDetail.id,
                        "DITOLAK",
                        adminNoteInput
                      );
                      setSelectedDetail(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-default bg-destructive/10 border border-destructive/30 text-destructive font-extrabold text-xs hover:bg-destructive/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {updatingId === selectedDetail.id && <Spinner size="sm" />}
                    <XCircle className="w-4 h-4" />
                    <span>Ditolak</span>
                  </button>

                  <button
                    disabled={updatingId !== null}
                    onClick={async () => {
                      await updateStatus(
                        selectedDetail.id,
                        "PROSES_SELEKSI",
                        adminNoteInput
                      );
                      setSelectedDetail(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-default bg-muted border border-border text-muted-foreground font-extrabold text-xs hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {updatingId === selectedDetail.id && <Spinner size="sm" />}
                    <Clock className="w-4 h-4" />
                    <span>Proses Seleksi</span>
                  </button>

                  <button
                    disabled={updatingId !== null}
                    onClick={async () => {
                      const id = selectedDetail.id;
                      await updateStatus(id, "DITERIMA", adminNoteInput);
                      setSelectedDetail(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-default bg-primary text-primary-foreground font-extrabold text-xs hover:opacity-95 transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {updatingId === selectedDetail.id && <Spinner size="sm" />}
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terima Pendaftaran</span>
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