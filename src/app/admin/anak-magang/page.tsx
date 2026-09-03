"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User } from "@/types";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertModal,
  ConfirmModal,
} from "@/components/ui/Alert";

import {
  Plus,
  Search,
  Calendar,
  GraduationCap,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  InfoIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react";

export default function AdminAnakMagangPage() {
  const [interns, setInterns] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newProgram, setNewProgram] = useState("");
  const [newStart, setNewStart] = useState("2026-07-01");
  const [newEnd, setNewEnd] = useState("2026-10-31");
  const [newBatch, setNewBatch] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // EDIT
  const [editItem, setEditItem] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIdentity, setEditIdentity] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editBatch, setEditBatch] = useState<string>("");
  const [editStatus, setEditStatus] =
    useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [isUpdating, setIsUpdating] = useState(false);

  // ALERT
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

  const [deleteUserConfirm, setDeleteUserConfirm] =
    useState<User | null>(null);

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

  const formatDate = (
    date: string | Date | null | undefined
  ) => {
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

  const loadInterns = async () => {
    try {
      setIsLoading(true);

      const res = await fetch(
        "/api/users/peserta_magang"
      );

      const data = await res.json();

      if (data.success) {
        setInterns(
          data.data.map((u: any) => ({
            ...u,
            nama: u.name,
            sekolah_kampus: u.institution,
            unit_kerja: u.study_program,
            identityNumber: u.identity_number,
            periode_mulai: u.start_date,
            periode_selesai: u.end_date,
          }))
        );
      }
    } catch (err) {
      console.error("Terjadi kesalahan saat memuat data peserta magang.", err);
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

  const filtered = interns.filter((i) => {
    const q = debounceSearch.trim().toLowerCase();

    if (!q) return true;

    const nameStr = (
      i.nama ||
      i.name ||
      ""
    ).toLowerCase();

    const instStr = (
      i.sekolah_kampus ||
      i.institution ||
      ""
    ).toLowerCase();

    const nimStr = (
      i.identityNumber ||
      ""
    ).toLowerCase();

    return (
      nameStr.includes(q) ||
      instStr.includes(q) ||
      nimStr.includes(q)
    );
  });

  const toggleStatus = async (
    id: string | number,
    currentStatus: string
  ) => {
    const newStatus =
      currentStatus === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {
      const res = await fetch("/api/users/peserta_magang", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setInterns((prev) =>
          prev.map((u) =>
            String(u.id) === String(id)
              ? {
                  ...u,
                  status: newStatus,
                }
              : u
          )
        );

        setBannerAlert({
          title: "Status Berhasil Diperbarui",
          message: `Status pengguna berhasil diubah menjadi ${newStatus}.`,
          color: "green",
        });
      } else {
        showAlert(
          data.message || "Gagal memperbarui status.",
          "Gagal memperbarui status.",
          "red",
        );
      }
    } catch (err) {
      console.error(err);

      showAlert(
        "Gagal terhubung ke server. Silakan coba beberapa saat lagi.",
        "Koneksi Gagal. Silakan coba lagi.",
        "red",
      );
    }
  };

  const handleAddIntern = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setIsSaving(true);

      const res = await fetch("/api/users/peserta_magang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: "123456",
          role: "ANAK_MAGANG",
          status: "ACTIVE",
          institution: newInstitution,
          study_program: newProgram,
          start_date: newStart,
          end_date: newEnd,
          batch: newBatch ? Number(newBatch) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan data.");
      }

      setShowAddModal(false);

      setNewName("");
      setNewEmail("");
      setNewInstitution("");
      setNewProgram("");
      setNewStart("2026-07-01");
      setNewEnd("2026-10-31");
      setNewBatch("");

      setBannerAlert({
        title: "Berhasil ditambahkan.",
        message: `Data peserta magang "${newName}" berhasil ditambahkan.`,
        color: "green",
      });

      await loadInterns();
    } catch (err: any) {
      showAlert(
        err?.message || "Gagal menambahkan data peserta magang.",
        "Gagal menambahkan data peserta magang.",
        "red",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: User) => {
    setEditItem(item);

    setEditName(
      item.nama ||
        item.name ||
        ""
    );

    setEditEmail(item.email || "");

    setEditIdentity(
      item.identityNumber ||
        (item as any).identity_number ||
        ""
    );

    setEditInstitution(
      item.sekolah_kampus ||
        item.institution ||
        ""
    );

    setEditProgram(
      item.unit_kerja ||
        item.studyProgram ||
        (item as any).study_program ||
        ""
    );

    const sDate =
      item.periode_mulai ||
      item.startDate ||
      (item as any).start_date ||
      "";

    const eDate =
      item.periode_selesai ||
      item.endDate ||
      (item as any).end_date ||
      "";

    setEditStart(
      typeof sDate === "string"
        ? sDate.slice(0, 10)
        : ""
    );

    setEditEnd(
      typeof eDate === "string"
        ? eDate.slice(0, 10)
        : ""
    );

    setEditStatus(
      (item.status as
        | "ACTIVE"
        | "INACTIVE") ||
        "ACTIVE"
    );

    setEditBatch(item.batch && item.batch !== "-" ? String(item.batch) : "");
  };

  const handleUpdateIntern = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editItem) return;

    try {
      setIsUpdating(true);

      const res = await fetch("/api/users/peserta_magang", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editItem.id,
          name: editName,
          email: editEmail,
          identity_number: editIdentity,
          institution: editInstitution,
          study_program: editProgram,
          start_date: editStart || null,
          end_date: editEnd || null,
          status: editStatus,
          batch: editBatch ? Number(editBatch) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan perubahan data.");
      }

      setInterns((prev) =>
        prev.map((u) =>
          String(u.id) === String(editItem.id)
            ? ({
                ...u,
                name: editName,
                nama: editName,
                email: editEmail,
                identityNumber: editIdentity,
                institution: editInstitution,
                sekolah_kampus: editInstitution,
                studyProgram: editProgram,
                unit_kerja: editProgram,
                startDate: editStart,
                periode_mulai: editStart,
                endDate: editEnd,
                periode_selesai: editEnd,
                status: editStatus,
                batch: editBatch ? Number(editBatch) : "-",
              } as User)
            : u,
        ),
      );

      showAlert(
        `Data peserta magang "${editName}" berhasil diperbarui.`,
        "Perubahan berhasil disimpan.",
        "green",
      );

      setEditItem(null);
      await loadInterns();
    } catch (err: any) {
      console.error(err);

      showAlert(
        err?.message ||
          "Gagal memperbarui data peserta magang.",
        "Gagal Memperbarui Data.",
        "red"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (
    item: User
  ) => {
    const name =
      item.nama ||
      item.name ||
      "data ini";

    try {
      const res = await fetch("/api/users/peserta_magang", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            "Terjadi kesalahan saat menghapus data. Silakan coba lagi."
        );
      }

      setInterns((prev) =>
        prev.filter(
          (u) =>
            String(u.id) !==
            String(item.id)
        )
      );

      setBannerAlert({
        title: "Data Berhasil Dihapus",
        message: `Data ${name} berhasil dihapus dari sistem.`,
        color: "blue",
      });
    } catch (err: any) {
      console.error(err);

      showAlert(
        err?.message ||
          "Terjadi kesalahan saat menghapus data. Silakan coba lagi.",
        "Gagal Hapus Data",
        "red"
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ConfirmModal
          isOpen={Boolean(deleteUserConfirm)}
          title="Hapus Data Anak Magang?"
          message={
            <span>
              Data peserta magang milik{" "}
              <span className="font-bold text-foreground">
                {deleteUserConfirm?.nama ||
                  deleteUserConfirm?.name ||
                  "peserta"}
              </span>{" "}
              akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
            </span>
          }
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          confirmColor="red"
          onConfirm={async () => {
            if (deleteUserConfirm) {
              const u = deleteUserConfirm;

              setDeleteUserConfirm(null);

              await handleDelete(u);
            }
          }}
          onCancel={() => setDeleteUserConfirm(null)}
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Manajemen Anak Magang
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground font-semibold mt-1">
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

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="relative md:max-w-md w-full">
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
              placeholder="Cari NIM, nama, atau kampus..."
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
                className="
                  absolute right-2.5 top-1/2
                  -translate-y-1/2
                  text-muted-foreground
                  hover:text-foreground
                  hover:bg-accent
                  p-1 rounded-md
                  transition-colors
                  cursor-pointer
                "
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                "
                >
                  <th className="py-3.5 px-4">NIM</th>

                  <th className="py-3.5 px-4">Nama</th>

                  <th className="py-3.5 px-4">Kampus</th>

                  <th className="py-3.5 px-4">Periode</th>

                  <th className="py-3.5 px-4 text-center">Batch</th>

                  <th className="py-3.5 px-4">Status</th>

                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="
                        py-14
                        text-center
                        text-muted-foreground
                        font-semibold
                      "
                    >
                      Memuat data anak magang...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="
                        py-14
                        text-center
                        text-muted-foreground
                        font-semibold
                      "
                    >
                      Tidak ada data anak magang.
                    </td>
                  </tr>
                ) : (
                  /* DATA */

                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="
                        hover:bg-accent/40
                        transition-colors
                      "
                    >
                      {/* NIM */}

                      <td
                        className="
                        py-3.5 px-4
                        font-mono
                        text-xs
                        font-extrabold
                        text-primary
                      "
                      >
                        {item.identityNumber || "-"}
                      </td>

                      {/* NAMA */}

                      <td
                        className="
                        py-3.5 px-4
                        font-extrabold
                        text-foreground
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
                              font-extrabold
                              text-foreground
                              truncate
                              max-w-[220px]
                            "
                            >
                              {item.nama || item.name || "-"}
                            </div>

                            <div
                              className="
                              text-[11px]
                              text-muted-foreground
                              font-normal
                              truncate
                              max-w-[220px]
                            "
                            >
                              {item.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* KAMPUS */}

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        font-bold
                        text-foreground
                      "
                      >
                        <div className="flex items-center gap-1.5">
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
                          font-normal
                          pl-5
                          mt-0.5
                        "
                        >
                          {item.unit_kerja ||
                            item.studyProgram ||
                            "Informatika"}
                        </div>
                      </td>

                      {/* PERIODE */}

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        font-semibold
                        text-foreground
                      "
                      >
                        <div
                          className="
                          flex items-center gap-1.5
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

                      {/* BATCH */}

                      <td
                        className="
                        py-3.5 px-4
                        text-xs
                        font-extrabold
                        text-center
                        text-foreground
                      "
                      >
                        {item.batch && item.batch !== "-" ? (
                          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {item.batch}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">
                            -
                          </span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* AKSI */}

                      <td
                        className="
                        py-3.5 px-4
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
                          {/* EDIT */}

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

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() => setDeleteUserConfirm(item)}
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

                          {/* TOGGLE */}

                          <button
                            type="button"
                            onClick={() => toggleStatus(item.id, item.status)}
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
                              ${
                                item.status === "ACTIVE"
                                  ? "text-status-terlambat hover:bg-status-terlambat/10"
                                  : "text-status-hadir hover:bg-status-hadir/10"
                              }
                            `}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div
            className="
      fixed inset-0
      z-50
      flex items-center justify-center
      p-4
      bg-black/60
      backdrop-blur-xs
      animate-in
      fade-in
    "
          >
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
        max-h-[90vh]
        overflow-y-auto
      "
            >
              {/* HEADER */}
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
                    Tambahkan peserta baru ke dalam sistem.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

              {/* FORM GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NAME */}
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

                {/* EMAIL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-foreground flex items-center gap-1">
                    Email <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Masukan Email"
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

                {/* INSTITUTION */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-foreground flex gap-1">
                    Kampus / Sekolah
                    <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newInstitution}
                    onChange={(e) => setNewInstitution(e.target.value)}
                    placeholder="Masukan Nama Kampus / Sekolah"
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

                {/* PROGRAM */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-foreground flex gap-1">
                    Program Studi<span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Masukan Prodi"
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

                {/* START DATE */}
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

                {/* END DATE */}
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

              {/* BATCH */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-foreground flex gap-1">
                  Batch
                  <span className="text-status-tolak">*</span>
                </label>

                <input
                  type="text"
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  placeholder="Misal: 1, 2, 3..."
                  className="
                    w-full
                    rounded-xl
                    border border-border
                    bg-input
                    px-3 py-2
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

              {/* BUTTON */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {isSaving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        )}

        {editItem && (
          <div
            className="
            fixed inset-0
            z-50
            flex items-center justify-center
            p-4
            bg-black/60
            backdrop-blur-xs
            animate-in
            fade-in
          "
          >
            <form
              onSubmit={handleUpdateIntern}
              className="
                bg-card
                border border-border
                rounded-2xl
                w-full
                max-w-md
                p-6
                shadow-elevated
                space-y-4
                animate-in
                zoom-in-95
                max-h-[90vh]
                overflow-y-auto
              "
            >
              {/* HEADER */}

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
                  onClick={() => setEditItem(null)}
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

              {/* NAME */}

              <div className="space-y-1">
                <label
                  className="
                  text-xs
                  font-extrabold
                  text-foreground
                "
                >
                  Nama Lengkap *
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

              {/* ID + EMAIL */}

              <div
                className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-2
              "
              >
                <div className="space-y-1">
                  <label
                    className="
                    text-xs
                    font-extrabold
                    text-foreground
                  "
                  >
                    NIM / No. Identitas
                  </label>

                  <input
                    type="text"
                    value={editIdentity}
                    onChange={(e) => setEditIdentity(e.target.value)}
                    placeholder="21081010001"
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
                    Email *
                  </label>

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@student.ac.id"
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
              </div>

              {/* INSTITUTION */}

              <div className="space-y-1">
                <label
                  className="
                  text-xs
                  font-extrabold
                  text-foreground
                "
                >
                  Kampus / Instansi *
                </label>

                <input
                  type="text"
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                  placeholder="Universitas..."
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

              {/* PROGRAM */}

              <div className="space-y-1">
                <label
                  className="
                  text-xs
                  font-extrabold
                  text-foreground
                "
                >
                  Program Studi / Divisi *
                </label>

                <input
                  type="text"
                  value={editProgram}
                  onChange={(e) => setEditProgram(e.target.value)}
                  placeholder="Teknik Informatika..."
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

              {/* DATE */}

              <div
                className="
                grid
                grid-cols-2
                gap-2
              "
              >
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
                      px-3 py-2.5
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
                      px-3 py-2.5
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

              {/* BATCH */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Batch
                </label>

                <input
                  type="text"
                  value={editBatch}
                  onChange={(e) => setEditBatch(e.target.value)}
                  placeholder="Misal: 1, 2, 3..."
                  className="
                    w-full
                    rounded-xl
                    border border-border
                    bg-input
                    px-3 py-2.5
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

              {/* STATUS */}

              <div className="space-y-1">
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
                    px-3 py-2.5
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

              {/* BUTTON */}

              <div
                className="
                flex gap-2
                pt-2
              "
              >
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="
                    flex-1
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
                    flex-1
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
                  {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}