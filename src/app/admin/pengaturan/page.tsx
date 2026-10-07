"use client";

import React, { useEffect, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { showNotification, showConfirm } from "@/components/ui/NotificationProvider";

import type { HariLibur } from "@/types";

import {
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  CalendarDays,
  CalendarRange,
  Phone,
  AlertCircle,
  X,
  RefreshCw,
  Check,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

const getApiBaseUrl = (): string => {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_LARAVEL_API;

  if (envUrl?.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Fallback hanya untuk development lokal.
  // Jangan gunakan 127.0.0.1 untuk production jika Laravel berada di server lain.
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000/api";
    }

    // Jika Next.js dan Laravel berjalan pada host yang sama.
    return `${window.location.protocol}//${hostname}:8000/api`;
  }

  return "http://127.0.0.1:8000/api";
};

const API_URL = getApiBaseUrl();
const API_PENGATURAN = `${API_URL}/pengaturan-sistem`;

const normalizeTimeForApi = (time: string): string => {
  if (!time) return "00:00:00";

  const value = String(time).trim();
  const parts = value.split(":");

  const hour = (parts[0] || "00").padStart(2, "0");
  const minute = (parts[1] || "00").padStart(2, "0");
  const second = (parts[2] || "00").padStart(2, "0");

  return `${hour}:${minute}:${second}`;
};


type ApiRequestOptions = RequestInit & {
  body?: BodyInit | null;
};

const requestLaravel = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_URL}/${endpoint.replace(/^\/+/, "")}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const originalMessage =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Tidak dapat terhubung ke server Laravel. URL API: ${url}. ` +
        `Pastikan Laravel berjalan, URL API benar, dan CORS Laravel mengizinkan origin Next.js. ` +
        `Detail: ${originalMessage}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let data: any = null;

  if (rawText) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (data?.errors
        ? Object.values(data.errors).flat().join(", ")
        : null) ||
      (typeof data === "string" && data.trim() ? data : null) ||
      `Request Laravel gagal dengan status ${response.status} ${response.statusText}.`;

    throw new Error(message);
  }

  return data as T;
};

type LiburTipe = "Nasional" | "Khusus";

type StatusTanggal = "HARI_KERJA" | "LIBUR" | "INVALID";

