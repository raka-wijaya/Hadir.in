"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Lock,
  Mail,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

type StepType = "form" | "success";

export default function LupaPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<StepType>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg("Alamat email wajib diisi.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          newPassword,
        }),
      });

      const contentType =
        res.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok || !data?.success) {
        setErrorMsg(
          data?.message ||
            "Gagal mereset password. Periksa alamat email Anda."
        );
        return;
      }

      setStep("success");
    } catch {
      setErrorMsg(
        "Gagal terhubung ke server. Periksa koneksi internet Anda."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-5 space-y-4 shadow-card text-center">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-black font-sans text-card-foreground">
              Password Berhasil Diubah!
            </h2>

            <p className="text-xs font-sans text-muted-foreground leading-relaxed">
              Password akun Anda telah berhasil direset. Silakan masuk
              menggunakan password baru Anda.
            </p>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="
              w-full
              min-h-[40px]
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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-5 md:p-6 space-y-4 shadow-card">
        {/* HEADER */}
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-sans font-black text-lg flex items-center justify-center mx-auto shadow-card">
            H
          </div>

          <h1 className="text-lg font-black font-sans tracking-tight text-card-foreground">
            Lupa Password
          </h1>

          <p className="text-[11px] font-sans font-semibold text-muted-foreground">
            Masukkan email terdaftar dan buat password baru
          </p>
        </div>

        {/* INFO BOX */}
        <div className="bg-accent border border-primary/25 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />

          <p className="text-[11px] font-sans text-accent-foreground font-semibold leading-relaxed">
            Masukkan email yang terdaftar, kemudian buat password baru. Pastikan
            Anda mengingat password baru ini.
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 flex items-center justify-center gap-2 text-[11px] font-bold text-destructive text-center animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />

            <span>{errorMsg}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* EMAIL */}
          <div className="space-y-1">
            <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Alamat Email
            </label>

            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan alamat email terdaftar"
              autoComplete="email"
              className={inputClass}
              required
            />
          </div>

          {/* NEW PASSWORD */}
          <div className="space-y-1">
            <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Password Baru
            </label>

            <div className="relative">
              <input
                id="fp-new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                className={`${inputClass} pr-10`}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="
                  absolute
                  right-2.5
                  top-1/2
                  -translate-y-1/2
                  text-muted-foreground
                  hover:text-foreground
                  p-1
                  rounded-md
                  transition-colors
                "
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
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

          {/* CONFIRM PASSWORD */}
          <div className="space-y-1">
            <label className="text-[11px] font-sans font-extrabold text-card-foreground flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Konfirmasi Password Baru
            </label>

            <div className="relative">
              <input
                id="fp-confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                className={`${inputClass} pr-10`}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="
                  absolute
                  right-2.5
                  top-1/2
                  -translate-y-1/2
                  text-muted-foreground
                  hover:text-foreground
                  p-1
                  rounded-md
                  transition-colors
                "
                aria-label={
                  showConfirm ? "Sembunyikan password" : "Tampilkan password"
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

          {/* SUBMIT BUTTON */}
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
              disabled:opacity-50
              disabled:cursor-not-allowed
              disabled:active:scale-100
              font-sans
            "
          >
            {isLoading ? (
              <span className="animate-pulse">Memproses Reset...</span>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                Reset Password Sekarang
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="text-center pt-3 border-t border-border">
          <Link
            href="/login"
            className="
              text-[11px]
              font-extrabold
              text-primary
              hover:opacity-80
              hover:underline
              inline-flex
              items-center
              gap-1
              transition-all
              font-sans
            "
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}