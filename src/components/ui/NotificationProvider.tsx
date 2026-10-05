"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info as InfoIcon,
  Trash2,
} from "lucide-react";
import { ModalPortal } from "./ModalPortal";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationOptions {
  type: NotificationType;
  message: React.ReactNode;
  title?: string;
  confirmLabel?: string;
  onClose?: () => void;
}

export type ConfirmColor = "red" | "blue" | "green" | "yellow" | "orange";

export interface ConfirmationOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: ConfirmColor;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface NotificationContextValue {
  showNotification: (options: NotificationOptions) => void;
  closeNotification: () => void;
  showConfirm: (options: ConfirmationOptions) => void;
  closeConfirm: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let globalShowNotification: ((options: NotificationOptions) => void) | null =
  null;
let globalCloseNotification: (() => void) | null = null;
let globalShowConfirm: ((options: ConfirmationOptions) => void) | null = null;
let globalCloseConfirm: (() => void) | null = null;

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

export function showConfirm(options: ConfirmationOptions) {
  if (globalShowConfirm) {
    globalShowConfirm(options);
  } else {
    console.warn("NotificationProvider is not yet mounted.", options);
  }
}

export function closeConfirm() {
  if (globalCloseConfirm) {
    globalCloseConfirm();
  }
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      showNotification,
      closeNotification,
      showConfirm,
      closeConfirm,
    };
  }
  return ctx;
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeNotification, setActiveNotification] =
    useState<NotificationOptions | null>(null);
  const [activeConfirmation, setActiveConfirmation] =
    useState<ConfirmationOptions | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

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

  const handleShowConfirm = useCallback((options: ConfirmationOptions) => {
    setActiveConfirmation(options);
  }, []);

  const handleCloseConfirm = useCallback(() => {
    const callback = activeConfirmation?.onCancel;
    setActiveConfirmation(null);
    setIsConfirming(false);
    if (callback) {
      try {
        callback();
      } catch (e) {
        console.error("Error in confirmation onCancel callback:", e);
      }
    }
  }, [activeConfirmation]);

  const handleConfirmAction = useCallback(async () => {
    if (!activeConfirmation) return;
    try {
      setIsConfirming(true);
      await activeConfirmation.onConfirm();
      setActiveConfirmation(null);
    } catch (e) {
      console.error("Error in confirmation onConfirm callback:", e);
    } finally {
      setIsConfirming(false);
    }
  }, [activeConfirmation]);

  useEffect(() => {
    globalShowNotification = handleShow;
    globalCloseNotification = handleClose;
    globalShowConfirm = handleShowConfirm;
    globalCloseConfirm = handleCloseConfirm;

    if (typeof window !== "undefined") {
      const originalAlert = window.alert;
      window.alert = (message?: any) => {
        handleShow({
          type: "info",
          title: "Informasi",
          message:
            typeof message === "object"
              ? JSON.stringify(message)
              : String(message ?? ""),
        });
      };

      return () => {
        globalShowNotification = null;
        globalCloseNotification = null;
        globalShowConfirm = null;
        globalCloseConfirm = null;
        window.alert = originalAlert;
      };
    }

    return () => {
      globalShowNotification = null;
      globalCloseNotification = null;
      globalShowConfirm = null;
      globalCloseConfirm = null;
    };
  }, [handleShow, handleClose, handleShowConfirm, handleCloseConfirm]);

  useEffect(() => {
    if (!activeNotification && !activeConfirmation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeConfirmation && !isConfirming) {
          handleCloseConfirm();
        } else if (activeNotification) {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeNotification,
    activeConfirmation,
    isConfirming,
    handleClose,
    handleCloseConfirm,
  ]);

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

  const getConfirmIconBadge = (
    color: ConfirmColor = "red",
    title?: string,
  ) => {
    const isDeleteAction =
      color === "red" ||
      (typeof title === "string" && title.toLowerCase().includes("hapus"));

    switch (color) {
      case "green":
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case "yellow":
      case "orange":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "blue":
        return (
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <InfoIcon className="w-6 h-6" />
          </div>
        );
      case "red":
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            {isDeleteAction ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
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

  const getConfirmButtonClasses = (color: ConfirmColor = "red") => {
    switch (color) {
      case "green":
        return "bg-emerald-600 hover:bg-emerald-700 text-white";
      case "blue":
        return "bg-primary hover:brightness-95 text-primary-foreground";
      case "yellow":
      case "orange":
        return "bg-amber-600 hover:bg-amber-700 text-white";
      case "red":
      default:
        return "bg-destructive hover:brightness-95 text-destructive-foreground";
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification: handleShow,
        closeNotification: handleClose,
        showConfirm: handleShowConfirm,
        closeConfirm: handleCloseConfirm,
      }}
    >
      {children}

      {/* Single action Notification Modal */}
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
                  {activeNotification.title ||
                    getDefaultTitle(activeNotification.type)}
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

      {/* Confirmation Dialog Modal */}
      {activeConfirmation && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => {
              if (!isConfirming) handleCloseConfirm();
            }}
          >
            <div
              className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 md:p-6 shadow-elevated space-y-4 animate-in fade-in max-h-[calc(100vh-2rem)] overflow-y-auto text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {getConfirmIconBadge(
                activeConfirmation.confirmColor,
                activeConfirmation.title,
              )}

              <div>
                <h3 className="text-base font-black text-foreground">
                  {activeConfirmation.title || "Konfirmasi Tindakan"}
                </h3>
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {activeConfirmation.message}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleCloseConfirm}
                  className="px-5 py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-extrabold text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {activeConfirmation.cancelLabel || "Batal"}
                </button>
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleConfirmAction}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-card hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 ${getConfirmButtonClasses(
                    activeConfirmation.confirmColor,
                  )}`}
                >
                  {isConfirming
                    ? "Memproses..."
                    : activeConfirmation.confirmLabel || "Ya, Lanjutkan"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </NotificationContext.Provider>
  );
}
