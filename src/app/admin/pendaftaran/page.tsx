"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pendaftar, PendaftarStatus } from "@/types";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertModal,
  ConfirmModal,
} from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  CheckCircle2Icon,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Plus,
  Building2,
  X,
  FileText,
  Download,
  ExternalLink,
  InfoIcon,
  AlertTriangleIcon,
  Filter,
} from "lucide-react";

export default function AdminPendaftaranPage() {
  const [list, setList] = useState<Pendaftar[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedDetail, setSelectedDetail] = useState<Pendaftar | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [showInputModal, setShowInputModal] = useState(false);

  const [inputNama, setInputNama] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputNoHp, setInputNoHp] = useState("");
  const [inputKampus, setInputKampus] = useState("");
  const [inputJurusan, setInputJurusan] = useState("");
  const [inputDivisi, setInputDivisi] = useState("Programmer");
  const [inputAlamat, setInputAlamat] = useState("");

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

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showAlert = (
    message: string,
    title = "Peringatan",
    color: "red" | "green" | "blue" | "yellow" = "red"
  ) => {
    setModalAlert({
      isOpen: true,
      title,
      message,
      color,
    });
  };

  const total = list.length;

  const pendingCount = list.filter((p) => p.status === "PENDING").length;

  const lolosCount = list.filter((p) => p.status === "DITERIMA").length;

  const tidakLolosCount = list.filter((p) => p.status === "DITOLAK").length;

  useEffect(() => {
    const loadPendaftar = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/pendaftar", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal mengambil data pendaftar"
          );
        }

        setList(result.data);
      } catch (error) {
        console.error("Gagal mengambil data pendaftar:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPendaftar();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const updateStatus = async (
    id: string,
    newStatus: PendaftarStatus,
    note?: string
  ) => {
    try {
      const response = await fetch("/api/pendaftar", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          catatan_admin: note || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal memperbarui status"
        );
      }

      const updated = list.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              catatan_admin: note || item.catatan_admin,
            }
          : item
      );

      setList(updated);

      if (selectedDetail?.id === id) {
        setSelectedDetail({
          ...selectedDetail,
          status: newStatus,
          catatan_admin:
            note || selectedDetail.catatan_admin,
        });
      }

      console.log("Status berhasil diperbarui:", result);

      setBannerAlert({
        title: "Status Diperbarui",
        message: `Status pendaftaran berhasil diubah menjadi ${newStatus.toUpperCase()}`,
        color: "green",
      });
    } catch (error) {
      console.error("Gagal update status:", error);

      showAlert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status pendaftaran",
        "Gagal Update Status",
        "red"
      );
    }
  };

  const handleCreatePendaftar = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/pendaftar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: inputNama,
          email: inputEmail,
          no_hp: inputNoHp,
          sekolah_kampus: inputKampus,
          study_program: inputJurusan || inputDivisi,
          jurusan: inputJurusan || inputDivisi,
          bagian: inputDivisi,
          alamat: inputAlamat || "Sidoarjo",
          status: "pending",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan pendaftaran"
        );
      }

      const newReg = result.data as Pendaftar;

      setList((prev) => [newReg, ...prev]);

      setShowInputModal(false);

      setInputNama("");
      setInputEmail("");
      setInputNoHp("");
      setInputKampus("");
      setInputJurusan("");
      setInputAlamat("");

      console.log("Pendaftaran berhasil:", result);

      setBannerAlert({
        title: "Pendaftaran Berhasil",
        message: `Data calon peserta ${inputNama} berhasil didaftarkan.`,
        color: "green",
      });
    } catch (error) {
      console.error("Gagal create pendaftar:", error);

      showAlert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pendaftaran",
        "Gagal Mendaftar",
        "red"
      );
    }
  };

  const filtered = list.filter((item) => {
    if (statusFilter !== "ALL" && item.status.toUpperCase() !== statusFilter) {
      return false;
    }

    const keyword = debounceSearch.trim().toLowerCase();

    if (!keyword) return true;

    return (
      item.nama.toLowerCase().includes(keyword) ||
      item.kode_pendaftaran
        .toLowerCase()
        .includes(keyword) ||
      item.sekolah_kampus
        .toLowerCase()
        .includes(keyword) ||
      item.bagian.toLowerCase().includes(keyword)
    );
  });

  const paginatedList = filtered.slice(0, itemsPerPage);

  const createUserFromPendaftar = async (pendaftar: Pendaftar): Promise<{ success: boolean; message: string; password?: string }> => {
    try {
      const namaParts = pendaftar.nama.trim().split(" ");
      const namaDepan = namaParts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const tahun = new Date().getFullYear();
      const defaultPassword = `${namaDepan}${tahun}`;

      const res = await fetch("/api/users/peserta_magang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pendaftar.nama,
          email: pendaftar.email,
          password: defaultPassword,
          role: "ANAK_MAGANG",
          status: "ACTIVE",
          phone: pendaftar.no_hp || null,
          institution: pendaftar.sekolah_kampus || null,
          study_program: pendaftar.study_program || pendaftar.bagian || null,
          start_date: pendaftar.periode_mulai || null,
          end_date: pendaftar.periode_selesai || null,
        }),
      });

      const result = await res.json();

      if (res.status === 409) {
        return {
          success: true,
          message: `Akun dengan email ${pendaftar.email} sudah ada di sistem.`,
        };
      }

      if (!res.ok || !result.success) {
        return {
          success: false,
          message: result.message || "Gagal membuat akun.",
        };
      }

      return {
        success: true,
        message: `Akun berhasil dibuat untuk ${pendaftar.nama}.`,
        password: defaultPassword,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Gagal membuat akun peserta.",
      };
    }
  };

  const deletePendaftar = async (id: string) => {
    try {
      const response = await fetch("/api/pendaftar", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menghapus pendaftar"
        );
      }

      setList((prev) =>
        prev.filter((item) => item.id !== id)
      );

      setSelectedDetail(null);

      console.log("Pendaftar berhasil dihapus:", result);

      setBannerAlert({
        title: "Data Dihapus",
        message:
          "Data pendaftar telah berhasil dihapus dari sistem.",
        color: "blue",
      });
    } catch (error) {
      console.error("Gagal menghapus pendaftar:", error);

      showAlert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus data pendaftar",
        "Gagal Hapus Data",
        "red"
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ConfirmModal
          isOpen={Boolean(deleteConfirmId)}
          title="Hapus Data Pendaftar?"
          message="Apakah Anda yakin ingin menghapus data pendaftar ini? Data yang dihapus tidak dapat dikembalikan."
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          confirmColor="red"
          onConfirm={async () => {
            if (deleteConfirmId) {
              const id = deleteConfirmId;

              setDeleteConfirmId(null);

              await deletePendaftar(id);
            }
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />

        <AlertModal
          isOpen={modalAlert.isOpen}
          title={modalAlert.title}
          message={modalAlert.message}
          color={modalAlert.color}
          onClose={() =>
            setModalAlert((prev) => ({
              ...prev,
              isOpen: false,
            }))
          }
        />

        {bannerAlert && (
          <Alert className="mb-4 relative">
            {bannerAlert.color === "green" ? (
              <CheckCircle2Icon className="h-4 w-4" />
            ) : bannerAlert.color === "red" ? (
              <AlertTriangleIcon className="h-4 w-4" />
            ) : (
              <InfoIcon className="h-4 w-4" />
            )}
            <div className="flex-1">
              <AlertTitle>{bannerAlert.title}</AlertTitle>
              <AlertDescription>{bannerAlert.message}</AlertDescription>
            </div>
            <button
              onClick={() => setBannerAlert(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Pendaftaran Magang
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground font-semibold">
              Input pendaftaran baru, seleksi calon peserta, dan atur status
              kelulusan.
            </p>
          </div>

          <button
            onClick={() => setShowInputModal(true)}
            className="
              px-4 py-2.5
              rounded-default
              bg-primary
              text-primary-foreground
              text-xs md:text-sm
              font-black
              hover:opacity-95
              transition-all
              flex items-center gap-1.5
              shadow-card
              cursor-pointer
            "
          >
            <Plus className="w-4 h-4" />
            <span>Pendaftaran Magang</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              <span>Total Calon Peserta</span>
            </span>

            <p className="text-2xl font-black text-foreground">{total}</p>

            <span className="text-[10px] font-semibold text-muted-foreground block">
              <span>Semua calon peserta</span>
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <span className="text-[10px] font-extrabold text-status-pending uppercase tracking-wider block">
              <span>Total Menunggu Seleksi</span>
            </span>

            <p className="text-2xl font-black text-status-pending">
              {pendingCount}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground block">
              <span>Menunggu seleksi</span>
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <span className="text-[10px] font-extrabold text-status-lolos uppercase tracking-wider block">
              <span>Total Diterima Magang</span>
            </span>

            <p className="text-2xl font-black text-status-lolos">
              {lolosCount}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground block">
              <span>Diterima magang</span>
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1 transition-all">
            <span className="text-[10px] font-extrabold text-status-tolak uppercase tracking-wider block">
              <span>Total Pendaftaran Ditolak</span>
            </span>

            <p className="text-2xl font-black text-status-tolak">
              {tidakLolosCount}
            </p>

            <span className="text-[10px] font-semibold text-muted-foreground block">
              <span>Pendaftaran ditolak</span>
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search
              className="
                w-4 h-4
                absolute left-3 top-1/2
                -translate-y-1/2
                text-muted-foreground
              "
            />

            <input
              type="text"
              placeholder="Cari kode, nama, kampus, divisi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full
                pl-9 pr-9 py-2.5
                bg-input
                border border-border
                rounded-xl
                text-xs
                font-semibold
                text-foreground
                placeholder:text-muted-foreground
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-primary/40
                focus:border-primary
              "
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
              className="
                h-8 pl-3 pr-8
                rounded-xl border border-border
                bg-card text-foreground
                text-xs font-semibold
                cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-primary/40
                transition-colors
                appearance-none
                bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
                bg-no-repeat bg-[right_0.6rem_center]
              "
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu Seleksi</option>
              <option value="DITERIMA">Diterima Magang</option>
              <option value="DITOLAK">Pendaftaran Ditolak</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className="
                  bg-muted/60
                  border-b border-border
                  text-muted-foreground
                  font-extrabold
                  text-xs
                  uppercase
                  tracking-wider
                "
                >
                  <th className="py-3 px-4">Kode</th>

                  <th className="py-3 px-4">Nama</th>

                  <th className="py-3 px-4">Kampus</th>

                  <th className="py-3 px-4">Divisi</th>

                  <th className="py-3 px-4">Status</th>

                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-xs text-foreground">
                          Tidak ada data pendaftar
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr
                      key={item.id}
                      className="
                        hover:bg-accent/40
                        transition-colors
                      "
                    >
                      <td
                        className="
                        py-3.5 px-4
                        font-mono
                        font-extrabold
                        text-primary
                      "
                      >
                        {item.kode_pendaftaran}
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        font-bold
                        text-foreground
                      "
                      >
                        <div>{item.nama}</div>

                        <div
                          className="
                          text-[11px]
                          text-muted-foreground
                          font-normal
                        "
                        >
                          {item.email}
                        </div>
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        font-semibold
                        text-foreground
                      "
                      >
                        {item.sekolah_kampus}
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        font-bold
                        text-foreground
                      "
                      >
                        {item.bagian}
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
                            aria-label="Aksi & Detail Pendaftar"
                            className="
                              p-2
                              rounded-lg
                              text-primary
                              hover:bg-primary/10
                              active:scale-95
                              transition-all
                              cursor-pointer
                              inline-flex
                              items-center
                              justify-center
                            "
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            title="Hapus Data Pendaftar"
                            aria-label="Hapus Data Pendaftar"
                            className="
                              p-2
                              rounded-lg
                              text-destructive
                              hover:bg-destructive/10
                              active:scale-95
                              transition-all
                              cursor-pointer
                              inline-flex
                              items-center
                              justify-center
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

          {!loading && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {filtered.length}
                </strong>{" "}
                data pendaftaran magang
                {statusFilter !== "ALL" && (
                  <span className="ml-1 text-primary font-bold">
                    (
                    {statusFilter === "PENDING"
                      ? "Pending"
                      : statusFilter === "DITERIMA"
                        ? "Diterima"
                        : "Ditolak"}
                    )
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

        {showInputModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleCreatePendaftar}
              className="
                bg-card
                border border-border
                rounded-lg
                w-full max-w-lg
                max-h-[calc(100vh-2rem)]
                overflow-y-auto
                p-6
                shadow-elevated
                space-y-4
                animate-in zoom-in-95
              "
            >
              <div
                className="
                flex items-center justify-between
                border-b border-border
                pb-3
              "
              >
                <h3 className="font-black text-lg text-foreground">
                  Input Pendaftaran Baru
                </h3>

                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="
                    p-1
                    rounded-sm
                    text-muted-foreground
                    hover:bg-accent
                    hover:text-foreground
                    transition-colors
                  "
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-foreground gap-1 flex">
                    Nama Lengkap<span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={inputNama}
                    onChange={(e) => setInputNama(e.target.value)}
                    placeholder="Masukan nama lengkap"
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      placeholder:text-muted-foreground
                      px-3.5 py-2
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                    "
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground gap-1 flex">
                    Email <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="email"
                    required
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="Masukan email"
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      placeholder:text-muted-foreground
                      px-3.5 py-2
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                    "
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground gap-1 flex">
                    No. HP / WhatsApp
                    <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={inputNoHp}
                    onChange={(e) => setInputNoHp(e.target.value)}
                    placeholder="Masukan no. hp"
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      placeholder:text-muted-foreground
                      px-3.5 py-2
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                    "
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground gap-1 flex">
                    Kampus / Sekolah{" "}
                    <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={inputKampus}
                    onChange={(e) => setInputKampus(e.target.value)}
                    placeholder="Masukan nama kampus / sekolah"
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      placeholder:text-muted-foreground
                      px-3.5 py-2
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                    "
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground gap-1 flex">
                    Program Studi <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={inputJurusan}
                    onChange={(e) => setInputJurusan(e.target.value)}
                    placeholder="Masukan program studi"
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      placeholder:text-muted-foreground
                      px-3.5 py-2
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                    "
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground gap-1 flex">
                    Divisi / Bagian <span className="text-status-tolak">*</span>
                  </label>

                  <select
                    value={inputDivisi}
                    onChange={(e) => setInputDivisi(e.target.value)}
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      px-3.5 py-2
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                      font-bold
                    "
                  >
                    <option value="Programmer">Programmer</option>

                    <option value="Operator">Operator Layanan Adminduk</option>

                    <option value="Branding Development">
                      Branding Development
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-extrabold text-foreground gap-1 flex">
                  Alamat Domisili <span className="text-status-tolak">*</span>
                </label>

                <textarea
                  rows={2}
                  value={inputAlamat}
                  onChange={(e) => setInputAlamat(e.target.value)}
                  placeholder="Masukan alamat"
                  className="
                    w-full
                    rounded-default
                    border border-border
                    bg-input
                    text-foreground
                    placeholder:text-muted-foreground
                    p-2.5
                    focus:outline-none
                    focus:border-ring
                    focus:ring-2
                    focus:ring-ring/20
                  "
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="
                    flex-1
                    py-2.5
                    rounded-default
                    border border-border
                    bg-secondary
                    text-secondary-foreground
                    font-extrabold
                    text-xs
                    hover:bg-accent
                    hover:text-accent-foreground
                    transition-all
                  "
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="
                    flex-1
                    py-2.5
                    rounded-default
                    bg-primary
                    text-primary-foreground
                    font-black
                    text-xs
                    shadow-card
                    hover:opacity-95
                    transition-all
                  "
                >
                  Simpan Pendaftaran
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div
              className="
              bg-card
              border border-border
              rounded-lg
              shadow-elevated
              w-full max-w-lg
              p-6
              space-y-5
              animate-in zoom-in-95
              max-h-[calc(100vh-2rem)]
              overflow-y-auto
            "
            >
              <div
                className="
                flex items-center justify-between
                border-b border-border
                pb-3
              "
              >
                <div>
                  <span
                    className="
                    text-xs
                    font-mono
                    font-bold
                    text-primary
                  "
                  >
                    {selectedDetail.kode_pendaftaran}
                  </span>

                  <h3
                    className="
                    text-lg
                    font-black
                    text-foreground
                  "
                  >
                    Detail &amp; Verifikasi Pendaftar
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedDetail(null)}
                  className="
                    p-1
                    rounded-sm
                    text-muted-foreground
                    hover:bg-accent
                    hover:text-foreground
                    transition-colors
                  "
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div
                  className="
                  grid grid-cols-2
                  gap-3
                  bg-muted/50
                  p-3
                  rounded-default
                  border border-border
                "
                >
                  <div>
                    <span
                      className="
                      text-[10px]
                      font-bold
                      text-muted-foreground
                    "
                    >
                      Nama
                    </span>

                    <p className="font-extrabold text-foreground">
                      {selectedDetail.nama}
                    </p>
                  </div>

                  <div>
                    <span
                      className="
                      text-[10px]
                      font-bold
                      text-muted-foreground
                    "
                    >
                      Email
                    </span>

                    <p className="font-extrabold text-foreground">
                      {selectedDetail.email}
                    </p>
                  </div>

                  <div>
                    <span
                      className="
                      text-[10px]
                      font-bold
                      text-muted-foreground
                    "
                    >
                      No. HP
                    </span>

                    <p className="font-extrabold text-foreground">
                      {selectedDetail.no_hp}
                    </p>
                  </div>

                  <div>
                    <span
                      className="
                      text-[10px]
                      font-bold
                      text-muted-foreground
                    "
                    >
                      Divisi Pilihan
                    </span>

                    <p className="font-extrabold text-primary">
                      {selectedDetail.bagian}
                    </p>
                  </div>
                </div>

                <div
                  className="
                  bg-muted/50
                  p-3
                  rounded-default
                  border border-border
                  space-y-1
                "
                >
                  <span
                    className="
                    text-[10px]
                    font-bold
                    text-muted-foreground
                  "
                  >
                    Kampus &amp; Jurusan
                  </span>

                  <p className="font-extrabold text-foreground">
                    {selectedDetail.sekolah_kampus} —{" "}
                    {selectedDetail.study_program ||
                      selectedDetail.jurusan ||
                      "-"}
                  </p>
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
                          className="
                            px-2 py-1
                            rounded-md
                            bg-primary/10
                            hover:bg-primary
                            text-primary
                            hover:text-primary-foreground
                            text-[10px]
                            font-bold
                            transition-all
                            inline-flex
                            items-center
                            gap-1
                            shrink-0
                          "
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic shrink-0">
                          -
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-default border border-border bg-muted/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-foreground truncate">
                            Berkas Portofolio
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {selectedDetail.portfolio_file
                              ? selectedDetail.portfolio_file.split("/").pop()
                              : "Tidak dilampirkan"}
                          </p>
                        </div>
                      </div>

                      {selectedDetail.portfolio_file ? (
                        <a
                          href={selectedDetail.portfolio_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            px-2 py-1
                            rounded-md
                            bg-amber-500/10
                            hover:bg-amber-500
                            text-amber-600
                            dark:text-amber-400
                            hover:text-white
                            text-[10px]
                            font-bold
                            transition-all
                            inline-flex
                            items-center
                            gap-1
                            shrink-0
                          "
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic shrink-0">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                  >
                    Catatan Admin
                  </label>

                  <textarea
                    rows={2}
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Masukkan catatan kelulusan..."
                    className="
                      w-full
                      rounded-default
                      border border-border
                      bg-input
                      text-foreground
                      placeholder:text-muted-foreground
                      p-2.5
                      text-xs
                      focus:outline-none
                      focus:border-ring
                      focus:ring-2
                      focus:ring-ring/20
                    "
                  />
                </div>
              </div>

              <div
                className="
                flex
                flex-col sm:flex-row
                items-stretch
                gap-3
                pt-2
              "
              >
                <button
                  onClick={async () => {
                    await updateStatus(
                      selectedDetail.id,
                      "DITOLAK",
                      adminNoteInput,
                    );

                    setSelectedDetail(null);
                  }}
                  className="
                    flex-1
                    py-2.5
                    px-4
                    rounded-default
                    bg-destructive/10
                    border border-destructive/30
                    text-destructive
                    font-extrabold
                    text-xs
                    hover:bg-destructive/20
                    transition-all
                  "
                >
                  Tidak Lolos
                </button>

                <button
                  onClick={async () => {
                    const pendaftarSnapshot = { ...selectedDetail };

                    await updateStatus(
                      selectedDetail.id,
                      "DITERIMA",
                      adminNoteInput,
                    );

                    setSelectedDetail(null);

                    const userResult = await createUserFromPendaftar(
                      pendaftarSnapshot as Pendaftar,
                    );

                    if (userResult.success) {
                      setBannerAlert({
                        title: "Akun Peserta Dibuat",
                        message: userResult.password
                          ? `${userResult.message} Password default: ${userResult.password}`
                          : userResult.message,
                        color: "green",
                      });
                    } else {
                      showAlert(
                        `Status berhasil diubah, namun gagal membuat akun: ${userResult.message}`,
                        "Perhatian",
                        "yellow",
                      );
                    }
                  }}
                  className="
                    flex-1
                    py-2.5
                    px-4
                    rounded-default
                    bg-primary
                    text-primary-foreground
                    font-extrabold
                    text-xs
                    hover:opacity-95
                    transition-all
                    shadow-card
                  "
                >
                  Lolos Pendaftaran
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
