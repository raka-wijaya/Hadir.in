"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info as InfoIcon } from "lucide-react";
import { ModalPortal } from "./ModalPortal";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationOptions {
  type: NotificationType;
  message: React.ReactNode;
  title?: string;
  confirmLabel?: string;
  onClose?: () => void;
}

interface NotificationContextValue {
  showNotification: (options: NotificationOptions) => void;
  closeNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let globalShowNotification: ((options: NotificationOptions) => void) | null = null;
let globalCloseNotification: (() => void) | null = null;

export function showNotification(options: NotificationOptions) {
  if (globalShowNotification) {
    globalShowNotification(options);
  } else {
    console.warn("NotificationProvider is not yet mounted.", options);
  }
}

export function closeNotification() {
  if (globalCloseNotification) {
    globalCloseNotification();
  }
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      showNotification,
      closeNotification,
    };
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [activeNotification, setActiveNotification] = useState<NotificationOptions | null>(null);

  const handleShow = useCallback((options: NotificationOptions) => {
    setActiveNotification(options);
  }, []);

  const handleClose = useCallback(() => {
    const callback = activeNotification?.onClose;
    setActiveNotification(null);
    if (callback) {
      try {
        callback();
      } catch (e) {
        console.error("Error in notification onClose callback:", e);
      }
    }
  }, [activeNotification]);

  useEffect(() => {
    globalShowNotification = handleShow;
    globalCloseNotification = handleClose;

    if (typeof window !== "undefined") {
      const originalAlert = window.alert;
      window.alert = (message?: any) => {
        handleShow({
          type: "info",
          title: "Informasi",
          message: typeof message === "object" ? JSON.stringify(message) : String(message ?? ""),
        });
      };

      return () => {
        globalShowNotification = null;
        globalCloseNotification = null;
        window.alert = originalAlert;
      };
    }

    return () => {
      globalShowNotification = null;
      globalCloseNotification = null;
    };
  }, [handleShow, handleClose]);

  useEffect(() => {
    if (!activeNotification) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNotification, handleClose]);

  const getIconBadge = (type: NotificationType) => {
    switch (type) {
      case "success":
        return (
          <div className="w-12 h-12 rounded-2xl bg-status-hadir/10 text-status-hadir flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 rounded-2xl bg-status-terlambat/10 text-status-terlambat flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "info":
        return (
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <InfoIcon className="w-6 h-6" />
          </div>
        );
      case "error":
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
        );
    }
  };

  const getDefaultTitle = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "Berhasil";
      case "warning":
        return "Peringatan";
      case "info":
        return "Informasi";
      case "error":
      default:
        return "Terjadi Kesalahan";
    }
  };

  const getButtonClass = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "bg-status-hadir/80 hover:bg-status-hadir text-white";
      case "warning":
        return "bg-status-terlambat/80 hover:bg-status-terlambat text-white";
      case "info":
        return "bg-primary/80 hover:bg-primary/100 text-white";
      case "error":
      default:
        return "bg-destructive/80 hover:bg-destructive/100 text-destructive-foreground";
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification: handleShow,
        closeNotification: handleClose,
      }}
    >
      {children}

      {activeNotification && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={handleClose}
          >
            <div
              className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 md:p-6 shadow-elevated space-y-4 animate-in fade-in max-h-[calc(100vh-2rem)] overflow-y-auto text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {getIconBadge(activeNotification.type)}

              <div>
                <h3 className="text-base font-bold text-foreground">
                  {activeNotification.title || getDefaultTitle(activeNotification.type)}
                </h3>
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
                  {activeNotification.message}
                </div>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-card active:scale-[0.98] transition-all cursor-pointer ${getButtonClass(
                    activeNotification.type,
                  )}`}
                >
                  {activeNotification.confirmLabel || "Mengerti"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </NotificationContext.Provider>
  );
}
