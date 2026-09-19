"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PhotoModal } from "@/components/attendance/PhotoModal";
import { useAuth } from "@/lib/auth/context";

import { Absensi, LogBook, TugasItem } from "@/types";

import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  XCircle,
  Eye,
  Search,
  BookOpen,
  Briefcase,
  Calendar,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

import { Statiska } from "@/components/ui/Statiska";
import { Kedisiplinan } from "@/components/ui/Kedisplinan";
import { formatLateDuration } from "@/lib/attendance-utils";

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return "—";

  const d = new Date(dateStr);

  if (isNaN(d.getTime())) return dateStr;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function formatWaktu(timeStr?: string | null): string {
  if (!timeStr) return "—";

  return timeStr.slice(0, 5);
}


export default function AdminDashboardPage() {
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);

  const [selectedPhotoRecord, setSelectedPhotoRecord] =
    useState<Absensi | null>(null);

  const [roleFilter, setRoleFilter] =
    useState<string>("ALL");

  const [searchQuery, setSearchQuery] =
    useState<string>("");

  const [absensiList, setAbsensiList] =
    useState<Absensi[]>([]);

  const [logbookList, setLogbookList] =
    useState<LogBook[]>([]);

  const [tugasList, setTugasList] =
    useState<TugasItem[]>([]);

  const [infoFilterTab, setInfoFilterTab] =
    useState<"ALL" | "LOGBOOK" | "TUGAS">("ALL");

  const [totalMagang, setTotalMagang] =
    useState(0);

  const [totalOS, setTotalOS] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const role = String(
    user?.role || "SUPERADMIN"
  ).toUpperCase();

  const isSuperAdmin =
    role === "SUPERADMIN" ||
    role === "SUPER_ADMIN";

  const isAdminMagang =
    role === "ADMIN_MAGANG";

  const isAdminOS =
    role === "ADMIN_OS";

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [
        absRes,
        magangRes,
        osRes,
        logbookRes,
        jobdeskRes,
      ] = await Promise.all([
        fetch("/api/absensi", {
          cache: "no-store",
        }),

        fetch("/api/users/peserta_magang", {
          cache: "no-store",
        }),

        fetch("/api/users/karyawan_os", {
          cache: "no-store",
        }),

        fetch("/api/log-book", {
          cache: "no-store",
        }),

        fetch("/api/tugas", {
          cache: "no-store",
        }),
      ]);

      if (absRes.ok) {
        const absData = await absRes.json();

        if (
          absData.success &&
          Array.isArray(absData.data)
        ) {
          setAbsensiList(absData.data);
        } else {
          setAbsensiList([]);
        }
      } else {
        setAbsensiList([]);
      }

      if (logbookRes.ok) {
        const lbData = await logbookRes.json();

        if (
          lbData.success &&
          Array.isArray(lbData.data)
        ) {
          setLogbookList(lbData.data);
        } else {
          setLogbookList([]);
        }
      } else {
        setLogbookList([]);
      }

      if (jobdeskRes.ok) {
        const jdData = await jobdeskRes.json();

        if (
          jdData.success &&
          Array.isArray(jdData.data)
        ) {
          setTugasList(jdData.data);
        } else {
          setTugasList([]);
        }
      } else {
        setTugasList([]);
      }

      let countMagang = 0;
      if (magangRes.ok) {
        const magangData = await magangRes.json();
        if (magangData.success && Array.isArray(magangData.data)) {
          countMagang = magangData.data.filter(
            (u: any) => u.status === "ACTIVE" || !u.status
          ).length;
        }
      }
      setTotalMagang(countMagang);

      let countOS = 0;
      if (osRes.ok) {
        const osData = await osRes.json();
        if (osData.success && Array.isArray(osData.data)) {
          countOS = osData.data.filter(
            (u: any) => u.status === "ACTIVE" || !u.status
          ).length;
        }
      }
      setTotalOS(countOS);
    } catch (err) {
      console.error(
        "Gagal memuat data dashboard admin:",
        err
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    fetchData();
  }, [mounted, role]);

  const todayStr = mounted
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
        .format(new Date())
        .replace(/\//g, "-")
    : "";

  const todayISOStr = mounted
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
      }).format(new Date())
    : "";

  const baseAbsensiList =
    absensiList.filter((a) => {
      const userRole =
        a.user_role ||
        a.userRole ||
        "";

      if (isAdminMagang) {
        return userRole === "ANAK_MAGANG";
      }

      if (isAdminOS) {
        return userRole === "KARYAWAN_OS";
      }

      return true;
    });

  const todayAbsensi =
    baseAbsensiList.filter((a) => {
      const tgl =
        a.tanggal ||
        a.attendanceDate ||
        "";

      return (
        tgl === todayStr ||
        tgl === todayISOStr ||
        (
          tgl &&
          todayISOStr &&
          tgl.slice(0, 10) === todayISOStr
        ) ||
        (
          tgl &&
          todayStr &&
          tgl.slice(0, 10) === todayStr
        )
      );
    });

  const hadirHariIni =
    todayAbsensi.filter((a) => {
      const status = String(
        a.status || ""
      ).toUpperCase();

      const statusMasuk = String(
        a.status_masuk ||
          a.statusMasuk ||
          ""
      ).toUpperCase();

      const jamMasuk = String(
        a.jam_masuk ||
          a.checkIn ||
          ""
      ).slice(0, 8);

      if (
        status === "IZIN" ||
        status === "SAKIT" ||
        status === "ALPA"
      ) {
        return false;
      }

      if (
        statusMasuk === "TERLAMBAT" ||
        status === "TERLAMBAT"
      ) {
        return false;
      }

      return (
        status === "HADIR" ||
        statusMasuk === "TEPAT_WAKTU" ||
        (
          jamMasuk !== "" &&
          jamMasuk <= "07:31:00"
        )
      );
    }).length;

  const terlambatHariIni =
    todayAbsensi.filter((a) => {
      const status = String(
        a.status || ""
      ).toUpperCase();

      const statusMasuk = String(
        a.status_masuk ||
          a.statusMasuk ||
          ""
      ).toUpperCase();

      const jamMasuk = String(
        a.jam_masuk ||
          a.checkIn ||
          ""
      ).slice(0, 8);

      const lateMin = Number(
        a.menit_terlambat ??
          a.lateMinutes ??
          0
      );

      return (
        statusMasuk === "TERLAMBAT" ||
        status === "TERLAMBAT" ||
        lateMin > 0 ||
        (
          jamMasuk !== "" &&
          jamMasuk > "07:31:00"
        )
      );
    }).length;

  const izinSakitHariIni =
    todayAbsensi.filter((a) => {
      const status = String(
        a.status || ""
      ).toUpperCase();

      return (
        status === "IZIN" ||
        status === "SAKIT" ||
        status === "PERMITTED"
      );
    }).length;

  const relevantTotalUsers =
    isAdminMagang
      ? totalMagang
      : isAdminOS
      ? totalOS
      : totalMagang + totalOS;

  const alpaHariIni = Math.max(
    0,
    relevantTotalUsers -
      (
        hadirHariIni +
        terlambatHariIni +
        izinSakitHariIni
      )
  );

  const filteredTodayList =
    todayAbsensi.filter((rec) => {
      const nameStr = (
        rec.user_nama ||
        rec.userName ||
        ""
      ).toLowerCase();

      const instStr = (
        rec.user_sekolah ||
        rec.userInstitution ||
        ""
      ).toLowerCase();

      const matchesSearch =
        nameStr.includes(
          searchQuery.toLowerCase()
        ) ||
        instStr.includes(
          searchQuery.toLowerCase()
        );

      const recRole = String(
        rec.user_role ||
        rec.userRole ||
        ""
      ).toUpperCase();

      const matchesRole =
        roleFilter === "ALL" ||
        (
          roleFilter === "MAGANG" &&
          recRole === "ANAK_MAGANG"
        ) ||
        (
          roleFilter === "OS" &&
          recRole === "KARYAWAN_OS"
        );

      return (
        matchesSearch &&
        matchesRole
      );
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div
          className={`grid gap-3 ${
            isSuperAdmin
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          }`}
        >
          {(isSuperAdmin || isAdminMagang) && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-sans text-primary uppercase tracking-wider">
                  Siswa Magang
                </span>
              </div>

              {isLoading ? (
                <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
              ) : (
                <p className="text-[19px] font-sans text-primary">
                  {totalMagang}
                </p>
              )}

              <span className="text-[10px] font-sans text-muted-foreground">
                Total Siswa Magang
              </span>
            </div>
          )}

          {(isSuperAdmin || isAdminOS) && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-sans text-status-izin uppercase tracking-wider">
                  Karyawan OS
                </span>
              </div>

              {isLoading ? (
                <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
              ) : (
                <p className="text-[19px] font-sans text-status-izin">
                  {totalOS}
                </p>
              )}

              <span className="text-[10px] font-sans text-muted-foreground">
                Total Karyawan OS
              </span>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-sans text-status-hadir uppercase tracking-wider">
                Hadir
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-[19px] font-sans text-status-hadir">
                {hadirHariIni}
              </p>
            )}

            <span className="text-[10px] font-sans text-muted-foreground">
              Total Hadir
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-sans text-status-terlambat uppercase tracking-wider">
                Terlambat
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-[19px] font-sans text-status-terlambat">
                {terlambatHariIni}
              </p>
            )}

            <span className="text-[10px] font-sans text-muted-foreground">
              Total Terlambatan
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-sans text-status-izin uppercase tracking-wider">
                Izin
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-[19px] font-sans text-status-izin">
                {izinSakitHariIni}
              </p>
            )}

            <span className="text-[10px] font-sans text-muted-foreground">
              Total Izin
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-sans text-status-alpa uppercase tracking-wider">
                Tanpa Ket.
              </span>
            </div>

            {isLoading ? (
              <div className="h-8 w-12 bg-muted/60 animate-pulse rounded-lg" />
            ) : (
              <p className="text-[19px] font-sans text-status-alpa">
                {alpaHariIni}
              </p>
            )}

            <span className="text-[10px] font-sans text-muted-foreground">
              Total Tanpa Keterangan
            </span>
          </div>
        </div>

        <Statiska role={role} />

        <Kedisiplinan role={role} />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                Riwayat logbook &amp; tugas terbaru
              </h2>

              <p className="text-xs text-muted-foreground mt-0.5">
                Pantau seluruh catatan aktivitas harian dan progres pengerjaan
                tugas peserta secara real time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setInfoFilterTab("ALL")}
                  className={`px-3 py-1 rounded-lg transition-all font-sans cursor-pointer ${
                    infoFilterTab === "ALL"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua
                </button>

                <button
                  type="button"
                  onClick={() => setInfoFilterTab("LOGBOOK")}
                  className={`px-3 py-1 rounded-lg transition-all font-sans cursor-pointer flex items-center gap-1.5 ${
                    infoFilterTab === "LOGBOOK"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Logbook ({logbookList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInfoFilterTab("TUGAS")}
                  className={`px-3 py-1 rounded-lg transition-all font-sans cursor-pointer flex items-center gap-1.5 ${
                    infoFilterTab === "TUGAS"
                      ? "bg-card text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Tugas ({tugasList.length})</span>
                </button>
              </div>

              {(isSuperAdmin || isAdminMagang) && (
                <Link
                  href="/admin/log-book"
                  className="hidden md:inline-flex items-center gap-1 font-sans px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs"
                >
                  <span>Kelola logbook</span>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(infoFilterTab === "ALL" || infoFilterTab === "LOGBOOK") && (
              <div
                className={`bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card space-y-4 ${
                  infoFilterTab === "LOGBOOK" ? "lg:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="font-bold font-sans text-base text-foreground">
                        Riwayat logbook aktivitas terbaru
                      </h3>

                      <p className="text-[11px] font-sans text-muted-foreground">
                        {logbookList.length} catatan logbook tercatat di sistem
                      </p>
                    </div>
                  </div>

                  {(isSuperAdmin || isAdminMagang) && (
                    <Link
                      href="/admin/log-book"
                      className="text-primary hover:underline text-xs font-sans font-bold inline-flex items-center gap-1"
                    >
                      <span>Lihat Semua</span>

                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <Spinner size="lg" />
                  </div>
                ) : logbookList.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-xs font-sans text-foreground">
                      Tidak ada catatan logbook
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {logbookList.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-muted text-foreground border border-border hover:border-primary/40 hover:bg-input transition-all space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={
                                  item.user_avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    item.user_nama || item.userName || "P",
                                  )}&background=random&bold=true`
                                }
                                alt={item.user_nama || "Avatar"}
                                className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                              />

                              <div className="min-w-0">
                                <h4 className="font-sans text-xs text-foreground truncate">
                                  {item.user_nama ||
                                    item.userName ||
                                    "Peserta Magang"}
                                </h4>

                                <p className="text-[10px] font-sans text-muted-foreground truncate">
                                  {item.user_institution ||
                                    item.user_sekolah ||
                                    "Peserta"}
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 inline-flex font-sans items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-muted-foreground bg-card border border-border">
                              <Calendar className="w-3 h-3 text-primary" />
                              {formatTanggalIndo(item.tanggal)}
                            </span>
                          </div>

                          <p className="text-xs font-sans text-foreground line-clamp-3 leading-relaxed bg-card p-2.5 rounded-lg border border-border">
                            {item.aktivitas}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {(infoFilterTab === "ALL" || infoFilterTab === "TUGAS") && (
              <div
                className={`bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card space-y-4 ${
                  infoFilterTab === "TUGAS" ? "lg:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="font-bold font-sans text-base text-foreground">
                        Riwayat tugas terbaru
                      </h3>

                      <p className="text-[11px] font-sans text-muted-foreground">
                        Daftar seluruh penugasan yang diberikan kepada peserta
                        magang
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 font-sans rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                    {tugasList.length} Tugas
                  </span>
                </div>

                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <Spinner size="lg" />
                  </div>
                ) : tugasList.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-xs text-foreground">
                      Tidak ada tugas tercatat
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {tugasList.map((task) => {
                      const isSelesai =
                        String(
                          task.status_pengerjaan || task.statusPengerjaan || "",
                        ).toUpperCase() === "SELESAI";

                      return (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-xl bg-input/40 border border-border/80 hover:border-primary/40 hover:bg-input/70 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={
                                  task.user_avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    task.user_nama || "P",
                                  )}&background=random&bold=true`
                                }
                                alt={task.user_nama || "Avatar"}
                                className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                              />

                              <div className="min-w-0">
                                <h4 className="font-sans text-xs text-foreground truncate">
                                  {task.user_nama || "Peserta Magang"}
                                </h4>

                                <p className="text-[10px] font-sans text-muted-foreground truncate">
                                  {task.user_institution ||
                                    task.user_sekolah ||
                                    "—"}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 inline-flex font-sans items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold border ${
                                isSelesai
                                  ? "status-hadir border"
                                  : "status-izin border"
                              }`}
                            >
                              {isSelesai ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span>Selesai</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>Pending</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />

                            <p className="font-sans text-xs text-foreground leading-snug">
                              {task.judul_tugas || task.judulTugas || "—"}
                            </p>
                          </div>

                          {task.log_book_aktivitas && (
                            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5">
                              <BookOpen className="w-3 h-3 text-primary mt-0.5 shrink-0" />

                              <span className="line-clamp-1">
                                <span className="font-sans text-primary">
                                  Logbook:
                                </span>{" "}
                                {task.log_book_aktivitas}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between font-sans text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary" />

                              {task.log_book_tanggal
                                ? formatTanggalIndo(task.log_book_tanggal)
                                : formatTanggalIndo(task.created_at)}
                            </span>

                            <span className="font-sans text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                              ID #{task.id}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="font-bold font-sans text-foreground text-[16px] md:text-lg">
                Daftar presensi hari ini
              </h3>

              <p className="text-xs font-sans text-muted-foreground">
                Catatan presensi{" "}
                {isAdminMagang
                  ? "siswa magang"
                  : isAdminOS
                    ? "karyawan OS"
                    : "siswa magang & karyawan OS"}{" "}
                tanggal {todayStr}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />

                <input
                  type="text"
                  placeholder="Cari nama"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-border bg-input pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {isSuperAdmin && (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-xl border border-border cursor-pointer bg-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                >
                  <option value="ALL">Semua Role</option>

                  <option value="MAGANG">Anak Magang</option>

                  <option value="OS">Karyawan OS</option>
                </select>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-sans font-bold whitespace-nowrap">
                  <th className="py-3 px-3">Nama Peserta</th>

                  <th className="py-3 px-3">Role</th>

                  <th className="py-3 px-3">Jam Masuk</th>

                  <th className="py-3 px-3">Status Masuk</th>

                  <th className="py-3 px-3">Jam Pulang</th>

                  <th className="py-3 px-3">Status Total</th>

                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex items-center justify-center">
                        <Spinner size="lg" />
                      </div>
                    </td>
                  </tr>
                ) : filteredTodayList.length > 0 ? (
                  filteredTodayList.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-accent/50 transition-colors whitespace-nowrap"
                    >
                      <td className="py-3 px-3">
                        <div className="font-sans text-foreground">
                          {rec.user_nama || rec.userName}
                        </div>

                        <div className="text-[10px] font-sans text-muted-foreground">
                          {rec.user_sekolah || rec.userInstitution}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-sans font-bold text-foreground">
                        {(() => {
                          const recRole = String(
                            rec.user_role || rec.userRole || "",
                          ).toUpperCase();

                          return recRole === "ANAK_MAGANG"
                            ? "Siswa Magang"
                            : "Karyawan OS";
                        })()}
                      </td>

                      <td className="py-3 px-3 font-sans font-bold text-foreground">
                        {rec.jam_masuk || rec.checkIn || "--:--"}
                      </td>

                      <td className="py-3 px-3 font-sans font-bold">
                        {String(
                          rec.status_masuk || rec.statusMasuk || "",
                        ).toUpperCase() === "TEPAT_WAKTU" ? (
                          <span className="text-status-hadir">Tepat Waktu</span>
                        ) : String(
                            rec.status_masuk || rec.statusMasuk || "",
                          ).toUpperCase() === "TERLAMBAT" ? (
                          <span className="text-status-terlambat">
                            Terlambat
                            {rec.menit_terlambat || rec.lateMinutes
                              ? ` (${formatLateDuration(
                                  rec.menit_terlambat || rec.lateMinutes,
                                  { withPrefixPlus: true, short: true },
                                )})`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-sans font-bold text-foreground">
                        {rec.jam_keluar ||
                          rec.jam_pulang ||
                          rec.checkOut ||
                          "--:--"}
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={rec.status} />
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {(rec.foto_masuk ||
                          rec.foto_keluar ||
                          rec.foto_pulang_cepat ||
                          rec.checkInPhoto ||
                          rec.checkOutPhoto) && (
                          <button
                            onClick={() => setSelectedPhotoRecord(rec)}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-input hover:bg-accent text-foreground transition-all inline-flex items-center gap-1.5 font-sans font-bold text-[11px] whitespace-nowrap cursor-pointer"
                            title="Lihat Bukti Foto Swafoto"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />

                            <span>Bukti Foto</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground font-semibold"
                    >
                      Tidak ada data presensi hari ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedPhotoRecord && (
          <PhotoModal
            isOpen={Boolean(selectedPhotoRecord)}
            onClose={() => setSelectedPhotoRecord(null)}
            fotoMasuk={
              selectedPhotoRecord.foto_masuk ||
              selectedPhotoRecord.fotoMasuk ||
              selectedPhotoRecord.checkInPhoto ||
              null
            }
            fotoPulang={
              selectedPhotoRecord.foto_keluar ||
              selectedPhotoRecord.fotoKeluar ||
              selectedPhotoRecord.checkOutPhoto ||
              selectedPhotoRecord.foto_pulang_cepat ||
              selectedPhotoRecord.fotoPulangCepat ||
              selectedPhotoRecord.foto_pulang ||
              selectedPhotoRecord.fotoPulang ||
              null
            }
            jamMasuk={
              selectedPhotoRecord.jam_masuk ||
              selectedPhotoRecord.jamMasuk ||
              selectedPhotoRecord.checkIn ||
              null
            }
            jamPulang={
              selectedPhotoRecord.jam_keluar ||
              selectedPhotoRecord.jamKeluar ||
              selectedPhotoRecord.jam_pulang ||
              selectedPhotoRecord.jamPulang ||
              selectedPhotoRecord.checkOut ||
              null
            }
            initialType={
              selectedPhotoRecord.foto_keluar ||
              selectedPhotoRecord.foto_pulang_cepat ||
              selectedPhotoRecord.checkOutPhoto
                ? "PULANG"
                : "MASUK"
            }
            userName={
              selectedPhotoRecord.user_nama ||
              selectedPhotoRecord.userName ||
              "Peserta"
            }
            userRole={selectedPhotoRecord.user_role || "ANAK_MAGANG"}
            attendanceDate={
              selectedPhotoRecord.tanggal ||
              selectedPhotoRecord.attendanceDate ||
              todayStr
            }
            status={selectedPhotoRecord.status}
            lateMinutes={
              selectedPhotoRecord.menit_terlambat ||
              selectedPhotoRecord.lateMinutes ||
              0
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}
