"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Spinner } from "./Spinner";

interface Absensi {
  id: string;
  peserta_magang_id?: string | null;
  karyawan_os_id?: string | null;
  tanggal: string;
  attendanceDate: string;

  jam_masuk: string | null;
  checkIn: string | null;

  jam_pulang: string | null;
  checkOut: string | null;

  foto_masuk: string | null;
  checkInPhoto: string | null;

  foto_pulang: string | null;
  checkOutPhoto: string | null;

  status: string | null;
  status_masuk: string | null;

  menit_terlambat: number;
  lateMinutes: number;

  keterangan_izin: string | null;

  user_nama: string;
  userName: string;

  user_role: string;
  userRole: string;

  user_sekolah: string;
  userInstitution: string;

  user_avatar: string;
  created_at: string;
}

interface LeaveRequest {
  id: string;
  peserta_magang_id?: string | null;
  karyawan_os_id?: string | null;
  userRole: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: string;
}

interface StatistikHarian {
  hari: string;
  tanggal: string;
  hadir: number;
  terlambat: number;
  izinSakit: number;
  alpa: number;
}

interface StatiskaProps {
  role?: string;
}

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

function getTanggalIndonesia(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

function getDayName(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00+07:00`);

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getMonday(date: Date): Date {
  const result = new Date(date);

  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isStatusIzin(status: string | null): boolean {
  if (!status) return false;

  const value = status.toLowerCase();

  return (
    value === "izin" ||
    value === "sakit" ||
    value === "izin_sakit" ||
    value.includes("izin") ||
    value.includes("sakit")
  );
}

function isStatusAlpa(status: string | null): boolean {
  if (!status) return false;

  const value = status.toLowerCase();

  return (
    value === "alpa" ||
    value === "alpha" ||
    value === "tanpa_keterangan" ||
    value === "tanpa_ket"
  );
}

function isStatusTerlambat(absensi: Absensi): boolean {
  if (Number(absensi.menit_terlambat ?? 0) > 0) {
    return true;
  }

  const status = absensi.status?.toLowerCase() || "";
  const statusMasuk = absensi.status_masuk?.toLowerCase() || "";

  return status === "terlambat" || statusMasuk === "terlambat";
}

function isStatusHadir(absensi: Absensi): boolean {
  const status = absensi.status?.toLowerCase() || "";
  const statusMasuk = absensi.status_masuk?.toLowerCase() || "";

  if (isStatusIzin(absensi.status) || isStatusAlpa(absensi.status)) {
    return false;
  }

  if (isStatusTerlambat(absensi)) {
    return false;
  }

  // Orang yang sudah check-in dan statusnya hadir / tepat waktu
  return (
    status === "hadir" ||
    status === "tepat_waktu" ||
    status === "present" ||
    statusMasuk === "tepat_waktu" ||
    // Jika ada jam masuk tapi status belum di-set (absen tapi belum ada status)
    (absensi.jam_masuk != null && status === "")
  );
}

export function Statiska({ role = "SUPER_ADMIN" }: StatiskaProps) {
  const [data, setData] = useState<StatistikHarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStatistics() {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        // Tanggal hari ini dalam WIB, digunakan untuk membandingkan hari
        const todayString = getTanggalIndonesia(today);
        const monday = getMonday(today);

        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        const tanggalMulai = getTanggalIndonesia(monday);
        const tanggalSelesai = getTanggalIndonesia(friday);

        // Fetch absensi dan users secara paralel
        const absUrl = new URL("/api/absensi", window.location.origin);
        absUrl.searchParams.set("role", role);
        absUrl.searchParams.set("startDate", tanggalMulai);
        absUrl.searchParams.set("endDate", tanggalSelesai);

        const roleUpper = role.toUpperCase();
        const fetchMagang =
          roleUpper === "SUPER_ADMIN" ||
          roleUpper === "SUPERADMIN" ||
          roleUpper === "ADMIN_MAGANG";
        const fetchOS =
          roleUpper === "SUPER_ADMIN" ||
          roleUpper === "SUPERADMIN" ||
          roleUpper === "ADMIN_OS";

        const [absResponse, magangResponse, osResponse] = await Promise.all([
          fetch(absUrl.toString(), {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetchMagang
            ? fetch("/api/users/peserta_magang", {
                method: "GET",
                cache: "no-store",
                signal: controller.signal,
              })
            : Promise.resolve(null),
          fetchOS
            ? fetch("/api/users/karyawan_os", {
                method: "GET",
                cache: "no-store",
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ]);

        const result = await absResponse.json().catch(() => ({}));

        if (!absResponse.ok || !result.success) {
          throw new Error(result.message || "Gagal mengambil data absensi");
        }

        const absensi: Absensi[] = result.data ?? [];

        // Filter absensi sesuai role
        const filteredAbsensi = absensi.filter((item) => {
          const ur = (item.user_role || item.userRole || "").toUpperCase();
          if (roleUpper === "SUPER_ADMIN" || roleUpper === "SUPERADMIN") {
            return ur === "ANAK_MAGANG" || ur === "KARYAWAN_OS";
          }
          if (roleUpper === "ADMIN_MAGANG") {
            return ur === "ANAK_MAGANG";
          }
          if (roleUpper === "ADMIN_OS") {
            return ur === "KARYAWAN_OS";
          }
          return true;
        });

        // Hitung total user aktif sesuai role (untuk kalkulasi Alpa)
        let totalActiveUsers = 0;
        if (magangResponse && magangResponse.ok) {
          const mResult = await magangResponse.json().catch(() => ({}));
          if (mResult.success && Array.isArray(mResult.data)) {
            totalActiveUsers += mResult.data.filter(
              (u: any) => !u.status || u.status === "ACTIVE",
            ).length;
          }
        }
        if (osResponse && osResponse.ok) {
          const osResult = await osResponse.json().catch(() => ({}));
          if (osResult.success && Array.isArray(osResult.data)) {
            totalActiveUsers += osResult.data.filter(
              (u: any) => !u.status || u.status === "ACTIVE",
            ).length;
          }
        }

        const absensiMingguIni = filteredAbsensi.filter((item) => {
          if (!item.tanggal) return false;
          return item.tanggal >= tanggalMulai && item.tanggal <= tanggalSelesai;
        });

        const statistik: StatistikHarian[] = [];

        for (let i = 0; i < 5; i++) {
          const tanggal = new Date(monday);
          tanggal.setDate(monday.getDate() + i);

          const tanggalString = getTanggalIndonesia(tanggal);
          const hari = HARI[i];

          // ── Hari yang akan datang: semua nilai 0, jangan hitung sama sekali ──
          if (tanggalString > todayString) {
            statistik.push({
              hari,
              tanggal: tanggalString,
              hadir: 0,
              terlambat: 0,
              izinSakit: 0,
              alpa: 0,
            });
            continue;
          }

          // ── Hari ini & hari yang sudah lewat: hitung dari data DB ──
          const isToday = tanggalString === todayString;

          const dataHariIni = absensiMingguIni.filter(
            (item) => item.tanggal === tanggalString,
          );

          const uniqueUsers = new Map<string, Absensi>();
          dataHariIni.forEach((item) => {
            const uid = String(
              item.peserta_magang_id || item.karyawan_os_id || item.id,
            );
            uniqueUsers.set(uid, item);
          });

          const records = Array.from(uniqueUsers.values());

          let hadir = 0;
          let terlambat = 0;
          let izinSakit = 0;
          let alpa = 0;

          const absenUserIds = new Set(
            records.map((r) =>
              String(r.peserta_magang_id || r.karyawan_os_id || r.id),
            ),
          );

          records.forEach((item) => {
            if (isStatusIzin(item.status)) {
              izinSakit++;
              return;
            }
            if (isStatusAlpa(item.status)) {
              alpa++;
              return;
            }
            if (isStatusTerlambat(item)) {
              terlambat++;
              return;
            }
            if (isStatusHadir(item)) {
              hadir++;
            }
          });

          // Hitung alpa:
          // - Hari yang sudah lewat: user aktif yang tidak tercatat = alpa
          // - Hari ini: hanya alpa dari yang sudah presensi (jangan paksa semua user belum absen = alpa)
          let calculatedAlpa = alpa;
          if (!isToday) {
            // Hari lampau: user yang tidak muncul di DB = alpa
            calculatedAlpa =
              totalActiveUsers > 0
                ? Math.max(0, totalActiveUsers - absenUserIds.size)
                : alpa;
          }
          // Hari ini: pakai alpa dari record saja (tidak paksa user yang belum absen sebagai alpa)

          const total = hadir + terlambat + izinSakit + calculatedAlpa;

          statistik.push({
            hari,
            tanggal: tanggalString,
            hadir: total > 0 ? Math.round((hadir / total) * 100) : 0,
            terlambat: total > 0 ? Math.round((terlambat / total) * 100) : 0,
            izinSakit: total > 0 ? Math.round((izinSakit / total) * 100) : 0,
            alpa: total > 0 ? Math.round((calculatedAlpa / total) * 100) : 0,
          });
        }

        setData(statistik);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error("Gagal mengambil statistik absensi:", err);

        setError("Gagal memuat statistik presensi.");
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();

    return () => controller.abort();
  }, [role]);

  const chartData = data.map((item) => ({
    name: item.hari,
    tanggal: item.tanggal,
    hadir: item.hadir,
    terlambat: item.terlambat,
    izin: item.izinSakit,
    alpa: item.alpa,
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {/* <BarChart3 className="w-5 h-5 text-primary" /> */}
          <h3 className="font-extrabold text-base text-foreground">
            Diagram Batang Presensi Mingguan
          </h3>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          Persentase Presensi (%)
        </span>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="w-full h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Spinner />
          </div>
        </div>
      ) : error ? (
        <div className="w-full h-[300px] flex items-center justify-center">
          <p className="text-xs font-semibold text-red-500">{error}</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="w-full h-[300px] flex items-center justify-center">
          <p className="text-xs text-foreground">Tidak ada data statistik</p>
        </div>
      ) : (
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              barGap={2}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/60"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />

              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                width={50}
                className="fill-muted-foreground"
              />

              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.25 }}
                wrapperStyle={{ outline: "none" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const items = [
                      { label: "Hadir", value: d.hadir, color: "#16a34a" },
                      {
                        label: "Terlambat",
                        value: d.terlambat,
                        color: "#d97706",
                      },
                      {
                        label: "Izin / Sakit",
                        value: d.izin,
                        color: "#2563eb",
                      },
                      { label: "Tanpa Ket.", value: d.alpa, color: "#dc2626" },
                    ];
                    return (
                      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-3.5 shadow-xl min-w-[165px] space-y-2">
                        <p className="font-extrabold text-xs text-foreground pb-1 border-b border-border">
                          {label}{" "}
                          <span className="font-normal text-[11px] text-muted-foreground">
                            ({formatDisplayDate(d.tanggal)})
                          </span>
                        </p>
                        <div className="space-y-1.5 text-xs font-semibold">
                          {items.map((it) => (
                            <div
                              key={it.label}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm"
                                  style={{ backgroundColor: it.color }}
                                />
                                <span className="text-muted-foreground">
                                  {it.label}:
                                </span>
                              </div>
                              <span
                                className="font-bold"
                                style={{ color: it.color }}
                              >
                                {it.value}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "16px" }}
                content={() => (
                  <div className="flex flex-wrap items-center justify-end gap-3 pb-2">
                    {[
                      { label: "Hadir", color: "#16a34a" },
                      { label: "Terlambat", color: "#d97706" },
                      { label: "Izin", color: "#2563eb" },
                      { label: "Tanpa Ket.", color: "#dc2626" },
                    ].map((it) => (
                      <div key={it.label} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: it.color }}
                        />
                        <span className="text-[11px] font-bold text-foreground">
                          {it.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />

              {/* Hadir — Hijau */}
              <Bar
                dataKey="hadir"
                name="Hadir"
                fill="#16a34a"
                radius={[3, 3, 0, 0]}
                barSize={14}
                animationDuration={800}
                minPointSize={1}
              />

              {/* Terlambat — Oranye */}
              <Bar
                dataKey="terlambat"
                name="Terlambat"
                fill="#d97706"
                radius={[3, 3, 0, 0]}
                barSize={14}
                animationDuration={800}
                minPointSize={1}
              />

              {/* Izin — Biru */}
              <Bar
                dataKey="izin"
                name="Izin"
                fill="#2563eb"
                radius={[3, 3, 0, 0]}
                barSize={14}
                animationDuration={800}
                minPointSize={1}
              />

              {/* Tanpa Keterangan / Alpa — Merah */}
              <Bar
                dataKey="alpa"
                name="Tanpa Ket."
                fill="#dc2626"
                radius={[3, 3, 0, 0]}
                barSize={14}
                animationDuration={800}
                minPointSize={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
