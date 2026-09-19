"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABELS } from "@/types";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ServerAdmin } from "@/components/ui/ServerAdmin";
import { LogBookLogoutModal } from "@/components/ui/LogBookLogoutModal";

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

export function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const { user, theme, toggleTheme, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogBookLogoutWarning, setShowLogBookLogoutWarning] =
    useState(false);
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, idx) => {
    const title = seg.charAt(0).toUpperCase() + seg.slice(1).replace("-", " ");
    return { title, href: "/" + pathSegments.slice(0, idx + 1).join("/") };
  });

  const userRole = user?.role || "ANAK_MAGANG";

  const handleLogoutClick = async () => {
    setProfileOpen(false);
    const isMagang = String(userRole).toUpperCase().includes("MAGANG");
    if (isMagang && user?.id) {
      try {
        const todayStr = new Intl.DateTimeFormat("sv-SE", {
          timeZone: "Asia/Jakarta",
        }).format(new Date());

        const res = await fetch(
          `/api/log-book?peserta_magang_id=${encodeURIComponent(user.id)}&tanggal=${todayStr}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = await res.json();
          const hasLogbook =
            json.success && Array.isArray(json.data) && json.data.length > 0;
          if (!hasLogbook) {
            setShowLogBookLogoutWarning(true);
            return;
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa log book:", err);
      }
    }
    logout();
  };

  const showServerAdmin = userRole === 'SUPERADMIN' || userRole.startsWith('ADMIN');

  return (
    <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 lg:px-8 py-3 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 cursor-pointer rounded-xl border border-border bg-input hover:bg-accent text-foreground transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Beranda
          </Link>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <span>/</span>
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "text-foreground font-extrabold"
                    : "hover:text-primary"
                }
              >
                {b.title}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="sm:hidden font-extrabold text-base text-foreground flex items-center gap-2">
          <span>Hadir.in</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {showServerAdmin && (
          <div className="hidden lg:flex items-center">
            <ServerAdmin compact />
          </div>
        )}

        <button
          onClick={toggleTheme}
          title="Beralih Mode Gelap/Terang"
          className="p-2.5 rounded-xl cursor-pointer border border-border bg-input hover:bg-accent text-foreground transition-all"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-primary" />
          ) : (
            <Moon className="w-4 h-4 text-foreground" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center cursor-pointer gap-2 p-1 md:pr-2.5 rounded-xl border border-border bg-input hover:bg-accent transition-all"
          >
            <img
              src={
                user?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nama || "User")}&background=f59e0b&color=000000&bold=true`
              }
              alt="Profile Avatar"
              className="w-7 h-7 rounded-full object-cover border border-primary"
            />
            <span className="hidden md:inline font-bold text-xs text-foreground truncate max-w-[110px]">
              {(user?.nama || user?.name || "User").split(" ")[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-elevated p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
              <div className="p-2.5 bg-muted/60 rounded-lg border border-border mb-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.nama || user?.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {user?.email}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/20 text-primary uppercase tracking-wider">
                  {ROLE_LABELS[userRole] || userRole}
                </span>
              </div>

              <Link
                href={
                  userRole === "ANAK_MAGANG" || userRole === "KARYAWAN_OS"
                    ? "/magang/profil"
                    : "/admin/profil"
                }
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <UserIcon className="w-4 h-4 text-primary" />
                <span>Lihat Profil Saya</span>
              </Link>

              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Hadir.in</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <LogBookLogoutModal
        isOpen={showLogBookLogoutWarning}
        onClose={() => setShowLogBookLogoutWarning(false)}
        onConfirmLogout={() => {
          setShowLogBookLogoutWarning(false);
          logout();
        }}
      />
    </header>
  );
}
