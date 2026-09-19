"use client";

import { useEffect } from "react";

/**
 * Memblokir tombol Enter secara global di seluruh aplikasi.
 * Tidak menampilkan UI apapun - hanya memasang event listener.
 */
export function EnterKeyBlocker() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;

      // Izinkan Enter di dalam <textarea> agar baris baru tetap bisa diketik
      const target = e.target as HTMLElement;
      if (target && target.tagName === "TEXTAREA") return;

      e.preventDefault();
      e.stopPropagation();
    };

    // capture: true agar intersepsi terjadi sebelum event sampai ke elemen
    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}
