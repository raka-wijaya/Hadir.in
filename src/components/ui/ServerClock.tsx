"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  ShieldCheck,
  Timer,
  AlertTriangle,
} from "lucide-react";

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = "sipresma_last_activity";
const SHOW_COUNTDOWN_THRESHOLD_MS = 3 * 60 * 1000;

export function ServerClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState("-- : -- : --");
  const [dateStr, setDateStr] = useState("Mengambil waktu server...");
  const [synced, setSynced] = useState(false);

  const [remainingMs, setRemainingMs] =
    useState(SESSION_TIMEOUT_MS);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const calcRemaining = useCallback(() => {
    const user = localStorage.getItem("sipresma_user");
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

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
    const remaining = SESSION_TIMEOUT_MS - elapsed;

    setRemainingMs(Math.max(0, remaining));
  }, []);

  // ==============================
  // SERVER CLOCK
  // ==============================
  useEffect(() => {
    let mounted = true;

    const fetchServerTime = async () => {
      try {
        const res = await fetch("/api/server-time", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!mounted) return;

        if (data.success) {
          setTime(data.serverTime);
          setDateStr(data.serverDateFormatted);
          setSynced(true);
        }
      } catch (error) {
        console.error("Failed to fetch server time:", error);
        setSynced(false);
      }
    };

    fetchServerTime();

    const interval = setInterval(fetchServerTime, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // ==============================
  // SESSION COUNTDOWN
  // ==============================
  useEffect(() => {
    calcRemaining();

    const interval = setInterval(calcRemaining, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining]);

  // ==============================
  // DETEKSI LOGIN / LOGOUT
  // ==============================
  useEffect(() => {
    const handleActivity = () => {
      calcRemaining();
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [calcRemaining]);

  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  const showCountdown =
    isLoggedIn &&
    remainingMs <= SHOW_COUNTDOWN_THRESHOLD_MS;

  const isCritical = remainingMs <= 60 * 1000;
  const isWarning = remainingMs <= 2 * 60 * 1000;

  const timeParts = time.split(":");

  return (
    <div
      className={`bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden ${className}`}
    >
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span>Waktu Server</span>
        </div>

        <div className="flex items-center gap-1.5 bg-primary/10 text-primary-foreground dark:text-primary px-2.5 py-1 rounded-full text-xs font-medium border border-primary/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            {synced ? "Terverifikasi WIB" : "Sinkronisasi..."}
          </span>
        </div>
      </div>

      {/* CLOCK */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="bg-input border border-border rounded-xl px-3 py-2 text-2xl md:text-3xl font-extrabold font-mono min-w-[54px] text-center shadow-inner">
          {timeParts[0] ?? "--"}
        </div>
      </div>

      {/* DATE */}
      <div className="text-center mt-2 text-xs md:text-sm font-medium text-muted-foreground">
        {dateStr}
      </div>

      {/* SESSION */}
      {showCountdown && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 flex items-center gap-2 border ${
            isCritical
              ? "bg-red-500/10 border-red-500/40"
              : isWarning
              ? "bg-orange-500/10 border-orange-500/40"
              : "bg-amber-500/10 border-amber-500/30"
          }`}
        >
          {isCritical ? (
            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
          ) : (
            <Timer className="w-4 h-4 text-amber-500 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-bold ${
                isCritical
                  ? "text-red-600 dark:text-red-400"
                  : isWarning
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {isCritical
                ? "Sesi hampir berakhir!"
                : "Sesi akan berakhir"}
            </p>

            <p className="text-[10px] text-muted-foreground font-medium">
              {isCritical
                ? "Segera lakukan aktivitas untuk tetap masuk"
                : "Klik atau ketik untuk memperpanjang sesi"}
            </p>
          </div>

          <span
            className={`font-mono font-black text-base tabular-nums ${
              isCritical
                ? "text-red-600 dark:text-red-400 animate-pulse"
                : isWarning
                ? "text-orange-600 dark:text-orange-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {formatRemaining(remainingMs)}
          </span>
        </div>
      )}
    </div>
  );
}