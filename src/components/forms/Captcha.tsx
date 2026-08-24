"use client";

import React, { useCallback, useState } from "react";
import { ShieldCheck, Check, RefreshCw } from "lucide-react";

const CHARS =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

function randomCode(len = 6): string {
  let result = "";

  for (let i = 0; i < len; i++) {
    result += CHARS.charAt(
      Math.floor(Math.random() * CHARS.length)
    );
  }

  return result;
}

interface CaptchaProps {
  onVerify?: (isValid: boolean) => void;
  refreshRef?: React.MutableRefObject<(() => void) | null>;
}

export function Captcha({
  onVerify,
  refreshRef,
}: CaptchaProps) {
  const [captchaCode, setCaptchaCode] = useState("8K3M9P");

  const [userInput, setUserInput] = useState("");

  const refresh = useCallback(() => {
    setCaptchaCode((oldCode) => {
      let newCode = randomCode(6);

      // Pastikan kode baru berbeda
      while (newCode === oldCode) {
        newCode = randomCode(6);
      }

      console.log("CAPTCHA BARU:", newCode);

      return newCode;
    });

    setUserInput("");
    onVerify?.(false);
  }, [onVerify]);

  // Generate kode CAPTCHA acak di client setelah hydration
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (refreshRef) {
      refreshRef.current = refresh;
    }

    return () => {
      if (refreshRef) {
        refreshRef.current = null;
      }
    };
  }, [refreshRef, refresh]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    setUserInput(value);

    const valid =
    value.length === 6 &&  
    value.trim().toLowerCase() ===
      captchaCode.toLowerCase();

    onVerify?.(valid);
  };

  const isCorrect =
    userInput.length === 6 &&
    userInput.trim().toLowerCase() ===
      captchaCode.toLowerCase();

  const isWrong =
    userInput.length >= 6 && !isCorrect;

  return (
    <div className="space-y-2">

      {/* LABEL */}
      <div className="flex items-center">
        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Verifikasi CAPTCHA</span>
        </label>
      </div>

      {/* CAPTCHA + INPUT */}
      <div className="flex items-center gap-2">

        <button
          type="button"
          onClick={refresh}
          title="Klik untuk mengacak CAPTCHA"
          aria-label="Refresh CAPTCHA"
          className="
            relative
            w-[170px]
            h-[46px]
            shrink-0
            rounded-xl
            bg-neutral-900 dark:bg-black
            border
            border-primary/60
            shadow-inner
            flex
            items-center
            justify-around
            px-3
            cursor-pointer
            select-none
            overflow-hidden
            hover:border-primary
            active:scale-95
            transition-all
          "
        >

          {/* GRID */}
          <div
            className="
              absolute
              inset-0
              opacity-30
              pointer-events-none
              bg-[radial-gradient(rgba(245,158,11,0.6)_1px,transparent_1px)]
              [background-size:8px_8px]
            "
          />

          {/* GARIS NOISE */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-1/2 left-0 w-full h-px bg-primary rotate-12" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-primary -rotate-12" />
          </div>

          {/* KODE CAPTCHA */}
          {captchaCode.split("").map((char, index) => {
            const rotation =
              (index % 2 === 0 ? 1 : -1) *
              (5 + (index * 4) % 10);

            return (
              <span
                key={`${char}-${index}`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
                className={`
                  relative
                  z-10
                  font-mono
                  font-black
                  text-xl
                  ${
                    index % 2 === 0
                      ? "text-primary drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                      : "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                  }
                `}
              >
                {char}
              </span>
            );
          })}
        </button>

        <input
          type="text"
          value={userInput}
          maxLength={6}
          onChange={handleChange}
          placeholder="Ketik kode..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`
            w-full
            rounded-xl
            border
            px-3.5
            py-2.5
            text-sm
            font-bold
            tracking-widest
            font-mono
            bg-input
            text-foreground
            transition-all
            focus:outline-none
            focus:ring-2

            ${
              isCorrect
                ? "border-primary ring-2 ring-primary/30 text-primary"
                : ""
            }

            ${
              isWrong
                ? "border-destructive ring-2 ring-destructive/30"
                : ""
            }

            ${
              !isCorrect && !isWrong
                ? "border-border focus:ring-primary"
                : ""
            }
          `}
        />
      </div>

      {/* BERHASIL */}
      {isCorrect && (
        <p className="text-xs text-primary font-bold flex items-center gap-1">
          <Check className="w-4 h-4 text-primary" />
          Kode CAPTCHA cocok!
        </p>
      )}

      {/* SALAH */}
      {isWrong && (
        <p className="text-xs text-destructive font-semibold">
          Kode tidak cocok — klik CAPTCHA untuk mengacak lagi.
        </p>
      )}
    </div>
  );
}