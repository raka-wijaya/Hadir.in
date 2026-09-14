"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  Camera,
  AlertTriangle,
  ShieldCheck,
  Check,
  Info,
} from "lucide-react";
import { Spinner } from "../ui/Spinner";

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel?: () => void;
  title?: string;
}

export function CameraCapture({
  onCapture,
  onCancel,
  title = "Absen Masuk",
}: CameraCaptureProps) {
  // ============================================================
  // REFS
  // ============================================================

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const startTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStartingRef = useRef(false);

  const mountedRef = useRef(false);

  // ============================================================
  // STATE
  // ============================================================

  const [error, setError] = useState<string | null>(null);

  const [isCameraLoading, setIsCameraLoading] =
    useState(true);

  const [capturedImage, setCapturedImage] =
    useState<string | null>(null);

  // ============================================================
  // STOP CAMERA
  // ============================================================

  const stopCamera = useCallback(() => {
    // ----------------------------------------------------------
    // STOP TIMEOUT
    // ----------------------------------------------------------

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    // ----------------------------------------------------------
    // STOP STREAM
    // ----------------------------------------------------------

    const stream = streamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });

      streamRef.current = null;
    }

    // ----------------------------------------------------------
    // CLEAR VIDEO
    // ----------------------------------------------------------

    const video = videoRef.current;

    if (video) {
      try {
        video.pause();
      } catch {
        // ignore
      }

      video.srcObject = null;
    }

    isStartingRef.current = false;

    if (mountedRef.current) {
      setIsCameraLoading(false);
    }
  }, []);

  // ============================================================
  // START CAMERA
  // ============================================================

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    if (isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;

    setError(null);

    setCapturedImage(null);

    setIsCameraLoading(true);

    try {
      if (
        typeof window === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error("Kamera tidak didukung oleh browser ini.");
      }

      // --------------------------------------------------------
      // GET USER MEDIA
      // --------------------------------------------------------

      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: {
              ideal: "user",
            },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // --------------------------------------------------------
      // CHECK MOUNT
      // --------------------------------------------------------

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });

        return;
      }

      streamRef.current = mediaStream;

      // --------------------------------------------------------
      // VIDEO ELEMENT
      // --------------------------------------------------------

      const video = videoRef.current;

      if (!video) {
        mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });

        streamRef.current = null;

        throw new Error("Element video belum tersedia.");
      }

      // --------------------------------------------------------
      // ATTACH STREAM
      // --------------------------------------------------------

      video.srcObject = mediaStream;

      video.muted = true;

      video.playsInline = true;

      video.autoplay = true;

      // --------------------------------------------------------
      // PLAY
      // --------------------------------------------------------

      try {
        await video.play();
      } catch (playError) {
        console.warn("[Camera] Video play warning:", playError);
      }

      if (!mountedRef.current) {
        return;
      }

      setIsCameraLoading(false);

      // --------------------------------------------------------
      // SAFETY TIMEOUT
      // --------------------------------------------------------

      startTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsCameraLoading(false);
        }

        startTimeoutRef.current = null;
      }, 3000);
    } catch (err: unknown) {
      console.error("[Camera] Access error:", err);

      streamRef.current = null;

      if (mountedRef.current) {
        setIsCameraLoading(false);

        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError("Izin kamera ditolak. Izinkan akses kamera pada browser.");
        } else if (
          err instanceof DOMException &&
          err.name === "NotFoundError"
        ) {
          setError("Kamera tidak ditemukan pada perangkat ini.");
        } else if (
          err instanceof DOMException &&
          err.name === "NotReadableError"
        ) {
          setError("Kamera sedang digunakan aplikasi lain.");
        } else if (
          err instanceof DOMException &&
          err.name === "SecurityError"
        ) {
          setError("Browser memblokir kamera. Gunakan HTTPS atau localhost.");
        } else {
          setError("Kamera tidak tersedia atau tidak dapat digunakan.");
        }
      }
    } finally {
      isStartingRef.current = false;
    }
  }, []);

  // ============================================================
  // CAMERA LIFECYCLE
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    const initialize = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      await startCamera();
    };

    initialize();

    return () => {
      cancelled = true;

      mountedRef.current = false;

      stopCamera();
    };
  }, [
    startCamera,
    stopCamera,
  ]);

  // ============================================================
  // VIDEO READY
  // ============================================================

  const handleVideoReady =
    useCallback(() => {
      if (startTimeoutRef.current) {
        clearTimeout(
          startTimeoutRef.current
        );

        startTimeoutRef.current = null;
      }

      if (!mountedRef.current) {
        return;
      }

      setIsCameraLoading(false);
    }, []);

  // ============================================================
  // TAKE SNAPSHOT
  // ============================================================

  const handleTakeSnapshot = () => {
    const video = videoRef.current;

    if (!video) {
      setError(
        "Kamera belum tersedia."
      );

      return;
    }

    // ----------------------------------------------------------
    // VIDEO READY
    // ----------------------------------------------------------

    if (
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError(
        "Kamera belum siap. Tunggu sebentar."
      );

      return;
    }

    // ----------------------------------------------------------
    // CANVAS
    // ----------------------------------------------------------

    const canvas =
      canvasRef.current ||
      document.createElement("canvas");

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      setError(
        "Browser tidak mendukung pengambilan foto."
      );

      return;
    }

    // ----------------------------------------------------------
    // MIRROR
    // ----------------------------------------------------------

    ctx.save();

    ctx.translate(
      canvas.width,
      0
    );

    ctx.scale(-1, 1);

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.restore();

    // ----------------------------------------------------------
    // CONVERT
    // ----------------------------------------------------------

    let dataUrl: string;

    try {
      dataUrl =
        canvas.toDataURL(
          "image/webp",
          0.85
        );
    } catch (err) {
      console.error(
        "[Camera] Snapshot error:",
        err
      );

      setError(
        "Gagal mengambil foto."
      );

      return;
    }

    // ----------------------------------------------------------
    // SET PREVIEW
    // ----------------------------------------------------------

    setCapturedImage(dataUrl);

    // ----------------------------------------------------------
    // STOP CAMERA
    // ----------------------------------------------------------

    stopCamera();
  };

  // ============================================================
  // CONFIRM PHOTO
  // ============================================================

  const handleConfirmPhoto = () => {
    if (!capturedImage) {
      return;
    }

    onCapture(
      capturedImage
    );
  };

  // ============================================================
  // CANCEL
  // ============================================================

  const handleCancel = () => {
    stopCamera();

    if (onCancel) {
      onCancel();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm max-w-xl mx-auto space-y-4">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />

          <h3 className="font-semibold text-base md:text-lg text-foreground">
            {title}
          </h3>
        </div>

        <span className="text-xs text-muted-foreground bg-input px-2.5 py-1 rounded-full border border-border">
          Presensi Kamera
        </span>
      </div>

      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />

          <div className="space-y-1">
            <p className="text-xs font-semibold text-destructive">
              Kamera Tidak Tersedia
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================
          CAPTURED PHOTO
      ======================================================= */}

      {capturedImage ? (
        <div className="space-y-4">

          {/* FOTO */}

          <div className="relative rounded-2xl overflow-hidden border-2 border-primary aspect-video bg-black shadow-inner">

            <img
              src={capturedImage}
              alt="Foto Presensi"
              className="w-full h-full object-cover"
            />

            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-primary text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-primary/30">
              <ShieldCheck className="w-3.5 h-3.5" />

              <span>
                Foto Berhasil Diambil
              </span>
            </div>

          </div>

          {/* ==================================================
              CONFIRM
          ================================================== */}

          <button
            type="button"
            onClick={
              handleConfirmPhoto
            }
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm min-h-[52px]"
          >
            <Check className="w-4 h-4" />

            <span>
              Konfirmasi Foto
            </span>
          </button>

          {/* ==================================================
              CANCEL
          ================================================== */}

          {onCancel && (
            <button
              type="button"
              onClick={
                handleCancel
              }
              className="w-full py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-accent transition-all"
            >
              Batal
            </button>
          )}

        </div>
      ) : (

        /* ====================================================
           CAMERA
        ===================================================== */

        <div className="space-y-4">

          {/* ==================================================
              CAMERA FRAME
          ================================================== */}

          <div className="relative rounded-2xl overflow-hidden border border-border aspect-video bg-neutral-900 shadow-inner flex items-center justify-center">

            {/* LOADING */}

            {isCameraLoading && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white space-y-2 z-30">

                <Spinner size="lg" />

                <span className="text-xs font-medium">
                  Membuka kamera...
                </span>

              </div>
            )}

            {/* VIDEO */}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={
                handleVideoReady
              }
              onCanPlay={
                handleVideoReady
              }
              onPlaying={
                handleVideoReady
              }
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* ==================================================
                GUIDE
            ================================================== */}

            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">

              <div className="w-44 h-56 border-2 border-dashed border-white/70 rounded-3xl flex items-center justify-center bg-primary/5 backdrop-blur-[1px] shadow-lg">

                <span className="text-[10px] uppercase font-mono tracking-widest text-primary bg-black/60 px-2 py-1 rounded">
                  FOTO AREA
                </span>

              </div>

              <p className="text-xs text-white/90 font-medium mt-3 bg-black/70 px-3 py-1 rounded-full backdrop-blur-sm shadow">
                {isCameraLoading
                  ? "Membuka kamera..."
                  : "Posisikan diri dengan baik sebelum mengambil foto."}
              </p>

            </div>

          </div>

          {/* ==================================================
              CANVAS
          ================================================== */}

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* ==================================================
              INFO SEBELUM AMBIL FOTO
          ================================================== */}

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">

            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />

            <div className="space-y-1">

              <p className="text-xs font-semibold text-foreground">
                Info Sebelum Ambil Foto
              </p>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pastikan wajah terlihat jelas dan hanya terdapat 1 orang di dalam foto.{" "}
                Jika terdeteksi lebih dari 1 orang, foto dianggap TIDAK SAH dan presensi tidak akan diproses.
              </p>

            </div>

          </div>

          {/* ==================================================
              TAKE PHOTO
          ================================================== */}

          <button
            type="button"
            onClick={
              handleTakeSnapshot
            }
            disabled={
              isCameraLoading ||
              !streamRef.current
            }
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-sm min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
          >

            <div className="w-4 h-4 rounded-full border-2 border-primary-foreground bg-primary-foreground/30 animate-pulse" />

            <span>
              {isCameraLoading
                ? "Membuka Kamera..."
                : "Ambil Foto Presensi"}
            </span>

          </button>

          {/* ==================================================
              CANCEL
          ================================================== */}

          {onCancel && (
            <button
              type="button"
              onClick={
                handleCancel
              }
              className="w-full py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-accent transition-all"
            >
              Batal
            </button>
          )}

        </div>
      )}

    </div>
  );
}