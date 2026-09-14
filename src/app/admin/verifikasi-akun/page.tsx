"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  User,
  UserCheck,
  RefreshCw,
  AlertCircle,
  X,
  Shield,
  Phone,
  Mail,
  CreditCard,
  Building2,
  Info,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { AlertModal, ConfirmModal } from "@/components/ui/Alert";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  identity_number?: string | null;
  avatar?: string | null;
  status: string;
  verification_status: "PENDING" | "APPROVED" | "REJECTED" | string;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  sourceTable: "admin" | "karyawan_os";
}

export default function AdminVerifikasiAkunPage() {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");
  const [rejectionError, setRejectionError] = useState<string>("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [userToApprove, setUserToApprove] = useState<AccountUser | null>(null);

  const [modalAlert, setModalAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    color: "red" | "green" | "blue" | "yellow";
  }>({
    isOpen: false,
    title: "",
    message: "",
    color: "green",
  });

  const showAlert = (
    message: string,
    title = "Pemberitahuan",
    color: "red" | "green" | "blue" | "yellow" = "green",
  ) => {
    setModalAlert({
      isOpen: true,
      title,
      message,
      color,
    });
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const combined: AccountUser[] = [];

      try {
        const adminRes = await fetch("/api/users/admin", { cache: "no-store" });
        if (adminRes.ok) {
          const adminJson = await adminRes.json();
          if (adminJson.success && Array.isArray(adminJson.data)) {
            adminJson.data.forEach((u: any) => {
              combined.push({
                ...u,
                sourceTable: "admin",
                verification_status: (u.verification_status || u.verificationStatus || "APPROVED").toUpperCase(),
              });
            });
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data admin:", err);
      }

      try {
        const osRes = await fetch("/api/users/karyawan_os", { cache: "no-store" });
        if (osRes.ok) {
          const osJson = await osRes.json();
          if (osJson.success && Array.isArray(osJson.data)) {
            osJson.data.forEach((u: any) => {
              combined.push({
                ...u,
                sourceTable: "karyawan_os",
                verification_status: (u.verification_status || u.verificationStatus || "APPROVED").toUpperCase(),
              });
            });
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data Karyawan OS:", err);
      }

      setUsers(combined);
    } catch (err) {
      console.error("Gagal mengambil data pengguna:", err);
      showAlert(
        "Gagal memuat data verifikasi akun.",
        "Gagal Memuat Data",
        "red",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userItem: AccountUser) => {
    try {
      setSubmittingId(`${userItem.sourceTable}-${userItem.id}`);
      const apiEndpoint =
        userItem.sourceTable === "admin"
          ? "/api/users/admin"
          : "/api/users/karyawan_os";

      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userItem.id,
          verification_status: "APPROVED",
          status: "ACTIVE",
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menyetujui akun.");
      }

      showAlert(
        `Akun ${userItem.name} (${userItem.role}) berhasil disetujui`,
        "Berhasil Disetujui",
        "green",
      );

      setUserToApprove(null);
      if (
        selectedUser?.id === userItem.id &&
        selectedUser?.sourceTable === userItem.sourceTable
      ) {
        setIsDetailOpen(false);
        setSelectedUser(null);
      }

      fetchUsers();
    } catch (err: any) {
      showAlert(
        err?.message || "Terjadi kesalahan saat memverifikasi akun.",
        "Gagal Menyetujui Akun",
        "red",
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    try {
      setSubmittingId(`${selectedUser.sourceTable}-${selectedUser.id}`);
      const apiEndpoint =
        selectedUser.sourceTable === "admin"
          ? "/api/users/admin"
          : "/api/users/karyawan_os";

      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          verification_status: "REJECTED",
          rejection_reason: rejectionReasonInput.trim() || "Tidak memenuhi syarat pendaftaran.",
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menolak akun.");
      }

      showAlert(
        `Pendaftaran akun ${selectedUser.name} telah ditolak.`,
        "Pendaftaran Ditolak",
        "red",
      );

      setIsRejectOpen(false);
      setIsDetailOpen(false);
      setSelectedUser(null);
      setRejectionReasonInput("");
      setRejectionError("");
      fetchUsers();
    } catch (err: any) {
      showAlert(
        err?.message || "Terjadi kesalahan saat menolak akun.",
        "Gagal Menolak Akun",
        "red",
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && u.verification_status !== "PENDING")
          return false;
        if (statusFilter === "APPROVED" && u.verification_status !== "APPROVED")
          return false;
        if (statusFilter === "REJECTED" && u.verification_status !== "REJECTED")
          return false;
      }

      if (roleFilter !== "ALL") {
        if (roleFilter === "KARYAWAN_OS" && u.role !== "KARYAWAN_OS")
          return false;
        if (
          roleFilter === "ADMIN" &&
          !u.role.startsWith("ADMIN") &&
          u.role !== "SUPERADMIN"
        )
          return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = (u.name || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchId = (u.identity_number || "").toLowerCase().includes(q);
        const matchPhone = (u.phone || "").toLowerCase().includes(q);
        return matchName || matchEmail || matchId || matchPhone;
      }

      return true;
    });
  }, [users, statusFilter, roleFilter, search]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(0, itemsPerPage);
  }, [filteredUsers, itemsPerPage]);

  const counts = useMemo(() => {
    const pending = users.filter((u) => u.verification_status === "PENDING").length;
    const approved = users.filter((u) => u.verification_status === "APPROVED").length;
    const rejected = users.filter((u) => u.verification_status === "REJECTED").length;
    return { pending, approved, rejected, total: users.length };
  }, [users]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Verifikasi Akun Internal
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1">
              Verifikasi pendaftaran akun Pegawai OS dan Administrator baru
              untuk mencegah pendaftaran ilegal/liar.
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer w-fit"
          >
            <RefreshCw
              className={`w-4 h-4 text-primary ${loading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </button>
        </div>

        <ConfirmModal
          isOpen={!!userToApprove}
          title="Setujui Verifikasi Akun"
          message={`Apakah Anda yakin ingin menyetujui akun "${userToApprove?.name}" (${userToApprove?.role})? Pengguna akan dapat login dan mengakses sistem.`}
          confirmLabel="Ya, Setujui"
          cancelLabel="Batal"
          confirmColor="green"
          onConfirm={() => {
            if (userToApprove) {
              handleApprove(userToApprove);
            }
          }}
          onCancel={() => setUserToApprove(null)}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div
            onClick={() => setStatusFilter("PENDING")}
            className={`bg-card border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card transition-all cursor-pointer ${
              statusFilter === "PENDING"
                ? "border-status-terlambat ring-2 ring-status-terlambat/20"
                : "border-border hover:border-status-terlambat/40"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-status-terlambat">
                Menunggu Verifikasi
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-status-terlambat">
              {counts.pending}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Perlu tindakan persetujuan
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("APPROVED")}
            className={`bg-card border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card transition-all cursor-pointer ${
              statusFilter === "APPROVED"
                ? "border-status-hadir ring-2 ring-status-hadir/20"
                : "border-border hover:border-status-hadir/40"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-status-hadir">
                Disetujui
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-status-hadir">
              {counts.approved}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Akun aktif terverifikasi
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("REJECTED")}
            className={`bg-card border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card transition-all cursor-pointer ${
              statusFilter === "REJECTED"
                ? "border-status-alpa ring-2 ring-status-alpa/20"
                : "border-border hover:border-status-alpa/40"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-status-alpa">
                Ditolak
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-status-alpa">
              {counts.rejected}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Pendaftaran ditolak
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("ALL")}
            className={`bg-card border rounded-2xl p-4 md:p-5 space-y-1.5 shadow-card transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Total Pendaftar
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground">
              {counts.total}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Semua riwayat akun
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, email, NIP"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="PENDING">Status: Menunggu Verifikasi</option>
                <option value="APPROVED">Status: Disetujui</option>
                <option value="REJECTED">Status: Ditolak</option>
                <option value="ALL">Semua Status Verifikasi</option>
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Role Akun</option>
                <option value="KARYAWAN_OS">Karyawan OS</option>
                <option value="ADMIN">Administrator (Super & Staff)</option>
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="font-extrabold text-foreground mt-0.5 text-[15px] md:text-lg">
                  Daftar Permohonan Verifikasi
                </h2>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Spinner size="lg" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-xs text-foreground">
                Tidak ada akun pada kategori ini
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Role Penugasan</th>
                    <th className="py-3 px-4">Kontak & NIP/NIM</th>
                    <th className="py-3 px-4 text-center">Status Verifikasi</th>
                    <th className="py-3 px-4 text-center w-48">
                      Aksi Verifikasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedUsers.map((item) => {
                    const isPending = item.verification_status === "PENDING";
                    const isApproved = item.verification_status === "APPROVED";
                    const isRejected = item.verification_status === "REJECTED";
                    const rowKey = `${item.sourceTable}-${item.id}`;

                    return (
                      <tr
                        key={rowKey}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  item.name || "User",
                                )}&background=4f46e5&color=ffffff&bold=true`
                              }
                              alt={item.name}
                              className="w-9 h-9 rounded-full object-cover border border-primary shrink-0"
                            />
                            <div>
                              <p className="font-extrabold text-foreground">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-medium">
                                {item.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              item.role === "KARYAWAN_OS"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                                : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {item.role.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-foreground/80 font-medium">
                            <p className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{item.phone || "—"}</span>
                            </p>
                            <p className="flex items-center gap-1 text-[11px]">
                              <CreditCard className="w-3 h-3 text-muted-foreground" />
                              <span>{item.identity_number || "—"}</span>
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black status-terlambat border">
                              <Clock className="w-3 h-3" />
                              Menunggu Verifikasi
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black status-hadir border">
                              <CheckCircle2 className="w-3 h-3" />
                              Disetujui
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black status-alpa border">
                              <XCircle className="w-3 h-3" />
                              Ditolak
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => setUserToApprove(item)}
                                  disabled={submittingId === rowKey}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-extrabold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {submittingId === rowKey ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  Setujui
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(item);
                                    setIsRejectOpen(true);
                                  }}
                                  disabled={submittingId === rowKey}
                                  className="px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Tolak
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(item);
                                  setIsDetailOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Info className="w-3.5 h-3.5 text-primary" />
                                Detail Akun
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && (
            <div className="p-4 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground font-semibold">
                Menampilkan{" "}
                <strong className="text-foreground font-bold">
                  {filteredUsers.length}
                </strong>{" "}
                data verifikasi akun
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

      {isDetailOpen && selectedUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-black text-foreground">
                    Detail Status Verifikasi
                  </h3>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                  <img
                    src={
                      selectedUser.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}`
                    }
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full object-cover border border-primary shrink-0"
                  />
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm">
                      {selectedUser.name}
                    </h4>
                    <p className="text-muted-foreground">
                      {selectedUser.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-input/40 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground">
                      Status Verifikasi:
                    </span>
                    <span className="font-black text-foreground">
                      {selectedUser.verification_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground">
                      No. Identitas / NIP:
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedUser.identity_number || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground">
                      No. HP:
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedUser.phone || "—"}
                    </span>
                  </div>
                </div>

                {selectedUser.rejection_reason && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 space-y-1">
                    <span className="font-bold text-destructive">
                      Alasan Penolakan:
                    </span>
                    <p className="text-foreground">
                      {selectedUser.rejection_reason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                {selectedUser.verification_status === "PENDING" && (
                  <button
                    onClick={() => setUserToApprove(selectedUser)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    Setujui Akun Ini
                  </button>
                )}
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isRejectOpen && selectedUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl max-w-sm w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 md:p-6 shadow-elevated space-y-4 animate-in zoom-in-95 text-center">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-black text-foreground">
                  Tolak Pendaftaran Akun
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Berikan alasan penolakan untuk{" "}
                  <span className="font-bold text-foreground">
                    {selectedUser.name}
                  </span>{" "}
                  ({selectedUser.email})
                </p>
              </div>

              <div className="text-left space-y-1.5">
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => {
                    setRejectionReasonInput(e.target.value);
                    if (e.target.value.trim()) setRejectionError("");
                  }}
                  placeholder="Masukkan alasan penolakan pendaftaran akun"
                  className={`w-full px-3 py-2 bg-input border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 ${
                    rejectionError
                      ? "border-destructive focus:ring-destructive/50"
                      : "border-border focus:ring-destructive/50"
                  }`}
                />
                {rejectionError && (
                  <p className="text-[11px] font-bold text-destructive">
                    {rejectionError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsRejectOpen(false);
                    setRejectionError("");
                    setRejectionReasonInput("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-extrabold text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (!rejectionReasonInput.trim()) {
                      setRejectionError(
                        "Mohon isi alasan penolakan terlebih dahulu.",
                      );
                      return;
                    }
                    setRejectionError("");
                    setIsRejectOpen(false);
                    handleReject();
                  }}
                  disabled={!!submittingId}
                  className="px-5 py-2.5 rounded-xl bg-destructive hover:brightness-95 text-destructive-foreground font-black text-xs shadow-card active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingId ? <Spinner size="sm" /> : "Tolak Akun"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </DashboardLayout>
  );
}
