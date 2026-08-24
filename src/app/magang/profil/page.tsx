"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import {
  Edit3,
  CheckCircle2,
  Camera,
  User as UserIcon,
  Mail,
  Phone,
  CreditCard,
  Building2,
  GraduationCap,
  Loader2,
  AlertCircle,
  X,
  Save,
} from "lucide-react";

export default function ProfilPage() {
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [institution, setInstitution] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [avatar, setAvatar] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inisialisasi data form dari state user
  useEffect(() => {
    if (user) {
      setName(user.name || user.nama || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.no_hp || "");
      setIdentityNumber(user.identityNumber || (user as any).identity_number || "");
      setInstitution(user.institution || user.sekolah_kampus || "");
      setStudyProgram(
        user.studyProgram || (user as any).study_program || user.unit_kerja || user.bagian || ""
      );
      setAvatar(user.avatar || "");
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────
  // ROLE
  // ─────────────────────────────────────────────────────────────
  const isAnakMagang = user?.role === "ANAK_MAGANG";

  // ─────────────────────────────────────────────────────────────
  // PERJALANAN MAGANG (Hanya untuk ANAK_MAGANG)
  // ─────────────────────────────────────────────────────────────
  const {
    startDate,
    endDate,
    elapsedDays,
    totalDays,
    progress,
  } = useMemo(() => {
    const startStr = user?.periode_mulai || user?.startDate || "2026-07-20";
    const endStr = user?.periode_selesai || user?.endDate || "2026-08-20";

    const start = new Date(startStr);
    const end = new Date(endStr);
    const now = new Date();

    const total =
      Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );

    let elapsed = 0;
    if (now < start) {
      elapsed = 0;
    } else if (now > end) {
      elapsed = total;
    } else {
      elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const percentage = Math.min(100, Math.max(0, (elapsed / total) * 100));

    return {
      startDate: start,
      endDate: end,
      elapsedDays: elapsed,
      totalDays: total,
      progress: percentage,
    };
  }, [user?.periode_mulai, user?.periode_selesai, user?.startDate, user?.endDate]);

  // ─────────────────────────────────────────────────────────────
  // FORMAT TANGGAL
  // ─────────────────────────────────────────────────────────────
  const formatDate = (date: Date) => {
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLE UPLOAD AVATAR
  // ─────────────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("Ukuran file foto maksimal 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─────────────────────────────────────────────────────────────
  // RESET / CANCEL EDIT
  // ─────────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (user) {
      setName(user.name || user.nama || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.no_hp || "");
      setIdentityNumber(user.identityNumber || (user as any).identity_number || "");
      setInstitution(user.institution || user.sekolah_kampus || "");
      setStudyProgram(
        user.studyProgram || (user as any).study_program || user.unit_kerja || user.bagian || ""
      );
      setAvatar(user.avatar || "");
    }
    setErrorMsg(null);
    setIsEditing(false);
  };

  // ─────────────────────────────────────────────────────────────
  // SIMPAN PROFIL
  // ─────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    const updatedData = {
      name,
      nama: name,
      email,
      phone,
      no_hp: phone,
      identityNumber,
      identity_number: identityNumber,
      institution,
      sekolah_kampus: institution,
      studyProgram,
      study_program: studyProgram,
      unit_kerja: studyProgram,
      avatar:
        avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name || "User"
        )}&background=f59e0b&color=000000&bold=true`,
    };

    try {
      if (user?.id) {
        const response = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user.id,
            ...updatedData,
          }),
        });

        if (!response.ok) {
          const resData = await response.json().catch(() => ({}));
          console.warn("Gagal update user ke server:", resData.message);
        }
      }

      // Update state auth context dan localStorage
      updateUser(updatedData);

      setIsEditing(false);
      setSavedMsg("Profil berhasil diperbarui!");
      setTimeout(() => {
        setSavedMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error update profile:", err);
      setErrorMsg("Gagal menyimpan perubahan. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const defaultAvatar =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || "User"
    )}&background=f59e0b&color=000000&bold=true`;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Profil Saya
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Informasi identitas pribadi dan data akun dalam sistem Hadir.in
          </p>
        </div>

        {/* =====================================================
            SUCCESS MESSAGE
        ====================================================== */}
        {savedMsg && (
          <div className="bg-primary/20 border border-primary/40 rounded-2xl p-4 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-sm font-bold text-primary-foreground dark:text-primary">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <span>{savedMsg}</span>
            </div>
          </div>
        )}

        {/* =====================================================
            ERROR MESSAGE
        ====================================================== */}
        {errorMsg && (
          <div className="bg-destructive/15 border border-destructive/30 rounded-2xl p-4 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-sm font-bold text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* =====================================================
            PERJALANAN MAGANG (Hanya untuk ANAK_MAGANG)
        ====================================================== */}
        {isAnakMagang && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">
                  Perjalanan Magang
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Pantau perkembangan periode magang kamu.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">
                    Hari Berjalan
                  </span>
                  <span className="font-extrabold text-foreground">
                    {elapsedDays} / {totalDays} Hari
                  </span>
                </div>

                <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Mulai: {formatDate(startDate)}</span>
                  <span>Selesai: {formatDate(endDate)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  Progress Keseluruhan
                </span>
                <span className="text-sm font-extrabold text-primary">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            PROFILE CARD
        ====================================================== */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          {/* Avatar & Identitas Singkat */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative group">
              <img
                src={isEditing ? avatar || defaultAvatar : user?.avatar || defaultAvatar}
                alt={user?.name || "Foto Profil"}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary shadow-md bg-muted"
              />

              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center gap-1 opacity-90 hover:opacity-100 transition-all font-bold text-[10px]"
                    title="Ganti Foto Profil"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Ubah Foto</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </>
              )}
            </div>

            <div>
              <h2 className="font-extrabold text-xl text-foreground">
                {isEditing ? name || "Nama Pengguna" : user?.name || user?.nama || "-"}
              </h2>
              <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/20 text-primary-foreground dark:text-primary border border-primary/30 uppercase tracking-wider">
                {user?.role || "USER"}
              </span>
            </div>
          </div>

          {/* =====================================================
              DETAILS & FORM
          ====================================================== */}
          <div className="bg-input/50 rounded-2xl p-5 border border-border space-y-4 text-xs md:text-sm">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2 flex items-center justify-between">
              <span>Informasi Pribadi & Akademik</span>
              {isEditing && (
                <span className="text-[11px] font-semibold text-primary">
                  Mode Edit Aktif
                </span>
              )}
            </h3>

            {isEditing ? (
              /* =================================================
                 EDIT FORM
              ================================================== */
              <form onSubmit={handleSave} className="space-y-4">
                {/* Nama Lengkap */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                {/* Nomor Telepon */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Nomor Identitas (NIM / NIP / NIS) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    Nomor Identitas (NIM / NIP / NIS)
                  </label>
                  <input
                    type="text"
                    value={identityNumber}
                    onChange={(e) => setIdentityNumber(e.target.value)}
                    placeholder="Contoh: 2110123456"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                </div>

                {/* Instansi / Sekolah / Kampus */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Instansi / Kampus / Sekolah
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: Universitas Indonesia / SMK Negeri 1"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Program Studi / Unit Kerja / Jabatan */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    Program Studi / Unit Kerja / Bagian
                  </label>
                  <input
                    type="text"
                    value={studyProgram}
                    onChange={(e) => setStudyProgram(e.target.value)}
                    placeholder="Contoh: Teknik Informatika / Programmer"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Tombol Aksi Simpan / Batal */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-bold text-xs hover:bg-accent transition-all flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Batal</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* =================================================
                 VIEW MODE
              ================================================== */
              <div className="space-y-3">
                {/* Nama Lengkap */}
                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    Nama Lengkap
                  </span>
                  <span className="font-bold text-foreground text-right">
                    {user?.name || user?.nama || "-"}
                  </span>
                </div>

                {/* Email */}
                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </span>
                  <span className="font-medium text-foreground text-right break-all">
                    {user?.email || "-"}
                  </span>
                </div>

                {/* Nomor Telepon */}
                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Nomor Telepon
                  </span>
                  <span className="font-medium text-foreground text-right">
                    {user?.phone || user?.no_hp || "-"}
                  </span>
                </div>

                {/* Nomor Identitas */}
                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    Nomor Identitas (NIM / NIP)
                  </span>
                  <span className="font-mono font-bold text-foreground text-right">
                    {user?.identityNumber || (user as any)?.identity_number || "-"}
                  </span>
                </div>

                {/* Instansi */}
                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Instansi / Kampus / Sekolah
                  </span>
                  <span className="font-semibold text-foreground text-right">
                    {user?.institution || user?.sekolah_kampus || "-"}
                  </span>
                </div>

                {/* Program Studi / Bagian */}
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                    Program Studi / Jabatan
                  </span>
                  <span className="font-semibold text-foreground text-right">
                    {user?.studyProgram ||
                      (user as any)?.study_program ||
                      user?.unit_kerja ||
                      user?.bagian ||
                      "-"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================
              EDIT BUTTON
          ====================================================== */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 px-4 rounded-xl bg-secondary text-secondary-foreground border border-border font-bold text-sm hover:bg-accent transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Edit3 className="w-4 h-4 text-primary" />
              <span>Edit Profil</span>
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}