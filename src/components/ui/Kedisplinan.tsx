"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  PenLine,
  X,
  Sparkles,
} from "lucide-react";
import { Spinner } from "./Spinner";
import { ModalPortal } from "./ModalPortal";
import { useAuth } from "@/lib/auth/context";

interface DisciplineItem {
  id: string;
  nama: string;
  role: string;
  count: number;
  avatar?: string;
}

interface CategoryData {
  title: string;
  totalOrang: number;
  emptyText: string;
  items: DisciplineItem[];
}

interface KedisiplinanProps {
  role?: string;
  limit?: number;
}

interface MasterUser {
  id: string;
  nama: string;
  email: string;
  role: "OS" | "MAGANG";
  avatar?: string | null;
}

function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

export function Kedisiplinan({
  role = "SUPER_ADMIN",
  limit,
}: KedisiplinanProps) {
  const [categories, setCategories] = useState<{
    palingRajin: CategoryData;
    seringTerlambat: CategoryData;
    seringIzinSakit: CategoryData;
    tanpaKeterangan: CategoryData;
  }>({
    palingRajin: {
      title: "PALING RAJIN",
      totalOrang: 0,
      emptyText: "Tidak ada data presensi tepat waktu",
      items: [],
    },
    seringTerlambat: {
      title: "SERING TERLAMBAT",
      totalOrang: 0,
      emptyText: "Tidak ada catatan terlambat",
      items: [],
    },
    seringIzinSakit: {
      title: "SERING IZIN / SAKIT",
      totalOrang: 0,
      emptyText: "Tidak ada catatan izin/sakit",
      items: [],
    },
    tanpaKeterangan: {
      title: "TANPA KETERANGAN",
      totalOrang: 0,
      emptyText: "Tidak ada tanpa keterangan",
      items: [],
    },
  });

  const { user } = useAuth();
  const ALLOWED_ADMIN_IDS = [1, 4, 6, 7, 8];
  const canOverride = user
    ? ALLOWED_ADMIN_IDS.includes(Number(user.id))
    : false;

  const [overrideItem, setOverrideItem] = useState<DisciplineItem | null>(null);
  const [targetJam, setTargetJam] = useState<string>("07:15");
  const [overrideLoading, setOverrideLoading] = useState<boolean>(false);
  const [overrideMessage, setOverrideMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = getTodayJakarta();
      const roleUpper = (role || "").toUpperCase();

      const fetchMagang =
        roleUpper === "SUPER_ADMIN" ||
        roleUpper === "SUPERADMIN" ||
        roleUpper === "ALL" ||
        roleUpper === "" ||
        roleUpper === "ADMIN_MAGANG" ||
        roleUpper === "ANAK_MAGANG";

      const fetchOS =
        roleUpper === "SUPER_ADMIN" ||
        roleUpper === "SUPERADMIN" ||
        roleUpper === "ALL" ||
        roleUpper === "" ||
        roleUpper === "ADMIN_OS" ||
        roleUpper === "KARYAWAN_OS";

      const [resStats, resMagang, resOS, resAbsensi, resIzin] =
        await Promise.allSettled([
          fetch(
            limit
              ? `/api/statistics/kedisiplinan?role=${encodeURIComponent(
                  role,
                )}&limit=${limit}`
              : `/api/statistics/kedisiplinan?role=${encodeURIComponent(role)}`,
            { method: "GET", cache: "no-store" },
          ),
          fetchMagang
            ? fetch("/api/users/peserta_magang", {
                method: "GET",
                cache: "no-store",
              })
            : Promise.resolve(null),
          fetchOS
            ? fetch("/api/users/karyawan_os", {
                method: "GET",
                cache: "no-store",
              })
            : Promise.resolve(null),
          fetch(`/api/absensi?tanggal=${today}`, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(`/api/izin?tanggal=${today}`, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      let rajinItems: DisciplineItem[] = [];
      let terlambatItems: DisciplineItem[] = [];
      let izinSakitItems: DisciplineItem[] = [];
      let statsTanpaKetItems: DisciplineItem[] = [];
      const statsAlpaMap = new Map<string, number>();

      if (resStats.status === "fulfilled" && resStats.value?.ok) {
        const statsData = await resStats.value.json().catch(() => ({}));
        if (statsData.categories) {
          rajinItems = statsData.categories.palingRajin?.items || [];
          terlambatItems = statsData.categories.seringTerlambat?.items || [];
          izinSakitItems = statsData.categories.seringIzinSakit?.items || [];
          statsTanpaKetItems =
            statsData.categories.tanpaKeterangan?.items || [];
        } else if (Array.isArray(statsData.peserta)) {
          const peserta = statsData.peserta;

          const sortedRajin = peserta
            .filter((p: any) => (p.totalHadir || 0) > 0)
            .sort(
              (a: any, b: any) => (b.totalHadir || 0) - (a.totalHadir || 0),
            );

          rajinItems = (limit ? sortedRajin.slice(0, limit) : sortedRajin).map(
            (p: any) => ({
              id: String(p.id),
              nama: p.nama,
              role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
              count: p.totalHadir || 0,
              avatar: p.avatar,
            }),
          );

          const sortedTerlambat = peserta
            .filter((p: any) => (p.totalTerlambat || 0) > 0)
            .sort(
              (a: any, b: any) =>
                (b.totalTerlambat || 0) - (a.totalTerlambat || 0),
            );

          terlambatItems = (
            limit ? sortedTerlambat.slice(0, limit) : sortedTerlambat
          ).map((p: any) => ({
            id: String(p.id),
            nama: p.nama,
            role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
            count: p.totalTerlambat || 0,
            avatar: p.avatar,
          }));

          const sortedIzin = peserta
            .filter((p: any) => (p.totalIzinSakit || 0) > 0)
            .sort(
              (a: any, b: any) =>
                (b.totalIzinSakit || 0) - (a.totalIzinSakit || 0),
            );

          izinSakitItems = (
            limit ? sortedIzin.slice(0, limit) : sortedIzin
          ).map((p: any) => ({
            id: String(p.id),
            nama: p.nama,
            role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
            count: p.totalIzinSakit || 0,
            avatar: p.avatar,
          }));

          peserta.forEach((p: any) => {
            if ((p.totalAlpa || 0) > 0) {
              statsAlpaMap.set(String(p.id), p.totalAlpa);
            }
          });
        }
      }

      const masterUsers: MasterUser[] = [];

      if (
        resMagang.status === "fulfilled" &&
        resMagang.value &&
        resMagang.value.ok
      ) {
        const mJson = await resMagang.value.json().catch(() => ({}));
        const mList = mJson?.data || [];
        if (Array.isArray(mList)) {
          mList
            .filter(
              (u: any) =>
                !u.status || (u.status || "").toUpperCase() === "ACTIVE",
            )
            .forEach((u: any) => {
              masterUsers.push({
                id: String(u.id),
                nama: u.name || u.nama || u.email || "Peserta Magang",
                email: u.email || "",
                role: "MAGANG",
                avatar: u.avatar || null,
              });
            });
        }
      }

      if (resOS.status === "fulfilled" && resOS.value && resOS.value.ok) {
        const osJson = await resOS.value.json().catch(() => ({}));
        const osList = osJson?.data || [];
        if (Array.isArray(osList)) {
          osList
            .filter(
              (u: any) =>
                !u.status || (u.status || "").toUpperCase() === "ACTIVE",
            )
            .forEach((u: any) => {
              masterUsers.push({
                id: String(u.id),
                nama: u.name || u.nama || u.email || "Karyawan OS",
                email: u.email || "",
                role: "OS",
                avatar: u.avatar || null,
              });
            });
        }
      }

      const sudahAbsenOsIds = new Set<string>();
      const sudahAbsenMagangIds = new Set<string>();

      if (resAbsensi.status === "fulfilled" && resAbsensi.value?.ok) {
        const absJson = await resAbsensi.value.json().catch(() => ({}));
        const absList: any[] = absJson?.data || [];
        absList.forEach((row: any) => {
          const tgl = (row.tanggal || "").slice(0, 10);
          if (tgl === today) {
            const isAlpa = (row.status || "").toUpperCase() === "ALPA";
            if (!isAlpa) {
              const osId = row.karyawan_os_id || row.karyawanOsId;
              if (osId) sudahAbsenOsIds.add(String(osId));

              const magangId = row.peserta_magang_id || row.pesertaMagangId;
              if (magangId) sudahAbsenMagangIds.add(String(magangId));
            }
          }
        });
      }

      const sedangIzinOsIds = new Set<string>();
      const sedangIzinMagangIds = new Set<string>();

      if (resIzin.status === "fulfilled" && resIzin.value?.ok) {
        const izinJson = await resIzin.value.json().catch(() => ({}));
        const izinList: any[] = izinJson?.data || izinJson?.izin || [];
        izinList.forEach((iz: any) => {
          const tMulai = (iz.tanggal_mulai || iz.tanggalMulai || "").slice(
            0,
            10,
          );
          const tSelesai = (
            iz.tanggal_selesai ||
            iz.tanggalSelesai ||
            ""
          ).slice(0, 10);
          if (today >= tMulai && today <= tSelesai) {
            const osId = iz.karyawan_os_id || iz.karyawanOsId;
            if (osId) sedangIzinOsIds.add(String(osId));

            const magangId = iz.peserta_magang_id || iz.pesertaMagangId;
            if (magangId) sedangIzinMagangIds.add(String(magangId));
          }
        });
      }

      const belumAbsenHariIni: DisciplineItem[] = masterUsers
        .filter((user) => {
          if (user.role === "OS") {
            return (
              !sudahAbsenOsIds.has(user.id) && !sedangIzinOsIds.has(user.id)
            );
          } else {
            return (
              !sudahAbsenMagangIds.has(user.id) &&
              !sedangIzinMagangIds.has(user.id)
            );
          }
        })
        .map((user) => {
          const pastAlpaCount = statsAlpaMap.get(user.id) || 0;
          return {
            id: user.id,
            nama: user.nama,
            role: user.role,
            count: pastAlpaCount > 0 ? pastAlpaCount : 1,
            avatar: user.avatar || undefined,
          };
        });

      const tanpaKeteranganMap = new Map<string, DisciplineItem>();
      belumAbsenHariIni.forEach((item) => {
        tanpaKeteranganMap.set(`${item.role}_${item.id}`, item);
      });

      statsTanpaKetItems.forEach((item) => {
        const key = `${item.role}_${item.id}`;
        if (!tanpaKeteranganMap.has(key)) {
          tanpaKeteranganMap.set(key, item);
        }
      });

      const sortedTanpaKet = Array.from(tanpaKeteranganMap.values()).sort(
        (a, b) => (b.count || 0) - (a.count || 0),
      );

      const finalTanpaKeteranganItems = limit
        ? sortedTanpaKet.slice(0, limit)
        : sortedTanpaKet;

      setCategories({
        palingRajin: {
          title: "PALING RAJIN",
          totalOrang: rajinItems.length,
          emptyText: "Tidak ada data presensi tepat waktu",
          items: rajinItems,
        },
        seringTerlambat: {
          title: "SERING TERLAMBAT",
          totalOrang: terlambatItems.length,
          emptyText: "Tidak ada catatan terlambat",
          items: terlambatItems,
        },
        seringIzinSakit: {
          title: "SERING IZIN / SAKIT",
          totalOrang: izinSakitItems.length,
          emptyText: "Tidak ada catatan izin/sakit",
          items: izinSakitItems,
        },
        tanpaKeterangan: {
          title: "TANPA KETERANGAN",
          totalOrang: tanpaKeteranganMap.size,
          emptyText: "Tidak ada tanpa keterangan",
          items: finalTanpaKeteranganItems,
        },
      });
    } catch (err: any) {
      console.error("Fetch kedisiplinan error:", err);
      setError("Data kedisiplinan gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [role, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenOverride = (item: DisciplineItem) => {
    setOverrideItem(item);
    setTargetJam("07:15");
    setOverrideMessage(null);
  };

  const handleCloseOverride = () => {
    if (overrideLoading) return;
    setOverrideItem(null);
    setOverrideMessage(null);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideItem || !user) return;

    try {
      setOverrideLoading(true);
      setOverrideMessage(null);

      const res = await fetch("/api/absensi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "KOREKSI_TERLAMBAT",
          adminId: user.id,
          userId: overrideItem.id,
          userRole: overrideItem.role,
          targetJamMasuk: targetJam,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengoreksi data keterlambatan.");
      }

      setOverrideMessage({
        type: "success",
        text: `Berhasil memindahkan ${overrideItem.nama} ke Paling Rajin dengan jam masuk ${targetJam}!`,
      });

      await fetchData();

      setTimeout(() => {
        setOverrideItem(null);
        setOverrideMessage(null);
      }, 1400);
    } catch (err: any) {
      setOverrideMessage({
        type: "error",
        text: err.message || "Terjadi kesalahan saat mengoreksi data.",
      });
    } finally {
      setOverrideLoading(false);
    }
  };

  const cardsConfig = [
    {
      key: "palingRajin",
      category: categories.palingRajin,
      titleColor: "text-status-hadir",
      borderColor: "border-border hover:border-status-hadir/40",
      rankColor: "text-status-hadir",
      countBadge: "status-hadir border",
    },
    {
      key: "seringTerlambat",
      category: categories.seringTerlambat,
      titleColor: "text-status-terlambat",
      borderColor: "border-border hover:border-status-terlambat/40",
      rankColor: "text-status-terlambat",
      countBadge: "status-terlambat border",
    },
    {
      key: "seringIzinSakit",
      category: categories.seringIzinSakit,
      titleColor: "text-status-izin",
      borderColor: "border-border hover:border-status-izin/40",
      rankColor: "text-status-izin",
      countBadge: "status-izin border",
    },
    {
      key: "tanpaKeterangan",
      category: categories.tanpaKeterangan,
      titleColor: "text-status-alpa",
      borderColor: "border-border hover:border-status-alpa/40",
      rankColor: "text-status-alpa",
      countBadge: "status-alpa border",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardsConfig.map(
        ({ key, category, titleColor, borderColor, rankColor, countBadge }) => (
          <div
            key={key}
            className={`bg-card border ${borderColor} rounded-2xl p-4 sm:p-5 font-sans flex flex-col justify-between min-h-[380px] shadow-card transition-all duration-300`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-bold text-xs md:text-xs font-sans tracking-wider uppercase ${titleColor}`}
                  >
                    {category.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-sans text-muted-foreground">
                    <span className="text-foreground text-xs md:text-xs">
                      {category.totalOrang}
                    </span>{" "}
                    Orang
                  </div>

                  {key === "tanpaKeterangan" && (
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      title="Muat ulang data"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Spinner size="lg" />
                </div>
              )}

              {!loading && error && (
                <div className="py-12 px-3 text-center">
                  <AlertCircle className="w-5 h-5 text-destructive mx-auto mb-1.5" />
                  <p className="text-xs text-destructive font-semibold">
                    {error}
                  </p>
                  <button
                    onClick={fetchData}
                    className="mt-2 text-xs font-sans font-bold text-destructive hover:underline cursor-pointer"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {!loading && !error && category.items.length === 0 && (
                <div className="py-20 px-3 text-center">
                  <p className="text-xs font-semibold font-sans italic text-muted-foreground leading-relaxed">
                    {category.emptyText}
                  </p>
                </div>
              )}

              {!loading && !error && category.items.length > 0 && (
                <div className="divide-y divide-border/60 mt-1 max-h-[320px] overflow-y-auto pr-1">
                  {category.items.map((item, index) => {
                    const isOs =
                      item.role?.toUpperCase() === "OS" ||
                      item.role?.toUpperCase() === "KARYAWAN_OS";

                    return (
                      <div
                        key={item.id || index}
                        className="py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className={`text-xs font-sans font-black ${rankColor} mt-0.5 shrink-0 w-3.5`}
                          >
                            {index + 1}.
                          </span>

                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-sans text-foreground truncate leading-snug"
                              title={item.nama}
                            >
                              {item.nama}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isOs ? (
                                <span className="inline-block font-sans px-1.5 py-0.5 rounded text-[9px] tracking-wider bg-muted text-foreground border border-border uppercase">
                                  OS
                                </span>
                              ) : (
                                <span className="inline-block font-sans px-1.5 py-0.5 rounded text-[9px] tracking-wider bg-primary/10 text-primary border border-primary/20 uppercase">
                                  MAGANG
                                </span>
                              )}

                              {key === "tanpaKeterangan" && (
                                <span className="inline-flex items-center gap-1 font-sans text-[9px] text-status-alpa">
                                  <span className="w-1.5 h-1.5 rounded-full bg-status-alpa shrink-0" />
                                  Belum Absen
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {key === "seringTerlambat" && canOverride && (
                            <button
                              type="button"
                              onClick={() => handleOpenOverride(item)}
                              title="Pindahkan ke Paling Rajin & Koreksi Jam"
                              className="p-1.5 rounded-lg bg-card border border-border text-primary hover:bg-primary/10 transition-all cursor-pointer"
                            >
                              <PenLine className="w-3 h-3" />
                            </button>
                          )}

                          {key !== "tanpaKeterangan" && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-sans font-black font-mono shrink-0 ${countBadge}`}
                            >
                              {item.count}x
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ),
      )}

      {overrideItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div>
                    <h3 className="text-sm font-bold font-sans tracking-tight text-foreground">
                      Pindahkan ke Paling Rajin
                    </h3>
                    <p className="text-xs font-sans text-muted-foreground mt-0.5">
                      Koreksi keterlambatan peserta oleh Admin #{user?.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseOverride}
                  disabled={overrideLoading}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitOverride} className="space-y-4">
                <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs font-sans text-foreground">
                      {overrideItem.nama}
                    </p>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-sans tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {overrideItem.role}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs text-status-terlambat border font-sans">
                    {overrideItem.count}x Terlambat
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-foreground font-sans flex items-center justify-between">
                    <span>Jam Masuk Baru</span>
                    <span className="text-xs text-muted-foreground font-sans">
                      Format: HH:mm (WIB)
                    </span>
                  </label>
                  <div className="relative">
                    <Clock
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
                    />
                    <input
                      type="time"
                      value={targetJam}
                      onChange={(e) => setTargetJam(e.target.value)}
                      required
                      style={{ colorScheme: "dark" }}
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs font-sans text-muted-foreground">
                      Preset cepat:
                    </span>
                    {["07:00", "07:15", "07:25"].map((timePreset) => (
                      <button
                        key={timePreset}
                        type="button"
                        onClick={() => setTargetJam(timePreset)}
                        className={`px-2 py-0.5 rounded text-xs font-sans transition-all border cursor-pointer ${
                          targetJam === timePreset
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {timePreset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border/50">
                  <span className="font-sans text-foreground">Catatan:</span>{" "}
                  Seluruh riwayat presensi berstatus terlambat bulan ini untuk
                  peserta ini akan diubah menjadi{" "}
                  <strong className="text-status-hadir font-sans">
                    Tepat Waktu
                  </strong>{" "}
                  dengan jam masuk{" "}
                  <strong className="font-sans text-foreground">
                    {targetJam}
                  </strong>
                  .
                </div>

                {overrideMessage && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-sans font-semibold flex items-center gap-2 ${
                      overrideMessage.type === "success"
                        ? "status-hadir border"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                  >
                    {overrideMessage.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{overrideMessage.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleCloseOverride}
                    disabled={overrideLoading}
                    className="px-3.5 py-2 text-xs font-sans rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={overrideLoading || !targetJam}
                    className="flex items-center justify-center gap-1.5 min-w-[150px] px-4 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {overrideLoading ? (
                      <>
                        <Spinner size="sm" className="text-current" />
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Simpan &amp; Pindahkan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
