"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { showNotification, showConfirm } from "@/components/ui/NotificationProvider";
import { Spinner } from "@/components/ui/Spinner";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

interface KaryawanOs {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  identity_number: string | null;
  avatar: string | null;
  status: string;
  verification_status: string;
  verified_at: string | null;
  verified_by: number | null;
  rejection_reason: string | null;
  last_login_at: string | null;
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

export default function AdminPegawaiOsPage() {
  const [employees, setEmployees] = useState<KaryawanOs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNip, setNewNip] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<KaryawanOs | null>(null);
  const [editNip, setEditNip] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/karyawan-os`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();

      if (data.status === "success" && Array.isArray(data.data)) {
        setEmployees(data.data);
      } else {
        setEmployees([]);
        setError("Format response API tidak dikenali.");
      }
    } catch (err: any) {
      console.error("Gagal mengambil data pegawai OS:", err);
      setError(err?.message || "Gagal terhubung ke server Laravel.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounceSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = employees.filter((e) => {
    const q = debounceSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.identity_number || "").toLowerCase().includes(q) ||
      (e.phone || "").toLowerCase().includes(q)
    );
  });

  const paginatedEmployees = filtered.slice(0, itemsPerPage);

  const toggleStatus = async (item: KaryawanOs) => {
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    setEmployees((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, status: nextStatus } : u))
    );

    try {
      const res = await fetch(`${API_URL}/karyawan-os/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      showAlert(
        `Status pegawai "${item.name}" berhasil diubah menjadi ${nextStatus === "ACTIVE" ? "Aktif" : "Nonaktif"}.`,
        "Status Diperbarui",
        "blue"
      );
    } catch (err: any) {
     
      setEmployees((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: item.status } : u))
      );
      console.error("Gagal update status:", err);
      showAlert(err?.message || "Gagal mengubah status pegawai OS.", "Gagal", "red");
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNip = newNip.trim();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanPhone = newPhone.trim();
    const cleanPassword = newPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      showAlert("Nama, email, dan password wajib diisi.", "Data Tidak Lengkap", "yellow");
      return;
    }

    if (cleanPassword.length < 8) {
      showAlert("Password minimal 8 karakter.", "Password Terlalu Pendek", "yellow");
      return;
    }

    try {
      setIsAdding(true);

      const body: Record<string, string> = {
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        status: "ACTIVE",
        verification_status: "APPROVED",
      };
      if (cleanNip) body.identity_number = cleanNip;
      if (cleanPhone) body.phone = cleanPhone;

      const res = await fetch(`${API_URL}/karyawan-os`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.status === "success") {
        await fetchEmployees();
        showAlert(
          `Pegawai OS "${cleanName}" berhasil ditambahkan.`,
          "Berhasil Ditambahkan",
          "green"
        );
        closeAddModal();
      } else {
        const msg =
          data.message ||
          (data.errors ? Object.values(data.errors).flat().join(", ") : "Gagal menambahkan pegawai OS.");
        showAlert(msg, "Gagal Tambah", "red");
      }
    } catch (err: any) {
      console.error("Gagal menambah pegawai OS:", err);
      showAlert("Gagal menghubungi server Laravel.", "Gagal Tambah", "red");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditEmployee = (employee: KaryawanOs) => {
    setEditingEmployee(employee);
    setEditNip(employee.identity_number || "");
    setEditName(employee.name || "");
    setEditEmail(employee.email || "");
    setEditPhone(employee.phone || "");
    setEditPassword("");
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEmployee) return;

    const cleanNip = editNip.trim();
    const cleanName = editName.trim();
    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanPhone = editPhone.trim();
    const cleanPassword = editPassword.trim();

    if (!cleanName || !cleanEmail) {
      showAlert("Nama dan email wajib diisi.", "Data Tidak Lengkap", "yellow");
      return;
    }

    if (cleanPassword && cleanPassword.length < 8) {
      showAlert("Password minimal 8 karakter.", "Password Terlalu Pendek", "yellow");
      return;
    }

    try {
      setIsSavingEdit(true);

      const body: Record<string, string> = {
        name: cleanName,
        email: cleanEmail,
      };
      if (cleanNip) body.identity_number = cleanNip;
      if (cleanPhone) body.phone = cleanPhone;
      if (cleanPassword) body.password = cleanPassword;

      const res = await fetch(`${API_URL}/karyawan-os/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.status === "success") {
        
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === editingEmployee.id ? { ...emp, ...data.data } : emp
          )
        );
        showAlert(
          `Data pegawai OS "${cleanName}" berhasil diperbarui.`,
          "Perubahan Disimpan",
          "green"
        );
        closeEditModal();
      } else {
        const msg =
          data.message ||
          (data.errors ? Object.values(data.errors).flat().join(", ") : "Gagal menyimpan perubahan.");
        showAlert(msg, "Gagal Simpan", "red");
      }
    } catch (err: any) {
      console.error("Gagal mengupdate pegawai OS:", err);
      showAlert("Gagal menghubungi server Laravel.", "Gagal Simpan", "red");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEmployee = async (item: KaryawanOs) => {
    try {
      const res = await fetch(`${API_URL}/karyawan-os/${item.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.status === "success") {
        setEmployees((prev) => prev.filter((u) => u.id !== item.id));
        showAlert(
          `Data pegawai OS "${item.name}" berhasil dihapus.`,
          "Data Dihapus",
          "blue"
        );
      } else {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error("Gagal menghapus pegawai OS:", err);
      showAlert(err?.message || "Gagal menghapus data pegawai OS.", "Gagal Hapus", "red");
    }
  };

  const resetAddForm = () => {
    setNewNip("");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword("");
    setShowNewPassword(false);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetAddForm();
  };

  const resetEditForm = () => {
    setEditNip("");
    setEditName("");
    setEditEmail("");
    setEditPhone("");
    setEditPassword("");
    setShowEditPassword(false);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingEmployee(null);
    resetEditForm();
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Manajemen Pegawai OS
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-semibold">
              Kelola data pegawai outsourcing, NIP, kontak, dan status keaktifan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs md:text-sm font-black hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-card"
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
              placeholder="Cari NIP, nama, email, atau no. HP"
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
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-xs font-semibold text-destructive">{error}</p>
                        <button
                          type="button"
                          onClick={fetchEmployees}
                          className="text-xs text-primary underline cursor-pointer"
                        >
                          Coba lagi
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-accent/40 transition-colors"
                    >
                      {/* NIP */}
                      <td className="py-3.5 px-4 font-mono text-xs font-extrabold text-primary">
                        {item.identity_number || "-"}
                      </td>

                      {/* Nama */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                item.name || "Pegawai"
                              )}&background=f59e0b&color=000000&bold=true`
                            }
                            alt={item.name || "Pegawai"}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                          <div className="font-extrabold text-foreground">
                            {item.name || "-"}
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
                          <span>{item.phone || "-"}</span>
                        </div>
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
                            onClick={() =>
                              showConfirm({
                                title: "Hapus Pegawai OS?",
                                message: `Data pegawai OS milik "${item.name || "pegawai"}" akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.`,
                                confirmLabel: "Ya, Hapus",
                                cancelLabel: "Batal",
                                confirmColor: "red",
                                onConfirm: () => handleDeleteEmployee(item),
                              })
                            }
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
                            onClick={() => toggleStatus(item)}
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
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-semibold">
                          {debounceSearch
                            ? `Tidak ada pegawai OS yang cocok dengan "${debounceSearch}".`
                            : "Tidak ada data pegawai OS."}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && !error && filtered.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {Math.min(itemsPerPage, filtered.length)}
                </strong>{" "}
                dari{" "}
                <strong className="text-foreground font-bold">{filtered.length}</strong>{" "}
                data pegawai OS
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Baris per halaman:
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

        {showAddModal && (
          <ModalPortal>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeAddModal();
              }}
            >
              <form
                onSubmit={handleAddEmployee}
                className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-elevated space-y-5 animate-in zoom-in-95 max-h-[calc(100vh-2rem)] overflow-y-auto"
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
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                    title="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      NIP / No. Induk Pegawai
                    </label>
                    <input
                      type="text"
                      value={newNip}
                      onChange={(e) => setNewNip(e.target.value)}
                      placeholder="Masukkan NIP (opsional)"
                      className={inputCls}
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
                      className={inputCls}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Email <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Masukkan email"
                      className={inputCls}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      No. HP / Kontak
                    </label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Masukkan no. HP (opsional)"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-extrabold text-foreground">
                      Password <span className="text-status-tolak">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Masukkan password (min. 8 karakter)"
                        className={`${inputCls} pr-10`}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Password minimal 8 karakter.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="px-6 py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-extrabold text-xs hover:bg-accent transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-card hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isAdding ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                        <span>Menyimpan...</span>
                      </span>
                    ) : (
                      "Simpan Pegawai OS"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </ModalPortal>
        )}

        {showEditModal && editingEmployee && (
          <ModalPortal>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeEditModal();
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
                      Perbarui informasi pegawai OS. Kosongkan field password jika tidak ingin mengubah password.
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
                      NIP / No. Induk Pegawai
                    </label>
                    <input
                      type="text"
                      value={editNip}
                      onChange={(e) => setEditNip(e.target.value)}
                      placeholder="Masukkan NIP (opsional)"
                      className={inputCls}
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
                      placeholder="Masukkan nama lengkap"
                      className={inputCls}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Email <span className="text-status-tolak">*</span>
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Masukkan email"
                      className={inputCls}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      No. HP / Kontak
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Masukkan no. HP"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-extrabold text-foreground">
                      Password Baru{" "}
                      <span className="text-muted-foreground font-normal">(Opsional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Kosongkan jika tidak ingin mengubah password"
                        className={`${inputCls} pr-10`}
                        minLength={editPassword ? 8 : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showEditPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Isi hanya jika ingin mengubah password. Minimal 8 karakter.
                    </p>
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
                    {isSavingEdit ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                        <span>Menyimpan...</span>
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