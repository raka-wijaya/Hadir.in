"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { ServerClock } from "@/components/ui/ServerClock";
import { CameraCapture } from "@/components/attendance/CameraCapture";
import { PhotoModal } from "@/components/attendance/PhotoModal";
import { useAuth } from "@/lib/auth/context";
import { Absensi, TugasItem } from "@/types";
import { showNotification } from "@/components/ui/NotificationProvider";
import { formatLateDuration } from "@/lib/attendance-utils";
import {
  CheckCircle2,
  Clock3,
  CalendarCheck2,
  CalendarDays,
  Camera,
  LogIn,
  LogOut,
  ChevronRight,
  XCircle,
  AlertTriangle,
  ClipboardList,
  FileText,
  X,
  Briefcase,
  Code,
  Image as ImageIcon,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  NotebookPen,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

function getKategoriIcon(kategori: string) {
  const k = (kategori || "").toLowerCase();
  if (k === "programmer") return <Code className="w-3.5 h-3.5" />;
  if (k === "media") return <ImageIcon className="w-3.5 h-3.5" />;
  if (k === "tambah bio data") return <UserPlus className="w-3.5 h-3.5" />;
  if (k === "pindah keluar") return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (k === "pindah datang") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  return <NotebookPen className="w-3.5 h-3.5" />;
}

function getKategoriBadgeClass(kategori: string): string {
  const k = (kategori || "").toLowerCase();
  switch (k) {
    case "akta kelahiran":
      return "bg-primary/15 text-primary border-primary/30";
    case "akta kematian":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "tambah bio data":
      return "status-izin";
    case "pindah keluar":
      return "status-terlambat";
    case "pindah datang":
      return "status-hadir";
    case "media":
      return "status-sakit";
    case "programmer":
      return "bg-primary/20 text-primary border-primary/40";
    default:
      return "bg-primary/15 text-primary border-primary/30";
  }
}

export default function MagangDashboardPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "IDLE" | "CAPTURE_IN" | "CAPTURE_OUT"
  >("IDLE");

  const [previewRecord, setPreviewRecord] = useState<Absensi | null>(null);

  const [previewType, setPreviewType] = useState<"MASUK" | "PULANG">("MASUK");

  // Form pulang cepat
  const [showEarlyCheckoutForm, setShowEarlyCheckoutForm] = useState(false);

  const [alasanPulangCepat, setAlasanPulangCepat] = useState("");


  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  const [userAttendances, setUserAttendances] = useState<Absensi[]>([]);
  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTugas, setIsLoadingTugas] = useState(true);
  const [updatingTugasId, setUpdatingTugasId] = useState<
    number | string | null
  >(null);

  const handleUpdateStatusTugas = async (
    tugasId: number | string,
    newStatus: "BELUM_DIKERJAKAN" | "SELESAI",
  ) => {
    try {
      setUpdatingTugasId(tugasId);
      const res = await fetch("/api/tugas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tugasId,
          status_pengerjaan: newStatus,
        }),
      });
      if (res.ok) {
        setTugasList((prev) =>
          prev.map((t) =>
            String(t.id) === String(tugasId)
              ? {
                  ...t,
                  status_pengerjaan: newStatus,
                  statusPengerjaan: newStatus,
                }
              : t,
          ),
        );
      }
    } catch (err) {
      console.error("Gagal memperbarui status tugas:", err);
    } finally {
      setUpdatingTugasId(null);
    }
  };

  // Jam pulang normal.
  const JAM_PULANG_NORMAL = "16:00";

  const todayStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const todayIDStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date())
    .replace(/\//g, "-");

  const currentUserId = user?.id || "";

  const fetchAttendance = useCallback(async () => {
    let targetUserId = currentUserId;
    if (!targetUserId && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hadirin_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          targetUserId = parsed.id || "";
        }
      } catch (e) {
        console.error("Error reading saved user:", e);
      }
    }

    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const absRes = await fetch(
        `/api/absensi?peserta_magang_id=${encodeURIComponent(targetUserId)}`,
        {
          cache: "no-store",
        },
      );

      if (absRes.ok) {
        const absData = await absRes.json();
        if (absData.success && Array.isArray(absData.data)) {
          // Pastikan hanya data yang peserta_magang_id-nya sesuai dengan ID user yang sedang login
          const myAttendances = absData.data.filter(
            (a: any) =>
              String(a.peserta_magang_id || a.pesertaMagangId) ===
              String(targetUserId),
          );
          setUserAttendances(myAttendances);
        } else {
          setUserAttendances([]);
        }
      } else {
        setUserAttendances([]);
      }
    } catch (err) {
      console.error("Gagal memuat data presensi magang:", err);
      setUserAttendances([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const fetchTugas = useCallback(async () => {
    let targetUserId = currentUserId;
    if (!targetUserId && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hadirin_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          targetUserId = parsed.id || "";
        }
      } catch (e) {
        console.error("Error reading saved user:", e);
      }
    }

    if (!targetUserId) {
      setIsLoadingTugas(false);
      return;
    }

    try {
      setIsLoadingTugas(true);
      const res = await fetch(
        `/api/tugas?peserta_magang_id=${encodeURIComponent(targetUserId)}`,
        { cache: "no-store" },
      );

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTugasList(json.data);
        } else {
          setTugasList([]);
        }
      } else {
        setTugasList([]);
      }
    } catch (err) {
      console.error("Gagal memuat data tugas magang:", err);
      setTugasList([]);
    } finally {
      setIsLoadingTugas(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAttendance();
    fetchTugas();
  }, [fetchAttendance, fetchTugas]);

  const userName = user?.nama || user?.name || "Peserta";

  const institution = user?.sekolah_kampus || user?.institution || "—";

  const unitKerja = user?.unit_kerja || user?.studyProgram || "—";

  const startDate = user?.periode_mulai || user?.startDate || "-";

  const endDate = user?.periode_selesai || user?.endDate || "-";

  const todayRecord = userAttendances.find((a) => {
    const rawTgl = String(
      a.tanggal || a.attendanceDate || a.created_at || "",
    ).slice(0, 10);
    if (!rawTgl) return false;
    if (rawTgl === todayStr) return true;
    if (rawTgl.split("-").reverse().join("-") === todayStr) return true;
    return false;
  });

  const isRecordLate = (a: Absensi) =>
    String(a.status_masuk || a.statusMasuk || "").toUpperCase() ===
      "TERLAMBAT" ||
    String(a.status || "").toUpperCase() === "TERLAMBAT" ||
    Number(a.menit_terlambat ?? a.lateMinutes ?? 0) > 0;

  const hadirCount = userAttendances.filter((a) => {
    const st = String(a.status || "").toUpperCase();
    if (st === "IZIN" || st === "SAKIT" || st === "ALPA") return false;
    return (st === "HADIR" || st === "TEPAT_WAKTU") && !isRecordLate(a);
  }).length;

  const terlambatCount = userAttendances.filter((a) => {
    const st = String(a.status || "").toUpperCase();
    if (st === "IZIN" || st === "SAKIT" || st === "ALPA") return false;
    return isRecordLate(a);
  }).length;

  const izinCount = userAttendances.filter((a) => {
    const st = String(a.status || "").toUpperCase();
    return st === "IZIN" || st === "SAKIT";
  }).length;

  const alpaCount = userAttendances.filter(
    (a) => String(a.status || "").toUpperCase() === "ALPA",
  ).length;

  const pulangCepatCount = userAttendances.filter((a) => {
    const stPulang = String(
      a.status_pulang || a.statusPulang || "",
    ).toUpperCase();
    return stPulang === "PULANG_CEPAT";
  }).length;

  const formatDate = (date?: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(parsed);
  };

  const statusLabel = todayRecord
    ? String(todayRecord.status || "").toUpperCase() === "HADIR"
      ? String(
          todayRecord.status_masuk || todayRecord.statusMasuk || "",
        ).toUpperCase() === "TERLAMBAT"
        ? "Terlambat"
        : String(
              todayRecord.status_pulang || todayRecord.statusPulang || "",
            ).toUpperCase() === "PULANG_CEPAT"
          ? "Pulang Cepat"
          : "Hadir"
      : String(todayRecord.status || "").toUpperCase() === "IZIN"
        ? "Izin"
        : String(todayRecord.status || "").toUpperCase() === "SAKIT"
          ? "Sakit"
          : String(todayRecord.status || "").toUpperCase() === "ALPA"
            ? "Tanpa Keterangan"
            : todayRecord.status || "Hadir"
    : "Belum Absen";

  const getStatusClass = (input?: Absensi | string | null) => {
    if (!input) return "text-muted-foreground bg-muted border-border";

    let sMasuk = "";
    let sPulang = "";
    let sUtama = "";

    if (typeof input === "string") {
      sUtama = input.toUpperCase();
    } else {
      sMasuk = String(
        input.status_masuk || input.statusMasuk || "",
      ).toUpperCase();
      sPulang = String(
        input.status_pulang || input.statusPulang || "",
      ).toUpperCase();
      sUtama = String(input.status || "").toUpperCase();
    }

    if (sUtama === "ALPA")
      return "text-status-alpa bg-status-alpa/10 border-status-alpa/20";

    if (
      sMasuk === "TERLAMBAT" ||
      sUtama === "TERLAMBAT" ||
      sPulang === "PULANG_CEPAT"
    )
      return "text-status-terlambat bg-status-terlambat/10 border-status-terlambat/20";

    if (sUtama === "HADIR" || sUtama === "TEPAT_WAKTU")
      return "text-status-hadir bg-status-hadir/10 border-status-hadir/20";

    if (sUtama === "IZIN")
      return "text-status-izin bg-status-izin/10 border-status-izin/20";

    if (sUtama === "SAKIT")
      return "text-status-sakit bg-status-sakit/10 border-status-sakit/20";

    return "text-muted-foreground bg-muted border-border";
  };

  const isEarlyCheckout = () => {
    const now = new Date();

    const [hour, minute] = JAM_PULANG_NORMAL.split(":").map(Number);

    const normalCheckoutTime = new Date();

    normalCheckoutTime.setHours(hour, minute, 0, 0);

    return now < normalCheckoutTime;
  };

  const handleStartCheckout = () => {
    if (isEarlyCheckout()) {
      setShowEarlyCheckoutForm(true);
      return;
    }

    setActiveTab("CAPTURE_OUT");
  };

  const handleSubmitEarlyCheckout = () => {
    if (!alasanPulangCepat.trim()) {
      showNotification({ type: "warning", message: "Alasan pulang cepat wajib diisi." });
      return;
    }

    setShowEarlyCheckoutForm(false);
    setActiveTab("CAPTURE_OUT");
  };

  const getEffectiveUserId = () => {
    let uid = user?.id;
    if (!uid && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hadirin_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          uid = parsed.id;
        }
      } catch (e) {}
    }
    return uid;
  };

  const handleCaptureIn = async (photoDataUrl: string) => {
    try {
      const uid = getEffectiveUserId();
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          peserta_magang_id: uid,
          photo: photoDataUrl,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showNotification({ type: "success", message: data.message || "Berhasil melakukan absen masuk." });
        setActiveTab("IDLE");
        setPreviewType("MASUK");
        setPreviewRecord(data.record);
        fetchAttendance();
      } else {
        showNotification({ type: "error", message: data.message || "Gagal melakukan absen masuk." });
      }
    } catch (err) {
      console.error(err);
      showNotification({ type: "error", message: "Gagal menyimpan presensi." });
    }
  };

  const handleCaptureOut = async (photoDataUrl: string) => {
    try {
      setIsSubmittingCheckout(true);

      const earlyCheckout = isEarlyCheckout();
      const uid = getEffectiveUserId();

      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          peserta_magang_id: uid,
          photo: photoDataUrl,

          // Data pulang cepat
          status: earlyCheckout ? "pulang_cepat" : "hadir",

          alasan_pulang_cepat: earlyCheckout ? alasanPulangCepat.trim() : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showNotification({ type: "success", message: data.message || "Berhasil melakukan absen pulang." });

        setActiveTab("IDLE");

        setPreviewType("PULANG");
        setPreviewRecord(data.record);

        // Reset form
        setAlasanPulangCepat("");
        setShowEarlyCheckoutForm(false);
        fetchAttendance();
      } else {
        showNotification({ type: "error", message: data.message || "Gagal melakukan absen pulang." });
      }
    } catch (err) {
      console.error(err);
      showNotification({ type: "error", message: "Gagal melakukan absen pulang." });
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ServerClock />

        {showEarlyCheckoutForm && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-terlambat/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-status-terlambat" />
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-foreground">
                    Pengajuan Pulang Cepat
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Kamu melakukan absen pulang sebelum jam{" "}
                    <span className="font-bold text-foreground">
                      {JAM_PULANG_NORMAL}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEarlyCheckoutForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Alasan Pulang Cepat */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Alasan Pulang Cepat
                </label>

                <textarea
                  value={alasanPulangCepat}
                  onChange={(e) => setAlasanPulangCepat(e.target.value)}
                  placeholder="Contoh: Ada keperluan keluarga yang tidak dapat ditinggalkan..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-3 text-xs font-medium outline-none resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Info */}
              <div className="rounded-xl bg-muted/50 border border-border p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Data alasan pulang cepat akan dicatat bersama presensi hari
                  ini.
                </p>
              </div>

              {/* Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEarlyCheckoutForm(false);
                    setAlasanPulangCepat("");
                  }}
                  className="rounded-xl border border-border bg-card text-foreground px-4 py-3 text-sm font-extrabold hover:bg-muted transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSubmitEarlyCheckout}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-extrabold hover:opacity-90 transition cursor-pointer"
                >
                  Lanjut Absen Pulang
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CAPTURE_IN" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setActiveTab("IDLE")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              ← Batal & Kembali ke Dashboard
            </button>

            <CameraCapture title="Absen Masuk" onCapture={handleCaptureIn} />
          </div>
        ) : activeTab === "CAPTURE_OUT" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setActiveTab("IDLE")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              ← Batal & Kembali ke Dashboard
            </button>

            <CameraCapture
              title={
                isEarlyCheckout()
                  ? "Absen Pulang Cepat (Swafoto Kamera)"
                  : "Absen Pulang (Swafoto Kamera)"
              }
              onCapture={handleCaptureOut}
            />
          </div>
        ) : (
          <section className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-primary" />

                <div>
                  <h3 className="font-extrabold text-sm text-foreground">
                    Presensi Hari Ini
                  </h3>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(todayStr)}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black border ${getStatusClass(
                  todayRecord,
                )}`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <LogIn className="w-4 h-4" />

                    <span className="text-xs font-bold">Jam Masuk</span>
                  </div>

                  <p className="text-2xl font-black text-foreground">
                    {todayRecord?.jam_masuk ||
                      todayRecord?.jamMasuk ||
                      todayRecord?.checkIn ||
                      "--:--"}
                  </p>

                  {String(
                    todayRecord?.status_masuk || todayRecord?.statusMasuk || "",
                  ).toUpperCase() === "TEPAT_WAKTU" && (
                    <p className="text-[10px] font-bold text-status-hadir mt-1">
                      Tepat waktu
                    </p>
                  )}

                  {String(
                    todayRecord?.status_masuk || todayRecord?.statusMasuk || "",
                  ).toUpperCase() === "TERLAMBAT" && (
                    <p className="text-[10px] font-bold text-status-terlambat mt-1">
                      Terlambat{" "}
                      {formatLateDuration(
                        todayRecord?.menit_terlambat ||
                          todayRecord?.lateMinutes ||
                          0,
                      )}
                    </p>
                  )}
                </div>

                {/* Button masuk di dalam card */}
                {!todayRecord?.jam_masuk &&
                !todayRecord?.jamMasuk &&
                !todayRecord?.checkIn ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("CAPTURE_IN")}
                    className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Absen Masuk
                  </button>
                ) : (
                  <div className="rounded-xl bg-muted border border-border p-3 text-center text-xs font-bold text-muted-foreground">
                    Absen masuk sudah dilakukan
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <LogOut className="w-4 h-4" />

                    <span className="text-xs font-bold">Jam Pulang</span>
                  </div>

                  <p className="text-2xl font-black text-foreground">
                    {todayRecord?.jam_keluar ||
                      todayRecord?.jam_pulang ||
                      todayRecord?.jamKeluar ||
                      todayRecord?.checkOut ||
                      "--:--"}
                  </p>

                  {/* Status pulang */}
                  {(todayRecord?.jam_keluar ||
                    todayRecord?.jam_pulang ||
                    todayRecord?.jamKeluar ||
                    todayRecord?.checkOut) &&
                    (String(
                      todayRecord?.status_pulang ||
                        todayRecord?.statusPulang ||
                        "",
                    ).toUpperCase() === "PULANG_CEPAT" ? (
                      <p className="text-[10px] font-bold text-status-terlambat mt-1">
                        Pulang cepat
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-status-hadir mt-1">
                        Pulang normal
                      </p>
                    ))}
                </div>

                {/* Button pulang di dalam card */}

                {(todayRecord?.jam_masuk ||
                  todayRecord?.jamMasuk ||
                  todayRecord?.checkIn) &&
                !todayRecord?.jam_keluar &&
                !todayRecord?.jam_pulang &&
                !todayRecord?.jamKeluar &&
                !todayRecord?.checkOut ? (
                  <button
                    type="button"
                    onClick={handleStartCheckout}
                    disabled={isSubmittingCheckout}
                    className="w-full rounded-xl border border-border bg-card text-foreground px-4 py-3 text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-muted transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4" />

                    {isSubmittingCheckout
                      ? "Memproses..."
                      : isEarlyCheckout()
                        ? "Absen Pulang Cepat"
                        : "Absen Pulang"}
                  </button>
                ) : todayRecord?.jam_keluar ||
                  todayRecord?.jam_pulang ||
                  todayRecord?.jamKeluar ||
                  todayRecord?.checkOut ? (
                  <div className="rounded-xl bg-muted border border-border p-3 text-center text-xs font-bold text-muted-foreground">
                    {String(
                      todayRecord?.status_pulang ||
                        todayRecord?.statusPulang ||
                        "",
                    ).toUpperCase() === "PULANG_CEPAT"
                      ? "Pulang cepat sudah dicatat"
                      : "Absen pulang sudah dilakukan"}
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted border border-border p-3 text-center text-xs font-bold text-muted-foreground">
                    Absen masuk terlebih dahulu
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                DETAIL PULANG CEPAT
            ================================================== */}

            {String(todayRecord?.status_pulang || "").toUpperCase() ===
              "PULANG_CEPAT" && (
              <div className="rounded-xl border border-status-terlambat/30 bg-status-terlambat/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-terlambat" />

                  <h4 className="text-xs font-extrabold text-foreground">
                    Detail Pulang Cepat
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground">
                      Alasan:
                    </span>

                    <p className="mt-1 text-foreground">
                      {(() => {
                        const ket = (todayRecord as any)?.keterangan || "";
                        const match = ket.match(
                          /Alasan Pulang Cepat:\s*([^|]+)/,
                        );
                        return match
                          ? match[1].trim()
                          : (todayRecord as any)?.alasan_pulang_cepat ||
                              "Tidak ada alasan";
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {!isLoadingTugas &&
          tugasList.filter(
            (task) =>
              (task.status_pengerjaan || "BELUM_DIKERJAKAN") ===
              "BELUM_DIKERJAKAN",
          ).length > 0 && (
            <Alert className="border-primary/30 bg-primary/5 text-foreground shadow-card">
              <Briefcase className="text-primary mt-1" />

              <div className="col-start-2 flex-1 space-y-3">
                <div>
                  <AlertTitle className="text-sm font-extrabold text-foreground">
                    Ada Tugas Baru
                  </AlertTitle>

                  <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                    Kamu memiliki{" "}
                    <span className="font-bold text-primary">
                      {
                        tugasList.filter(
                          (task) =>
                            (task.status_pengerjaan || "BELUM_DIKERJAKAN") ===
                            "BELUM_DIKERJAKAN",
                        ).length
                      }{" "}
                      tugas
                    </span>{" "}
                    yang perlu dikerjakan.
                  </AlertDescription>
                </div>

                {/* Daftar tugas yang belum dikerjakan */}
                <div className="space-y-2">
                  {tugasList
                    .filter(
                      (task) =>
                        (task.status_pengerjaan || "BELUM_DIKERJAKAN") ===
                        "BELUM_DIKERJAKAN",
                    )
                    .map((task) => {
                      const katLabel = task.kategori || "Umum";
                      const isUpdating = updatingTugasId === task.id;

                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-3 bg-card border border-border/80 rounded-xl px-3 py-2.5"
                        >
                          {/* Kategori + Judul */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getKategoriBadgeClass(
                                katLabel,
                              )}`}
                            >
                              {getKategoriIcon(katLabel)}

                              <span className="capitalize">{katLabel}</span>
                            </span>

                            <span className="text-xs font-extrabold text-foreground truncate">
                              {task.judul_tugas || task.judulTugas || "—"}
                            </span>
                          </div>

                          {/* Tombol selesai */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatusTugas(task.id, "SELESAI")
                            }
                            disabled={isUpdating}
                            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isUpdating ? (
                              <Spinner size="sm" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Alert>
          )}

        {previewRecord && (
          <PhotoModal
            isOpen={Boolean(previewRecord)}
            onClose={() => setPreviewRecord(null)}
            title={
              previewType === "PULANG"
                ? String(
                    previewRecord.status_pulang ||
                      previewRecord.statusPulang ||
                      "",
                  ).toUpperCase() === "PULANG_CEPAT"
                  ? "Bukti Presensi Swafoto Pulang Cepat"
                  : "Bukti Presensi Swafoto Pulang"
                : "Bukti Presensi Swafoto Masuk"
            }
            fotoMasuk={
              previewRecord.foto_masuk ||
              previewRecord.fotoMasuk ||
              previewRecord.checkInPhoto ||
              null
            }
            fotoPulang={
              previewRecord.foto_keluar ||
              previewRecord.fotoKeluar ||
              previewRecord.checkOutPhoto ||
              previewRecord.foto_pulang_cepat ||
              previewRecord.fotoPulangCepat ||
              previewRecord.foto_pulang ||
              previewRecord.fotoPulang ||
              null
            }
            photoUrl={
              previewType === "PULANG"
                ? previewRecord.foto_keluar ||
                  previewRecord.fotoKeluar ||
                  previewRecord.checkOutPhoto ||
                  previewRecord.foto_pulang_cepat ||
                  previewRecord.fotoPulangCepat ||
                  previewRecord.foto_pulang ||
                  previewRecord.fotoPulang ||
                  null
                : previewRecord.foto_masuk ||
                  previewRecord.fotoMasuk ||
                  previewRecord.checkInPhoto ||
                  null
            }
            jamMasuk={
              previewRecord.jam_masuk ||
              previewRecord.jamMasuk ||
              previewRecord.checkIn ||
              null
            }
            jamPulang={
              previewRecord.jam_keluar ||
              previewRecord.jamKeluar ||
              previewRecord.jam_pulang ||
              previewRecord.jamPulang ||
              previewRecord.checkOut ||
              null
            }
            initialType={previewType}
            userName={
              previewRecord.user_nama ||
              previewRecord.userName ||
              user?.nama ||
              user?.name ||
              "User"
            }
            userRole={
              previewRecord.user_role ||
              previewRecord.userRole ||
              user?.role ||
              "ANAK_MAGANG"
            }
            attendanceDate={
              previewRecord.tanggal || previewRecord.attendanceDate || todayStr
            }
            time={
              previewType === "PULANG"
                ? previewRecord.jam_keluar ||
                  previewRecord.jamKeluar ||
                  previewRecord.jam_pulang ||
                  previewRecord.jamPulang ||
                  previewRecord.checkOut ||
                  "--:--"
                : previewRecord.jam_masuk ||
                  previewRecord.jamMasuk ||
                  previewRecord.checkIn ||
                  "--:--"
            }
            status={
              previewType === "PULANG"
                ? String(
                    previewRecord.status_pulang ||
                      previewRecord.statusPulang ||
                      "",
                  ).toUpperCase() === "PULANG_CEPAT"
                  ? "PULANG_CEPAT"
                  : "TEPAT_WAKTU"
                : previewRecord.status_masuk ||
                  previewRecord.statusMasuk ||
                  previewRecord.status ||
                  "HADIR"
            }
            lateMinutes={
              previewType === "MASUK"
                ? previewRecord.menit_terlambat ||
                  previewRecord.lateMinutes ||
                  0
                : 0
            }
          />
        )}

        <div
          className={`grid grid-cols-2 sm:grid-cols-3 ${
            pulangCepatCount > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"
          } gap-3`}
        >
          {/* Hadir */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-hadir uppercase tracking-wider">
                Hadir
              </span>
              <CheckCircle2 className="w-4 h-4 text-status-hadir" />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-hadir">
                {hadirCount}
              </p>
            )}
            <p className="text-[10px] font-semibold text-muted-foreground">
              Total Hadir
            </p>
          </div>

          {/* Terlambat */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-terlambat uppercase tracking-wider">
                Terlambat
              </span>
              <Clock3 className="w-4 h-4 text-status-terlambat" />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-terlambat">
                {terlambatCount}
              </p>
            )}
            <p className="text-[10px] font-semibold text-muted-foreground">
              Total Terlambatan
            </p>
          </div>

          {/* Izin */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-izin uppercase tracking-wider">
                Izin
              </span>
              <CalendarDays className="w-4 h-4 text-status-izin" />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-izin">
                {izinCount}
              </p>
            )}
            <p className="text-[10px] font-semibold text-muted-foreground">
              Total Izin
            </p>
          </div>

          {/* Tanpa Keterangan */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-status-alpa uppercase tracking-wider">
                Tanpa Ket.
              </span>
              <XCircle className="w-4 h-4 text-status-alpa" />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-status-alpa">
                {alpaCount}
              </p>
            )}
            <p className="text-[10px] font-semibold text-muted-foreground">
              Total Tanpa Keterangan
            </p>
          </div>

          {/* Pulang Cepat */}
          {pulangCepatCount > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-status-terlambat uppercase tracking-wider">
                  Pulang Cepat
                </span>
                <AlertTriangle className="w-4 h-4 text-status-terlambat" />
              </div>
              {isLoading ? (
                <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
              ) : (
                <p className="text-2xl font-black text-status-terlambat">
                  {pulangCepatCount}
                </p>
              )}
              <p className="text-[10px] font-semibold text-muted-foreground">
                Total pulang cepat
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}