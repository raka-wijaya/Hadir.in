"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User, UserRole } from "@/types";
import { getDefaultDashboardForRole } from "../permissions";
import { useRouter, usePathname } from "next/navigation";

// Konfigurasi Session Timeout
// Durasi tidak aktif sebelum auto logout (dalam menit)
const SESSION_TIMEOUT_MINUTES = 10;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
const LAST_ACTIVITY_KEY = "sipresma_last_activity";
// Cek setiap 10 detik agar lebih responsif
const CHECK_INTERVAL_MS = 10 * 1000;
// Throttle update aktivitas agar tidak spam localStorage (max 1x per 5 detik)
const ACTIVITY_THROTTLE_MS = 5 * 1000;

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  theme: "light" | "dark";
  toggleTheme: () => void;
  login: (user: User) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const pathname = usePathname();
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref untuk throttle: catat kapan terakhir kali updateLastActivity benar-benar nulis
  const lastActivityWriteRef = useRef<number>(0);

  // Catat waktu aktivitas terakhir (dengan throttle)
  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current >= ACTIVITY_THROTTLE_MS) {
      lastActivityWriteRef.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }
  }, []);

  // Periksa apakah session sudah kedaluwarsa
  const checkSessionExpiry = useCallback(() => {
    const savedUser = localStorage.getItem("hadirin_user");
    if (!savedUser) return; // Belum login, skip

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      // Tidak ada catatan aktivitas → anggap baru login, catat sekarang
      updateLastActivity();
      return;
    }

    const elapsed = Date.now() - parseInt(lastActivity, 10);
    if (elapsed >= SESSION_TIMEOUT_MS) {
      // Session expired → auto logout
      setUser(null);
      localStorage.removeItem("hadirin_user");
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      router.push("/login?reason=timeout");
    }
  }, [router, updateLastActivity]);

  // Pasang event listener aktivitas pengguna
  useEffect(() => {
    if (!user) return;

    // Hanya event yang benar-benar menunjukkan interaksi nyata user
    // JANGAN pakai mousemove/scroll → terlalu sensitif, selalu reset timer
    const activityEvents = ["mousedown", "keydown", "touchstart", "click"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateLastActivity, { passive: true });
    });

    sessionCheckRef.current = setInterval(checkSessionExpiry, CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateLastActivity);
      });
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
    };
  }, [user, updateLastActivity, checkSessionExpiry]);

  useEffect(() => {
    const savedUser = localStorage.getItem("hadirin_user");
    const savedTheme = localStorage.getItem("hadirin_theme") as
      | "light"
      | "dark"
      | null;

    if (savedUser) {
      try {
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        const isExpired =
          lastActivity && Date.now() - parseInt(lastActivity, 10) >= SESSION_TIMEOUT_MS;

        if (isExpired) {
          localStorage.removeItem("hadirin_user");
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          setUser(null);
        } else {
          setUser(JSON.parse(savedUser));
          updateLastActivity();
        }
      } catch {
        setUser(null);
        localStorage.removeItem("hadirin_user");
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
    } else {
      setUser(null);
    }

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    setIsInitialized(true);
  }, [updateLastActivity]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("hadirin_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("hadirin_user", JSON.stringify(userData));
    updateLastActivity();
    const targetPath = getDefaultDashboardForRole(userData.role);
    router.push(targetPath);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("hadirin_user");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    router.push("/login");
  };

  const switchRole = (newRole: UserRole) => {
    const targetUser: User = {
      id: `mock-${newRole}`,
      nama: `User (${newRole})`,
      name: `User (${newRole})`,
      email: `${newRole.toLowerCase()}@hadirin.go.id`,
      role: newRole,
      status: "ACTIVE",
      sekolah_kampus: "Hadirin System",
      institution: "Hadirin System",
    };

    setUser(targetUser);
    localStorage.setItem("hadirin_user", JSON.stringify(targetUser));
    updateLastActivity();

    const defaultPath = getDefaultDashboardForRole(newRole);
    if (!pathname.startsWith(defaultPath.split("/")[1])) {
      router.push(defaultPath);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("hadirin_user", JSON.stringify(updated));
      updateLastActivity();
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        theme,
        toggleTheme,
        login,
        logout,
        switchRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
