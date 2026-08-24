"use client";

import React, { useState } from "react";
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
  AlertCircle,
} from "lucide-react";

type NonInternRole =
  | "KARYAWAN_OS"
  | "ADMIN_OS"
  | "ADMIN_MAGANG"
  | "SUPERADMIN";

export default function RegisterPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [selectedRole, setSelectedRole] =
    useState<NonInternRole>("KARYAWAN_OS");

  const [form, setForm] = useState({
    nama: "",
    email: "",
    no_hp: "",
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
      setErrorMsg("Format email yang Anda masukkan tidak sesuai.");
      return false;
    }

    if (form.password.length < 6) {
      setErrorMsg("Password harus memiliki minimal 6 karakter.");
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
          password: form.password,
          role: selectedRole,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok || !data?.success) {
        setErrorMsg(data?.message || "Gagal memproses pendaftaran akun.");
        return;
      }

      setSuccessMsg(
        data.message ||
          `Akun ${selectedRole} berhasil didaftarkan. Silakan masuk menggunakan akun baru Anda.`,
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
        <div className="w-full max-w-xs bg-card text-card-foreground border border-border rounded-xl p-4 space-y-3 shadow-card text-center">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-black font-sans text-card-foreground">
              Pendaftaran Akun Berhasil!
            </h2>

            <p className="text-[10px] font-sans text-muted-foreground leading-relaxed">
              {successMsg}
            </p>

            <div className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <div className="flex items-center font-sans justify-center gap-1.5 text-primary font-bold text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Role: {selectedRole}
              </div>

              <p className="text-[9px] font-sans text-muted-foreground mt-1">
                Akun internal telah aktif dan dapat digunakan untuk masuk ke
                sistem.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="
              w-full
              min-h-[38px]
              py-2
              px-4
              rounded-lg
              bg-primary
              text-primary-foreground
              font-black
              text-[11px]
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
            <ShieldCheck className="w-3.5 h-3.5" />
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-3 py-4">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl p-4 md:p-5 shadow-card">
        {/* HEADER */}
        <div className="text-center space-y-1 mb-4">
          <div className="w-9 h-9 font-sans rounded-lg bg-primary text-primary-foreground font-black text-base flex items-center justify-center mx-auto shadow-card">
            H
          </div>

          <h1 className="text-base font-sans md:text-lg font-black tracking-tight text-card-foreground">
            Daftar Akun Internal
          </h1>

          <p className="text-[10px] font-semibold font-sans text-muted-foreground">
            Presensi Karyawan & Staf Disdukcapil Sidoarjo
          </p>
        </div>

        {/* ERROR */}
        {errorMsg && (
          <div className="mb-3 bg-destructive/10 border border-destructive/30 rounded-lg p-2 flex items-center justify-center gap-2 text-[10px] font-bold text-destructive text-center animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* DATA INTERNAL */}
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-primary" />
                Nama Lengkap
                <span className="text-destructive">*</span>
              </label>

              <input
                type="text"
                value={form.nama}
                onChange={set("nama")}
                placeholder="Contoh: Budi Santoso"
                autoComplete="name"
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-primary" />
                Email
                <span className="text-destructive">*</span>
              </label>

              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="contoh@email.com"
                autoComplete="email"
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-primary" />
                No. HP / WhatsApp
                <span className="text-muted-foreground font-sans font-normal">
                  (opsional)
                </span>
              </label>

              <input
                type="tel"
                value={form.no_hp}
                onChange={set("no_hp")}
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
                className={inputClass}
              />
            </div>

            {/* ROLE SELECTION */}
            <div className="space-y-2.5 p-2.5 rounded-lg border border-border bg-background">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                </div>

                <div>
                  <p className="text-[11px] font-sans font-black text-card-foreground">
                    Pilih Role Akun Internal
                  </p>

                  <p className="text-[9px] text-muted-foreground font-sans mt-0.5">
                    Pilih role sesuai posisi atau wewenang.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-extrabold text-card-foreground">
                  Role Penugasan
                  <span className="text-destructive ml-1">*</span>
                </label>

                <select
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(e.target.value as NonInternRole)
                  }
                  className={`${inputClass} font-bold`}
                >
                  <option value="KARYAWAN_OS">
                    KARYAWAN OS - Karyawan Outsourcing
                  </option>

                  <option value="ADMIN_MAGANG">
                    ADMIN MAGANG — Administrator Magang
                  </option>

                  <option value="ADMIN_OS">
                    ADMIN OS — Administrator Outsourcing
                  </option>

                  <option value="SUPERADMIN">
                    SUPERADMIN — Super Administrator
                  </option>
                </select>
              </div>

              <div className="p-2 rounded-lg bg-muted border border-border text-[9px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-primary shrink-0" />

                <span className="font-sans">
                  Akun akan memiliki hak akses sebagai{" "}
                  <strong className="text-foreground">{selectedRole}</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* PASSWORD */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5 text-primary" />
              </div>

              <div>
                <p className="text-[11px] font-sans font-black text-card-foreground">
                  Buat Password Akun
                </p>

                <p className="text-[9px] font-sans text-muted-foreground mt-0.5">
                  Password digunakan untuk masuk ke sistem.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 text-primary" />
                  Password
                  <span className="text-destructive">*</span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    className={`${inputClass} pr-9`}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
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
                <label className="text-[10px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 text-primary" />
                  Konfirmasi Password
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
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full
              min-h-[38px]
              py-2
              px-4
              rounded-lg
              bg-primary
              text-primary-foreground
              font-black
              text-[11px]
              hover:opacity-90
              active:scale-[0.99]
              transition-all
              flex
              items-center
              justify-center
              gap-2
              shadow-card
              disabled:opacity-50
              disabled:cursor-not-allowed
              disabled:active:scale-100
            "
          >
            {isLoading ? (
              <span className="animate-pulse font-sans">
                Mendaftarkan Akun...
              </span>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar sebagai {selectedRole}</span>
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="text-center pt-3 mt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-sans font-semibold">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-extrabold text-primary font-sans hover:opacity-80 hover:underline inline-flex items-center gap-1 transition-all"
            >
              <ShieldCheck className="w-3 h-3" />
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}