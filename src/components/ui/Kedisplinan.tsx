"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Loader2,
} from "lucide-react";

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

interface KedisiplinanResponse {
  categories?: {
    palingRajin: CategoryData;
    seringTerlambat: CategoryData;
    seringIzinSakit: CategoryData;
    tanpaKeterangan: CategoryData;
  };
  peserta?: any[];
}

interface KedisiplinanProps {
  role?: string;
  limit?: number;
}

export function Kedisiplinan({
  role = "SUPER_ADMIN",
  limit = 10,
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
      emptyText: "Tidak ada catatan alpa bulan ini.",
      items: [],
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchKedisiplinan() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/statistics/kedisiplinan?role=${encodeURIComponent(
            role,
          )}&limit=${limit}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data kedisiplinan");
        }

        const result: KedisiplinanResponse = await response.json();

        if (!cancelled) {
          if (result.categories) {
            setCategories(result.categories);
          } else if (result.peserta) {
            const peserta = result.peserta;

            const rajin = peserta
              .filter((p: any) => (p.totalHadir || 0) > 0)
              .sort(
                (a: any, b: any) => (b.totalHadir || 0) - (a.totalHadir || 0),
              )
              .slice(0, limit)
              .map((p: any) => ({
                id: String(p.id),
                nama: p.nama,
                role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
                count: p.totalHadir || 0,
                avatar: p.avatar,
              }));

            const terlambat = peserta
              .filter((p: any) => (p.totalTerlambat || 0) > 0)
              .sort(
                (a: any, b: any) =>
                  (b.totalTerlambat || 0) - (a.totalTerlambat || 0),
              )
              .slice(0, limit)
              .map((p: any) => ({
                id: String(p.id),
                nama: p.nama,
                role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
                count: p.totalTerlambat || 0,
                avatar: p.avatar,
              }));

            const izinSakit = peserta
              .filter((p: any) => (p.totalIzinSakit || 0) > 0)
              .sort(
                (a: any, b: any) =>
                  (b.totalIzinSakit || 0) - (a.totalIzinSakit || 0),
              )
              .slice(0, limit)
              .map((p: any) => ({
                id: String(p.id),
                nama: p.nama,
                role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
                count: p.totalIzinSakit || 0,
                avatar: p.avatar,
              }));

            const alpa = peserta
              .filter((p: any) => (p.totalAlpa || 0) > 0)
              .sort((a: any, b: any) => (b.totalAlpa || 0) - (a.totalAlpa || 0))
              .slice(0, limit)
              .map((p: any) => ({
                id: String(p.id),
                nama: p.nama,
                role: p.role === "ANAK_MAGANG" ? "MAGANG" : "OS",
                count: p.totalAlpa || 0,
                avatar: p.avatar,
              }));

            setCategories({
              palingRajin: {
                title: "PALING RAJIN",
                totalOrang: rajin.length,
                emptyText: "Belum ada data presensi tepat waktu bulan ini.",
                items: rajin,
              },
              seringTerlambat: {
                title: "SERING TERLAMBAT",
                totalOrang: terlambat.length,
                emptyText: "Tidak ada catatan terlambat bulan ini.",
                items: terlambat,
              },
              seringIzinSakit: {
                title: "SERING IZIN / SAKIT",
                totalOrang: izinSakit.length,
                emptyText: "Tidak ada catatan izin/sakit bulan ini.",
                items: izinSakit,
              },
              tanpaKeterangan: {
                title: "TANPA KETERANGAN",
                totalOrang: alpa.length,
                emptyText: "Tidak ada catatan alpa bulan ini.",
                items: alpa,
              },
            });
          }
        }
      } catch (err) {
        console.error("Fetch kedisiplinan error:", err);
        if (!cancelled) {
          setError("Data kedisiplinan gagal dimuat.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchKedisiplinan();

    return () => {
      cancelled = true;
    };
  }, [role, limit]);

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
                <div className="text-[11px] font-semibold text-muted-foreground">
                  <span className="font-extrabold text-foreground text-[11px] md:text-[11px]">
                    {category.totalOrang}
                  </span>{" "}
                  Orang
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
                <div className="py-12 text-center text-xs text-status-alpa font-semibold">
                  {error}
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
                <div className="divide-y divide-border/60 mt-1">
                  {category.items.map((item, index) => {
                    const isOs =
                      item.role?.toUpperCase() === "OS" ||
                      item.role?.toUpperCase() === "KARYAWAN_OS";

                    return (
                      <div
                        key={item.id || index}
                        className="py-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`text-xs font-black ${rankColor} mt-0.5 shrink-0`}
                          >
                            {index + 1}.
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-foreground truncate leading-snug">
                              {item.nama}
                            </p>
                            <div className="mt-1">
                              {isOs ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                                  OS
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-primary/15 text-primary border border-primary/30 uppercase">
                                  MAGANG
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Count Pill */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black border font-mono shrink-0 ${countBadge}`}
                        >
                          {item.count}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
