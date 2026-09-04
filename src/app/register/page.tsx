"use client";

import React, { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  Lock,
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  AlertCircle,
} from "lucide-react";

type InternalRole =
  | "KARYAWAN_OS"
  | "ADMIN_MAGANG"
  | "ADMIN_OS"
  | "SUPERADMIN";

function PasswordRequirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] font-semibold transition-colors ${
        valid ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span
        className={`w-3.5 h-3.5 shrink-0 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${
          valid
            ? "bg-primary text-primary-foreground"
            : "border border-muted-foreground/40"
        }`}
      >
        {valid ? "✓" : ""}
      </span>

      <span>{text}</span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<InternalRole>("KARYAWAN_OS");
  const [form, setForm] = useState({
    nama: "",
    email: "",
    no_hp: "",
    identity_number: "",
    password: "",
    confirmPassword: "",
  });

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));

      if (errorMsg) {
        setErrorMsg(null);
      }
    };

  const passwordRequirements = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>_\-]/.test(form.password),
  };

  const isPasswordValid =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  const isConfirmPasswordValid =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const validateForm = () => {
    setErrorMsg(null);

    if (!form.nama.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return false;
    }

    if (!form.email.trim()) {
      setErrorMsg("Email wajib diisi.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrorMsg("Format email yang Anda masukkan tidak valid.");
      return false;
    }

    if (!passwordRequirements.length) {
      setErrorMsg("Password harus memiliki minimal 8 karakter.");
      return false;
    }

    if (!passwordRequirements.uppercase) {
      setErrorMsg("Password harus memiliki minimal 1 huruf besar (A-Z).");
      return false;
    }

    if (!passwordRequirements.lowercase) {
      setErrorMsg("Password harus memiliki minimal 1 huruf kecil (a-z).");
      return false;
    }

    if (!passwordRequirements.number) {
      setErrorMsg("Password harus memiliki minimal 1 angka (0-9).");
      return false;
    }

    if (!passwordRequirements.special) {
      setErrorMsg(
        "Password harus memiliki minimal 1 karakter khusus seperti !, @, #, atau $.",
      );
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok dengan password.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: form.nama.trim(),
          email: form.email.trim(),
          no_hp: form.no_hp.trim() || null,
          identity_number: form.identity_number.trim() || null,
          password: form.password,
          role: selectedRole,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok || !data?.success) {
        setErrorMsg(
          data?.message || "Gagal memproses pendaftaran akun internal.",
        );
        return;
      }

      setSuccessMsg(
        data.message ||
          `Akun ${selectedRole.replace(
            "_",
            " ",
          )} berhasil didaftarkan. Silakan masuk menggunakan akun baru Anda.`,
      );
    } catch (error) {
      console.error("Register request error:", error);

      setErrorMsg("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full h-9 rounded-lg border border-border bg-background px-3 text-[11px] font-semibold text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring";

  if (successMsg) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-3">
        <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-xl p-5 space-y-4 shadow-card text-center">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-black font-sans text-card-foreground">
              Pendaftaran Akun Berhasil!
            </h2>

            <p className="text-xs font-sans text-muted-foreground leading-relaxed">
              {successMsg}
            </p>

            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <div className="flex items-center font-sans justify-center gap-1.5 text-primary font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                Role: {selectedRole}
              </div>

              <p className="text-[10px] font-sans text-muted-foreground mt-1">
                {selectedRole === ("ANAK_MAGANG" as any)
                  ? "Akun telah aktif dan dapat langsung digunakan untuk masuk."
                  : "Akun telah didaftarkan dan saat ini dalam proses verifikasi Admin. Anda dapat masuk setelah akun Anda disetujui."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="
              w-full
              min-h-[40px]
              py-2
              px-4
              rounded-lg
              bg-primary
              text-primary-foreground
              font-black
              text-xs
              hover:opacity-90
              active:scale-[0.99]
              transition-all
              flex
              items-center
              justify-center
              gap-2
              shadow-card
              font-sans
            "
          >
            <ShieldCheck className="w-4 h-4" />
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-3 py-6">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl p-4 md:p-6 shadow-card space-y-4">
        <div className="text-center space-y-1">
          <div className="w-9 h-9 font-sans rounded-lg bg-primary text-primary-foreground font-black text-base flex items-center justify-center mx-auto shadow-card">
            H
          </div>

          <h1 className="text-lg font-black font-sans tracking-tight text-card-foreground">
            Daftar Akun Internal
          </h1>

          <p className="text-xs font-semibold font-sans text-muted-foreground">
            Presensi Karyawan OS & Staf Disdukcapil Sidoarjo
          </p>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 flex items-center justify-center gap-2 text-xs font-bold text-destructive text-center animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />

            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-2 p-3 rounded-lg border border-border bg-background">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>

              <div>
                <p className="text-xs font-sans font-black text-card-foreground">
                  Pilih Role Akun Internal
                </p>

                <p className="text-[10px] text-muted-foreground font-sans">
                  Pilih role sesuai jabatan atau penugasan Anda.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans font-extrabold text-card-foreground">
                Role Penugasan <span className="text-destructive">*</span>
              </label>

              <select
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(e.target.value as InternalRole)
                }
                className={`${inputClass} font-bold`}
              >
                <option value="KARYAWAN_OS">
                  KARYAWAN OS | Karyawan Outsourcing
                </option>

                <option value="ADMIN_MAGANG">
                  ADMIN MAGANG | Administrator Magang
                </option>

                <option value="ADMIN_OS">
                  ADMIN OS | Administrator Outsourcing
                </option>

                <option value="SUPERADMIN">
                  SUPERADMIN | Super Administrator
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary" />
                Nama Lengkap <span className="text-destructive">*</span>
              </label>

              <input
                type="text"
                value={form.nama}
                onChange={set("nama")}
                placeholder="Masukkan nama lengkap"
                autoComplete="name"
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Alamat Email <span className="text-destructive">*</span>
              </label>

              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="Masukkan email"
                autoComplete="email"
                className={inputClass}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  NIP / Nomor Identitas{" "}
                  <span className="text-destructive">*</span>
                </label>

                <input
                  type="text"
                  value={form.identity_number}
                  onChange={set("identity_number")}
                  placeholder="Masukan NIP"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  No. HP / WhatsApp
                  <span className="text-destructive">*</span>
                </label>

                <input
                  type="tel"
                  value={form.no_hp}
                  onChange={set("no_hp")}
                  placeholder="Masukkan no wa"
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Password
                  <span className="text-destructive">*</span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Masukkan password minimal 8 karakter"
                    autoComplete="new-password"
                    className={`${inputClass} pr-9`}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Konfirmasi Password{" "}
                  <span className="text-destructive">*</span>
                </label>

                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    className={`${inputClass} pr-9`}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    aria-label={
                      showConfirm
                        ? "Sembunyikan konfirmasi password"
                        : "Tampilkan konfirmasi password"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {form.password && (
              <div className="rounded-lg border border-border bg-background p-2.5 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-sans font-bold text-muted-foreground">
                    Password harus memiliki:
                  </p>

                  {isPasswordValid && (
                    <span className="text-[9px] font-sans font-black text-primary">
                      Password kuat
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <PasswordRequirement
                    valid={passwordRequirements.length}
                    text="Minimal 8 karakter"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.uppercase}
                    text="Huruf besar (A-Z)"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.lowercase}
                    text="Huruf kecil (a-z)"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.number}
                    text="Angka (0-9)"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.special}
                    text="Karakter khusus (!@#$)"
                  />
                </div>
              </div>
            )}

            {form.confirmPassword && (
              <div
                className={`flex items-center gap-1.5 text-[10px] font-sans font-semibold ${
                  isConfirmPasswordValid ? "text-primary" : "text-destructive"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center font-black">
                  {isConfirmPasswordValid ? "✓" : "!"}
                </span>

                <span>
                  {isConfirmPasswordValid
                    ? "Konfirmasi password cocok"
                    : "Konfirmasi password belum cocok"}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full
              min-h-[42px]
              py-2.5
              px-4
              rounded-lg
              bg-primary
              text-primary-foreground
              font-black
              text-xs
              hover:opacity-90
              active:scale-[0.99]
              transition-all
              flex
              items-center
              justify-center
              gap-2
              shadow-card
              font-sans
              disabled:opacity-50
              disabled:cursor-not-allowed
              disabled:active:scale-100
            "
          >
            {isLoading ? (
              <>
                <Spinner />

                <span className="font-sans">Mendaftarkan Akun...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />

                <span>Daftar sebagai {selectedRole.replace("_", " ")}</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-sans font-semibold">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-extrabold text-primary font-sans hover:opacity-80 hover:underline inline-flex items-center gap-1 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}