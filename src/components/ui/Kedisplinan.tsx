"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Pencil,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

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

// ============================================================
// HELPER: Tanggal Hari Ini (WIB / Asia/Jakarta) -> YYYY-MM-DD
// ============================================================
function getTodayJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

// ============================================================
// KOMPONEN UTAMA KEDISIPLINAN
// ============================================================
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
      emptyText: "Belum ada data presensi tepat waktu bulan ini.",
      items: [],
    },
    seringTerlambat: {
      title: "SERING TERLAMBAT",
      totalOrang: 0,
      emptyText: "Tidak ada catatan terlambat bulan ini.",
      items: [],
    },
    seringIzinSakit: {
      title: "SERING IZIN / SAKIT",
      totalOrang: 0,
      emptyText: "Tidak ada catatan izin/sakit bulan ini.",
      items: [],
    },
    tanpaKeterangan: {
      title: "TANPA KETERANGAN",
      totalOrang: 0,
      emptyText: "Semua sudah presensi atau memiliki izin hari ini.",
      items: [],
    },
  });

  const { user } = useAuth();
  const ALLOWED_ADMIN_IDS = [1, 4, 6, 7, 8];
  const canOverride = user
    ? ALLOWED_ADMIN_IDS.includes(Number(user.id))
    : false;

  // State untuk Modal Koreksi (Sering Terlambat -> Paling Rajin)
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

      // Panggil seluruh API terkait secara paralel
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

      // --------------------------------------------------------
      // 1. Data Kedisiplinan (Paling Rajin, Terlambat, Izin/Sakit)
      // --------------------------------------------------------
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

      // --------------------------------------------------------
      // 2. Master Data Karyawan OS & Peserta Magang
      // --------------------------------------------------------
      const masterUsers: MasterUser[] = [];

      // Peserta Magang dari /api/users/peserta_magang
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

      // Karyawan OS dari /api/users/karyawan_os
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

      // --------------------------------------------------------
      // 3. Catatan Absensi Hari Ini dari /api/absensi
      // --------------------------------------------------------
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

      // --------------------------------------------------------
      // 4. Catatan Izin / Sakit Hari Ini dari /api/izin
      // --------------------------------------------------------
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

      // --------------------------------------------------------
      // 5. Olah Kategori "TANPA KETERANGAN"
      //    (User aktif yang belum absen hari ini & tidak sedang izin)
      // --------------------------------------------------------
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

      // Gabungkan dengan rekam alpa historis bulan ini jika ada
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

      // --------------------------------------------------------
      // 6. Update State Kategori
      // --------------------------------------------------------
      setCategories({
        palingRajin: {
          title: "PALING RAJIN",
          totalOrang: rajinItems.length,
          emptyText: "Belum ada data presensi tepat waktu bulan ini.",
          items: rajinItems,
        },
        seringTerlambat: {
          title: "SERING TERLAMBAT",
          totalOrang: terlambatItems.length,
          emptyText: "Tidak ada catatan terlambat bulan ini.",
          items: terlambatItems,
        },
        seringIzinSakit: {
          title: "SERING IZIN / SAKIT",
          totalOrang: izinSakitItems.length,
          emptyText: "Tidak ada catatan izin/sakit bulan ini.",
          items: izinSakitItems,
        },
        tanpaKeterangan: {
          title: "TANPA KETERANGAN",
          totalOrang: tanpaKeteranganMap.size,
          emptyText: "Semua sudah presensi atau memiliki izin hari ini.",
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

  // ----------------------------------------------------------
  // HANDLER KOREKSI TERLAMBAT -> PALING RAJIN
  // ----------------------------------------------------------
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

      // Refresh data kartu
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

  // ----------------------------------------------------------
  // CONFIG KARTU KEDISIPLINAN
  // ----------------------------------------------------------
  const cardsConfig = [
    {
      key: "palingRajin",
      category: categories.palingRajin,
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      titleColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-500/20 dark:border-emerald-500/30",
      rankColor: "text-emerald-600 dark:text-emerald-400",
      countBadge:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    },
    {
      key: "seringTerlambat",
      category: categories.seringTerlambat,
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      titleColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-500/20 dark:border-amber-500/30",
      rankColor: "text-amber-600 dark:text-amber-400",
      countBadge:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    },
    {
      key: "seringIzinSakit",
      category: categories.seringIzinSakit,
      icon: FileText,
      iconColor: "text-blue-600 dark:text-blue-400",
      titleColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-500/20 dark:border-blue-500/30",
      rankColor: "text-blue-600 dark:text-blue-400",
      countBadge:
        "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    },
    {
      key: "tanpaKeterangan",
      category: categories.tanpaKeterangan,
      icon: HelpCircle,
      iconColor: "text-rose-600 dark:text-rose-400",
      titleColor: "text-rose-600 dark:text-rose-400",
      borderColor: "border-rose-500/20 dark:border-rose-500/30",
      rankColor: "text-rose-600 dark:text-rose-400",
      countBadge:
        "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    },
  ];

  // ----------------------------------------------------------
  // RENDER (4 Grid Kartu Kedisiplinan Bersih & Konsisten)
  // ----------------------------------------------------------
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardsConfig.map(
        ({
          key,
          category,
          icon: Icon,
          iconColor,
          titleColor,
          borderColor,
          rankColor,
          countBadge,
        }) => (
          <div
            key={key}
            className={`bg-card border ${borderColor} rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[380px] shadow-card transition-all duration-300`}
          >
            <div>
              {/* Header Card */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />
                  <h3
                    className={`font-black text-[11px] md:text-[11px] tracking-wider uppercase ${titleColor}`}
                  >
                    {category.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    <span className="font-extrabold text-foreground text-[11px] md:text-[11px]">
                      {category.totalOrang}
                    </span>{" "}
                    Orang
                  </div>

                  {key === "tanpaKeterangan" && (
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      title="Muat ulang data"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Memuat...
                  </p>
                </div>
              )}

              {/* Error State */}
              {!loading && error && (
                <div className="py-12 px-3 text-center">
                  <AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
                  <p className="text-xs text-rose-500 font-semibold">{error}</p>
                  <button
                    onClick={fetchData}
                    className="mt-2 text-[11px] font-bold text-rose-500 hover:underline"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && category.items.length === 0 && (
                <div className="py-20 px-3 text-center">
                  <p className="text-xs font-semibold italic text-muted-foreground leading-relaxed">
                    {category.emptyText}
                  </p>
                </div>
              )}

              {/* Populated List State */}
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
                            className={`text-xs font-black ${rankColor} mt-0.5 shrink-0 w-3.5`}
                          >
                            {index + 1}.
                          </span>

                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-extrabold text-foreground truncate leading-snug"
                              title={item.nama}
                            >
                              {item.nama}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isOs ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                                  OS
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-primary/15 text-primary border border-primary/30 uppercase">
                                  MAGANG
                                </span>
                              )}

                              {key === "tanpaKeterangan" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-500 dark:text-rose-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  Belum Absen
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Area: Count Pill & Tombol Koreksi */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Tombol Edit Koreksi (Khusus Admin ID: 1, 4, 6, 7, 8 pada kartu Sering Terlambat) */}
                          {key === "seringTerlambat" && canOverride && (
                            <button
                              type="button"
                              onClick={() => handleOpenOverride(item)}
                              title="Pindahkan ke Paling Rajin & Koreksi Jam"
                              className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all shrink-0"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}

                          {/* Right Count Pill (hanya untuk kartu statistik kedisiplinan) */}
                          {key !== "tanpaKeterangan" && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black border font-mono shrink-0 ${countBadge}`}
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
      {/* ======================================================
          MODAL: KOREKSI KEDISIPLINAN (SERING TERLAMBAT -> PALING RAJIN)
          ====================================================== */}
      {overrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div>
                  <h3 className="text-sm font-black tracking-tight text-foreground">
                    Pindahkan ke Paling Rajin
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Koreksi keterlambatan peserta oleh Admin #{user?.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseOverride}
                disabled={overrideLoading}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmitOverride} className="space-y-4">
              {/* Info Peserta */}
              <div className="p-3 rounded-xl bg-accent/40 border border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {overrideItem.nama}
                  </p>
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                    {overrideItem.role}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-500 font-mono">
                  {overrideItem.count}x Terlambat
                </span>
              </div>

              {/* Input Jam Masuk Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Jam Masuk Baru</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Format: HH:mm (WIB)
                  </span>
                </label>
                <input
                  type="time"
                  value={targetJam}
                  onChange={(e) => setTargetJam(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />

                {/* Preset Jam Cepat */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Preset cepat:
                  </span>
                  {["07:00", "07:15", "07:25"].map((timePreset) => (
                    <button
                      key={timePreset}
                      type="button"
                      onClick={() => setTargetJam(timePreset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                        targetJam === timePreset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {timePreset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border/50">
                💡{" "}
                <span className="font-semibold text-foreground">Catatan:</span>{" "}
                Seluruh riwayat presensi berstatus terlambat bulan ini untuk
                peserta ini akan diubah menjadi{" "}
                <strong className="text-emerald-500">Tepat Waktu</strong> dengan
                jam masuk{" "}
                <strong className="font-mono text-foreground">
                  {targetJam}
                </strong>
                .
              </div>

              {/* Status Message */}
              {overrideMessage && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    overrideMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
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

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseOverride}
                  disabled={overrideLoading}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading || !targetJam}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {overrideLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
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
      )}
    </div>
  );
}
