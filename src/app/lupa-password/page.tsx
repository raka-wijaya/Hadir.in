"use client";

import React, { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { showNotification } from "@/components/ui/NotificationProvider";
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
} from "lucide-react";

type StepType = "form" | "success";

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
        className={`flex items-center justify-center w-3 h-3 rounded-full text-[8px] font-black ${
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

export default function LupaPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepType>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring";

  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>_\-]/.test(newPassword),
  };

  const isPasswordValid =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showNotification({
        type: "warning",
        message: "Alamat email wajib diisi.",
      });
      return;
    }

    if (newPassword.length < 8) {
      showNotification({
        type: "warning",
        message: "Password minimal 8 karakter.",
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      showNotification({
        type: "warning",
        message: "Password harus memiliki minimal 1 huruf besar.",
      });
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      showNotification({
        type: "warning",
        message: "Password harus memiliki minimal 1 huruf kecil.",
      });
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      showNotification({
        type: "warning",
        message: "Password harus memiliki minimal 1 angka.",
      });
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(newPassword)) {
      showNotification({
        type: "warning",
        message: "Password harus memiliki minimal 1 karakter khusus.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification({
        type: "warning",
        message: "Konfirmasi password tidak cocok.",
      });
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

      const contentType = res.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok || !data?.success) {
        const errMsg =
          data?.message || "Gagal mereset password. Periksa alamat email Anda.";
        showNotification({ type: "error", message: errMsg });
        return;
      }

      showNotification({
        type: "success",
        title: "Password Berhasil Diubah",
        message:
          "Password akun Anda telah berhasil direset. Silakan masuk menggunakan password baru Anda.",
      });
      setStep("success");
    } catch {
      showNotification({
        type: "error",
        message: "Gagal terhubung ke server. Periksa koneksi internet Anda.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-5 md:p-6 space-y-4 shadow-card">
        <div className="text-center space-y-1.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-sans font-bold text-lg flex items-center justify-center mx-auto shadow-card">
            H
          </div>
          <h1 className="text-lg font-bold font-sans tracking-tight text-card-foreground">
            Lupa Password
          </h1>
          <p className="text-xs font-sans text-muted-foreground">
            Masukkan email terdaftar dan buat password baru
          </p>
        </div>
        <div className="bg-accent border border-primary/25 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs font-sans text-accent-foreground leading-relaxed">
            Masukkan email yang terdaftar, kemudian buat password baru. Pastikan
            Anda mengingat password baru ini.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-sans font-bold text-card-foreground flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Alamat Email
              <span className="text-status-tolak">*</span>
            </label>

            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email terdaftar"
              autoComplete="email"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-sans font-bold text-card-foreground flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Password Baru
              <span className="text-status-tolak">*</span>
            </label>

            <div className="relative">
              <input
                id="fp-new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
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
                  cursor-pointer
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

            {newPassword && (
              <div className="mt-2 rounded-lg border border-border bg-background/50 p-2.5 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Password harus memiliki:
                </p>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <PasswordRequirement
                    valid={passwordRequirements.length}
                    text="Minimal 8 karakter"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.uppercase}
                    text="Huruf besar"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.lowercase}
                    text="Huruf kecil"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.number}
                    text="Angka"
                  />

                  <PasswordRequirement
                    valid={passwordRequirements.special}
                    text="Karakter khusus"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-sans font-bold text-card-foreground flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Konfirmasi Password Baru
              <span className="text-status-tolak">*</span>
            </label>

            <div className="relative">
              <input
                id="fp-confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan ulang password baru"
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
                  cursor-pointer
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
              cursor-pointer
            "
          >
            {isLoading ? (
              <>
                <Spinner className="text-current" />
              </>
            ) : (
              <span className="font-sans">Reset Password</span>
            )}
          </button>
        </form>

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
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}