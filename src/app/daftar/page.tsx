"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Captcha } from "@/components/forms/Captcha";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BAGIAN_OPTIONS } from "@/types";
import {
  CheckCircle2,
  Search,
  Upload,
  Calendar,
  Building2,
  GraduationCap,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  User,
  ArrowLeft,
  FileText,
  AlertCircle
} from "lucide-react";

export default function RegistrationPortalPage() {
  const [activeTab, setActiveTab] = useState<"DAFTAR" | "CEK_STATUS">("DAFTAR");
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const portfolioInputRef = React.useRef<HTMLInputElement | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);


  // Registration Form State
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    no_hp: "",
    sekolah_kampus: "",
    jurusan: "",
    bagian: "Programmer",
    alamat: "",
    periode_mulai: "2026-09-01",
    periode_selesai: "2026-12-01",
  });
  const [isCaptchaValid, setIsCaptchaValid] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Ukuran file CV tidak boleh melebihi 5MB.");
        return;
      }
      setCvFile(file);
      setFormError(null);
    }
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError("Ukuran file Portofolio tidak boleh melebihi 10MB.");
        return;
      }
      setPortfolioFile(file);
      setFormError(null);
    }
  };

  // Search State for Cek Status
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Pendaftaran periode info
  const isPeriodOpen = true;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isCaptchaValid) {
      setFormError("Silakan selesaikan kode verifikasi CAPTCHA dengan benar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("nama", formData.nama.trim());
      fd.append("email", formData.email.trim());
      fd.append("no_hp", formData.no_hp.trim());
      fd.append("sekolah_kampus", formData.sekolah_kampus.trim());
      fd.append("study_program", formData.jurusan.trim());
      fd.append("jurusan", formData.jurusan.trim());
      fd.append("bagian", formData.bagian.trim());
      fd.append("alamat", formData.alamat.trim());
      fd.append("periode_mulai", formData.periode_mulai || "");
      fd.append("periode_selesai", formData.periode_selesai || "");
      fd.append("status", "PENDING");
      if (cvFile) fd.append("file_cv", cvFile);
      if (portfolioFile) fd.append("portfolio_file", portfolioFile);

      const res = await fetch("/api/pendaftar", {
        method: "POST",
        body: fd,
      });

      let result: any = null;
      try {
        result = await res.json();
      } catch {
        result = null;
      }

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Gagal memproses pendaftaran.");
      }

      setGeneratedCode(result.data?.kode_pendaftaran || "");
      setIsSubmittedSuccess(true);
    } catch (error: any) {
      console.error("Submit pendaftaran error:", error);
      setFormError(error?.message || "Terjadi kesalahan saat mengirim pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(false);

    try {
      const res = await fetch(`/api/pendaftar?q=${encodeURIComponent(searchQuery.trim())}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await res.json();

      if (res.ok && result.success && result.data) {
        setSearchResult(result.data);
      } else {
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Search status error:", error);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 md:p-8">
      {/* Top Navbar Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-border mb-6">
        <Link href="/login" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black text-xl font-sans flex items-center justify-center shadow-card group-hover:scale-105 transition-all">
            H
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-foreground font-sans leading-none">
              Hadir.in
            </h1>
            <p className="text-xs text-muted-foreground font-sans">
              Portal Pendaftaran Magang
            </p>
          </div>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-accent transition-all shadow-card"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-sans">Kembali ke Login</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto flex-1 space-y-6">
        {/* Banner Title */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-sans md:text-3xl font-black text-foreground tracking-tight">
            Portal Pendaftaran Magang
          </h2>
          <p className="text-xs font-sans md:text-sm text-muted-foreground">
            Daftarkan diri Anda untuk mengikuti program magang resmi atau cek
            status pengajuan pendaftaran.
          </p>
        </div>

        {/* Registration Period Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-primary/15 text-primary">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <h4 className="font-extrabold font-sans text-sm md:text-base text-foreground">
                  Pendaftaran Magang Dibuka
                </h4>
              </div>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                Silakan lengkapi formulir di bawah ini dengan data yang valid.
              </p>
            </div>
          </div>

          <span className="px-3.5 font-sans py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-card">
            AKTIF
          </span>
        </div>

        {/* Tabs Switcher */}
        <div className="flex rounded-2xl bg-muted/70 p-1 border border-border">
          <button
            onClick={() => {
              setActiveTab("DAFTAR");
              setIsSubmittedSuccess(false);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
              activeTab === "DAFTAR"
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Daftar Magang
          </button>
          <button
            onClick={() => setActiveTab("CEK_STATUS")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
              activeTab === "CEK_STATUS"
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cek Status Pendaftaran
          </button>
        </div>

        {/* TAB 1: FORM PENDAFTARAN / SUCCESS CARD */}
        {activeTab === "DAFTAR" && (
          <div>
            {isSubmittedSuccess ? (
              /* Success Card */
              <div className="bg-card border border-border rounded-2xl p-8 shadow-elevated text-center space-y-6 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto border border-primary/40">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-foreground">
                    Pendaftaran Berhasil
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Pendaftaran Anda telah berhasil tersimpan di sistem.
                  </p>
                </div>

                <div className="bg-muted/80 border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Kode Pendaftaran Anda
                  </span>
                  <p className="text-2xl md:text-3xl font-mono font-black text-primary tracking-wider">
                    {generatedCode}
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Simpan kode di atas untuk mengecek status pendaftaran secara
                    berkala.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("CEK_STATUS");
                      setSearchQuery(generatedCode);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm hover:opacity-95 transition-all shadow-card"
                  >
                    Cek Status Pendaftaran
                  </button>
                  <Link
                    href="/login"
                    className="w-full py-3 px-4 rounded-xl bg-secondary text-secondary-foreground border border-border font-extrabold text-sm hover:bg-accent transition-all text-center"
                  >
                    Kembali ke Login
                  </Link>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <form
                onSubmit={handleFormSubmit}
                className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card space-y-6"
              >
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs font-extrabold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Lengkap */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.nama}
                        onChange={(e) =>
                          setFormData({ ...formData, nama: e.target.value })
                        }
                        placeholder="Masukkan nama lengkap Anda"
                        className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="nama@email.com"
                        className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Nomor Handphone */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      Nomor Handphone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={formData.no_hp}
                        onChange={(e) =>
                          setFormData({ ...formData, no_hp: e.target.value })
                        }
                        placeholder="08xxxxxxxxxx"
                        className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Sekolah / Kampus */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      Sekolah / Kampus <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.sekolah_kampus}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sekolah_kampus: e.target.value,
                          })
                        }
                        placeholder="Nama Universitas / Sekolah"
                        className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Jurusan */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      Jurusan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.jurusan}
                        onChange={(e) =>
                          setFormData({ ...formData, jurusan: e.target.value })
                        }
                        placeholder="Program Studi / Jurusan"
                        className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Bagian */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      Bagian Pilihan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={formData.bagian}
                        onChange={(e) =>
                          setFormData({ ...formData, bagian: e.target.value })
                        }
                        className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      >
                        {BAGIAN_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Periode Mulai */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Periode Mulai
                    </label>
                    <input
                      type="date"
                      value={formData.periode_mulai}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          periode_mulai: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Periode Selesai */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Periode Selesai
                    </label>
                    <input
                      type="date"
                      value={formData.periode_selesai}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          periode_selesai: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-foreground flex items-center gap-1">
                    Alamat Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                    <textarea
                      required
                      rows={2}
                      value={formData.alamat}
                      onChange={(e) =>
                        setFormData({ ...formData, alamat: e.target.value })
                      }
                      placeholder="Masukkan alamat domisili lengkap Anda"
                      className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Upload Section: CV & Portofolio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CV File Upload */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Unggah CV (Curriculum Vitae)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setFormError(
                              "Ukuran file CV tidak boleh melebihi 5MB.",
                            );
                            return;
                          }
                          setCvFile(file);
                          setFormError(null);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                        cvFile
                          ? "border-primary bg-primary/10 dark:bg-primary/20"
                          : "border-border bg-muted/40 hover:bg-muted/70 hover:border-primary/60"
                      }`}
                    >
                      {cvFile ? (
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2 text-left truncate">
                            <FileText className="w-6 h-6 text-primary shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-foreground truncate">
                                {cvFile.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(cvFile.size / 1024 / 1024).toFixed(2)} MB •
                                Berhasil dipilih
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCvFile(null);
                            }}
                            className="text-xs font-extrabold text-red-500 hover:underline shrink-0 ml-2"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs font-bold text-foreground">
                            Klik / seret file CV
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Format: PDF, DOCX (Maks 5MB)
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Portfolio File Upload */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-foreground">
                      Unggah Portofolio (Opsional)
                    </label>
                    <input
                      ref={portfolioInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.zip,.rar"
                      onChange={handlePortfolioChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => portfolioInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setFormError(
                              "Ukuran file Portofolio tidak boleh melebihi 10MB.",
                            );
                            return;
                          }
                          setPortfolioFile(file);
                          setFormError(null);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                        portfolioFile
                          ? "border-amber-500 bg-amber-500/10 dark:bg-amber-500/20"
                          : "border-border bg-muted/40 hover:bg-muted/70 hover:border-amber-500/60"
                      }`}
                    >
                      {portfolioFile ? (
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2 text-left truncate">
                            <Briefcase className="w-6 h-6 text-amber-500 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-foreground truncate">
                                {portfolioFile.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(portfolioFile.size / 1024 / 1024).toFixed(2)}{" "}
                                MB • Berhasil dipilih
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPortfolioFile(null);
                            }}
                            className="text-xs font-extrabold text-red-500 hover:underline shrink-0 ml-2"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs font-bold text-foreground">
                            Klik / seret file Portofolio
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Format: PDF, ZIP, RAR (Maks 10MB)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* CAPTCHA Widget */}
                <div className="pt-2">
                  <Captcha onVerify={setIsCaptchaValid} />
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isCaptchaValid}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-base hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-card min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">
                      Mengirim Pendaftaran...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Kirim Pendaftaran Magang</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: CEK STATUS PENDAFTARAN */}
        {activeTab === "CEK_STATUS" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card text-center space-y-4">
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-black text-foreground">
                  Cari Pendaftaran Anda
                </h3>
                <p className="text-xs text-muted-foreground">
                  Masukkan Kode Pendaftaran, Email, atau Nomor HP yang Anda
                  gunakan saat mendaftar.
                </p>
              </div>

              <form
                onSubmit={handleSearchStatus}
                className="max-w-lg mx-auto flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Masukkan Kode Pendaftaran (e.g. REG-0826-101) / Email / No. HP"
                    className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs hover:opacity-95 transition-all shadow-card flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {isSearching ? (
                    <span className="animate-pulse">Mencari...</span>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Cari</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Search Results */}
            {hasSearched && (
              <div>
                {searchResult ? (
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-elevated space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {searchResult.kode_pendaftaran}
                        </span>
                        <h4 className="text-lg font-black text-foreground">
                          {searchResult.nama}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {searchResult.sekolah_kampus} •{" "}
                          {searchResult.study_program || searchResult.jurusan}
                        </p>
                      </div>
                      <StatusBadge status={searchResult.status} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-muted/50 p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Bagian
                        </span>
                        <p className="font-extrabold text-foreground">
                          {searchResult.bagian}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Tanggal Daftar
                        </span>
                        <p className="font-extrabold text-foreground">
                          {searchResult.tanggal_daftar
                            ? new Date(
                                searchResult.tanggal_daftar,
                              ).toLocaleDateString("id-ID")
                            : "-"}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-2.5 rounded-xl border border-border col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Periode
                        </span>
                        <p className="font-extrabold text-foreground">
                          {[
                            searchResult.periode_mulai,
                            searchResult.periode_selesai,
                          ]
                            .map((d) => {
                              if (!d) return "N/A";
                              const parsed = new Date(d);
                              return isNaN(parsed.getTime())
                                ? d
                                : new Intl.DateTimeFormat("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    timeZone: "Asia/Jakarta",
                                  }).format(parsed);
                            })
                            .join(" s/d ")}
                        </p>
                      </div>
                    </div>

                    {/* Berkas Lampiran (CV & Portofolio) */}
                    {(searchResult.file_cv || searchResult.portfolio_file) && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-[11px] font-bold text-muted-foreground mb-2">
                          Berkas Terlampir:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {searchResult.file_cv && (
                            <a
                              href={searchResult.file_cv}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-primary/10 hover:border-primary/40 text-xs font-bold text-primary transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Lihat File CV</span>
                            </a>
                          )}

                          {searchResult.portfolio_file && (
                            <a
                              href={searchResult.portfolio_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-xs font-bold text-amber-600 dark:text-amber-400 transition-all"
                            >
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Lihat Portofolio</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {searchResult.catatan_admin && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200">
                        <p className="font-bold mb-0.5">Catatan Admin:</p>
                        <p>{searchResult.catatan_admin}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                    <h4 className="font-bold text-sm text-foreground">
                      Data Pendaftaran Tidak Ditemukan
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Pastikan Anda memasukkan Kode Pendaftaran, Email, atau No.
                      HP dengan benar.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto border-t border-border pt-4 mt-8 text-center text-xs text-muted-foreground">
        © 2026 Hadir.in — Sistem Informasi Presensi Magang terpusat.
      </footer>
    </div>
  );
}
