import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { MantineProvider } from "@mantine/core";

export const metadata: Metadata = {
  title: "SiPresma — Sistem Informasi Presensi Magang",
  description: "Sistem Informasi Presensi dan Administrasi Magang terpusat untuk pengelolaan data pendaftaran, presensi kamera real time, izin, rekap kehadiran, dan jobdesk.",
};

import { NotificationProvider } from "@/components/ui/NotificationProvider";
import { EnterKeyBlocker } from "@/components/ui/EnterKeyBlocker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <MantineProvider defaultColorScheme="auto">
          <AuthProvider>
            <NotificationProvider>
              <EnterKeyBlocker />
              {children}
            </NotificationProvider>
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

