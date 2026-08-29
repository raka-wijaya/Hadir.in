"use client";

import { useEffect, useState } from "react";
import {
  Award,
  ShieldCheck,
  Trophy,
  Medal,
  Star,
  Loader2,
  Users,
} from "lucide-react";

type AwardTier =
  | "emas"
  | "perak"
  | "perunggu"
  | "bintang"
  | "reguler";

interface PesertaKedisiplinan {
  rank: number;
  id: string;
  peserta_magang_id?: string | null;
  karyawan_os_id?: string | null;
  nama: string;
  role: string;
  sekolah: string;
  avatar: string;
  totalHadir: number;
  totalTerlambat: number;
  totalIzinSakit: number;
  totalAlpa: number;
  totalPresensi: number;
  skorKedisiplinan: number;
  award: AwardTier;
}

interface KedisiplinanResponse {
  peserta: PesertaKedisiplinan[];
}

interface KedisiplinanProps {
  role?: string;
  limit?: number;
}

function getAwardLabel(award: AwardTier): string {
  switch (award) {
    case "emas":
      return "Emas";
    case "perak":
      return "Perak";
    case "perunggu":
      return "Perunggu";
    case "bintang":
      return "Bintang";
    default:
      return "Reguler";
  }
}

function getAwardIcon(award: AwardTier) {
  switch (award) {
    case "emas":
      return <Trophy className="w-4 h-4" />;

    case "perak":
      return <Medal className="w-4 h-4" />;

    case "perunggu":
      return <Medal className="w-4 h-4" />;

    case "bintang":
      return <Star className="w-4 h-4" />;

    default:
      return <Award className="w-4 h-4" />;
  }
}

function getAwardClass(award: AwardTier): string {
  switch (award) {
    case "emas":
      return "bg-primary/15 text-primary border-primary/30";

    case "perak":
      return "bg-secondary text-secondary-foreground border-border";

    case "perunggu":
      return "bg-accent text-accent-foreground border-border";

    case "bintang":
      return "bg-primary/10 text-primary border-primary/30";

    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getRankClass(rank: number): string {
  if (rank === 1) {
    return "bg-primary text-primary-foreground";
  }

  if (rank === 2) {
    return "bg-secondary text-secondary-foreground border border-border";
  }

  if (rank === 3) {
    return "bg-accent text-accent-foreground border border-border";
  }

  return "bg-muted text-muted-foreground";
}

export function Kedisiplinan({
  role = "SUPER_ADMIN",
  limit = 10,
}: KedisiplinanProps) {
  const [peserta, setPeserta] = useState<PesertaKedisiplinan[]>([]);
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
            role
          )}&limit=${limit}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data kedisiplinan");
        }

        const result: KedisiplinanResponse = await response.json();

        if (!cancelled) {
          setPeserta(result.peserta ?? []);
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

  const terbaik = peserta[0];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />

            <h3 className="font-extrabold text-base text-foreground">
              Rekap Kedisiplinan
            </h3>
          </div>

          {terbaik && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getAwardClass(
                terbaik.award
              )}`}
            >
              {getAwardLabel(terbaik.award)}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />

            <p className="text-xs font-bold text-muted-foreground">
              Memuat data kedisiplinan...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-extrabold text-status-alpa">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-bold text-primary hover:underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && peserta.length === 0 && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
            <Users className="w-7 h-7 text-muted-foreground" />

            <p className="text-sm font-extrabold text-foreground">
              Belum ada data peserta
            </p>

            <p className="text-xs text-muted-foreground">
              Data kedisiplinan belum tersedia.
            </p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && terbaik && (
          <>
            {/* Peserta Terbaik */}
            <div className="text-center py-2 space-y-2">
              <div className="flex justify-center">
                <div className="relative">
                  {terbaik.avatar ? (
                    <img
                      src={terbaik.avatar}
                      alt={terbaik.nama}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                      <span className="text-xl font-black text-primary">
                        {terbaik.nama
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  )}

                  <span
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-card ${getRankClass(
                      terbaik.rank
                    )}`}
                  >
                    {terbaik.rank}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-lg font-black text-foreground">
                  {terbaik.nama}
                </p>

                <p className="text-[11px] font-semibold text-muted-foreground">
                  {terbaik.sekolah}
                </p>
              </div>

              <div className="pt-1">
                <p className="text-4xl font-black text-primary">
                  {terbaik.skorKedisiplinan}%
                </p>

                <p className="text-xs font-bold text-muted-foreground">
                  Skor Kedisiplinan Ketepatan Waktu
                </p>
              </div>
            </div>

            {/* Statistik Peserta Terbaik */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border font-semibold">
                <span className="text-muted-foreground">
                  Hadir
                </span>

                <span className="font-extrabold text-status-hadir">
                  {terbaik.totalHadir} Sesi
                </span>
              </div>

              <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border font-semibold">
                <span className="text-muted-foreground">
                  Terlambat
                </span>

                <span className="font-extrabold text-status-terlambat">
                  {terbaik.totalTerlambat} Sesi
                </span>
              </div>

              <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border font-semibold">
                <span className="text-muted-foreground">
                  Izin / Sakit
                </span>

                <span className="font-extrabold text-status-izin">
                  {terbaik.totalIzinSakit} Sesi
                </span>
              </div>

              <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border font-semibold">
                <span className="text-muted-foreground">
                  Alpa
                </span>

                <span className="font-extrabold text-status-alpa">
                  {terbaik.totalAlpa} Sesi
                </span>
              </div>

              <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border font-semibold">
                <span className="text-muted-foreground">
                  Award
                </span>

                <span
                  className={`inline-flex items-center gap-1 font-extrabold capitalize`}
                >
                  {getAwardIcon(terbaik.award)}
                  {getAwardLabel(terbaik.award)}
                </span>
              </div>
            </div>

            {/* Ranking lainnya */}
            {peserta.length > 1 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Ranking Kedisiplinan
                  </p>

                  <span className="text-[10px] font-bold text-muted-foreground">
                    {peserta.length} Peserta
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {peserta.slice(1).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-muted/20"
                    >
                      {/* Rank */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${getRankClass(
                          item.rank
                        )}`}
                      >
                        {item.rank}
                      </div>

                      {/* Avatar */}
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.nama}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-black text-primary">
                            {item.nama
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Nama */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-foreground truncate">
                          {item.nama}
                        </p>

                        <p className="text-[9px] text-muted-foreground font-semibold">
                          Hadir {item.totalHadir}x
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-primary">
                          {item.skorKedisiplinan}%
                        </p>

                        <p className="text-[9px] font-bold text-muted-foreground capitalize">
                          {getAwardLabel(item.award)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />

        <span>
          Sistem otomatis menghitung penalti keterlambatan per sesi presensi.
        </span>
      </div>
    </div>
  );
}