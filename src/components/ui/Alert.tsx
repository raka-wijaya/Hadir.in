"use client";

import React from "react";
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info as InfoIcon,
  XCircle,
} from "lucide-react";

// ─── Shadcn-style Alert ─────────────────────────────────────────────────────
// Usage:
//   <Alert>
//     <CheckCircle2Icon />
//     <AlertTitle>Title</AlertTitle>
//     <AlertDescription>Description</AlertDescription>
//   </Alert>

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export function Alert({
  className = "",
  variant = "default",
  children,
  ...props
}: AlertProps) {
  const base =
    "relative w-full rounded-2xl border border-border px-4 py-3.5 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing,0.25rem)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current";
  const variants: Record<string, string> = {
    default: "bg-card text-foreground",
    destructive: "text-destructive bg-card [&>svg]:text-current",
  };

  return (
    <div
      data-slot="alert"
      role="alert"
      className={`${base} ${variants[variant] ?? variants.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-title"
      className={`col-start-2 font-bold leading-none tracking-tight text-sm ${className}`}
      {...props}
    />
  );
}

export function AlertDescription({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={`text-muted-foreground col-start-2 grid justify-items-start gap-1 text-xs font-medium [&_p]:leading-relaxed ${className}`}
      {...props}
    />
  );
}

// ─── AlertModal ──────────────────────────────────────────────────────────────
/**
 * Floating / Modal Alert Component untuk notifikasi info / sukses / error
 */
export function AlertModal({
  isOpen,
  title = "Pemberitahuan",
  message,
  color = "red",
  onClose,
}: {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  variant?: "light" | "filled" | "outline";
  color?: "red" | "blue" | "green" | "yellow" | "orange";
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const getIconBadge = () => {
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
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-center">
        {getIconBadge()}
        <div>
          <h3 className="text-base font-black text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {message}
          </div>
        </div>

        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-90 shadow-card transition-all cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
/**
 * Confirm Modal Component (selaras dengan style modal delete di Izin)
 */
export function ConfirmModal({
  isOpen,
  title = "Konfirmasi Tindakan",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  confirmColor = "red",
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "red" | "blue" | "green" | "yellow" | "orange";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  const isDeleteAction =
    confirmColor === "red" ||
    (typeof title === "string" && title.toLowerCase().includes("hapus"));

  const getIconBadge = () => {
    switch (confirmColor) {
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

  const getConfirmButtonClasses = () => {
    switch (confirmColor) {
      case "green":
        return "bg-emerald-600 hover:bg-emerald-700 text-white";
      case "blue":
        return "bg-primary hover:bg-primary/90 text-primary-foreground";
      case "yellow":
      case "orange":
        return "bg-amber-600 hover:bg-amber-700 text-white";
      case "red":
      default:
        return "bg-destructive hover:bg-destructive/90 text-destructive-foreground";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-center">
        {getIconBadge()}
        <div>
          <h3 className="text-base font-black text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {message}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold cursor-pointer transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all ${getConfirmButtonClasses()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { InfoIcon, AlertTriangle as Warning, CheckCircle2 as CheckCircle, XCircle };
