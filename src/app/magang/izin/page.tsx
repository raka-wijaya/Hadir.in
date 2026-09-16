"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/context";
import { ConfirmModal } from "@/components/ui/Alert";

import {
  FileCheck,
  Send,
  Calendar,
  Upload,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  X,
  Clock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

/**
 * ============================================================
 * TYPE
 * ============================================================
 */

interface Izin {
  id: string;
  peserta_magang_id?: string | null;
  pesertaMagangId?: string | null;
  karyawan_os_id?: string | null;
  karyawanOsId?: string | null;
  absensiId: string;

  userName: string;
  userRole: string;
  userAvatar: string;
  userInstitution: string;

  jenis: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;

  /**
   * Path file.
   *
   * Contoh:
   * /uploads/izin/abc123.pdf
   */
  attachment: string | null;

  catatanAdmin: string;

  createdAt: string;
  updatedAt: string;
}

type JenisIzin =
  | "SAKIT"
  | "KEPERLUAN_PRIBADI"
  | "LAINNYA"
  | "Sakit"
  | "Keperluan Pribadi"
  | "Lainnya";

/**
 * ============================================================
 * DATE
 * ============================================================
 */

const getTodayWIB = (): string => {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
};

const fmtDate = (
  dateStr?: string | null
): string => {
  if (!dateStr) return "—";

  const d = new Date(dateStr);

  if (isNaN(d.getTime())) {
    return dateStr;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
};

/**
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function MagangIzinPage() {
  const { user } = useAuth();

  /**
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const [izin, setIzin] =
    useState<Izin[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  /**
   * ==========================================================
   * FORM
   * ==========================================================
   */

  const [jenis, setJenis] =
    useState<JenisIzin>("SAKIT");

  const [tanggalMulai, setTanggalMulai] =
    useState(getTodayWIB());

  const [tanggalSelesai, setTanggalSelesai] =
    useState(getTodayWIB());

  const [alasan, setAlasan] =
    useState("");

  /**
   * File asli.
   *
   * BUKAN Base64.
   */

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const [attachmentName, setAttachmentName] =
    useState<string | null>(null);

  /**
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [deleteConfirmItem, setDeleteConfirmItem] =
    useState<Izin | null>(null);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /**
   * ==========================================================
   * GET DATA IZIN
   * ==========================================================
   */

  const fetchIzin = useCallback(
    async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // user.id adalah peserta_magang_id (karena login dari tabel peserta_magang)
        const paramKey = user.role === "KARYAWAN_OS" ? "karyawan_os_id" : "peserta_magang_id";
        const res = await fetch(
          `/api/izin?${paramKey}=${encodeURIComponent(
            String(user.id)
          )}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await res.json().catch(() => ({}));

        if (
          res.ok &&
          data?.success
        ) {
          const list = Array.isArray(data.izin)
            ? data.izin
            : Array.isArray(data.data)
            ? data.data
            : [];
          setIzin(list);
        } else {
          setIzin([]);
        }
      } catch (err) {
        console.error(
          "Gagal mengambil data izin:",
          err
        );

        setErrorMsg(
          "Gagal memuat riwayat izin."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  /**
   * ==========================================================
   * LOAD DATA
   * ==========================================================
   */

  useEffect(() => {
    fetchIzin();
  }, [fetchIzin]);

  /**
   * ==========================================================
   * HANDLE FILE
   * ==========================================================
   */

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setErrorMsg(null);

    /**
     * Maksimal 3MB
     */

    if (
      file.size >
      3 * 1024 * 1024
    ) {
      setErrorMsg(
        "Ukuran file lampiran maksimal 3MB."
      );

      e.target.value = "";
      return;
    }

    /**
     * Format yang diperbolehkan
     */

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setErrorMsg(
        "Format file harus PDF, JPG, JPEG, PNG, atau WEBP."
      );

      e.target.value = "";
      return;
    }

    /**
     * Simpan File asli.
     *
     * Tidak ada FileReader.
     * Tidak ada Base64.
     */

    setAttachment(file);
    setAttachmentName(file.name);
  };

  /**
   * ==========================================================
   * REMOVE SELECTED FILE
   * ==========================================================
   */

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentName(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * ==========================================================
   * SUBMIT IZIN
   * ==========================================================
   */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setSuccessMsg(null);
    setErrorMsg(null);

    /**
     * Validasi user
     */

    if (!user?.id) {
      setErrorMsg(
        "Sesi pengguna tidak valid. Silakan login ulang."
      );

      return;
    }

    /**
     * Validasi alasan
     */

    if (!alasan.trim()) {
      setErrorMsg(
        "Silakan isi alasan pengajuan izin."
      );

      return;
    }

    /**
     * Validasi tanggal
     */

    if (
      tanggalSelesai <
      tanggalMulai
    ) {
      setErrorMsg(
        "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      /**
       * ======================================================
       * FORM DATA
       * ======================================================
       */

      const formData =
        new FormData();

      // Kirim peserta_magang_id atau karyawan_os_id sesuai role
      const idKey = user.role === "KARYAWAN_OS" ? "karyawan_os_id" : "peserta_magang_id";
      formData.append(
        idKey,
        String(user.id)
      );

      formData.append(
        "jenis",
        jenis
      );

      formData.append(
        "tanggalMulai",
        tanggalMulai
      );

      formData.append(
        "tanggalSelesai",
        tanggalSelesai
      );

      formData.append(
        "alasan",
        alasan.trim()
      );

      /**
       * File asli
       */

      if (attachment) {
        formData.append(
          "attachment",
          attachment,
          attachment.name
        );
      }

      /**
       * POST
       */

      const res = await fetch(
        "/api/izin",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await res.json().catch(() => ({}));

      if (
        res.ok &&
        data?.success
      ) {
        setSuccessMsg(
          "Pengajuan izin berhasil dikirim."
        );

        /**
         * Tambahkan data baru
         */

        if (data.izin) {
          setIzin((prev) => [
            data.izin,
            ...prev,
          ]);
        } else {
          await fetchIzin();
        }

        /**
         * Reset form
         */

        setAlasan("");

        const today =
          getTodayWIB();

        setTanggalMulai(today);
        setTanggalSelesai(today);

        setJenis("Sakit");

        removeAttachment();
      } else {
        setErrorMsg(
          data.message ||
            "Gagal mengirim pengajuan izin."
        );
      }
    } catch (err) {
      console.error(
        "Submit izin error:",
        err
      );

      setErrorMsg(
        "Gagal mengirim pengajuan izin. Pastikan koneksi server aktif."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * ==========================================================
   * DELETE IZIN
   * ==========================================================
   */

  const handleDeleteIzin = async (
    item: Izin
  ) => {
    /**
     * Pastikan user valid
     */

    if (!user?.id) {
      setErrorMsg(
        "Sesi pengguna tidak valid. Silakan login ulang."
      );

      return;
    }

    setSuccessMsg(null);
    setErrorMsg(null);
    setDeletingId(item.id);

    try {
      const res =
        await fetch(
          `/api/izin?id=${encodeURIComponent(
            item.id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await res.json().catch(() => ({}));

      if (
        res.ok &&
        data?.success
      ) {
        /**
         * Hapus dari state
         * tanpa reload halaman.
         */

        setIzin((prev) =>
          prev.filter(
            (izinItem) =>
              izinItem.id !== item.id
          )
        );

        setSuccessMsg(
          "Pengajuan izin berhasil dihapus."
        );
      } else {
        setErrorMsg(
          data.message ||
            "Gagal menghapus pengajuan izin."
        );
      }
    } catch (err) {
      console.error(
        "Delete izin error:",
        err
      );

      setErrorMsg(
        "Gagal menghapus pengajuan izin. Pastikan koneksi server aktif."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * ==========================================================
   * OPEN ATTACHMENT
   * ==========================================================
   */

  const openAttachment = (
    attachmentPath: string
  ) => {
    if (!attachmentPath) {
      return;
    }

    window.open(
      attachmentPath,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ConfirmModal
          isOpen={Boolean(deleteConfirmItem)}
          title="Hapus Pengajuan Izin"
          message={`Apakah Anda yakin ingin menghapus pengajuan izin "${deleteConfirmItem?.jenis}"? Data pengajuan dan lampiran akan dihapus secara permanen.`}
          confirmLabel="Ya, Hapus Izin"
          cancelLabel="Batal"
          confirmColor="red"
          onConfirm={async () => {
            if (deleteConfirmItem) {
              const item = deleteConfirmItem;
              setDeleteConfirmItem(null);
              await handleDeleteIzin(item);
            }
          }}
          onCancel={() => setDeleteConfirmItem(null)}
        />

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Pengajuan Izin Saya
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Formulir permohonan surat izin tidak masuk kerja karena sakit, keperluan pribadi, atau alasan lainnya
          </p>
        </div>

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {successMsg && (
          <div className="bg-primary/20 border border-primary/40 rounded-2xl p-4 flex items-center justify-between animate-in fade-in">

            <div className="flex items-center gap-2.5 text-sm font-bold text-primary-foreground dark:text-primary">

              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />

              <span>
                {successMsg}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMsg(null)
              }
              className="p-1"
            >
              <X className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {errorMsg && (
          <div className="bg-destructive/15 border border-destructive/30 rounded-2xl p-4 flex items-center justify-between animate-in fade-in">

            <div className="flex items-center gap-2.5 text-sm font-bold text-destructive">

              <AlertCircle className="w-5 h-5 shrink-0" />

              <span>
                {errorMsg}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setErrorMsg(null)
              }
              className="p-1 text-destructive"
            >
              <X className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* ==================================================
            FORM PENGAJUAN
        ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4"
        >

          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">

            <FileCheck className="w-5 h-5 text-primary" />

            <span>
              Formulir Pengajuan Izin Baru
            </span>

          </h3>

          {/* ==================================================
              JENIS + TANGGAL
          ================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Jenis */}

            <div className="space-y-1">

              <label className="text-xs font-semibold text-foreground">
                Jenis Izin
              </label>

              <select
                value={jenis}
                onChange={(e) =>
                  setJenis(
                    e.target.value as JenisIzin
                  )
                }
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >

                <option value="SAKIT">
                  Sakit
                </option>

                <option value="KEPERLUAN_PRIBADI">
                  Keperluan Pribadi
                </option>

                <option value="LAINNYA">
                  Lainnya
                </option>

              </select>

            </div>

            {/* Tanggal Mulai */}

            <div className="space-y-1">

              <label className="text-xs font-semibold text-foreground">
                Tanggal Mulai
              </label>

              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => {

                  const value =
                    e.target.value;

                  setTanggalMulai(value);

                  if (
                    value >
                    tanggalSelesai
                  ) {
                    setTanggalSelesai(
                      value
                    );
                  }

                }}
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />

            </div>

            {/* Tanggal Selesai */}

            <div className="space-y-1">

              <label className="text-xs font-semibold text-foreground">
                Tanggal Selesai
              </label>

              <input
                type="date"
                value={tanggalSelesai}
                min={tanggalMulai}
                onChange={(e) =>
                  setTanggalSelesai(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />

            </div>

          </div>

          {/* ==================================================
              ALASAN
          ================================================== */}

          <div className="space-y-1">

            <label className="text-xs font-semibold text-foreground">
              Alasan Pengajuan Izin
            </label>

            <textarea
              value={alasan}
              onChange={(e) =>
                setAlasan(
                  e.target.value
                )
              }
              placeholder="Jelaskan alasan izin Anda secara jelas..."
              className="w-full rounded-xl border border-border bg-input p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
              required
            />

          </div>

          {/* ==================================================
              ATTACHMENT
          ================================================== */}

          <div className="space-y-1">

            <label className="text-xs font-semibold text-foreground">
              Lampiran / Surat Dokter /
              Surat Izin (Opsional)
            </label>

            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-input/40 space-y-3">

              <Upload className="w-6 h-6 text-muted-foreground mx-auto" />

              <p className="text-xs text-muted-foreground">
                Unggah berkas bukti atau
                foto surat dokter
                <br />
                PDF / JPG / PNG / WEBP,
                maksimal 3MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={
                  handleFileChange
                }
                className="text-xs text-muted-foreground mx-auto block cursor-pointer"
              />

              {attachmentName && (
                <div className="flex items-center justify-center">

                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs font-bold text-primary max-w-full">

                    <FileText className="w-4 h-4 shrink-0" />

                    <span className="max-w-[250px] truncate">
                      {attachmentName}
                    </span>

                    <button
                      type="button"
                      onClick={
                        removeAttachment
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* ==================================================
              SUBMIT
          ================================================== */}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
          >

            {isSubmitting ? (
              <>
                <Spinner size="md" />

                <span>
                  Mengirim Pengajuan...
                </span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />

                <span>
                  Ajukan Izin Sekarang
                </span>
              </>
            )}

          </button>

        </form>

        {/* ==================================================
            RIWAYAT IZIN
        ================================================== */}

        <div className="space-y-3">

          <div className="flex items-center justify-between">

            <h3 className="font-extrabold text-sm text-foreground">
              Riwayat Pengajuan Izin
            </h3>

            <span className="text-xs font-bold text-muted-foreground">
              {izin.length} Riwayat
            </span>

          </div>

          {/* Loading */}

          {isLoading ? (

            <div className="flex flex-col items-center justify-center py-12 gap-2">

              <Spinner size="lg" />

            </div>

          ) : izin.length > 0 ? (

            <div className="space-y-3">

              {izin.map((item) => (

                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 hover:border-primary/40 transition-all"
                >

                  {/* ==================================================
                      HEADER CARD
                  ================================================== */}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">

                    <div className="flex items-center gap-2.5">

                      <div className="p-2 rounded-xl bg-primary/10 text-primary">

                        <FileCheck className="w-4 h-4" />

                      </div>

                      <div>

                        <span className="font-extrabold text-sm text-foreground">
                          {item.jenis}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">

                          <Calendar className="w-3.5 h-3.5" />

                          <span>

                            {fmtDate(
                              item.tanggalMulai
                            )}

                            {" s/d "}

                            {fmtDate(
                              item.tanggalSelesai
                            )}

                          </span>

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* ==================================================
                      ALASAN
                  ================================================== */}

                  <div className="text-xs space-y-1">

                    <span className="text-muted-foreground font-semibold">
                      Alasan:
                    </span>

                    <p className="text-foreground font-medium bg-input/40 p-2.5 rounded-xl border border-border whitespace-pre-wrap">
                      {item.alasan}
                    </p>

                  </div>

                  {/* ==================================================
                      LAMPIRAN
                  ================================================== */}

                  <div className="text-xs flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmItem(item)
                      }
                      disabled={
                        deletingId === item.id
                      }
                      title="Hapus pengajuan izin"
                      className="p-2 rounded-xl text-status-alpa hover:bg-status-alpa/10 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === item.id ? (
                        <Spinner size="md" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>

                    {item.attachment && (
                      <button
                        type="button"
                        onClick={() =>
                          openAttachment(
                            item.attachment!
                          )
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold hover:bg-primary/20 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>
                          Lihat Lampiran
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* ==================================================
                      CATATAN ADMIN
                  ================================================== */}

                  {item.catatanAdmin && (

                    <div className="text-xs bg-primary/10 border border-primary/20 p-3 rounded-xl space-y-1">

                      <span className="font-extrabold text-primary flex items-center gap-1">

                        <MessageSquare className="w-3.5 h-3.5" />

                        Catatan Admin

                      </span>

                      <p className="text-foreground font-semibold whitespace-pre-wrap">
                        {item.catatanAdmin}
                      </p>

                    </div>

                  )}

                  {/* ==================================================
                      TANGGAL PENGAJUAN
                  ================================================== */}

                  {item.createdAt && (

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">

                      <Clock className="w-3 h-3" />

                      Diajukan{" "}

                      {fmtDate(
                        item.createdAt
                      )}

                    </div>

                  )}

                </div>

              ))}

            </div>

          ) : (

            <div className="py-12 bg-card border border-border rounded-2xl text-center space-y-2">

              <Clock className="w-8 h-8 text-muted-foreground mx-auto" />

              <p className="text-sm font-bold text-foreground">
                Belum ada riwayat
                pengajuan izin
              </p>

              <p className="text-xs text-muted-foreground">
                Semua permohonan izin
                yang Anda ajukan akan
                tercatat di sini.
              </p>

            </div>

          )}

        </div>

      </div>
    </DashboardLayout>
  );
}