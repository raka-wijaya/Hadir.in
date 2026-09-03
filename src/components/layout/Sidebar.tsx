"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { UserRole, ROLE_LABELS } from "@/types";

import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  User as UserIcon,
  ListTodo,
  History,
  FileCheck,
  X,
  ShieldAlert,
  ShieldCheck,
  MessageSquareText,
  NotebookPen,
  Briefcase,
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavMenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface NavMenuGroup {
  category: string;
  items: NavMenuItem[];
}

export function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const effectiveRole = user?.role
    ? String(user.role).toUpperCase()
    : pathname.startsWith("/admin")
    ? "SUPERADMIN"
    : pathname.startsWith("/pegawai-os")
    ? "KARYAWAN_OS"
    : "ANAK_MAGANG";

  const superAdminMenu: NavMenuGroup[] = [
    {
      category: "UTAMA",
      items: [
        {
          title: "Beranda",
          href: "/admin/dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PENDAFTARAN & VERIFIKASI",
      items: [
        {
          title: "Verifikasi Akun",
          href: "/admin/verifikasi-akun",
          icon: <ShieldCheck className="w-4 h-4" />,
        },
        {
          title: "Pendaftaran Magang",
          href: "/admin/pendaftaran",
          icon: <ClipboardList className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "MANAJEMEN",
      items: [
        {
          title: "Manajemen Anak Magang",
          href: "/admin/anak-magang",
          icon: <Users className="w-4 h-4" />,
        },
        {
          title: "Manajemen Pegawai OS",
          href: "/admin/pegawai-os",
          icon: <UserCheck className="w-4 h-4" />,
        },
        {
          title: "Manajemen Izin",
          href: "/admin/izin",
          icon: <FileCheck className="w-4 h-4" />,
        },
        {
          title: "Manajemen Logbook",
          href: "/admin/log-book",
          icon: <NotebookPen className="w-4 h-4" />,
        },
        {
          title: "Manajemen Tugas",
          href: "/admin/tugas",
          icon: <Briefcase className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PRESENSI & REKAP",
      items: [
        {
          title: "Rekap Kehadiran",
          href: "/admin/rekap-kehadiran",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "SISTEM & HAK AKSES",
      items: [
        {
          title: "Rule / Hak Akses",
          href: "/admin/roles",
          icon: <ShieldAlert className="w-4 h-4" />,
        },
        {
          title: "Pengaturan Sistem",
          href: "/admin/pengaturan",
          icon: <Settings className="w-4 h-4" />,
        },
        {
          title: "Profil Saya",
          href: "/admin/profil",
          icon: <UserIcon className="w-4 h-4" />,
        },
      ],
    },
  ];

  const adminMagangMenu: NavMenuGroup[] = [
    {
      category: "UTAMA",
      items: [
        {
          title: "Beranda",
          href: "/admin/dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PENDAFTARAN",
      items: [
        {
          title: "Pendaftaran Magang",
          href: "/admin/pendaftaran",
          icon: <ClipboardList className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "MANAJEMEN MAGANG",
      items: [
        {
          title: "Manajemen Anak Magang",
          href: "/admin/anak-magang",
          icon: <Users className="w-4 h-4" />,
        },
        {
          title: "Manajemen Izin",
          href: "/admin/izin",
          icon: <FileCheck className="w-4 h-4" />,
        },
        {
          title: "Manajemen Logbook",
          href: "/admin/log-book",
          icon: <NotebookPen className="w-4 h-4" />,
        },
        {
          title: "Manajemen Tugas",
          href: "/admin/tugas",
          icon: <Briefcase className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PRESENSI & REKAP",
      items: [
        {
          title: "Rekap Kehadiran",
          href: "/admin/rekap-kehadiran",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "AKUN",
      items: [
        {
          title: "Profil Saya",
          href: "/admin/profil",
          icon: <UserIcon className="w-4 h-4" />,
        },
      ],
    },
  ];

  const adminOsMenu: NavMenuGroup[] = [
    {
      category: "UTAMA",
      items: [
        {
          title: "Beranda",
          href: "/admin/dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "MANAJEMEN OS",
      items: [
        {
          title: "Manajemen Pegawai OS",
          href: "/admin/pegawai-os",
          icon: <UserCheck className="w-4 h-4" />,
        },
        {
          title: "Manajemen Izin",
          href: "/admin/izin",
          icon: <FileCheck className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PRESENSI & REKAP",
      items: [
        {
          title: "Rekap Kehadiran",
          href: "/admin/rekap-kehadiran",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "AKUN",
      items: [
        {
          title: "Profil Saya",
          href: "/admin/profil",
          icon: <UserIcon className="w-4 h-4" />,
        },
      ],
    },
  ];

  const anakMagangMenu: NavMenuGroup[] = [
    {
      category: "UTAMA",
      items: [
        {
          title: "Beranda",
          href: "/magang/dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PRESENSI",
      items: [
        {
          title: "Riwayat Presensi",
          href: "/magang/riwayat",
          icon: <History className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "AKTIVITAS",
      items: [
        {
          title: "Logbook",
          href: "/magang/log-book",
          icon: <NotebookPen className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "AKUN",
      items: [
        {
          title: "Profil Saya",
          href: "/magang/profil",
          icon: <UserIcon className="w-4 h-4" />,
        },
      ],
    },
  ];

  const pegawaiOsMenu: NavMenuGroup[] = [
    {
      category: "UTAMA",
      items: [
        {
          title: "Beranda",
          href: "/pegawai-os/dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "PRESENSI",
      items: [
        {
          title: "Riwayat Presensi",
          href: "/pegawai-os/riwayat",
          icon: <History className="w-4 h-4" />,
        },
      ],
    },

    {
      category: "AKUN",
      items: [
        {
          title: "Profil Saya",
          href: "/pegawai-os/profil",
          icon: <UserIcon className="w-4 h-4" />,
        },
      ],
    },
  ];

  let navMenuItems: NavMenuGroup[];

  switch (effectiveRole) {
    case "SUPERADMIN":
    case "SUPER_ADMIN":
      navMenuItems = superAdminMenu;
      break;

    case "ADMIN_MAGANG":
      navMenuItems = adminMagangMenu;
      break;

    case "ADMIN_OS":
      navMenuItems = adminOsMenu;
      break;

    case "KARYAWAN_OS":
    case "PEGAWAI_OS":
    case "ANAK_OS":
      navMenuItems = pegawaiOsMenu;
      break;

    case "ANAK_MAGANG":
    case "MAGANG":
    default:
      if (pathname.startsWith("/admin")) {
        navMenuItems = superAdminMenu;
      } else if (pathname.startsWith("/pegawai-os")) {
        navMenuItems = pegawaiOsMenu;
      } else {
        navMenuItems = anakMagangMenu;
      }
      break;
  }

  const isMenuActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard";
    }

    if (href === "/magang/dashboard") {
      return pathname === "/magang/dashboard";
    }

    if (href === "/pegawai-os/dashboard") {
      return pathname === "/pegawai-os/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };
  const sidebarContent = (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border w-[260px]">
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
            H
          </div>

          <div>
            <h1 className="font-extrabold text-base leading-none tracking-tight text-sidebar-foreground">
              Hadir.in
            </h1>

            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
              Sistem Presensi Magang
            </p>
          </div>
        </Link>

        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 min-h-0 p-3 space-y-4 overflow-y-auto">

        {navMenuItems.map((group) => (
          <div
            key={group.category}
            className="space-y-1"
          >
            <p className="px-3 text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase mb-1">
              {group.category}
            </p>
            {group.items.map((item) => {
              const isActive = isMenuActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (mobileOpen && onCloseMobile) {
                      onCloseMobile();
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "text-primary-foreground shrink-0"
                        : "text-primary shrink-0"
                    }
                  >
                    {item.icon}
                  </span>

                  <span className="truncate">
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}

      </nav>

      <div className="p-3 border-t border-sidebar-border bg-sidebar shrink-0">

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border shadow-card">

          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">

            <img
              src={
                user?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.nama ||
                    user?.name ||
                    "User"
                )}&background=f59e0b&color=000000&bold=true`
              }
              alt={
                user?.nama ||
                user?.name ||
                "User Avatar"
              }
              className="w-8 h-8 rounded-full object-cover border border-primary shrink-0"
            />

            <div className="truncate min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {user?.nama ||
                  user?.name ||
                  "Pengguna"}
              </p>

              <p className="text-[10px] font-medium text-muted-foreground truncate">
                {ROLE_LABELS[
                  effectiveRole as UserRole
                ] || effectiveRole}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Keluar Akun"
            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 w-[260px]">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">

          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={onCloseMobile}
          />

          <div className="relative z-10 w-[260px] max-w-[80vw] h-full shadow-elevated animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}