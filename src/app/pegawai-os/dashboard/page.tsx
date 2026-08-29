"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ServerClock } from "@/components/ui/ServerClock";
import { CameraCapture } from "@/components/attendance/CameraCapture";
import { PhotoModal } from "@/components/attendance/PhotoModal";
import { Alert, AlertModal } from "@/components/ui/Alert";
import { Info as InfoIcon } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/context";
import { Absensi } from "@/types";
import { CheckCircle2, History, FileCheck } from "lucide-react";
import Link from "next/link";

function DashboardGreeting({
  userName,
  userRole,
  subtitle,
}: {
  userName: string;
  userRole: string;
  subtitle: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl md:text-2xl font-black text-foreground">
          Selamat Datang, {userName}! 👋
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground w-fit shadow-card">
        {userRole}
      </span>
    </div>
  );
}

function TodayAttendanceCard({
  todayRecord,
  title,
  subtitle,
  onOpenCheckIn,
  onOpenCheckOut,
}: {
  todayRecord?: Absensi | null;
  title: string;
  subtitle: string;
  onOpenCheckIn: () => void;
  onOpenCheckOut: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
      <div>
        <h3 className="text-[16px] font-black text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground">Absen Masuk</span>
          <p className="text-lg font-black text-foreground">
            {todayRecord?.jam_masuk || "--:--"}
          </p>
          {!todayRecord?.jam_masuk && (
            <button
              onClick={onOpenCheckIn}
              className="w-full py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-95 shadow-card"
            >
              Ambil Presensi Masuk
            </button>
          )}
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground">Absen Pulang</span>
          <p className="text-lg font-black text-foreground">
            {todayRecord?.jam_pulang || "--:--"}
          </p>
          {todayRecord?.jam_masuk && !todayRecord?.jam_pulang && (
            <button
              onClick={onOpenCheckOut}
              className="w-full py-2 px-3 rounded-xl bg-secondary border border-border text-foreground text-xs font-black hover:bg-accent"
            >
              Ambil Presensi Pulang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PegawaiOsDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"IDLE" | "CAPTURE_IN" | "CAPTURE_OUT">("IDLE");
  const [previewRecord, setPreviewRecord] = useState<Absensi | null>(null);
  const [previewType, setPreviewType] = useState<"MASUK" | "PULANG">("MASUK");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<Absensi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );

  const todayIDStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date()).replace(/\//g, "-");

  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/absensi?karyawan_os_id=${user.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const found = data.data.find((a: Absensi) => {
          const tgl = a.tanggal || a.attendanceDate;
          return tgl === todayStr || tgl === todayIDStr;
        });
        setTodayRecord(found || null);
      }
    } catch (err) {
      console.error("Gagal mengambil data absensi hari ini:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, todayStr, todayIDStr]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  const [alertInfo, setAlertInfo] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    color: "red" | "green" | "blue" | "yellow";
  }>({
    isOpen: false,
    title: "",
    message: "",
    color: "red",
  });

  const showAlert = (message: string, title = "Peringatan", color: "red" | "green" | "blue" | "yellow" = "red") => {
    setAlertInfo({
      isOpen: true,
      title,
      message,
      color,
    });
  };

  const handleCaptureIn = async (photoDataUrl: string) => {
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          karyawan_os_id: user?.id,
          photo: photoDataUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMsg(data.message);
        setActiveTab("IDLE");
        setPreviewType("MASUK");
        setPreviewRecord(data.record);
        fetchTodayAttendance();
      } else {
        showAlert(data.message || "Gagal melakukan presensi masuk.", "Gagal Presensi", "red");
      }
    } catch (err) {
      console.error(err);
      showAlert("Gagal melakukan absen masuk. Silakan periksa koneksi Anda.", "Gagal Presensi", "red");
    }
  };

  const handleCaptureOut = async (photoDataUrl: string) => {
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          karyawan_os_id: user?.id,
          photo: photoDataUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMsg(data.message);
        setActiveTab("IDLE");
        setPreviewType("PULANG");
        setPreviewRecord(data.record);
        fetchTodayAttendance();
      } else {
        showAlert(data.message || "Gagal melakukan presensi pulang.", "Gagal Presensi", "red");
      }
    } catch (err) {
      console.error(err);
      showAlert("Gagal melakukan absen pulang. Silakan periksa koneksi Anda.", "Gagal Presensi", "red");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <AlertModal
          isOpen={alertInfo.isOpen}
          title={alertInfo.title}
          message={alertInfo.message}
          color={alertInfo.color}
          onClose={() => setAlertInfo((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* 1. Header Greeting */}
        <DashboardGreeting
          userName={user?.nama || user?.name || "Pegawai"}
          userRole={user?.role || "PEGAWAI_OS"}
          subtitle={`${user?.sekolah_kampus || user?.institution || "Perusahaan"} • ${
            user?.unit_kerja || user?.studyProgram || "Tenaga OS"
          }`}
        />

        {/* Toast Alert */}
        {toastMsg && (
          <Alert
            variant="light"
            color="green"
            title="Berhasil"
            withCloseButton
            onClose={() => setToastMsg(null)}
          >
            {toastMsg}
          </Alert>
        )}

        {/* 2. Server Clock */}
        <ServerClock />

        {/* 3. Today Attendance Card */}
        {activeTab === "CAPTURE_IN" ? (
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab("IDLE")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              ← Batal & Kembali ke Dashboard
            </button>
            <CameraCapture
              title="Absen Masuk (Tenaga OS)"
              onCapture={handleCaptureIn}
            />
          </div>
        ) : activeTab === "CAPTURE_OUT" ? (
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab("IDLE")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              ← Batal & Kembali ke Dashboard
            </button>
            <CameraCapture
              title="Absen Pulang (Tenaga OS)"
              onCapture={handleCaptureOut}
            />
          </div>
        ) : (
          <TodayAttendanceCard
            todayRecord={todayRecord}
            title="Status Kehadiran Hari Ini"
            subtitle="Catatan presensi otomatis terverifikasi waktu server"
            onOpenCheckIn={() => setActiveTab("CAPTURE_IN")}
            onOpenCheckOut={() => setActiveTab("CAPTURE_OUT")}
          />
        )}

        {/* 4. Quick Action Cards */}
        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/pegawai-os/riwayat"
            className="bg-card border border-border rounded-2xl p-5 shadow-card hover:border-primary transition-all space-y-2 block group"
          >
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit group-hover:scale-110 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-foreground">
              Riwayat Presensi OS
            </h4>
            <p className="text-xs text-muted-foreground font-medium">
              Lihat riwayat kehadiran lengkap per bulan
            </p>
          </Link>
        </div>

        {/* 5. Photo Proof Lightbox Modal */}
        {previewRecord && (
          <PhotoModal
            isOpen={Boolean(previewRecord)}
            onClose={() => setPreviewRecord(null)}
            title={
              previewType === "PULANG"
                ? String(previewRecord.status_pulang || previewRecord.statusPulang || "").toUpperCase() === "PULANG_CEPAT"
                  ? "Bukti Presensi Swafoto Pulang Cepat"
                  : "Bukti Presensi Swafoto Pulang OS"
                : "Bukti Presensi Swafoto Masuk OS"
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
            userRole={previewRecord.user_role || "KARYAWAN_OS"}
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
                ? String(previewRecord.status_pulang || previewRecord.statusPulang || "").toUpperCase() === "PULANG_CEPAT"
                  ? "PULANG_CEPAT"
                  : "TEPAT_WAKTU"
                : previewRecord.status_masuk ||
                  previewRecord.statusMasuk ||
                  previewRecord.status ||
                  "HADIR"
            }
            lateMinutes={
              previewType === "MASUK"
                ? previewRecord.menit_terlambat || previewRecord.lateMinutes || 0
                : 0
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}
