"use client";

import React, { useEffect, useState } from "react";

const LARAVEL_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_LARAVEL_API ||
  "http://127.0.0.1:8000/api";
const API_URL = `${LARAVEL_BASE_URL.replace(/\/+$/, "")}/peserta-magang`;

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User } from "@/types";
import {
  showNotification,
  showConfirm,
} from "@/components/ui/NotificationProvider";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { Spinner } from "@/components/ui/Spinner";

import {
  Plus,
  Search,
  Calendar,
  GraduationCap,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";

export default function AdminAnakMagangPage() {
  const [interns, setInterns] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIdentity, setNewIdentity] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newProgram, setNewProgram] = useState("");
  const [newDivisi, setNewDivisi] = useState("");
  const [newStart, setNewStart] = useState("2026-07-01");
  const [newEnd, setNewEnd] = useState("2026-10-31");
  const [newBatch, setNewBatch] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [addErrors, setAddErrors] = useState<Record<string, string[]>>({});

  const [editItem, setEditItem] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIdentity, setEditIdentity] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editDivisi, setEditDivisi] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editBatch, setEditBatch] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});

  const [isUpdating, setIsUpdating] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | number | null>(null);


  useEffect(() => {
    if (showAddModal || Boolean(editItem)) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showAddModal, editItem]);

  const showAlert = (
    message: string,
    title = "Peringatan",
    color: "red" | "green" | "blue" | "yellow" = "red",
  ) => {
    const typeMap: Record<string, "success" | "error" | "warning" | "info"> = {
      green: "success",
      red: "error",
      yellow: "warning",
      blue: "info",
    };
    showNotification({
      type: typeMap[color] || "info",
      title,
      message,
    });
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";

    const d = new Date(date);

    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  };

  const formatValidationErrors = (errors: Record<string, string[]> | undefined) => {
    if (!errors) return null;
    return Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join(" | ");
  };

  const loadInterns = async () => {
    try {
      setIsLoading(true);

      const res = await fetch(API_URL, {
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success" && Array.isArray(data.data)) {
        setInterns(
          data.data.map((u: any) => ({
            ...u,
            peserta_magang_id: u.id,
            nama: u.name,
            sekolah_kampus: u.institution,
            unit_kerja: u.study_program,
            identityNumber: u.identity_number,
            periode_mulai: u.start_date,
            periode_selesai: u.end_date,
          })),
        );
      } else {
        const errorMsg = data?.message || "Gagal memuat data dari API Laravel.";
        showAlert(errorMsg, "Gagal Memuat Data", "red");
      }
    } catch (err: any) {
      console.error("Terjadi kesalahan saat memuat data peserta magang:", err);
      showAlert(
        "Gagal terhubung ke API Laravel. Pastikan backend aktif.",
        "Koneksi Gagal",
        "red",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInterns();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const availableBatches = Array.from(
    new Set(
      interns
        .map((i) =>
          i.batch !== null &&
          i.batch !== undefined &&
          i.batch !== "" &&
          i.batch !== "-"
            ? String(i.batch)
            : null,
        )
        .filter(Boolean) as string[],
    ),
  ).sort((a, b) => Number(a) - Number(b));

  const filtered = interns.filter((i) => {
    if (selectedBatch !== "ALL") {
      const b =
        i.batch !== null && i.batch !== undefined && i.batch !== ""
          ? String(i.batch)
          : "-";
      if (b !== selectedBatch) return false;
    }

    const q = debounceSearch.trim().toLowerCase();

    if (!q) return true;

    const nameStr = (i.nama || i.name || "").toLowerCase();
    const instStr = (i.sekolah_kampus || i.institution || "").toLowerCase();
    const nimStr = (i.identityNumber || (i as any).identity_number || "").toLowerCase();
    const batchStr = String(i.batch || "");
    const divisiStr = (i.divisi || "").toLowerCase();

    return (
      nameStr.includes(q) ||
      instStr.includes(q) ||
      nimStr.includes(q) ||
      batchStr.includes(q) ||
      divisiStr.includes(q)
    );
  });

  const paginatedInterns = filtered.slice(0, itemsPerPage);

  const toggleStatus = async (id: string | number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setStatusLoadingId(id);
      const res = await fetch(`${API_URL}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && (data?.status === "success" || data?.success)) {
        setInterns((prev) =>
          prev.map((u) =>
            String(u.id) === String(id)
              ? {
                  ...u,
                  status: newStatus,
                }
              : u,
          ),
        );

        showAlert(
          `Status pengguna berhasil diubah menjadi ${newStatus}.`,
          "Status Berhasil Diperbarui",
          "green",
        );
      } else {
        const errorMsg =
          data?.errors ? formatValidationErrors(data.errors) : (data?.message || "Gagal memperbarui status.");
        showAlert(errorMsg, "Gagal Memperbarui Status", "red");
      }
    } catch (err) {
      console.error(err);
      showAlert(
        "Gagal terhubung ke API Laravel. Silakan coba beberapa saat lagi.",
        "Koneksi Gagal",
        "red",
      );
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleAddIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrors({});

    const cleanPassword = newPassword.trim();
    if (!cleanPassword) {
      setAddErrors({ password: ["Password wajib diisi saat membuat akun."] });
      showAlert("Password wajib diisi.", "Validasi Gagal", "red");
      return;
    }

    if (cleanPassword.length < 8) {
      setAddErrors({ password: ["Password minimal 8 karakter."] });
      showAlert("Password minimal 8 karakter sesuai aturan backend Laravel.", "Validasi Gagal", "red");
      return;
    }

    const savedName = newName;

    try {
      setIsSaving(true);

      const payload: Record<string, any> = {
        name: newName.trim(),
        email: newEmail.trim(),
        password: cleanPassword,
        identity_number: newIdentity.trim() || null,
        institution: newInstitution.trim() || null,
        study_program: newProgram.trim() || null,
        divisi: newDivisi.trim() || null,
        start_date: newStart || null,
        end_date: newEnd || null,
        batch: newBatch ? Number(newBatch) : null,
        status: "ACTIVE",
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.status !== "success" && !data.success)) {
        if (res.status === 422 && data?.errors) {
          setAddErrors(data.errors);
          const detailedMsg = formatValidationErrors(data.errors) || data.message || "Validasi gagal.";
          showAlert(detailedMsg, "Validasi Gagal (422)", "red");
          return;
        }

        const msg = data?.message || `Terjadi kesalahan (HTTP ${res.status}).`;
        showAlert(msg, "Gagal Menambahkan Data", "red");
        return;
      }

      // Berhasil: baru reset form dan tutup modal
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewIdentity("");
      setNewInstitution("");
      setNewProgram("");
      setNewDivisi("");
      setNewStart("2026-07-01");
      setNewEnd("2026-10-31");
      setNewBatch("");
      setAddErrors({});

      showAlert(
        `Data peserta magang "${savedName}" berhasil ditambahkan.`,
        "Berhasil Ditambahkan",
        "green",
      );

      await loadInterns();
    } catch (err: any) {
      console.error("Error creating intern:", err);
      showAlert(
        err?.message || "Gagal terhubung ke API Laravel saat menambahkan data.",
        "Koneksi Gagal",
        "red",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: User) => {
    setEditItem(item);
    setEditErrors({});

    setEditName(item.nama || item.name || "");
    setEditEmail(item.email || "");
    setEditPassword(""); // Selalu kosongkan, jangan pernah tampilkan password lama
    setEditIdentity(item.identityNumber || (item as any).identity_number || "");
    setEditInstitution(item.sekolah_kampus || item.institution || "");
    setEditProgram(
      item.unit_kerja || item.studyProgram || (item as any).study_program || "",
    );

    const sDate =
      item.periode_mulai || item.startDate || (item as any).start_date || "";
    const eDate =
      item.periode_selesai || item.endDate || (item as any).end_date || "";

    setEditStart(typeof sDate === "string" ? sDate.slice(0, 10) : "");
    setEditEnd(typeof eDate === "string" ? eDate.slice(0, 10) : "");
    setEditStatus((item.status as "ACTIVE" | "INACTIVE") || "ACTIVE");
    setEditBatch(item.batch && item.batch !== "-" ? String(item.batch) : "");
    setEditDivisi(item.divisi || "");
  };

  const handleUpdateIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditErrors({});

    if (editPassword && editPassword.trim().length > 0 && editPassword.trim().length < 8) {
      setEditErrors({ password: ["Password baru minimal 8 karakter."] });
      showAlert("Password baru minimal 8 karakter jika ingin diubah.", "Validasi Gagal", "red");
      return;
    }

    try {
      setIsUpdating(true);

      const payload: Record<string, any> = {
        name: editName.trim(),
        email: editEmail.trim(),
        identity_number: editIdentity.trim() || null,
        institution: editInstitution.trim() || null,
        study_program: editProgram.trim() || null,
        divisi: editDivisi.trim() || null,
        start_date: editStart || null,
        end_date: editEnd || null,
        status: editStatus,
        batch: editBatch ? Number(editBatch) : null,
      };

      // Hanya kirim password jika admin mengisi password baru
      if (editPassword && editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`${API_URL}/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.status !== "success" && !data.success)) {
        if (res.status === 422 && data?.errors) {
          setEditErrors(data.errors);
          const detailedMsg = formatValidationErrors(data.errors) || data.message || "Validasi update gagal.";
          showAlert(detailedMsg, "Validasi Gagal (422)", "red");
          return;
        }

        const msg = data?.message || `Gagal menyimpan perubahan data (HTTP ${res.status}).`;
        showAlert(msg, "Gagal Memperbarui Data", "red");
        return;
      }

      showAlert(
        `Data peserta magang "${editName}" berhasil diperbarui.`,
        "Perubahan Berhasil Disimpan",
        "green",
      );

      // Tutup modal dan reset edit state setelah berhasil
      setEditItem(null);
      setEditPassword("");
      setEditErrors({});
      await loadInterns();
    } catch (err: any) {
      console.error("Error updating intern:", err);
      showAlert(
        err?.message || "Gagal terhubung ke API Laravel saat memperbarui data.",
        "Koneksi Gagal",
        "red",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (item: User) => {
    const name = item.nama || item.name || "data ini";

    try {
      const res = await fetch(`${API_URL}/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.status !== "success" && !data.success)) {
        const msg = data?.message || "Terjadi kesalahan saat menghapus data di Laravel API.";
        showAlert(msg, "Gagal Hapus Data", "red");
        return;
      }

      setInterns((prev) =>
        prev.filter((u) => String(u.id) !== String(item.id)),
      );

      showAlert(
        `Data ${name} berhasil dihapus dari sistem.`,
        "Data Berhasil Dihapus",
        "green",
      );
    } catch (err: any) {
      console.error("Error deleting intern:", err);
      showAlert(
        err?.message || "Gagal terhubung ke API Laravel saat menghapus data.",
        "Koneksi Gagal",
        "red",
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-foreground tracking-tight">
              Manajemen Anak Magang
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground font-sans font-semibold mt-1">
              Kelola data NIM, nama, kampus, periode magang, dan status
              keaktifan peserta.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="
              px-4 py-2.5
              rounded-xl
              bg-primary
              text-primary-foreground
              text-xs md:text-sm
              font-black
              hover:brightness-95
              active:scale-[0.98]
              transition-all
              flex items-center justify-center gap-2
              shadow-card
              cursor-pointer
            "
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anak Magang</span>
          </button>
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
              placeholder="Cari NIM, nama, kampus, divisi, atau batch"
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
              <span>Filter Batch:</span>
            </div>

            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
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
              <option value="ALL">Semua Batch</option>
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
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
                  <th className="py-3.5 px-4 whitespace-nowrap">NIM / NPM</th>

                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">
                    Nama
                  </th>

                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">
                    Kampus
                  </th>

                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">
                    Divisi
                  </th>

                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[240px]">
                    Periode
                  </th>

                  <th className="py-3.5 px-4 text-center whitespace-nowrap">
                    Batch
                  </th>

                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>

                  <th className="py-3.5 px-4 text-right whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="
                        py-14
                        text-center
                        text-muted-foreground
                        font-semibold
                      "
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="
                        py-14
                        text-center
                        text-muted-foreground
                        font-semibold
                      "
                    >
                      Tidak ada data anak magang
                    </td>
                  </tr>
                ) : (
                  paginatedInterns.map((item) => (
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
                        text-xs
                        font-extrabold
                        text-primary
                        whitespace-nowrap
                      "
                      >
                        {item.identityNumber || "-"}
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        text-foreground
                        whitespace-nowrap
                      "
                      >
                        <div className="flex items-center gap-3">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.nama || item.name || "Avatar"}
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
                              shrink-0
                            "
                            >
                              {(item.nama || item.name || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div
                              className="
                              text-foreground
                              truncate
                              max-w-[220px]
                            "
                            >
                              {item.nama || item.name || "-"}
                              {item.divisi ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  - {item.divisi}
                                </span>
                              ) : null}
                            </div>

                            <div
                              className="
                              text-[11px]
                              text-muted-foreground
                              truncate
                              max-w-[220px]
                            "
                            >
                              {item.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        text-foreground
                        whitespace-nowrap
                      "
                      >
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <GraduationCap
                            className="
                              w-4 h-4
                              text-primary
                              shrink-0
                            "
                          />

                          <span>
                            {item.sekolah_kampus || item.institution || "-"}
                          </span>
                        </div>

                        <div
                          className="
                          text-[11px]
                          text-muted-foreground
                          pl-5.5
                          mt-0.5
                          whitespace-nowrap
                        "
                        >
                          {item.unit_kerja || item.studyProgram || "-"}
                        </div>
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        text-foreground
                        whitespace-nowrap
                      "
                      >
                        {item.divisi ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                            {item.divisi}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        text-foreground
                        whitespace-nowrap
                      "
                      >
                        <div
                          className="
                          flex items-center gap-1.5
                          whitespace-nowrap
                        "
                        >
                          <Calendar
                            className="
                              w-3.5 h-3.5
                              text-muted-foreground
                              shrink-0
                            "
                          />

                          <span>
                            {formatDate(item.periode_mulai || item.startDate)}

                            {" s.d. "}

                            {formatDate(item.periode_selesai || item.endDate)}
                          </span>
                        </div>
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        text-center
                        text-foreground
                        whitespace-nowrap
                      "
                      >
                        {item.batch && item.batch !== "-" ? (
                          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {item.batch}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      <td
                        className="
                        py-3.5 px-4
                        whitespace-nowrap
                      "
                      >
                        <div
                          className="
                          flex
                          items-center
                          justify-end
                          gap-1
                        "
                        >
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
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
                            onClick={() =>
                              showConfirm({
                                title: "Hapus Data Anak Magang?",
                                message: (
                                  <span>
                                    Data peserta magang milik{" "}
                                    <span className="font-bold">
                                      {item.nama || item.name || "peserta"}
                                    </span>{" "}
                                    akan dihapus dari sistem. Tindakan ini tidak
                                    dapat dibatalkan.
                                  </span>
                                ),
                                confirmLabel: "Ya, Hapus",
                                cancelLabel: "Batal",
                                confirmColor: "red",
                                onConfirm: async () => {
                                  await handleDelete(item);
                                },
                              })
                            }
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

                          <button
                            type="button"
                            onClick={() => toggleStatus(item.id, item.status)}
                            disabled={statusLoadingId === item.id}
                            title={
                              item.status === "ACTIVE"
                                ? "Nonaktifkan"
                                : "Aktifkan"
                            }
                            className={`
                              p-2
                              rounded-lg
                              active:scale-95
                              transition-all
                              cursor-pointer
                              disabled:opacity-50
                              disabled:cursor-not-allowed
                              ${
                                item.status === "ACTIVE"
                                  ? "text-status-terlambat hover:bg-status-terlambat/10"
                                  : "text-status-hadir hover:bg-status-hadir/10"
                              }
                            `}
                          >
                            {statusLoadingId === item.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
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

          {!isLoading && filtered.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {filtered.length}
                </strong>{" "}
                data peserta magang
                {selectedBatch !== "ALL" && (
                  <span className="ml-1 text-primary font-bold">
                    (Batch {selectedBatch})
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

        {showAddModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <form
                onSubmit={handleAddIntern}
                className="
        bg-card
        border border-border
        rounded-2xl
        w-full
        max-w-2xl
        p-5 md:p-6
        shadow-elevated
        space-y-5
        animate-in
        zoom-in-95
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
                    <h3
                      className="
              font-black
              text-base
              text-foreground
            "
                    >
                      Tambah Data Anak Magang
                    </h3>

                    <p
                      className="
              text-[11px]
              text-muted-foreground
              mt-0.5
            "
                    >
                      Tambahkan peserta baru ke dalam sistem via Laravel API.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddErrors({});
                    }}
                    className="
            p-1.5
            rounded-lg
            text-muted-foreground
            hover:text-foreground
            hover:bg-accent
            transition-colors
            cursor-pointer
          "
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {Object.keys(addErrors).length > 0 && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                    <div className="font-bold">Periksa kesalahan input:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {Object.entries(addErrors).map(([field, msgs]) => (
                        <li key={field}>
                          <span className="font-semibold capitalize">{field.replace("_", " ")}</span>: {msgs.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex items-center gap-1">
                      Nama Lengkap<span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex items-center gap-1">
                      Nomor Identitas (NIM / NPM){" "}
                      <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={newIdentity}
                      onChange={(e) => setNewIdentity(e.target.value)}
                      placeholder="Masukkan NIM/NPM"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex items-center gap-1">
                      Email <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Masukan email"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex items-center gap-1">
                      Password <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex gap-1">
                      Kampus / Sekolah
                      <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={newInstitution}
                      onChange={(e) => setNewInstitution(e.target.value)}
                      placeholder="Masukan nama kampus / sekolah"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex gap-1">
                      Program Studi<span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={newProgram}
                      onChange={(e) => setNewProgram(e.target.value)}
                      placeholder="Masukan program studi"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
                      Divisi <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={newDivisi}
                      onChange={(e) => setNewDivisi(e.target.value)}
                      placeholder="Masukkan divisi"
                      maxLength={150}
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground flex gap-1">
                      Batch
                      <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={newBatch}
                      onChange={(e) => setNewBatch(e.target.value)}
                      placeholder="Masukkan batch"
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
                      Periode Mulai
                    </label>

                    <input
                      type="date"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-foreground">
                      Periode Selesai
                    </label>

                    <input
                      type="date"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3
              py-2
              text-xs
              text-foreground
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/40
              focus:border-primary
            "
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddErrors({});
                    }}
                    className="
            px-5
            py-2.5
            rounded-xl
            border border-border
            bg-secondary
            text-secondary-foreground
            font-extrabold
            text-xs
            hover:bg-accent
            hover:text-accent-foreground
            transition-colors
            cursor-pointer
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
            font-black
            text-xs
            shadow-card
            hover:brightness-95
            active:scale-[0.98]
            transition-all
            disabled:opacity-50
            cursor-pointer
          "
                  >
                    {isSaving ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                      </span>
                    ) : (
                      "Simpan Data"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </ModalPortal>
        )}

        {editItem && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <form
                onSubmit={handleUpdateIntern}
                className="
                bg-card
                border border-border
                rounded-2xl
                w-full
                max-w-2xl
                p-6
                shadow-elevated
                space-y-4
                animate-in
                zoom-in-95
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
                    <h3
                      className="
                    font-black
                    text-lg
                    text-foreground
                  "
                    >
                      Edit Data Anak Magang
                    </h3>

                    <p
                      className="
                    text-xs
                    text-muted-foreground
                    mt-0.5
                  "
                    >
                      Perbarui data informasi dan periode magang peserta.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditItem(null);
                      setEditErrors({});
                    }}
                    className="
                    p-1.5
                    rounded-lg
                    text-muted-foreground
                    hover:text-foreground
                    hover:bg-accent
                    transition-colors
                    cursor-pointer
                  "
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {Object.keys(editErrors).length > 0 && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                    <div className="font-bold">Periksa kesalahan input:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {Object.entries(editErrors).map(([field, msgs]) => (
                        <li key={field}>
                          <span className="font-semibold capitalize">{field.replace("_", " ")}</span>: {msgs.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Nama Lengkap <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      NIM / NPM <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={editIdentity}
                      onChange={(e) => setEditIdentity(e.target.value)}
                      placeholder="Masukkan NIM/NPM"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Email <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Masukkan email"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Password Baru (opsional)
                    </label>

                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Kosongkan jika tidak diubah (min 8 karakter)"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Kampus / Sekolah{" "}
                      <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={editInstitution}
                      onChange={(e) => setEditInstitution(e.target.value)}
                      placeholder="Masukkan nama kampus / sekolah"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Program Studi <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={editProgram}
                      onChange={(e) => setEditProgram(e.target.value)}
                      placeholder="Masukkan program studi"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Divisi <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={editDivisi}
                      onChange={(e) => setEditDivisi(e.target.value)}
                      placeholder="Masukkan divisi"
                      maxLength={150}
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Batch <span className="text-status-tolak">*</span>
                    </label>

                    <input
                      type="text"
                      value={editBatch}
                      onChange={(e) => setEditBatch(e.target.value)}
                      placeholder="Masukkan batch"
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      placeholder:text-muted-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Periode Mulai
                    </label>

                    <input
                      type="date"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Periode Selesai
                    </label>

                    <input
                      type="date"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      text-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label
                      className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                    >
                      Status Keaktifan
                    </label>

                    <select
                      value={editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")
                      }
                      className="
                      w-full
                      rounded-xl
                      border border-border
                      bg-input
                      px-3.5 py-2.5
                      text-xs
                      font-bold
                      text-foreground
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary/40
                      focus:border-primary
                    "
                    >
                      <option value="ACTIVE">Aktif (ACTIVE)</option>

                      <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                    </select>
                  </div>
                </div>

                <div
                  className="
                flex justify-end gap-2
                pt-2
              "
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem(null);
                      setEditErrors({});
                    }}
                    className="
                    px-6
                    py-2.5
                    rounded-xl
                    border border-border
                    bg-secondary
                    text-secondary-foreground
                    font-extrabold
                    text-xs
                    hover:bg-accent
                    hover:text-accent-foreground
                    transition-colors
                    cursor-pointer
                  "
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="
                    px-6
                    py-2.5
                    rounded-xl
                    bg-primary
                    text-primary-foreground
                    font-black
                    text-xs
                    shadow-card
                    hover:brightness-95
                    transition-all
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    cursor-pointer
                  "
                  >
                    {isUpdating ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                      </span>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </ModalPortal>
        )}
      </div>
    </DashboardLayout>
  );
}