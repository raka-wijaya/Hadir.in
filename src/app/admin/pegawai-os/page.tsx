"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User } from "@/types";
import { AlertModal, ConfirmModal } from "@/components/ui/Alert";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  UserCheck,
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

export default function AdminPegawaiOsPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newNip, setNewNip] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVendor, setNewVendor] = useState("");
  const [newDivisi, setNewDivisi] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);

  const [editNip, setEditNip] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editDivisi, setEditDivisi] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

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

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await fetch("/api/users/karyawan_os", {
        cache: "no-store",
      });

      const data = await res.json();

      if (
        res.ok &&
        data.success &&
        Array.isArray(data.data)
      ) {
        const osUsers = data.data
          .filter(
            (u: any) =>
              u.role === "KARYAWAN_OS"
          )
          .map((u: any) => ({
            ...u,
            nama: u.name,
            no_hp: u.phone,
            sekolah_kampus: u.institution,
            unit_kerja: u.study_program,
            identityNumber: u.identity_number,
          }));

        setEmployees(osUsers);
      }
    } catch (err) {
      console.error(
        "Gagal mengambil data pegawai OS:",
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearch(search);
    }, 300);

    return () => clearTimeout(timer); 
  }, [search]);

  const filtered = employees.filter((e) => {
    const nameStr = (
      e.nama ||
      e.name ||
      ""
    ).toLowerCase();

    const instStr = (
      e.sekolah_kampus ||
      e.institution ||
      ""
    ).toLowerCase();

    const nipStr = (
      e.identityNumber ||
      ""
    ).toLowerCase();

    const divisiStr = (
      e.unit_kerja ||
      e.bagian ||
      e.studyProgram ||
      ""
    ).toLowerCase();

    const q = debounceSearch.toLowerCase().trim();

    return (
      nameStr.includes(q) ||
      instStr.includes(q) ||
      nipStr.includes(q) ||
      divisiStr.includes(q)
    );
  });

  const paginatedEmployees = filtered.slice(0, itemsPerPage);

  const toggleStatus = async (id: string) => {
    const targetUser = employees.find(
      (u) => u.id === id
    );

    if (!targetUser) return;

    const nextStatus =
      targetUser.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    setEmployees((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              status: nextStatus,
            }
          : user
      )
    );

    try {
      await fetch("/api/users/karyawan_os", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.error(
        "Gagal update status user:",
        err
      );
    }
  };
  
  const handleAddEmployee = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const cleanNip = newNip.trim();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanPhone = newPhone.trim();
    const cleanVendor = newVendor.trim();
    const cleanDivisi = newDivisi.trim();

    if (
      !cleanNip ||
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !cleanVendor ||
      !cleanDivisi
    ) {
      showAlert(
        "Semua field wajib diisi termasuk NIP.",
        "Data Tidak Lengkap",
        "yellow",
      );
      return;
    }

    try {
      const res = await fetch("/api/users/karyawan_os", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          institution: cleanVendor,
          study_program: cleanDivisi,
          identity_number: cleanNip,
          role: "KARYAWAN_OS",
          status: "ACTIVE",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        fetchEmployees();
        showAlert(`Data pegawai OS "${cleanName}" berhasil ditambahkan.`, "Berhasil Ditambahkan", "green");
      } else {
        showAlert(data.message || "Gagal menambahkan pegawai OS.", "Gagal Tambah", "red");
        return;
      }
    } catch (err) {
      console.error(
        "Gagal menambah pegawai OS:",
        err
      );
      showAlert("Gagal menambahkan pegawai OS. Periksa koneksi Anda.", "Gagal Tambah", "red");
      return;
    }

    resetAddForm();
    setShowAddModal(false);
  };

  const resetAddForm = () => {
    setNewNip("");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewVendor("");
    setNewDivisi("");
  };

  const handleEditEmployee = (
    employee: User
  ) => {
    setEditingEmployee(employee);

    setEditNip(
      employee.identityNumber || (employee as any).identity_number || "",
    );

    setEditName(
      employee.nama ||
        employee.name ||
        ""
    );

    setEditEmail(
      employee.email ||
        ""
    );

    setEditPhone(
      employee.no_hp ||
        employee.phone ||
        ""
    );

    setEditVendor(
      employee.sekolah_kampus ||
        employee.institution ||
        ""
    );

    setEditDivisi(
      employee.unit_kerja ||
        employee.bagian ||
        employee.studyProgram ||
        ""
    );

    setShowEditModal(true);
  };

  const handleSaveEdit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editingEmployee) {
      return;
    }

    const cleanNip = editNip.trim();
    const cleanName = editName.trim();
    const cleanEmail = editEmail
      .trim()
      .toLowerCase();

    const cleanPhone = editPhone.trim();
    const cleanVendor = editVendor.trim();
    const cleanDivisi = editDivisi.trim();

    if (
      !cleanNip ||
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !cleanVendor ||
      !cleanDivisi
    ) {
      showAlert(
        "Semua field wajib diisi termasuk NIP.",
        "Data Tidak Lengkap",
        "yellow",
      );
      return;
    }

    const updatedEmployee: User = {
      ...editingEmployee,

      identityNumber: cleanNip,
      identity_number: cleanNip,

      nama: cleanName,
      name: cleanName,

      email: cleanEmail,

      no_hp: cleanPhone,
      phone: cleanPhone,

      sekolah_kampus: cleanVendor,
      institution: cleanVendor,

      unit_kerja: cleanDivisi,
      studyProgram: cleanDivisi,
      bagian: cleanDivisi,

      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        cleanName,
      )}&background=f59e0b&color=000000&bold=true`,
    };

    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id ===
        editingEmployee.id
          ? updatedEmployee
          : employee
      )
    );

    try {
      setIsSavingEdit(true);
      const res = await fetch("/api/users/karyawan_os", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingEmployee.id,
          identity_number: cleanNip,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          institution: cleanVendor,
          study_program: cleanDivisi,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan perubahan.");
      }

      setShowEditModal(false);
      setEditingEmployee(null);
      resetEditForm();

      showAlert(`Data pegawai OS "${cleanName}" berhasil diperbarui.`, "Perubahan Disimpan", "green");
    } catch (err: any) {
      console.error(
        "Gagal mengupdate pegawai OS:",
        err
      );
      showAlert(err?.message || "Gagal menyimpan perubahan.", "Gagal Simpan", "red");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const resetEditForm = () => {
    setEditNip("");
    setEditName("");
    setEditEmail("");
    setEditPhone("");
    setEditVendor("");
    setEditDivisi("");
  };

  const handleDeleteEmployee = async (item: User) => {
    try {
      const res = await fetch("/api/users/karyawan_os", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus data.");
      }
      setEmployees((prev) => prev.filter((u) => String(u.id) !== String(item.id)));
      showAlert(
        `Data pegawai OS "${item.nama || item.name}" berhasil dihapus.`,
        "Data Dihapus",
        "blue"
      );
    } catch (err: any) {
      console.error("Gagal menghapus pegawai OS:", err);
      showAlert(err?.message || "Gagal menghapus data pegawai OS.", "Gagal Hapus", "red");
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingEmployee(null);
    resetEditForm();
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetAddForm();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ConfirmModal
          isOpen={Boolean(deleteConfirm)}
          title="Hapus Pegawai OS?"
          message={
            <span>
              Data pegawai OS milik{" "}
              <span className="font-bold text-foreground">
                {deleteConfirm?.nama || deleteConfirm?.name || "pegawai"}
              </span>{" "}
              akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
            </span>
          }
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          confirmColor="red"
          onConfirm={async () => {
            if (deleteConfirm) {
              const u = deleteConfirm;
              setDeleteConfirm(null);
              await handleDeleteEmployee(u);
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />

        <AlertModal
          isOpen={modalAlert.isOpen}
          title={modalAlert.title}
          message={modalAlert.message}
          color={modalAlert.color}
          onClose={() => setModalAlert((prev) => ({ ...prev, isOpen: false }))}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Manajemen Pegawai OS
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground font-semibold">
              Kelola data pegawai outsourcing, NIP, divisi kerja, kontak, dan
              status keaktifan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs md:text-sm font-black hover:opacity-95 transition-all flex items-center gap-1.5 shadow-card"
            >
              <Plus className="w-4 h-4" />

              <span>Tambah Pegawai OS</span>
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="relative md:max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari NIP, nama, vendor, atau divisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">NIP</th>

                  <th className="py-3 px-4">Nama</th>

                  <th className="py-3 px-4">Kontak (Email / No HP)</th>

                  <th className="py-3 px-4">Divisi</th>

                  <th className="py-3 px-4">Status</th>

                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Memuat data pegawai OS...
                    </td>
                  </tr>
                ) : paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-accent/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-extrabold text-primary">
                        {item.identityNumber || "-"}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                item.nama || item.name || "Pegawai",
                              )}&background=f59e0b&color=000000&bold=true`
                            }
                            alt={item.nama || item.name || "Pegawai"}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />

                          <div>
                            <div className="font-extrabold text-foreground">
                              {item.nama || item.name}
                            </div>

                            <div className="text-[11px] text-muted-foreground font-normal">
                              {item.sekolah_kampus ||
                                item.institution ||
                                "PT Sinergi OS"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-foreground">
                        <div className="font-semibold flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />

                          <span>{item.email || "-"}</span>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />

                          <span>{item.no_hp || item.phone || "-"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-foreground">
                        {item.unit_kerja ||
                          item.bagian ||
                          item.studyProgram ||
                          "Teknisi Operasional"}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Edit Pegawai"
                            onClick={() => handleEditEmployee(item)}
                            className="p-2 rounded-xl text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Hapus Pegawai"
                            onClick={() => setDeleteConfirm(item)}
                            className="p-2 rounded-xl text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title={
                              item.status === "ACTIVE"
                                ? "Nonaktifkan Pegawai"
                                : "Aktifkan Pegawai"
                            }
                            onClick={() => toggleStatus(item.id)}
                            className={`p-2 rounded-xl transition-all border ${
                              item.status === "ACTIVE"
                                ? "text-status-terlambat hover:bg-status-terlambat/10 border-transparent hover:border-status-terlambat/20"
                                : "text-status-hadir hover:bg-status-hadir/10 border-transparent hover:border-status-hadir/20"
                            }`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="w-8 h-8 opacity-40" />

                        <span className="text-xs font-semibold">
                          Tidak ada data pegawai OS.
                        </span>
                      </div>
                    </td>
                  </tr>
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
                data pegawai OS
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeAddModal();
              }
            }}
          >
            <form
              onSubmit={handleAddEmployee}
              className="
        bg-card
        border border-border
        rounded-2xl
        w-full
        max-w-2xl
        p-6
        shadow-elevated
        space-y-5
        animate-in zoom-in-95
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
      "
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-lg text-foreground">
                    Tambah Pegawai OS Baru
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Masukkan informasi pegawai outsourcing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  className="
            p-1.5
            rounded-lg
            text-muted-foreground
            hover:text-foreground
            hover:bg-accent
            transition-all
            cursor-pointer
          "
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    NIP / No. Induk Pegawai{" "}
                    <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newNip}
                    onChange={(e) => setNewNip(e.target.value)}
                    placeholder="Masukkan NIP pegawai OS"
                    className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3.5 py-2.5
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-primary
            "
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Nama Lengkap <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Masukkan nama pegawai OS"
                    className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3.5 py-2.5
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-primary
            "
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Email Work <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="pegawai@os.sipresma.go.id"
                    className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3.5 py-2.5
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-primary
            "
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    No. HP / Kontak <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="081234567890"
                    className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3.5 py-2.5
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-primary
            "
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Vendor Outsourcing{" "}
                    <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    placeholder="PT Sinergi Facility Management"
                    className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3.5 py-2.5
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-primary
            "
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Divisi / Unit Kerja{" "}
                    <span className="text-status-tolak">*</span>
                  </label>

                  <input
                    type="text"
                    value={newDivisi}
                    onChange={(e) => setNewDivisi(e.target.value)}
                    placeholder="Teknisi Operasional / Security / IT Support..."
                    className="
              w-full
              rounded-xl
              border border-border
              bg-input
              px-3.5 py-2.5
              text-xs
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-primary
            "
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
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
            transition-all
            cursor-pointer
          "
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="
            px-6
            py-2.5
            rounded-xl
            bg-primary
            text-primary-foreground
            font-black
            text-xs
            shadow-card
            hover:opacity-95
            transition-all
            cursor-pointer
          "
                >
                  Simpan Pegawai OS
                </button>
              </div>
            </form>
          </div>
        )}
        {showEditModal && editingEmployee && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeEditModal();
              }
            }}
          >
            <form
              onSubmit={handleSaveEdit}
              className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-elevated space-y-5 animate-in zoom-in-95 max-h-[calc(100vh-2rem)] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-lg text-foreground">
                    Edit Pegawai OS
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Perbarui informasi pegawai OS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    NIP / No. Induk Pegawai{" "}
                    <span className="text-status-tolak">*</span>
                  </label>
                  <input
                    type="text"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    placeholder="Masukkan NIP pegawai OS"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Nama Lengkap <span className="text-status-tolak">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Masukkan nama pegawai OS"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Email Work <span className="text-status-tolak">*</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Masukkan Email Work"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    No. HP / Kontak <span className="text-status-tolak">*</span>
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Masukkan No. HP / Kontak"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Vendor Outsourcing
                    <span className="text-status-tolak">*</span>
                  </label>
                  <input
                    type="text"
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    placeholder="Masukkan Vendor Outsourcing"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground">
                    Divisi / Unit Kerja{" "}
                    <span className="text-status-tolak">*</span>
                  </label>
                  <input
                    type="text"
                    value={editDivisi}
                    onChange={(e) => setEditDivisi(e.target.value)}
                    placeholder="Masukkan Divisi / Unit Kerja"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-extrabold text-xs hover:bg-accent transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-card hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}