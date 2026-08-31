"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth/context";
import { Captcha } from "@/components/forms/Captcha";
import { getDefaultDashboardForRole } from "@/lib/permissions";

import {
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Lock,
  UserPlus,
  Clock,
  AlertCircle,
  User,
} from "lucide-react";

function LoginForm() {
  const { user, login } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const isTimeoutLogout = searchParams.get("reason") === "timeout";

  useEffect(() => {
    if (user?.role) {
      router.replace(getDefaultDashboardForRole(user.role));
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      setErrorMsg("Silakan masukkan CAPTCHA dengan benar terlebih dahulu.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const cleanTarget = identifier.trim();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: cleanTarget,
          email: cleanTarget,
          password,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok || !data?.success) {
        setErrorMsg(
          data?.message ||
            (res.status === 404
              ? "Layanan login tidak tersedia. Mulai ulang server aplikasi lalu coba lagi."
              : "Email / No. Identitas atau password salah.")
        );
        return;
      }

      login(data.user);

      const targetPath = getDefaultDashboardForRole(data.user.role);
      router.push(targetPath);
    } catch (error) {
      console.error("Login request error:", error);
      setErrorMsg("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-5 md:p-6 space-y-5 shadow-card">
        {/* LOGO & HEADER */}
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center mx-auto shadow-card">
            H
          </div>

          <h1 className="text-xl font-black tracking-tight font-sans text-card-foreground">
            Hadir.in
          </h1>

          <p className="text-[11px] font-semibold font-sans text-muted-foreground">
            Presensi Karyawan & Magang Disdukcapil Sidoarjo
          </p>
        </div>

        {/* FORM LOGIN */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* TIMEOUT MESSAGE */}
          {isTimeoutLogout && (
            <div className="bg-accent border border-primary/30 rounded-xl p-2.5 flex items-start gap-2 animate-in fade-in">
              <Clock className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />

              <p className="text-[11px] font-bold font-sans text-accent-foreground leading-relaxed">
                Sesi Anda telah berakhir karena tidak ada aktivitas selama 10
                menit. Silakan masuk kembali.
              </p>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2.5 flex items-center justify-center gap-2 text-[11px] font-bold text-destructive text-center animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />

              <span>{errorMsg}</span>
            </div>
          )}

          {/* IDENTIFIER (EMAIL / NIP / NIM / NO. HP) */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold font-sans text-card-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Email / Nomor Identitas (NIP / NIM)
            </label>

            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Masukkan email, NIP, atau NIM"
              autoComplete="username"
              required
              className="
                w-full
                rounded-xl
                border
                border-border
                bg-background
                text-foreground
                font-sans
                placeholder:text-muted-foreground
                px-3.5
                py-2
                text-sm
                font-semibold
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-ring
                focus:border-ring
              "
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold font-sans text-card-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Password
              </label>

              <Link
                href="/lupa-password"
                className="
                  text-[11px]
                  font-bold
                  font-sans
                  text-primary
                  hover:opacity-80
                  hover:underline
                  transition-all
                "
              >
                Lupa Password?
              </Link>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
                className="
                  w-full
                  rounded-xl
                  border
                  border-border
                  bg-background
                  text-foreground
                  placeholder:text-muted-foreground
                  px-3.5
                  py-2
                  pr-10
                  font-sans
                  text-sm
                  font-semibold
                  transition-all
                  focus:outline-none
                  focus:ring-2
                  focus:ring-ring
                  focus:border-ring
                "
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
                  rounded-lg
                  transition-colors
                "
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* CAPTCHA */}
          <div className="pt-0.5">
            <Captcha onVerify={setCaptchaVerified} />
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={isLoading || !captchaVerified}
            className="
              w-full
              min-h-[44px]
              py-2.5
              px-4
              rounded-xl
              bg-primary
              text-primary-foreground
              font-black
              text-sm
              hover:opacity-90
              active:scale-[0.99]
              transition-all
              flex
              font-sans
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
              <>
                <Spinner />
                <span>Verifikasi Akun</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span className="font-sans">Masuk ke Hadir.in</span>
              </>
            )}
          </button>
        </form>

        {/* REGISTER */}
        <div className="text-center pt-4 border-t border-border space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-semibold font-sans">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="
                font-extrabold
                text-primary
                hover:opacity-80
                hover:underline
                inline-flex
                items-center
                gap-1
                transition-all
              "
            >
              <UserPlus className="w-3 h-3" />

              <span className="font-sans">Daftar Akun</span>
            </Link>
          </p>
        </div>

        {/* SECURITY BADGES */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 font-semibold">
          <span className="flex items-center gap-1 font-sans">
            <ShieldCheck className="w-3 h-3 text-primary" />
            CAPTCHA Protected
          </span>

          <span className="flex items-center gap-1 font-sans">
            <Lock className="w-3 h-3 text-primary" />
            Session Security
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-5 md:p-6 space-y-4 text-center shadow-card">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center mx-auto animate-pulse">
              H
            </div>

            <p className="text-xs font-sans font-bold text-muted-foreground animate-pulse">
              Memuat halaman masuk...
            </p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}