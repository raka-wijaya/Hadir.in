"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth/context";
import { Captcha } from "@/components/forms/Captcha";
import { getDefaultDashboardForRole } from "@/lib/permissions";
import { User as UserType, UserRole, UserStatus } from "@/types";

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
  // const [captchaVerified, setCaptchaVerified] = useState(false);

  const isTimeoutLogout = searchParams.get("reason") === "timeout";

  useEffect(() => {
    if (user?.role) {
      router.replace(getDefaultDashboardForRole(user.role));
    }
  }, [user, router]);

  const formRef = React.useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    // Pastikan saat halaman dimuat, password dan form selalu bersih
    setPassword("");
    setShowPassword(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg(null);

    const cleanTarget = identifier.trim();
    if (!cleanTarget) {
      setErrorMsg("Email / No. Identitas wajib diisi.");
      return;
    }

    if (!password) {
      setErrorMsg("Password wajib diisi.");
      return;
    }

    setIsLoading(true);

    try {
      const LARAVEL_API = process.env.NEXT_PUBLIC_LARAVEL_API || "http://127.0.0.1:8000/api";

      const [adminRes, magangRes, osRes] = await Promise.all([
        fetch(`${LARAVEL_API}/admin`, { cache: "no-store" }).catch(() => null),
        fetch(`${LARAVEL_API}/peserta-magang`, { cache: "no-store" }).catch(() => null),
        fetch(`${LARAVEL_API}/karyawan-os`, { cache: "no-store" }).catch(() => null),
      ]);

      const [adminJson, magangJson, osJson] = await Promise.all([
        adminRes && adminRes.ok ? adminRes.json().catch(() => null) : null,
        magangRes && magangRes.ok ? magangRes.json().catch(() => null) : null,
        osRes && osRes.ok ? osRes.json().catch(() => null) : null,
      ]);

      const adminList: any[] = adminJson?.data || (Array.isArray(adminJson) ? adminJson : []);
      const magangList: any[] = magangJson?.data || (Array.isArray(magangJson) ? magangJson : []);
      const osList: any[] = osJson?.data || (Array.isArray(osJson) ? osJson : []);

      const lowerTarget = cleanTarget.toLowerCase();

      const matchIdentifier = (u: any) => {
        const uEmail = String(u.email || "").trim().toLowerCase();
        const uIdent = String(u.identity_number || u.identityNumber || u.nip || u.nim || "").trim().toLowerCase();
        const uPhone = String(u.phone || u.no_hp || "").trim();
        return uEmail === lowerTarget || (uIdent && uIdent === lowerTarget) || (uPhone && uPhone === cleanTarget);
      };

      let matchedUser: any = null;
      let matchedRole: any = null;

      const foundAdmin = adminList.find(matchIdentifier);
      if (foundAdmin) {
        matchedUser = foundAdmin;
        matchedRole = foundAdmin.role || "SUPERADMIN";
      }

      if (!matchedUser) {
        const foundOS = osList.find(matchIdentifier);
        if (foundOS) {
          matchedUser = foundOS;
          matchedRole = "KARYAWAN_OS";
        }
      }

      if (!matchedUser) {
        const foundMagang = magangList.find(matchIdentifier);
        if (foundMagang) {
          matchedUser = foundMagang;
          matchedRole = "ANAK_MAGANG";
        }
      }

      if (!matchedUser) {
        setPassword("");
        setShowPassword(false);
        setErrorMsg("Email / No. Identitas atau password salah.");
        return;
      }

      // Status check
      const statusUpper = String(matchedUser.status || "ACTIVE").toUpperCase();
      const normalizedStatus: UserStatus =
        statusUpper === "INACTIVE" || statusUpper === "NONAKTIF"
          ? "INACTIVE"
          : "ACTIVE";
      if (normalizedStatus === "INACTIVE") {
        setPassword("");
        setShowPassword(false);
        setErrorMsg("Akun Anda telah dinonaktifkan. Silakan hubungi admin.");
        return;
      }

      // Verification status check
      const verifStatus = String(matchedUser.verification_status || matchedUser.verificationStatus || "").toUpperCase();
      if (verifStatus === "PENDING" && matchedRole === "ANAK_MAGANG") {
        setPassword("");
        setShowPassword(false);
        setErrorMsg("Akun Anda masih dalam proses verifikasi oleh Admin. Silakan tunggu persetujuan Admin sebelum dapat masuk.");
        return;
      }
      if (verifStatus === "REJECTED") {
        const reason = matchedUser.rejection_reason || matchedUser.rejectionReason;
        setPassword("");
        setShowPassword(false);
        setErrorMsg(`Akun Anda telah ditolak oleh Admin.${reason ? ` Alasan: ${reason}` : ""}`);
        return;
      }

      // Format user object
      const safeUser: UserType = {
        id: String(matchedUser.id),
        email: matchedUser.email || "",
        role: (matchedRole as UserRole) || "ANAK_MAGANG",
        name: matchedUser.name || matchedUser.nama || "",
        phone: matchedUser.phone || matchedUser.no_hp || null,
        identity_number: matchedUser.identity_number || matchedUser.identityNumber || null,
        institution: matchedUser.institution || matchedUser.sekolah_kampus || null,
        study_program: matchedUser.study_program || matchedUser.jurusan || null,
        avatar: matchedUser.avatar || matchedUser.avatar_url || null,
        start_date: matchedUser.start_date || null,
        end_date: matchedUser.end_date || null,
        status: normalizedStatus,
        created_at: matchedUser.created_at || undefined,

        // Aliases & kompatibilitas
        nama: matchedUser.name || matchedUser.nama || "",
        no_hp: matchedUser.phone || matchedUser.no_hp || null,
        identityNumber: matchedUser.identity_number || matchedUser.identityNumber || null,
        sekolah_kampus: matchedUser.institution || matchedUser.sekolah_kampus || null,
        studyProgram: matchedUser.study_program || matchedUser.jurusan || null,
        divisi: matchedUser.divisi || matchedUser.study_program || null,
        unit_kerja: matchedUser.study_program || null,
        bagian: matchedUser.study_program || null,
        startDate: matchedUser.start_date || null,
        endDate: matchedUser.end_date || null,
      };

      // Login berhasil
      setIdentifier("");
      setPassword("");
      setShowPassword(false);
      setErrorMsg(null);
      if (formRef.current) {
        formRef.current.reset();
      }

      login(safeUser);

      const targetPath = getDefaultDashboardForRole(safeUser.role);
      router.push(targetPath);
    } catch (error) {
      console.error("Login request error:", error);
      setPassword("");
      setShowPassword(false);
      setErrorMsg("Tidak dapat terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl p-5 md:p-6 space-y-5 shadow-card">
        <div className="text-center space-y-1.5">
          <div className="w-9 h-9 font-sans rounded-lg bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto shadow-card">
            H
          </div>
          <h1 className="text-lg font-bold font-sans tracking-tight text-card-foreground">
            Hadir.in
          </h1>
          <p className="text-xs font-sans text-muted-foreground">
            Presensi Karyawan & Magang Disdukcapil Sidoarjo
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
          {isTimeoutLogout && (
            <div className="bg-accent border border-primary/30 rounded-xl p-2.5 flex items-start gap-2 animate-in fade-in">
              <Clock className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium font-sans text-accent-foreground leading-relaxed">
                Sesi Anda telah berakhir karena tidak ada aktivitas selama 10
                menit. Silakan masuk kembali.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2.5 flex items-center justify-center gap-2 text-[11px] font-bold text-destructive text-center animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-sans text-card-foreground flex items-center gap-1">
              Email <span className="text-destructive">*</span>
            </label>

            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Masukkan email"
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

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-sans text-card-foreground flex items-center gap-1.5">
                Password <span className="text-destructive">*</span>
              </label>

              <Link
                href="/lupa-password"
                className="
                  text-xs
                  font-semibold
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
                  cursor-pointer
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

          <button
            type="submit"
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
              cursor-pointer
            "
          >
            {isLoading ? (
              <>
                <Spinner className="text-current" />
              </>
            ) : (
              <>
                <span className="font-sans">Masuk</span>
              </>
            )}
          </button>
        </form>

        {/* <div className="text-center pt-4 border-t border-border space-y-1.5">
          <p className="text-xs text-muted-foreground font-semibold font-sans">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="
                font-bold
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
        </div> */}
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
            <div className="flex justify-center">
              <Spinner size="lg" />
            </div>

          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}