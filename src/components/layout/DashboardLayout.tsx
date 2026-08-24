"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNavbar } from "./MobileNavbar";
import { useAuth } from "@/lib/auth/context";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();

  const role = String(user?.role || "ANAK_MAGANG").toUpperCase();
  const isNonAdmin = role === "ANAK_MAGANG" || role === "ANAK_OS" || role === "PEGAWAI_OS" || role === "KARYAWAN_OS" || role === "MAGANG";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Desktop Sidebar (260px) & Mobile Drawer */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-[260px] flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Page Content */}
        <main className={`flex-1 p-4 md:p-6 lg:p-8 space-y-6 ${isNonAdmin ? "pb-24 lg:pb-8" : ""}`}>
          {children}
        </main>
      </div>

      {/* Bottom Mobile Navigation for Non-Admin */}
      <MobileNavbar />
    </div>
  );
}
