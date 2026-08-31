"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Briefcase,
  Loader2,
  AlertCircle,
  X,
  Save,
  ShieldCheck,
} from "lucide-react";

export default function AdminProfilPage() {
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [institution, setInstitution] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [avatar, setAvatar] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────
  // INIT FORM
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setName(user.name || user.nama || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.no_hp || "");
      setIdentityNumber(user.identityNumber || (user as any).identity_number || "");
      setInstitution(user.institution || user.sekolah_kampus || "");
      setUnitKerja(
        user.unit_kerja || user.bagian || user.studyProgram || (user as any).study_program || ""
      );
      setAvatar(user.avatar || "");
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────
  // AVATAR
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
  // CANCEL
  // ─────────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (user) {
      setName(user.name || user.nama || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.no_hp || "");
      setIdentityNumber(user.identityNumber || (user as any).identity_number || "");
      setInstitution(user.institution || user.sekolah_kampus || "");
      setUnitKerja(
        user.unit_kerja || user.bagian || user.studyProgram || (user as any).study_program || ""
      );
      setAvatar(user.avatar || "");
    }
    setErrorMsg(null);
    setIsEditing(false);
  };

  // ─────────────────────────────────────────────────────────────
  // SIMPAN
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
      unit_kerja: unitKerja,
      bagian: unitKerja,
      studyProgram: unitKerja,
      study_program: unitKerja,
      avatar:
        avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Admin")}&background=f59e0b&color=000000&bold=true`,
    };

    let serverAvatar = updatedData.avatar;
    try {
      if (user?.id) {
        const response = await fetch("/api/users/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id, ...updatedData }),
        });

        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(resData.message || "Gagal menyimpan profil ke server.");
        } else if (resData?.data?.avatar) {
          serverAvatar = resData.data.avatar;
          setAvatar(serverAvatar);
        }
      }

      updateUser({ ...updatedData, avatar: serverAvatar });
      setIsEditing(false);
      setSavedMsg("Profil berhasil diperbarui!");
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: any) {
      console.error("Error update profile:", err);
      setErrorMsg(err?.message || "Gagal menyimpan perubahan. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const defaultAvatar =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Admin")}&background=f59e0b&color=000000&bold=true`;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 mx-auto">

        {/* HEADER */}
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Profil Saya
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Informasi identitas dan data akun administrator dalam sistem Hadir.in
          </p>
        </div>

        {/* SUCCESS */}
        {savedMsg && (
          <div className="bg-primary/20 border border-primary/40 rounded-2xl p-4 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm font-bold text-primary-foreground dark:text-primary">
              {savedMsg}
            </span>
          </div>
        )}

        {/* ERROR */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-sm font-bold text-red-700 dark:text-red-300">
              {errorMsg}
            </span>
          </div>
        )}

        {/* PROFILE CARD */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">

          {/* AVATAR */}
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
                {isEditing ? name || "Nama Admin" : user?.name || user?.nama || "-"}
              </h2>
              <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/20 text-primary-foreground dark:text-primary border border-primary/30 uppercase tracking-wider">
                {user?.role || "ADMIN"}
              </span>
            </div>
          </div>

          {/* DETAIL / FORM */}
          <div className="bg-input/50 rounded-2xl p-5 border border-border space-y-4 text-xs md:text-sm">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2 flex items-center justify-between">
              <span>Informasi Pribadi</span>
              {isEditing && (
                <span className="text-[11px] font-semibold text-primary">
                  Mode Edit Aktif
                </span>
              )}
            </h3>

            {isEditing ? (
              /* ── EDIT FORM ── */
              <form onSubmit={handleSave} className="space-y-4">

                {/* Nama */}
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
                    placeholder="admin@email.com"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                {/* Telepon */}
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

                {/* NIP */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    NIP / Nomor Identitas
                  </label>
                  <input
                    type="text"
                    value={identityNumber}
                    onChange={(e) => setIdentityNumber(e.target.value)}
                    placeholder="Contoh: 196808171990031001"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                </div>

                {/* Instansi */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Instansi / Unit Organisasi
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: Dinas Komunikasi dan Informatika"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Unit Kerja / Bagian */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Unit Kerja / Bagian / Jabatan
                  </label>
                  <input
                    type="text"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    placeholder="Contoh: Seksi Pengembangan Sistem"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Aksi */}
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
              /* ── VIEW MODE ── */
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" />
                    Nama Lengkap
                  </span>
                  <span className="font-bold text-foreground text-right">
                    {user?.name || user?.nama || "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </span>
                  <span className="font-medium text-foreground text-right break-all">
                    {user?.email || "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Nomor Telepon
                  </span>
                  <span className="font-medium text-foreground text-right">
                    {user?.phone || user?.no_hp || "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    NIP / Nomor Identitas
                  </span>
                  <span className="font-mono font-bold text-foreground text-right">
                    {user?.identityNumber || (user as any)?.identity_number || "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4 pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Instansi / Unit Organisasi
                  </span>
                  <span className="font-semibold text-foreground text-right">
                    {user?.institution || user?.sekolah_kampus || "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    Unit Kerja / Jabatan
                  </span>
                  <span className="font-semibold text-foreground text-right">
                    {user?.unit_kerja ||
                      user?.bagian ||
                      user?.studyProgram ||
                      (user as any)?.study_program ||
                      "-"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* EDIT BUTTON */}
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
