"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

export default function AdminRolesPage() {
  const roles = [
    { name: "Super Admin", code: "SUPERADMIN", desc: "Akses penuh seluruh fitur sistem SiPresma" },
    { name: "Admin Magang", code: "ADMIN_MAGANG", desc: "Pengelolaan data anak magang, izin & pendaftaran" },
    { name: "Admin OS", code: "ADMIN_OS", desc: "Pengelolaan pegawai OS, izin & rekap OS" },
    { name: "Anak Magang", code: "ANAK_MAGANG", desc: "Absensi kamera, izin, riwayat & jobdesk magang" },
    { name: "Karyawan OS", code: "KARYAWAN_OS", desc: "Absensi kamera, izin, riwayat pegawai OS" }
  ];

  const features = [
    { name: "Beranda Dashboard", key: "dashboard" },
    { name: "Pendaftaran Magang", key: "pendaftaran" },
    { name: "Manajemen Anak Magang", key: "magang" },
    { name: "Manajemen Pegawai OS", key: "os" },
    { name: "Manajemen & Pengajuan Izin", key: "izin" },
    { name: "Rekap Kehadiran Laporan", key: "rekap" },
    { name: "Presensi Kamera & Server Time", key: "presensi" },
    { name: "Jobdesk Magang", key: "jobdesk" },
    { name: "Pengaturan Jam & Sistem", key: "settings" }
  ];

  const hasAccess = (roleCode: string, featureKey: string) => {
    if (roleCode === "SUPER_ADMIN" || roleCode === "SUPERADMIN") return true;
    if (roleCode === "ADMIN_MAGANG") {
      return ["dashboard", "pendaftaran", "magang", "izin", "rekap", "jobdesk"].includes(featureKey);
    }
    if (roleCode === "ADMIN_OS") {
      return ["dashboard", "os", "izin", "rekap"].includes(featureKey);
    }
    if (roleCode === "ANAK_MAGANG" || roleCode === "MAGANG") {
      return ["dashboard", "presensi", "izin", "jobdesk"].includes(featureKey);
    }
    if (roleCode === "PEGAWAI_OS" || roleCode === "KARYAWAN_OS") {
      return ["dashboard", "presensi", "izin"].includes(featureKey);
    }
    return false;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Manajemen Role & Hak Akses (RBAC)
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Matriks permission hak akses fitur berdasarkan 5 peran pengguna SiPresma
          </p>
        </div>

        {/* Roles List Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.code} className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-foreground">{r.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary">
                  {r.code}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Permission Matrix Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border font-bold text-sm text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Matriks Permisi Hak Akses</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="bg-input/60 border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Fitur Sistem</th>
                  {roles.map((r) => (
                    <th key={r.code} className="py-3 px-4 text-center">{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {features.map((f) => (
                  <tr key={f.key} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">{f.name}</td>
                    {roles.map((r) => {
                      const allowed = hasAccess(r.code, f.key);
                      return (
                        <td key={r.code} className="py-3.5 px-4 text-center">
                          {allowed ? (
                            <CheckCircle2 className="w-5 h-5 text-primary mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
