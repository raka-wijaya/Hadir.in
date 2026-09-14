"use client";

import React, { useEffect, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConfirmModal } from "@/components/ui/Alert";

import type { HariLibur } from "@/types";

import {
  Settings,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  CalendarDays,
  CalendarRange,
  Phone,
  AlertCircle,
  Clock,
  X,
  RefreshCw,
  Check,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

type LiburTipe = "Nasional" | "Khusus";

type StatusTanggal =
  | "HARI_KERJA"
  | "LIBUR"
  | "INVALID";

export default function AdminPengaturanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deleteHolidayIndex, setDeleteHolidayIndex] =
    useState<number | null>(null);
  const [jamMasuk, setJamMasuk] =
    useState<string>("07:30");
  const [jamPulang, setJamPulang] =
    useState<string>("16:00");
  const [jamPulangJumat, setJamPulangJumat] =
    useState<string>("14:00");
  const [toleransi, setToleransi] =
    useState<number>(15);
  const [hariKerja, setHariKerja] =
    useState<string[]>([
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
    ]);
  const [noWaMagang, setNoWaMagang] =
    useState<string>("");
  const [noWaOS, setNoWaOS] =
    useState<string>("");
  const [hariLiburList, setHariLiburList] =
    useState<HariLibur[]>([]);
  const [newLiburTanggal, setNewLiburTanggal] =
    useState<string>("");
  const [newLiburKet, setNewLiburKet] =
    useState<string>("");
  const [newLiburTipe, setNewLiburTipe] =
    useState<LiburTipe>("Nasional");
  const [editingIndex, setEditingIndex] =
    useState<number | null>(null);
  const [editTanggal, setEditTanggal] =
    useState<string>("");
  const [editKet, setEditKet] =
    useState<string>("");
  const [editTipe, setEditTipe] =
    useState<LiburTipe>("Nasional");
  const [tanggalBuka, setTanggalBuka] =
    useState<string>("2026-08-01");

  const [tanggalTutup, setTanggalTutup] =
    useState<string>("2026-08-31");

  const [aktifManual, setAktifManual] =
    useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const allDays: string[] = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];
  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToastMsg({
      type,
      message,
    });

    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  const toInputDate = (
    value: unknown
  ): string => {
    if (!value) {
      return "";
    }

    if (value instanceof Date) {
      return new Intl.DateTimeFormat(
        "sv-SE",
        {
          timeZone: "Asia/Jakarta",
        }
      ).format(value);
    }

    const tanggal = String(value).trim();

    if (!tanggal) {
      return "";
    }

    const ddmmyyyy = tanggal.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

    if (ddmmyyyy) {
      const [
        ,
        day,
        month,
        year,
      ] = ddmmyyyy;

      return `${year}-${month}-${day}`;
    }
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        tanggal
      )
    ) {
      return tanggal;
    }

    if (
      /^\d{4}-\d{2}-\d{2}T/.test(
        tanggal
      )
    ) {
      return tanggal.slice(0, 10);
    }

    return tanggal.slice(0, 10);
  };

  const normalizeDate = (
    value: unknown
  ): string => {
    return toInputDate(value);
  };

  const formatTanggalIndonesia = (
    value: unknown
  ): string => {
    const normalized =
      normalizeDate(value);

    if (!normalized) {
      return "";
    }

    const match = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!match) {
      return normalized;
    }

    const [
      ,
      year,
      month,
      day,
    ] = match;

    return `${day}-${month}-${year}`;
  };

  const toApiDate = (
    value: unknown
  ): string => {
    if (!value) {
      return "";
    }

    const tanggal =
      normalizeDate(value);

    if (!tanggal) {
      return "";
    }

    const match = tanggal.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (match) {
      const [
        ,
        year,
        month,
        day,
      ] = match;

      return `${day}-${month}-${year}`;
    }

    return tanggal;
  };

  const getTodayWIB = (): string => {
    return new Intl.DateTimeFormat(
      "sv-SE",
      {
        timeZone: "Asia/Jakarta",
      }
    ).format(new Date());
  };

  const getNamaHari = (
    tanggal: string
  ): string => {
    const normalized =
      normalizeDate(tanggal);

    if (!normalized) {
      return "";
    }

    const date = new Date(
      `${normalized}T00:00:00`
    );

    const hariMap: Record<
      number,
      string
    > = {
      0: "Minggu",
      1: "Senin",
      2: "Selasa",
      3: "Rabu",
      4: "Kamis",
      5: "Jumat",
      6: "Sabtu",
    };

    return (
      hariMap[date.getDay()] ?? ""
    );
  };

  const getHariLiburByTanggal = (
    tanggal: string
  ): HariLibur | null => {
    const targetDate =
      normalizeDate(tanggal);

    if (!targetDate) {
      return null;
    }

    const found =
      hariLiburList.find(
        (item) =>
          normalizeDate(
            item.tanggal
          ) === targetDate
      );

    return found ?? null;
  };

  const isTanggalLibur = (
    tanggal: string
  ): boolean => {
    return (
      getHariLiburByTanggal(
        tanggal
      ) !== null
    );
  };

  const getStatusTanggal = (
    tanggal: string
  ): {
    status: StatusTanggal;
    keterangan: string;
    tipe: string;
  } => {
    const normalized =
      normalizeDate(tanggal);

    if (!normalized) {
      return {
        status: "INVALID",
        keterangan: "",
        tipe: "",
      };
    }

    const hariLibur =
      getHariLiburByTanggal(
        normalized
      );

    if (hariLibur) {
      return {
        status: "LIBUR",
        keterangan:
          hariLibur.keterangan ||
          "Hari libur",
        tipe:
          hariLibur.tipe ||
          "Khusus",
      };
    }

    const namaHari =
      getNamaHari(normalized);

    if (
      !hariKerja.includes(
        namaHari
      )
    ) {
      return {
        status: "LIBUR",
        keterangan: `${namaHari} bukan hari kerja`,
        tipe: "Mingguan",
      };
    }

    return {
      status: "HARI_KERJA",
      keterangan: "",
      tipe: "",
    };
  };

  const getStatusHariIni = () => {
    const today =
      getTodayWIB();

    const status =
      getStatusTanggal(
        today
      );

    return {
      tanggal: today,
      namaHari:
        getNamaHari(today),
      ...status,
    };
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const res =
        await fetch(
          "/api/settings",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await res.json();

      if (
        !res.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Gagal memuat pengaturan."
        );
      }

      const settings =
        data.settings;

      if (!settings) {
        throw new Error(
          "Data pengaturan tidak ditemukan."
        );
      }

      setJamMasuk(
        settings.jam_masuk_standar ||
          "07:30"
      );

      setJamPulang(
        settings.jam_pulang_standar ||
          "16:00"
      );

      setJamPulangJumat(
        settings.jam_pulang_jumat ||
          "14:00"
      );

      setToleransi(
        Number(
          settings.batas_toleransi_menit ??
            15
        )
      );

      if (
        Array.isArray(
          settings.hari_kerja
        )
      ) {
        setHariKerja(
          settings.hari_kerja
        );
      } else {
        setHariKerja([
          "Senin",
          "Selasa",
          "Rabu",
          "Kamis",
          "Jumat",
        ]);
      }

      setNoWaMagang(
        settings.no_wa_admin_magang ||
          ""
      );

      setNoWaOS(
        settings.no_wa_admin_os ||
          ""
      );

      setTanggalBuka(
        toInputDate(
          settings.tanggal_buka ||
            "01-08-2026"
        )
      );

      setTanggalTutup(
        toInputDate(
          settings.tanggal_tutup ||
            "31-08-2026"
        )
      );

      setAktifManual(
        Boolean(
          settings.aktif_manual ??
            true
        )
      );

      if (
        Array.isArray(
          settings.hari_libur
        )
      ) {
        const normalized =
          settings.hari_libur.map(
            (
              item: HariLibur,
              index: number
            ): HariLibur => ({
              id:
                item.id ??
                `server-${index}-${item.tanggal}`,

              tanggal:
                normalizeDate(
                  item.tanggal
                ),

              keterangan:
                item.keterangan ||
                "",

              tipe:
                item.tipe ===
                "Khusus"
                  ? "Khusus"
                  : "Nasional",
            })
          );

        setHariLiburList(
          normalized.sort(
            (a: any, b: any) =>
              normalizeDate(
                a.tanggal
              ).localeCompare(
                normalizeDate(
                  b.tanggal
                )
              )
          )
        );
      } else {
        setHariLiburList([]);
      }
    } catch (
      error: unknown
    ) {
      console.error(
        "Gagal load settings:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Gagal memuat pengaturan.";

      showToast(
        message,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleDay = (day: string) => {
    setHariKerja((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day);
      }

      return [...prev, day];
    });
  };
  const handleAddLibur = () => {
    if (
      !newLiburTanggal ||
      !newLiburKet.trim()
    ) {
      showToast(
        "Tanggal dan keterangan hari libur wajib diisi.",
        "error"
      );

      return;
    }

    const normalizedTanggal =
      normalizeDate(
        newLiburTanggal
      );

    if (!normalizedTanggal) {
      showToast(
        "Format tanggal tidak valid.",
        "error"
      );

      return;
    }

    const duplicate =
      hariLiburList.some(
        (item) =>
          normalizeDate(
            item.tanggal
          ) ===
          normalizedTanggal
      );

    if (duplicate) {
      showToast(
        "Tanggal hari libur tersebut sudah terdaftar.",
        "error"
      );

      return;
    }

    // ==========================================================
    // DATA BARU
    // ==========================================================

    const newItem: HariLibur = {
      id: `temp-${Date.now()}`,

      tanggal:
        normalizedTanggal,

      keterangan:
        newLiburKet.trim(),

      tipe:
        newLiburTipe,
    };

    setHariLiburList(
      (prev) =>
        [
          ...prev,
          newItem,
        ].sort(
          (a, b) =>
            normalizeDate(
              a.tanggal
            ).localeCompare(
              normalizeDate(
                b.tanggal
              )
            )
        )
    );

    setNewLiburTanggal("");
    setNewLiburKet("");
    setNewLiburTipe(
      "Nasional"
    );

    showToast(
      `Hari libur ${formatTanggalIndonesia(
        normalizedTanggal
      )} berhasil ditambahkan. Klik Simpan untuk menyimpan ke database.`
    );
  };

  const openEditModal = (
    item: HariLibur,
    index: number
  ) => {
    setEditingIndex(index);

    setEditTanggal(
      normalizeDate(
        item.tanggal
      )
    );

    setEditKet(
      item.keterangan || ""
    );

    setEditTipe(
      item.tipe === "Khusus"
        ? "Khusus"
        : "Nasional"
    );
  };

  const handleSaveEditLibur = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      editingIndex === null
    ) {
      return;
    }

    if (
      !editTanggal ||
      !editKet.trim()
    ) {
      showToast(
        "Tanggal dan keterangan wajib diisi.",
        "error"
      );

      return;
    }

    const normalizedTanggal =
      normalizeDate(
        editTanggal
      );

    const duplicate =
      hariLiburList.some(
        (
          item,
          index
        ) =>
          index !==
            editingIndex &&
          normalizeDate(
            item.tanggal
          ) ===
            normalizedTanggal
      );

    if (duplicate) {
      showToast(
        "Tanggal hari libur tersebut sudah terdaftar.",
        "error"
      );

      return;
    }

    setHariLiburList(
      (prev) =>
        prev
          .map(
            (
              item,
              index
            ) =>
              index ===
              editingIndex
                ? {
                    ...item,
                    tanggal:
                      normalizedTanggal,
                    keterangan:
                      editKet.trim(),
                    tipe:
                      editTipe,
                  }
                : item
          )
          .sort(
            (a, b) =>
              normalizeDate(
                a.tanggal
              ).localeCompare(
                normalizeDate(
                  b.tanggal
                )
              )
          )
    );

    setEditingIndex(null);
    setEditTanggal("");
    setEditKet("");
    setEditTipe(
      "Nasional"
    );

    showToast(
      `Hari libur ${formatTanggalIndonesia(
        normalizedTanggal
      )} berhasil diperbarui. Klik Simpan untuk menyimpan perubahan.`
    );
  };

  const handleHapusHariLibur = (
    index: number
  ) => {
    const item =
      hariLiburList[index];

    if (!item) {
      return;
    }

    setHariLiburList(
      (prev) =>
        prev.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    );

    showToast(
      `Hari libur ${formatTanggalIndonesia(
        item.tanggal
      )} dihapus dari daftar. Klik Simpan untuk menyimpan perubahan.`
    );
  };

  const isSystemOpen = () => {
    if (
      !tanggalBuka ||
      !tanggalTutup
    ) {
      return false;
    }

    if (!aktifManual) {
      return false;
    }

    const today =
      getTodayWIB();

    return (
      today >= tanggalBuka &&
      today <= tanggalTutup
    );
  };

  const systemStatus =
    isSystemOpen();

  const statusHariIni =
    getStatusHariIni();

  const handleSaveAll = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !tanggalBuka ||
      !tanggalTutup
    ) {
      showToast(
        "Tanggal buka dan tanggal tutup wajib diisi.",
        "error"
      );

      return;
    }

    if (
      tanggalTutup <
      tanggalBuka
    ) {
      showToast(
        "Tanggal tutup tidak boleh lebih awal dari tanggal buka.",
        "error"
      );

      return;
    }

    if (
      !Number.isInteger(
        toleransi
      ) ||
      toleransi < 0
    ) {
      showToast(
        "Batas toleransi harus berupa angka bulat 0 atau lebih.",
        "error"
      );

      return;
    }

    for (
      const item of hariLiburList
    ) {
      if (!item.tanggal) {
        showToast(
          "Tanggal hari libur wajib diisi.",
          "error"
        );

        return;
      }

      if (
        !item.keterangan?.trim()
      ) {
        showToast(
          "Keterangan hari libur wajib diisi.",
          "error"
        );

        return;
      }
    }

    try {
      setIsSaving(true);

      const normalizedHariLibur =
        hariLiburList.map(
          (item) => ({
            tanggal:
              toApiDate(
                item.tanggal
              ),

            keterangan:
              String(
                item.keterangan ||
                  ""
              ).trim(),

            tipe:
              item.tipe ===
              "Khusus"
                ? "Khusus"
                : "Nasional",
          })
        );

      const res =
        await fetch(
          "/api/settings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              jam_masuk_standar:
                jamMasuk,

              jam_pulang_standar:
                jamPulang,

              jam_pulang_jumat:
                jamPulangJumat,

              batas_toleransi_menit:
                toleransi,

              hari_kerja:
                hariKerja,

              no_wa_admin_magang:
                noWaMagang ||
                null,

              no_wa_admin_os:
                noWaOS ||
                null,

              tanggal_buka:
                toApiDate(
                  tanggalBuka
                ),

              tanggal_tutup:
                toApiDate(
                  tanggalTutup
                ),

              aktif_manual:
                aktifManual,

              hari_libur:
                normalizedHariLibur,
            }),
          }
        );

      const result =
        await res.json();

      if (
        !res.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Gagal menyimpan pengaturan."
        );
      }

      showToast(
        "Seluruh pengaturan berhasil disimpan ke database."
      );

      await loadSettings();
    } catch (
      error: unknown
    ) {
      console.error(
        "Save settings error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan pengaturan.";

      showToast(
        message,
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ConfirmModal
          isOpen={deleteHolidayIndex !== null}
          title="Hapus Hari Libur"
          message={`Apakah Anda yakin ingin menghapus hari libur "${deleteHolidayIndex !== null ? hariLiburList[deleteHolidayIndex]?.keterangan : ""}"?`}
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          confirmColor="red"
          onConfirm={() => {
            if (deleteHolidayIndex !== null) {
              const idx = deleteHolidayIndex;
              setDeleteHolidayIndex(null);
              handleHapusHariLibur(idx);
            }
          }}
          onCancel={() => setDeleteHolidayIndex(null)}
        />

        <div className="bg-card border border-border p-4 rounded-2xl shadow-card space-y-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground">
                Pengaturan Presensi & Sistem
              </h1>
            </div>

            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Konfigurasi jam kerja, hari kerja, periode pendaftaran, kontak
              admin, dan hari libur.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-border bg-input hover:bg-accent text-xs font-bold text-foreground flex items-center gap-1.5 transition-all self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoading ? "animate-spin text-primary" : ""
              }`}
            />

            <span>Muat Ulang</span>
          </button>
        </div>


        {toastMsg && (
          <div
            className={`rounded-2xl p-4 flex items-center justify-between text-xs font-bold animate-in fade-in ${
              toastMsg.type === "error"
                ? "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300"
                : "bg-primary/15 border border-primary/30 text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              )}

              <span>{toastMsg.message}</span>
            </div>

            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="hover:underline ml-4 shrink-0 font-extrabold"
            >
              Tutup
            </button>
          </div>
        )}

        {!isLoading && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  Status Hari Ini
                </p>

                <h3 className="text-lg font-black text-foreground mt-1">
                  {statusHariIni.namaHari},{" "}
                  {formatTanggalIndonesia(statusHariIni.tanggal)}
                </h3>

                <p className="text-[11px] text-muted-foreground mt-1">
                  Zona waktu: Asia/Jakarta (WIB)
                </p>
              </div>

              <span
                className={`px-3 py-1.5 rounded-full text-xs font-black ${
                  statusHariIni.status === "LIBUR"
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20"
                    : "bg-primary/15 text-primary border border-primary/20"
                }`}
              >
                {statusHariIni.status === "LIBUR" ? "LIBUR" : "HARI KERJA"}
              </span>
            </div>

            {statusHariIni.status === "LIBUR" && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />

                  <div>
                    <p className="text-sm font-black text-red-600 dark:text-red-400">
                      {statusHariIni.keterangan}
                    </p>

                    <p className="text-[11px] text-muted-foreground mt-1">
                      Tipe: <strong>{statusHariIni.tipe}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {statusHariIni.status === "HARI_KERJA" && (
              <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />

                  <div>
                    <p className="text-sm font-black text-foreground">
                      Hari ini merupakan hari kerja.
                    </p>

                    <p className="text-[11px] text-muted-foreground mt-1">
                      Tidak ditemukan tanggal hari libur untuk hari ini.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="font-extrabold text-base text-foreground border-b border-border pb-3 flex items-center gap-2">
              <span>Jam Kerja Standar &amp; Toleransi</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Jam Masuk Standar
                </label>

                <input
                  type="time"
                  required
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Jam Pulang Standar
                </label>

                <input
                  type="time"
                  required
                  value={jamPulang}
                  onChange={(e) => setJamPulang(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Jam Pulang Jumat
                </label>

                <input
                  type="time"
                  required
                  value={jamPulangJumat}
                  onChange={(e) => setJamPulangJumat(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Toleransi Keterlambatan
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={toleransi}
                    onChange={(e) => setToleransi(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2 pr-14 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    Menit
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <span>Jadwal Hari Kerja Mingguan</span>
              </h3>

              <p className="text-[11px] text-muted-foreground mt-0.5">
                Hari libur berdasarkan tanggal tertentu tetap menjadi
                pengecualian.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {allDays.map((day) => {
                const isSelected = hariKerja.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl text-xs font-extrabold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? "bg-primary/15 text-primary border-primary/50 shadow-card ring-1 ring-primary/20"
                        : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:bg-muted/70"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span className="font-black text-sm">{day}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isSelected ? "Hari Kerja" : "Libur"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==================================================
              PERIODE PENDAFTARAN
          ================================================== */}

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CalendarRange className="w-5 h-5 text-primary" />

              <div>
                <h3 className="font-extrabold text-base text-foreground">
                  Periode Pendaftaran Magang
                </h3>

                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Atur jadwal buka dan tutup pendaftaran.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                Status Sistem Real Time
              </span>

              <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/40">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`relative flex w-3.5 h-3.5 shrink-0 rounded-full ${
                      systemStatus ? "bg-primary" : "bg-red-500"
                    }`}
                  >
                    {systemStatus && (
                      <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                    )}
                  </span>

                  <div>
                    <h4 className="font-black text-base text-foreground">
                      {systemStatus
                        ? "Pendaftaran Dibuka"
                        : "Pendaftaran Ditutup"}
                    </h4>

                    <p className="text-xs text-muted-foreground">
                      {systemStatus
                        ? "Pendaftaran magang aktif."
                        : "Pendaftaran magang ditutup."}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    systemStatus
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}
                >
                  {systemStatus ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Tanggal Buka Pendaftaran
                </label>

                <input
                  type="date"
                  required
                  value={tanggalBuka}
                  onChange={(e) => setTanggalBuka(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                />

                <p className="text-[10px] text-muted-foreground font-semibold">
                  {formatTanggalIndonesia(tanggalBuka)}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  Tanggal Tutup Pendaftaran
                </label>

                <input
                  type="date"
                  required
                  min={tanggalBuka}
                  value={tanggalTutup}
                  onChange={(e) => setTanggalTutup(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                />

                <p className="text-[10px] text-muted-foreground font-semibold">
                  {formatTanggalIndonesia(tanggalTutup)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/40">
              <div>
                <label
                  htmlFor="toggle-manual"
                  className="text-xs font-extrabold text-foreground cursor-pointer"
                >
                  Status Manual (Aktifkan / Tutup Manual)
                </label>

                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Jika dinonaktifkan, pendaftaran otomatis ditutup.
                </p>
              </div>

              <input
                id="toggle-manual"
                type="checkbox"
                checked={aktifManual}
                onChange={(e) => setAktifManual(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer rounded shrink-0"
              />
            </div>
          </div>

          {/* ==================================================
              WHATSAPP
          ================================================== */}

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="font-extrabold text-base text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span>Kontak WhatsApp Admin</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  No. WA Admin Magang
                </label>

                <input
                  type="text"
                  value={noWaMagang}
                  onChange={(e) => setNoWaMagang(e.target.value)}
                  placeholder="081234567891"
                  maxLength={20}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-foreground">
                  No. WA Admin OS
                </label>

                <input
                  type="text"
                  value={noWaOS}
                  onChange={(e) => setNoWaOS(e.target.value)}
                  placeholder="081234567892"
                  maxLength={20}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* ==================================================
              HARI LIBUR
          ================================================== */}

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>Kelola Hari Libur Nasional &amp; Khusus</span>
              </h3>

              <p className="text-[11px] text-muted-foreground mt-0.5">
                Hari libur hanya berlaku pada tanggal yang didaftarkan.
              </p>
            </div>

            {/* ==================================================
                TAMBAH HARI LIBUR
            ================================================== */}

            <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-3">
              <span className="text-xs font-extrabold text-foreground block">
                Tambah Hari Libur Baru
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <input
                    type="date"
                    value={newLiburTanggal}
                    onChange={(e) => setNewLiburTanggal(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                  />

                  {newLiburTanggal && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono font-bold">
                      {formatTanggalIndonesia(newLiburTanggal)}
                    </p>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Keterangan Libur"
                  value={newLiburKet}
                  onChange={(e) => setNewLiburKet(e.target.value)}
                  className="rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <select
                  value={newLiburTipe}
                  onChange={(e) => setNewLiburTipe(e.target.value as LiburTipe)}
                  className="rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                >
                  <option value="Nasional">Nasional</option>
                  <option value="Khusus">Keagamaan</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddLibur}
                  className="py-2 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-1 shadow-card cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* ==================================================
                TABEL HARI LIBUR
            ================================================== */}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-extrabold">Tanggal</th>
                    <th className="py-2.5 px-3 font-extrabold">Hari</th>
                    <th className="py-2.5 px-3 font-extrabold">Keterangan</th>
                    <th className="py-2.5 px-3 font-extrabold">Tipe</th>
                    <th className="py-2.5 px-3 font-extrabold text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {hariLiburList.length > 0 ? (
                    hariLiburList.map((item, index) => (
                      <tr
                        key={item.id ?? `${item.tanggal}-${index}`}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        {/* TANGGAL */}
                        <td className="py-2.5 px-3 font-bold text-foreground font-mono whitespace-nowrap">
                          {formatTanggalIndonesia(item.tanggal)}
                        </td>

                        {/* HARI */}
                        <td className="py-2.5 px-3 font-bold text-foreground whitespace-nowrap">
                          {getNamaHari(item.tanggal)}
                        </td>

                        {/* KETERANGAN */}
                        <td className="py-2.5 px-3 text-foreground font-semibold">
                          {item.keterangan}
                        </td>

                        {/* TIPE */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.tipe === "Nasional"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {item.tipe}
                          </span>
                        </td>

                        {/* AKSI */}
                        <td className="py-2.5 px-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item, index)}
                            className="p-1.5 rounded-lg border border-border bg-input hover:bg-accent text-foreground hover:text-primary transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteHolidayIndex(index)}
                            className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all inline-flex items-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Belum ada data hari libur yang tersimpan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================================================
              SAVE
          ================================================== */}

          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-card min-h-[50px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? <Spinner size="md" /> : <Save className="w-4 h-4" />}

            <span>
              {isSaving
                ? "Menyimpan Pengaturan..."
                : "Simpan Seluruh Pengaturan Sistem"}
            </span>
          </button>
        </form>

        {/* ====================================================
            MODAL EDIT
        ==================================================== */}

        {editingIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleSaveEditLibur}
              className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-elevated space-y-4 animate-in zoom-in-95"
            >
              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-black text-base text-foreground flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-primary" />

                  <span>Edit Hari Libur</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FORM */}

              <div className="space-y-3 text-xs">
                {/* TANGGAL */}

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground">
                    Tanggal Libur *
                  </label>

                  <input
                    type="date"
                    required
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  {editTanggal && (
                    <p className="text-[10px] text-muted-foreground font-mono font-bold">
                      Tampilan: {formatTanggalIndonesia(editTanggal)}
                    </p>
                  )}
                </div>

                {/* KETERANGAN */}

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground">
                    Keterangan Libur *
                  </label>

                  <input
                    type="text"
                    required
                    value={editKet}
                    onChange={(e) => setEditKet(e.target.value)}
                    placeholder="Contoh: Hari Raya Idul Fitri"
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                  />
                </div>

                {/* TIPE */}

                <div className="space-y-1">
                  <label className="font-extrabold text-foreground">
                    Tipe Libur *
                  </label>

                  <select
                    value={editTipe}
                    onChange={(e) => setEditTipe(e.target.value as LiburTipe)}
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                  >
                    <option value="Nasional">Nasional</option>

                    <option value="Khusus">Khusus</option>
                  </select>
                </div>
              </div>

              {/* ACTION */}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border bg-secondary font-extrabold text-xs hover:bg-accent"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-card"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}