export default function AdminPengaturanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ID pengaturan dari Laravel
  const [pengaturanId, setPengaturanId] = useState<number | null>(null);

  const [jamMasuk, setJamMasuk] = useState<string>("07:30");
  const [jamPulang, setJamPulang] = useState<string>("16:00");
  const [jamPulangJumat, setJamPulangJumat] = useState<string>("14:00");
  const [toleransi, setToleransi] = useState<number>(15);
  const [hariKerja, setHariKerja] = useState<string[]>([
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
  ]);
  const [noWaMagang, setNoWaMagang] = useState<string>("");
  const [noWaOS, setNoWaOS] = useState<string>("");
  const [batch, setBatch] = useState<number | null>(null);
  const [hariLiburList, setHariLiburList] = useState<HariLibur[]>([]);

  // Form tambah hari libur
  const [newLiburTanggal, setNewLiburTanggal] = useState<string>("");
  const [newLiburKet, setNewLiburKet] = useState<string>("");
  const [newLiburTipe, setNewLiburTipe] = useState<LiburTipe>("Nasional");

  // Edit hari libur
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTanggal, setEditTanggal] = useState<string>("");
  const [editKet, setEditKet] = useState<string>("");
  const [editTipe, setEditTipe] = useState<LiburTipe>("Nasional");

  // Loading aksi hari libur
  const [isAddingLibur, setIsAddingLibur] = useState<boolean>(false);
  const [isSavingEditLibur, setIsSavingEditLibur] = useState<boolean>(false);
  const [deletingLiburId, setDeletingLiburId] = useState<string | null>(null);
  const [isDeletingPengaturan, setIsDeletingPengaturan] = useState<boolean>(false);
  const [isSavingPeriode, setIsSavingPeriode] = useState<boolean>(false);

  const [tanggalBuka, setTanggalBuka] = useState<string>("2026-08-01");
  const [tanggalTutup, setTanggalTutup] = useState<string>("2026-08-31");
  const [aktifManual, setAktifManual] = useState<boolean>(true);

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
    showNotification({ type, message });
  };

  const toInputDate = (value: unknown): string => {
    if (!value) return "";

    if (value instanceof Date) {
      return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
      }).format(value);
    }

    const tanggal = String(value).trim();
    if (!tanggal) return "";

    const ddmmyyyy = tanggal.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month}-${day}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return tanggal;
    if (/^\d{4}-\d{2}-\d{2}T/.test(tanggal)) return tanggal.slice(0, 10);

    return tanggal.slice(0, 10);
  };

  const normalizeDate = (value: unknown): string => toInputDate(value);

  const formatTanggalIndonesia = (value: unknown): string => {
    const normalized = normalizeDate(value);
    if (!normalized) return "";
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return normalized;
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  };

  const toApiDate = (value: unknown): string => {
    if (!value) return "";
    return normalizeDate(value);
  };

  const getTodayWIB = (): string =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());

  const getNamaHari = (tanggal: string): string => {
    const normalized = normalizeDate(tanggal);
    if (!normalized) return "";
    const date = new Date(`${normalized}T00:00:00`);
    const hariMap: Record<number, string> = {
      0: "Minggu",
      1: "Senin",
      2: "Selasa",
      3: "Rabu",
      4: "Kamis",
      5: "Jumat",
      6: "Sabtu",
    };
    return hariMap[date.getDay()] ?? "";
  };

  const getHariLiburByTanggal = (tanggal: string): HariLibur | null => {
    const targetDate = normalizeDate(tanggal);
    if (!targetDate) return null;
    return (
      hariLiburList.find(
        (item) => normalizeDate(item.tanggal) === targetDate
      ) ?? null
    );
  };

  const getStatusTanggal = (
    tanggal: string
  ): { status: StatusTanggal; keterangan: string; tipe: string } => {
    const normalized = normalizeDate(tanggal);
    if (!normalized) return { status: "INVALID", keterangan: "", tipe: "" };

    const hariLibur = getHariLiburByTanggal(normalized);
    if (hariLibur) {
      return {
        status: "LIBUR",
        keterangan: hariLibur.keterangan || "Hari libur",
        tipe: hariLibur.tipe || "Khusus",
      };
    }

    const namaHari = getNamaHari(normalized);
    if (!hariKerja.includes(namaHari)) {
      return {
        status: "LIBUR",
        keterangan: `${namaHari} bukan hari kerja`,
        tipe: "Mingguan",
      };
    }

    return { status: "HARI_KERJA", keterangan: "", tipe: "" };
  };

  const getStatusHariIni = () => {
    const today = getTodayWIB();
    const status = getStatusTanggal(today);
    return { tanggal: today, namaHari: getNamaHari(today), ...status };
  };

  /**
   * Mengambil object pengaturan dari berbagai bentuk response Laravel.
   * Contoh yang didukung:
   * { id: 1, ... }
   * { data: { id: 1, ... } }
   * { data: [{ id: 1, ... }] }
   * { settings: { id: 1, ... } }
   */
  const unwrapSettingsResponse = (data: any): any | null => {
    let value = data;

    for (let i = 0; i < 5; i += 1) {
      if (value == null) return null;

      if (Array.isArray(value)) {
        return value.length > 0 ? value[value.length - 1] : null;
      }

      if (typeof value !== "object") return null;

      if (value.data !== undefined && value.data !== value) {
        value = value.data;
        continue;
      }

      if (value.settings !== undefined && value.settings !== value) {
        value = value.settings;
        continue;
      }

      if (value.pengaturan !== undefined && value.pengaturan !== value) {
        value = value.pengaturan;
        continue;
      }

      return value;
    }

    return null;
  };

  const parseJsonValue = (value: unknown): unknown => {
    if (typeof value !== "string") return value;

    const text = value.trim();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  };

  const normalizeTimeForInput = (
    value: unknown,
    fallback: string
  ): string => {
    if (value == null) return fallback;

    const text = String(value).trim();
    if (!text) return fallback;

    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return fallback;

    const hour = Math.min(23, Math.max(0, Number(match[1])));
    const minute = Math.min(59, Math.max(0, Number(match[2])));

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    const normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "on", "aktif"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "nonaktif", "inactive"].includes(normalized)) {
      return false;
    }

    return fallback;
  };

  const normalizeHariKerja = (value: unknown): string[] => {
    const parsed = parseJsonValue(value);

    if (Array.isArray(parsed)) {
      return Array.from(
        new Set(
          parsed
            .map((day: unknown) => String(day).trim())
            .filter((day: string) => allDays.includes(day))
        )
      );
    }

    if (parsed && typeof parsed === "object") {
      const objectValue = parsed as Record<string, unknown>;

      return Array.from(
        new Set(
          allDays.filter((day) => normalizeBoolean(objectValue[day], false))
        )
      );
    }

    if (typeof parsed === "string") {
      return Array.from(
        new Set(
          parsed
            .split(",")
            .map((day: string) =>
              day.trim().replace(/^[\[\]"']+|[\[\]"']+$/g, "")
            )
            .filter((day: string) => allDays.includes(day))
        )
      );
    }

    return [];
  };

  const normalizeHariLibur = (value: unknown): HariLibur[] => {
    const parsed = parseJsonValue(value);
    let source: unknown[] = [];

    if (Array.isArray(parsed)) {
      source = parsed;
    } else if (parsed && typeof parsed === "object") {
      const objectValue = parsed as Record<string, unknown>;

      // Mendukung format:
      // { Nasional: [...], Khusus: [...] }
      const grouped = [
        ...(Array.isArray(objectValue.Nasional)
          ? objectValue.Nasional.map((item) => ({
              ...(item as object),
              tipe: "Nasional",
            }))
          : []),
        ...(Array.isArray(objectValue.Khusus)
          ? objectValue.Khusus.map((item) => ({
              ...(item as object),
              tipe: "Khusus",
            }))
          : []),
      ];

      source = grouped.length > 0 ? grouped : [objectValue];
    }

    return source
      .map((rawItem: unknown, index: number): HariLibur | null => {
        if (!rawItem || typeof rawItem !== "object") return null;

        const item = rawItem as Record<string, unknown>;
        const tanggal = normalizeDate(item.tanggal);

        if (!tanggal) return null;

        return {
          id:
            item.id != null && String(item.id).trim()
              ? String(item.id)
              : `server-${index}-${tanggal}`,
          tanggal,
          keterangan: String(item.keterangan ?? item.nama ?? "").trim(),
          tipe: item.tipe === "Khusus" ? "Khusus" : "Nasional",
        };
      })
      .filter((item): item is HariLibur => item !== null)
      .sort((a, b) => normalizeDate(a.tanggal).localeCompare(normalizeDate(b.tanggal)));
  };

  const resetSettingsToDefault = () => {
    setPengaturanId(null);
    setJamMasuk("07:30");
    setJamPulang("16:00");
    setJamPulangJumat("14:00");
    setToleransi(15);
    setHariKerja(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]);
    setNoWaMagang("");
    setNoWaOS("");
    setBatch(null);
    setTanggalBuka("2026-08-01");
    setTanggalTutup("2026-08-31");
    setAktifManual(true);
    setHariLiburList([]);
  };

  const normalizeSettings = (data: any) => {
    const settings = unwrapSettingsResponse(data);

    if (!settings) {
      resetSettingsToDefault();
      return;
    }

    const id = Number(settings.id);
    setPengaturanId(Number.isFinite(id) && id > 0 ? id : null);

    setJamMasuk(
      normalizeTimeForInput(settings.jam_masuk_standar, "07:30")
    );
    setJamPulang(
      normalizeTimeForInput(settings.jam_pulang_standar, "16:00")
    );
    setJamPulangJumat(
      normalizeTimeForInput(settings.jam_pulang_jumat, "14:00")
    );

    const toleransiValue = Number(settings.batas_toleransi_menit);
    setToleransi(
      Number.isFinite(toleransiValue) && toleransiValue >= 0
        ? Math.floor(toleransiValue)
        : 15
    );

    const normalizedHariKerja = normalizeHariKerja(settings.hari_kerja);
    setHariKerja(
      normalizedHariKerja.length > 0
        ? normalizedHariKerja
        : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
    );

    setNoWaMagang(
      settings.no_wa_admin_magang == null
        ? ""
        : String(settings.no_wa_admin_magang)
    );
    setNoWaOS(
      settings.no_wa_admin_os == null ? "" : String(settings.no_wa_admin_os)
    );

    const batchVal = settings.batch;
    setBatch(
      batchVal !== null && batchVal !== undefined && batchVal !== "" && batchVal !== "-"
        ? Number(batchVal) || null
        : null
    );

    setTanggalBuka(
      toInputDate(settings.tanggal_buka) || "2026-08-01"
    );
    setTanggalTutup(
      toInputDate(settings.tanggal_tutup) || "2026-08-31"
    );
    setAktifManual(normalizeBoolean(settings.aktif_manual, true));

    setHariLiburList(normalizeHariLibur(settings.hari_libur));
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const data = await requestLaravel(API_PENGATURAN, {
        method: "GET",
      });

      normalizeSettings(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal memuat pengaturan.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    
  }, []);

  const handleToggleDay = (day: string) => {
    setHariKerja((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  const buildSavePayload = (
    overrides: Partial<{
      hari_libur: { tanggal: string; keterangan: string; tipe: string }[];
    }> = {}
  ) => {
    const normalizedHariLibur =
      overrides.hari_libur ??
      hariLiburList.map((item) => ({
        tanggal: toApiDate(item.tanggal),
        keterangan: String(item.keterangan || "").trim(),
        tipe: item.tipe === "Khusus" ? "Khusus" : "Nasional",
      }));

    return {
      jam_masuk_standar: normalizeTimeForApi(jamMasuk),
      jam_pulang_standar: normalizeTimeForApi(jamPulang),
      jam_pulang_jumat: normalizeTimeForApi(jamPulangJumat),
      batas_toleransi_menit: toleransi,
      hari_kerja: Array.from(
        new Set(
          hariKerja
            .map((day: string) => String(day).trim())
            .filter((day: string) => allDays.includes(day))
        )
      ),
      no_wa_admin_magang: noWaMagang || null,
      no_wa_admin_os: noWaOS || null,
      batch: batch ?? null,
      tanggal_buka: toApiDate(tanggalBuka),
      tanggal_tutup: toApiDate(tanggalTutup),
      aktif_manual: aktifManual,
      hari_libur: normalizedHariLibur,
    };
  };

  const handleAddLibur = async () => {
    if (!newLiburTanggal || !newLiburKet.trim()) {
      showToast("Tanggal dan keterangan hari libur wajib diisi.", "error");
      return;
    }

    const normalizedTanggal = normalizeDate(newLiburTanggal);
    if (!normalizedTanggal) {
      showToast("Format tanggal tidak valid.", "error");
      return;
    }

    const duplicate = hariLiburList.some(
      (item) => normalizeDate(item.tanggal) === normalizedTanggal
    );
    if (duplicate) {
      showToast("Tanggal hari libur tersebut sudah terdaftar.", "error");
      return;
    }

    try {
      setIsAddingLibur(true);

      const updatedList = [
        ...hariLiburList.map((item) => ({
          tanggal: toApiDate(item.tanggal),
          keterangan: item.keterangan,
          tipe: item.tipe,
        })),
        {
          tanggal: toApiDate(normalizedTanggal),
          keterangan: newLiburKet.trim(),
          tipe: newLiburTipe,
        },
      ];

      const payload = buildSavePayload({ hari_libur: updatedList });

      const url = pengaturanId ? `${API_PENGATURAN}/${pengaturanId}` : API_PENGATURAN;
      const method = pengaturanId ? "PUT" : "POST";

      await requestLaravel(url, {
        method,
        body: JSON.stringify(payload),
      });

      showToast(
        `Hari libur ${formatTanggalIndonesia(normalizedTanggal)} berhasil ditambahkan.`
      );

      setNewLiburTanggal("");
      setNewLiburKet("");
      setNewLiburTipe("Nasional");

      await loadSettings();
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        showToast(
          "Tidak dapat terhubung ke server Laravel. Periksa URL API, server Laravel, atau konfigurasi CORS.",
          "error"
        );
      } else {
        const message =
          error instanceof Error ? error.message : "Gagal menambahkan hari libur.";
        showToast(message, "error");
      }
    } finally {
      setIsAddingLibur(false);
    }
  };

  const openEditModal = (item: HariLibur) => {
    setEditingId(item.id);
    setEditTanggal(normalizeDate(item.tanggal));
    setEditKet(item.keterangan || "");
    setEditTipe(item.tipe === "Khusus" ? "Khusus" : "Nasional");
  };

  const handleSaveEditLibur = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    if (!editTanggal || !editKet.trim()) {
      showToast("Tanggal dan keterangan wajib diisi.", "error");
      return;
    }

    const normalizedTanggal = normalizeDate(editTanggal);

    const duplicate = hariLiburList.some(
      (item) =>
        item.id !== editingId &&
        normalizeDate(item.tanggal) === normalizedTanggal
    );
    if (duplicate) {
      showToast("Tanggal hari libur tersebut sudah terdaftar.", "error");
      return;
    }

    try {
      setIsSavingEditLibur(true);

      const updatedList = hariLiburList.map((item) =>
        item.id === editingId
          ? {
              tanggal: toApiDate(normalizedTanggal),
              keterangan: editKet.trim(),
              tipe: editTipe,
            }
          : {
              tanggal: toApiDate(item.tanggal),
              keterangan: item.keterangan,
              tipe: item.tipe,
            }
      );

      const payload = buildSavePayload({ hari_libur: updatedList });

      const url = pengaturanId ? `${API_PENGATURAN}/${pengaturanId}` : API_PENGATURAN;
      const method = pengaturanId ? "PUT" : "POST";

      await requestLaravel(url, {
        method,
        body: JSON.stringify(payload),
      });

      showToast(
        `Hari libur ${formatTanggalIndonesia(normalizedTanggal)} berhasil diperbarui.`
      );

      setEditingId(null);
      setEditTanggal("");
      setEditKet("");
      setEditTipe("Nasional");

      await loadSettings();
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        showToast(
          "Tidak dapat terhubung ke server Laravel. Periksa URL API, server Laravel, atau konfigurasi CORS.",
          "error"
        );
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memperbarui hari libur.";
        showToast(message, "error");
      }
    } finally {
      setIsSavingEditLibur(false);
    }
  };

  const handleHapusHariLibur = (itemId: string) => {
    const item = hariLiburList.find((h) => h.id === itemId);
    if (!item) return;

    showConfirm({
      title: "Hapus Hari Libur",
      message: `Apakah Anda yakin ingin menghapus hari libur "${item.keterangan}"?`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      confirmColor: "red",
      onConfirm: async () => {
        if (!pengaturanId) {
          showToast("ID pengaturan belum tersedia.", "error");
          return;
        }

        try {
          setDeletingLiburId(itemId);

          const updatedList = hariLiburList
            .filter((h) => h.id !== itemId)
            .map((h) => ({
              tanggal: toApiDate(h.tanggal),
              keterangan: h.keterangan,
              tipe: h.tipe,
            }));

          const payload = buildSavePayload({ hari_libur: updatedList });

          await requestLaravel(`${API_PENGATURAN}/${pengaturanId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });

          showToast(
            `Hari libur ${formatTanggalIndonesia(item.tanggal)} berhasil dihapus.`
          );

          await loadSettings();
        } catch (error: unknown) {
          if (error instanceof TypeError && error.message === "Failed to fetch") {
            showToast(
              "Tidak dapat terhubung ke server Laravel. Periksa URL API, server Laravel, atau konfigurasi CORS.",
              "error"
            );
          } else {
            const message =
              error instanceof Error
                ? error.message
                : "Gagal menghapus hari libur.";
            showToast(message, "error");
          }
        } finally {
          setDeletingLiburId(null);
        }
      },
    });
  };

  const handleHapusPengaturanSistem = () => {
    if (!pengaturanId) {
      showToast("ID pengaturan belum tersedia.", "error");
      return;
    }

    showConfirm({
      title: "Hapus Pengaturan Sistem",
      message:
        "Apakah Anda yakin ingin menghapus pengaturan sistem ini dari database? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Ya, Hapus Pengaturan",
      cancelLabel: "Batal",
      confirmColor: "red",
      onConfirm: async () => {
        try {
          setIsDeletingPengaturan(true);

          await requestLaravel(`${API_PENGATURAN}/${pengaturanId}`, {
            method: "DELETE",
          });

          showToast("Pengaturan sistem berhasil dihapus.");
          setPengaturanId(null);
          await loadSettings();
        } catch (error: unknown) {
          if (error instanceof TypeError && error.message === "Failed to fetch") {
            showToast(
              "Tidak dapat terhubung ke server Laravel. Periksa URL API, server Laravel, atau konfigurasi CORS.",
              "error"
            );
          } else {
            const message =
              error instanceof Error
                ? error.message
                : "Terjadi kesalahan saat menghapus pengaturan.";
            showToast(message, "error");
          }
        } finally {
          setIsDeletingPengaturan(false);
        }
      },
    });
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tanggalBuka || !tanggalTutup) {
      showToast("Tanggal buka dan tanggal tutup wajib diisi.", "error");
      return;
    }

    if (tanggalTutup < tanggalBuka) {
      showToast(
        "Tanggal tutup tidak boleh lebih awal dari tanggal buka.",
        "error"
      );
      return;
    }

    if (!Number.isInteger(toleransi) || toleransi < 0) {
      showToast(
        "Batas toleransi harus berupa angka bulat 0 atau lebih.",
        "error"
      );
      return;
    }

    for (const item of hariLiburList) {
      if (!item.tanggal) {
        showToast("Tanggal hari libur wajib diisi.", "error");
        return;
      }
      if (!item.keterangan?.trim()) {
        showToast("Keterangan hari libur wajib diisi.", "error");
        return;
      }
    }

    try {
      setIsSaving(true);

      const payload = buildSavePayload();

      if (pengaturanId) {
        await requestLaravel(`${API_PENGATURAN}/${pengaturanId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestLaravel(API_PENGATURAN, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      showToast("Seluruh pengaturan berhasil disimpan.");

      await loadSettings();
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        showToast(
          "Tidak dapat terhubung ke server Laravel. Periksa URL API, server Laravel, atau konfigurasi CORS.",
          "error"
        );
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan pengaturan.";
        showToast(message, "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePeriode = async () => {
    if (!tanggalBuka || !tanggalTutup) {
      showToast("Tanggal buka dan tanggal tutup wajib diisi.", "error");
      return;
    }

    if (tanggalTutup < tanggalBuka) {
      showToast(
        "Tanggal tutup tidak boleh lebih awal dari tanggal buka.",
        "error"
      );
      return;
    }

    try {
      setIsSavingPeriode(true);

      const payload = buildSavePayload();

      const url = pengaturanId ? `${API_PENGATURAN}/${pengaturanId}` : API_PENGATURAN;
      const method = pengaturanId ? "PUT" : "POST";

      await requestLaravel(url, {
        method,
        body: JSON.stringify(payload),
      });

      showToast("Periode pendaftaran magang berhasil disimpan.");
      await loadSettings();
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        showToast(
          "Tidak dapat terhubung ke server Laravel. Periksa URL API, server Laravel, atau konfigurasi CORS.",
          "error"
        );
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan periode pendaftaran.";
        showToast(message, "error");
      }
    } finally {
      setIsSavingPeriode(false);
    }
  };

  const isSystemOpen = () => {
    if (!tanggalBuka || !tanggalTutup) return false;
    if (!aktifManual) return false;
    const today = getTodayWIB();
    return today >= tanggalBuka && today <= tanggalTutup;
  };

  const systemStatus = isSystemOpen();
  const statusHariIni = getStatusHariIni();

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="bg-card border border-border p-4 rounded-2xl shadow-card space-y-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-sans text-foreground">
                Pengaturan Presensi &amp; Sistem
              </h1>
            </div>

            <p className="text-xs text-muted-foreground font-sans font-semibold mt-1">
              Konfigurasi jam kerja, hari kerja, periode pendaftaran, kontak
              admin, dan hari libur.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {pengaturanId && (
              <button
                type="button"
                onClick={handleHapusPengaturanSistem}
                disabled={isLoading || isDeletingPengaturan}
                className="px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingPengaturan ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Hapus Pengaturan</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadSettings}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl border border-border bg-input hover:bg-accent text-xs font-bold text-foreground flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading ? "animate-spin text-primary" : ""
                }`}
              />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl p-16 shadow-card flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
          
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold font-sans text-muted-foreground uppercase tracking-wider">
                    Status Hari Ini
                  </p>

                  <h3 className="text-lg font-sans text-foreground mt-1">
                    {statusHariIni.namaHari},{" "}
                    {formatTanggalIndonesia(statusHariIni.tanggal)}
                  </h3>

                  <p className="text-[11px] text-muted-foreground font-sans mt-1">
                    Zona waktu: Asia/Jakarta (WIB)
                  </p>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
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
                      <p className="text-sm font-bold font-sans text-red-600 dark:text-red-400">
                        {statusHariIni.keterangan}
                      </p>
                      <p className="text-[11px] font-sans text-muted-foreground mt-1">
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
                      <p className="text-sm font-bold font-sans text-foreground">
                        Hari ini merupakan hari kerja.
                      </p>
                      <p className="text-[11px] font-sans text-muted-foreground mt-1">
                        Tidak ditemukan tanggal hari libur untuk hari ini.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveAll} className="space-y-6">

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
                <h3 className="font-bold font-sans text-base text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <span>Jam Kerja Standar &amp; Toleransi</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-sans text-foreground">
                      Jam Masuk Standar
                    </label>
                    <input
                      type="time"
                      required
                      value={jamMasuk}
                      onChange={(e) => setJamMasuk(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-sans text-foreground">
                      Jam Pulang Standar
                    </label>
                    <input
                      type="time"
                      required
                      value={jamPulang}
                      onChange={(e) => setJamPulang(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-sans text-foreground">
                      Jam Pulang Jumat
                    </label>
                    <input
                      type="time"
                      required
                      value={jamPulangJumat}
                      onChange={(e) => setJamPulangJumat(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-sans text-foreground">
                      Toleransi Keterlambatan
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={toleransi}
                        onChange={(e) => setToleransi(Number(e.target.value))}
                        className="w-full rounded-xl border border-border bg-input px-3.5 py-2 pr-14 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-sans text-muted-foreground">
                        Menit
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold font-sans text-base text-foreground flex items-center gap-2">
                    <span>Jadwal Hari Kerja Mingguan</span>
                  </h3>
                  <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
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
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl text-xs font-bold transition-all border text-center cursor-pointer ${
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
                          <span className="font-bold font-sans text-sm">{day}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans uppercase tracking-wider ${
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

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold font-sans text-base text-foreground">
                      Periode Pendaftaran Magang
                    </h3>
                    <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
                      Atur jadwal buka dan tutup pendaftaran.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold font-sans text-muted-foreground uppercase tracking-wider">
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
                        <h4 className="font-bold font-sans text-base text-foreground">
                          {systemStatus
                            ? "Pendaftaran Dibuka"
                            : "Pendaftaran Ditutup"}
                        </h4>
                        <p className="text-xs font-sans text-muted-foreground">
                          {systemStatus
                            ? "Pendaftaran magang aktif."
                            : "Pendaftaran magang ditutup."}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-sans uppercase tracking-wider ${
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
                    <label className="text-xs font-bold font-sans text-foreground">
                      Tanggal Buka Pendaftaran
                    </label>
                    <input
                      type="date"
                      required
                      value={tanggalBuka}
                      onChange={(e) => setTanggalBuka(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <p className="text-[10px] text-muted-foreground font-sans">
                      {formatTanggalIndonesia(tanggalBuka)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold font-sans text-foreground">
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
                    <p className="text-[10px] text-muted-foreground font-sans">
                      {formatTanggalIndonesia(tanggalTutup)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold font-sans text-foreground">
                    Nomor Batch
                  </label>
                  <div className="relative w-full sm:w-48">
                    <input
                      id="input-batch"
                      type="number"
                      min={1}
                      max={999}
                      placeholder="Batch"
                      value={batch ?? ""}
                      onChange={(e) =>
                        setBatch(e.target.value === "" ? null : Number(e.target.value))
                      }
                      className="w-full rounded-xl border border-border bg-input pl-4 pr-16 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-sans text-muted-foreground pointer-events-none">
                      Batch
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans">
                    Nomor gelombang pendaftaran magang. Kosongkan jika tidak relevan.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/40">
                  <div>
                    <label
                      htmlFor="toggle-manual"
                      className="text-xs font-bold font-sans text-foreground cursor-pointer"
                    >
                      Status Manual (Aktifkan / Tutup Manual)
                    </label>
                    <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
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

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSavePeriode}
                    disabled={isSavingPeriode || isLoading}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-95 transition-all flex items-center gap-2 shadow-card disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSavingPeriode ? (
                      <>
                        <Spinner className="text-current" />
                      </>
                    ) : (
                      <>
                        <span className="font-sans">Simpan Periode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
                <h3 className="font-bold font-sans text-base text-foreground border-b border-border pb-3 flex items-center gap-2">
                  Kontak WhatsApp Admin
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold font-sans text-foreground">
                      No. WA Admin Magang
                    </label>
                    <input
                      type="text"
                      value={noWaMagang}
                      onChange={(e) => setNoWaMagang(e.target.value)}
                      placeholder="Masukkan no wa admin magang"
                      maxLength={20}
                      className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold font-sans text-foreground">
                      No. WA Admin OS
                    </label>
                    <input
                      type="text"
                      value={noWaOS}
                      onChange={(e) => setNoWaOS(e.target.value)}
                      placeholder="Masukkan no wa admin os"
                      maxLength={20}
                      className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold font-sans text-base text-foreground flex items-center gap-2">
                    Kelola Hari Libur Nasional &amp; Khusus
                  </h3>
                  <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
                    Hari libur hanya berlaku pada tanggal yang didaftarkan.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-3">
                  <span className="text-xs font-bold font-sans text-foreground block">
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
                      onChange={(e) =>
                        setNewLiburTipe(e.target.value as LiburTipe)
                      }
                      className="rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                    >
                      <option value="Nasional">Nasional</option>
                      <option value="Khusus">Keagamaan</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleAddLibur}
                      disabled={isAddingLibur}
                      className="py-2 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-1 shadow-card cursor-pointer disabled:opacity-60"
                    >
                      {isAddingLibur ? (
              <>
                <Spinner className="text-current" />
              </>
            ) : (
              <>
                <span className="font-sans">Tambah</span>
              </>
            )}
                    </button>
                  </div>
                </div>

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
                      {isLoading ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="flex justify-center py-8">
                              <Spinner size="lg" />
                            </div>
                          </td>
                        </tr>
                      ) : hariLiburList.length > 0 ? (
                        hariLiburList.map((item) => {
                          const isDeleting = deletingLiburId === item.id;
                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-accent/50 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-sans text-foreground font-mono whitespace-nowrap">
                                {formatTanggalIndonesia(item.tanggal)}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-foreground whitespace-nowrap">
                                {getNamaHari(item.tanggal)}
                              </td>
                              <td className="py-2.5 px-3 text-foreground font-sans">
                                {item.keterangan}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.tipe === "Nasional"
                                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      : "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  }`}
                                >
                                  {item.tipe}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg border border-border bg-input hover:bg-accent text-foreground hover:text-primary transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleHapusHariLibur(item.id)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all inline-flex items-center cursor-pointer disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Spinner className="text-current" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            <div className="flex flex-col items-center gap-2">
                              
                              <span className="text-xs">
                                Tidak ada data hari libur yang tersimpan.
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-card min-h-[50px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
              <>
                <Spinner className="text-current" />
              </>
            ) : (
              <>
                <span className="font-sans">Simpan Seluruh Pengaturan Sistem</span>
              </>
            )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* MODAL EDIT HARI LIBUR */}
      {editingId !== null && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleSaveEditLibur}
              className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-elevated space-y-4 animate-in zoom-in-95"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-black text-base text-foreground flex items-center gap-2">
                  <span>Edit Hari Libur</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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

              {/* ACTIONS */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  disabled={isSavingEditLibur}
                  className="flex-1 py-2.5 rounded-xl border border-border bg-secondary font-extrabold text-xs hover:bg-accent disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSavingEditLibur}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-card flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSavingEditLibur ? (
                    <>
                      <Spinner size="sm" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </DashboardLayout>
  );
}