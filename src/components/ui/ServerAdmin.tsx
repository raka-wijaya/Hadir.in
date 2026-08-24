"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Clock,
  ShieldCheck,
  Timer,
  AlertTriangle,
} from "lucide-react";
import { Alert } from "@heroui/react";

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = "sipresma_last_activity";
const SHOW_COUNTDOWN_THRESHOLD_MS = 3 * 60 * 1000;

interface ServerClockProps {
  className?: string;
  compact?: boolean;
}

export function ServerAdmin({
  className = "",
  compact = false,
}: ServerClockProps) {
  const [serverTimestamp, setServerTimestamp] =
    useState<number | null>(null);

  const [clientSyncTimestamp, setClientSyncTimestamp] =
    useState<number | null>(null);

  const [time, setTime] = useState("--:--:--");

  const [dateStr, setDateStr] = useState(
    "Mengambil waktu server..."
  );

  const [synced, setSynced] = useState(false);

  const [remainingMs, setRemainingMs] =
    useState(SESSION_TIMEOUT_MS);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // =========================================================
  // SESSION TIMEOUT
  // =========================================================

  const calcRemaining = useCallback(() => {
    const user = localStorage.getItem("sipresma_user");

    const lastActivity = localStorage.getItem(
      LAST_ACTIVITY_KEY
    );

    setIsLoggedIn(Boolean(user));

    if (!user || !lastActivity) {
      setRemainingMs(SESSION_TIMEOUT_MS);
      return;
    }

    const last = Number(lastActivity);

    if (Number.isNaN(last)) {
      setRemainingMs(SESSION_TIMEOUT_MS);
      return;
    }

    const elapsed = Date.now() - last;

    const remaining =
      SESSION_TIMEOUT_MS - elapsed;

    setRemainingMs(Math.max(0, remaining));
  }, []);

  // =========================================================
  // UPDATE CLOCK DARI SERVER
  // =========================================================

  const updateClock = useCallback(() => {
    if (
      serverTimestamp === null ||
      clientSyncTimestamp === null
    ) {
      return;
    }

    const elapsed =
      Date.now() - clientSyncTimestamp;

    const currentServerTimestamp =
      serverTimestamp + elapsed;

    const currentServerDate = new Date(
      currentServerTimestamp
    );

    // Format waktu WIB
    const formattedTime =
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(currentServerDate);

    // Format tanggal WIB
    const formattedDate =
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(currentServerDate);

    setTime(formattedTime);
    setDateStr(formattedDate);
  }, [
    serverTimestamp,
    clientSyncTimestamp,
  ]);

  // =========================================================
  // FETCH WAKTU SERVER
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const fetchServerTime = async () => {
      try {
        const response = await fetch(
          "/api/server-time",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Gagal mengambil waktu server"
          );
        }

        const data = await response.json();

        if (!mounted) return;

        if (
          data.success &&
          typeof data.serverTimestamp === "number"
        ) {
          setServerTimestamp(
            data.serverTimestamp
          );

          setClientSyncTimestamp(
            Date.now()
          );

          setSynced(true);
        }
      } catch (error) {
        console.error(
          "Failed to fetch server time:",
          error
        );

        if (mounted) {
          setSynced(false);
        }
      }
    };

    fetchServerTime();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // UPDATE JAM SETIAP DETIK
  // =========================================================

  useEffect(() => {
    updateClock();

    const interval = setInterval(
      updateClock,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [updateClock]);

  // =========================================================
  // SESSION COUNTDOWN
  // =========================================================

  useEffect(() => {
    calcRemaining();

    const interval = setInterval(
      calcRemaining,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [calcRemaining]);

  // =========================================================
  // DETEKSI AKTIVITAS USER
  // =========================================================

  useEffect(() => {
    const handleActivity = () => {
      calcRemaining();
    };

    window.addEventListener(
      "click",
      handleActivity
    );

    window.addEventListener(
      "keydown",
      handleActivity
    );

    window.addEventListener(
      "mousedown",
      handleActivity
    );

    window.addEventListener(
      "touchstart",
      handleActivity
    );

    return () => {
      window.removeEventListener(
        "click",
        handleActivity
      );

      window.removeEventListener(
        "keydown",
        handleActivity
      );

      window.removeEventListener(
        "mousedown",
        handleActivity
      );

      window.removeEventListener(
        "touchstart",
        handleActivity
      );
    };
  }, [calcRemaining]);

  // =========================================================
  // FORMAT COUNTDOWN
  // =========================================================

  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.max(
      0,
      Math.floor(ms / 1000)
    );

    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  // =========================================================
  // SESSION STATUS
  // =========================================================

  const showCountdown =
    isLoggedIn &&
    remainingMs <=
      SHOW_COUNTDOWN_THRESHOLD_MS;

  const isCritical =
    remainingMs <= 60 * 1000;

  const isWarning =
    remainingMs <= 2 * 60 * 1000;

  // =========================================================
  // COMPACT MODE
  // Untuk Topbar
  // =========================================================

  if (compact) {
    return (
      <div
        className={`
          flex
          items-center
          gap-2
          px-3
          py-2
          rounded-xl
          border
          border-border
          bg-input
          hover:bg-accent
          text-foreground
          transition-all
          select-none
          shadow-card
          ${className}
        `}
        title={`Waktu Server ${time} WIB`}
      >
        {/* Icon */}
        <Clock className="w-4 h-4 shrink-0 text-primary" />

        {/* Jam */}
        <span className="font-mono font-bold text-xs tabular-nums text-foreground">
          {synced ? time : "--:--:--"}
        </span>

        {/* WIB */}
        <span className="hidden lg:inline text-[10px] font-bold text-muted-foreground">
          WIB
        </span>
      </div>
    );
  }

  // =========================================================
  // FULL SERVER CLOCK
  // =========================================================

  return (
    <div
      className={`
        bg-card
        border
        border-border
        rounded-2xl
        p-5
        shadow-sm
        relative
        overflow-hidden
        text-foreground
        ${className}
      `}
    >
      {/* Decorative Background */}
      <div
        className="
          absolute
          -right-8
          -top-8
          w-24
          h-24
          bg-primary/10
          rounded-full
          blur-xl
          pointer-events-none
        "
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between mb-3">
        {/* Title */}
        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            font-semibold
            uppercase
            tracking-wider
            text-muted-foreground
          "
        >
          <Clock className="w-4 h-4 text-primary" />

          <span>Waktu Server</span>
        </div>

        {/* Status */}
        <div
          className="
            flex
            items-center
            gap-1.5
            bg-primary/10
            text-primary
            px-2.5
            py-1
            rounded-full
            text-xs
            font-medium
            border
            border-primary/20
          "
        >
          <ShieldCheck className="w-3.5 h-3.5" />

          <span>
            {synced
              ? "Terverifikasi WIB"
              : "Sinkronisasi..."}
          </span>
        </div>
      </div>

      {/* =====================================================
          CLOCK
      ===================================================== */}

      <div className="flex items-center justify-center py-2">
        <div
          className="
            bg-input
            border
            border-border
            rounded-xl
            px-5
            py-3
            text-3xl
            md:text-4xl
            font-extrabold
            font-mono
            text-center
            shadow-inner
            tracking-wider
            text-foreground
          "
        >
          {synced ? time : "--:--:--"}
        </div>
      </div>

      {/* =====================================================
          DATE
      ===================================================== */}

      <div
        className="
          text-center
          mt-2
          text-xs
          md:text-sm
          font-medium
          text-muted-foreground
        "
      >
        {dateStr} • WIB
      </div>

      {/* =====================================================
          SESSION WARNING
      ===================================================== */}

      {showCountdown && (
        <div className="mt-4">
          <Alert
            status={
              isCritical
                ? "danger"
                : isWarning
                ? "warning"
                : "accent"
            }
            className="
              rounded-xl
              border
              border-border
            "
          >
            {/* Icon */}
            <Alert.Indicator>
              {isCritical ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Timer className="w-5 h-5" />
              )}
            </Alert.Indicator>

            {/* Content */}
            <Alert.Content>
              <Alert.Title className="font-bold">
                {isCritical
                  ? "Sesi hampir berakhir!"
                  : "Sesi akan berakhir"}
              </Alert.Title>

              <Alert.Description>
                {isCritical
                  ? "Segera lakukan aktivitas untuk tetap masuk."
                  : "Klik atau ketik untuk memperpanjang sesi."}
              </Alert.Description>
            </Alert.Content>

            {/* Countdown */}
            <span
              className="
                ml-auto
                self-center
                font-mono
                font-black
                text-base
                tabular-nums
                whitespace-nowrap
                text-foreground
              "
            >
              {formatRemaining(remainingMs)}
            </span>
          </Alert>
        </div>
      )}
    </div>
  );
}