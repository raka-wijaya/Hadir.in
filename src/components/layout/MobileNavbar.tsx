"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { LayoutDashboard, NotebookPen, History, User } from "lucide-react";

export function MobileNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const role = String(user?.role || "ANAK_MAGANG").toUpperCase();

  // Only render bottom nav for non-admin roles (Anak Magang & Anak OS / Pegawai OS)
  if (role.startsWith("ADMIN") || role === "SUPER_ADMIN" || role === "SUPERADMIN") {
    return null;
  }

  const isPegawaiOs = role === "ANAK_OS" || role === "PEGAWAI_OS" || role === "KARYAWAN_OS";
  const basePath = isPegawaiOs ? "/pegawai-os" : "/magang";

  const navItems = [
    {
      title: "Beranda",
      href: `${basePath}/dashboard`,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    ...(!isPegawaiOs
      ? [
          {
            title: "Logbook",
            href: `${basePath}/log-book`,
            icon: <NotebookPen className="w-5 h-5" />,
          },
        ]
      : []),
    {
      title: "Riwayat",
      href: `${basePath}/riwayat`,
      icon: <History className="w-5 h-5" />,
    },
    {
      title: "Profil",
      href: `${basePath}/profil`,
      icon: <User className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[52px] min-w-[64px] rounded-xl px-2 py-1 transition-all ${
                isActive
                  ? "text-primary font-bold bg-primary/10"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              }`}
            >
              <div className={isActive ? "scale-110 text-primary" : ""}>{item.icon}</div>
              <span className="text-[10px] font-semibold mt-1 tracking-tight">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
