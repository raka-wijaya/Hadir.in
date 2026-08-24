"use client";

import React from "react";
import { Alert as MantineAlert, AlertProps as MantineAlertProps } from "@mantine/core";
import { Info as InfoIcon, CheckCircle, Warning, XCircle, X } from "@phosphor-icons/react";

export interface CustomAlertProps extends Omit<MantineAlertProps, "children"> {
  title?: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "light" | "filled" | "outline" | "transparent" | "white" | "default";
  color?: "red" | "blue" | "green" | "yellow" | "orange" | "teal" | "cyan" | "pink" | "gray";
  icon?: React.ReactNode;
  withCloseButton?: boolean;
  onClose?: () => void;
}

export function Alert({
  title = "Pemberitahuan",
  message,
  children,
  variant = "light",
  color = "red",
  icon,
  withCloseButton = false,
  onClose,
  className = "",
  ...props
}: CustomAlertProps) {
  const defaultIcon = icon || <InfoIcon size={20} weight="bold" />;

  return (
    <div className={`relative transition-all duration-200 ${className}`}>
      <MantineAlert
        variant={variant}
        color={color}
        title={title}
        icon={defaultIcon}
        withCloseButton={withCloseButton}
        onClose={onClose}
        radius="md"
        styles={{
          root: {
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            backgroundColor:
              color === "red"
                ? "rgba(239, 68, 68, 0.08)"
                : color === "green"
                ? "rgba(34, 197, 94, 0.08)"
                : color === "yellow" || color === "orange"
                ? "rgba(245, 158, 11, 0.08)"
                : "rgba(59, 130, 246, 0.08)",
          },
          title: {
            fontWeight: 800,
            fontSize: "13px",
            marginBottom: "4px",
          },
          message: {
            fontSize: "12px",
            fontWeight: 500,
            lineHeight: 1.5,
          },
          icon: {
            marginRight: "10px",
          },
        }}
        {...props}
      >
        {children || message}
      </MantineAlert>
    </div>
  );
}

/**
 * Floating / Modal Alert Component untuk menggantikan window.alert()
 */
export function AlertModal({
  isOpen,
  title = "Pemberitahuan",
  message,
  variant = "light",
  color = "red",
  onClose,
}: {
  isOpen: boolean;
  title?: string;
  message: string;
  variant?: "light" | "filled" | "outline";
  color?: "red" | "blue" | "green" | "yellow" | "orange";
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (color) {
      case "green":
        return <CheckCircle size={22} weight="bold" className="text-emerald-500" />;
      case "yellow":
      case "orange":
        return <Warning size={22} weight="bold" className="text-amber-500" />;
      case "blue":
        return <InfoIcon size={22} weight="bold" className="text-blue-500" />;
      case "red":
      default:
        return <InfoIcon size={22} weight="bold" className="text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
        <MantineAlert
          variant={variant}
          color={color}
          title={title}
          icon={getIcon()}
          radius="md"
          styles={{
            root: {
              padding: "16px",
              borderRadius: "14px",
            },
            title: {
              fontWeight: 800,
              fontSize: "14px",
              marginBottom: "4px",
            },
            message: {
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.5,
            },
          }}
        >
          {message}
        </MantineAlert>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-90 shadow-card transition-all"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirm Modal Component untuk menggantikan window.confirm()
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
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "red" | "blue" | "green" | "yellow" | "orange";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (confirmColor) {
      case "green":
        return <CheckCircle size={22} weight="bold" className="text-emerald-500" />;
      case "yellow":
      case "orange":
        return <Warning size={22} weight="bold" className="text-amber-500" />;
      case "blue":
        return <InfoIcon size={22} weight="bold" className="text-blue-500" />;
      case "red":
      default:
        return <Warning size={22} weight="bold" className="text-red-500" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (confirmColor) {
      case "green":
        return "bg-primary hover:bg-primary/90 text-primary-foreground";
      case "blue":
        return "bg-primary hover:bg-primary/90 text-primary-foreground";
      case "yellow":
      case "orange":
        return "bg-primary hover:bg-primary/90 text-primary-foreground";
      case "red":
      default:
        return "bg-destructive hover:bg-destructive/90 text-destructive-foreground";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
        <MantineAlert
          variant="light"
          color={confirmColor}
          title={title}
          icon={getIcon()}
          radius="md"
          styles={{
            root: {
              padding: "16px",
              borderRadius: "14px",
            },
            title: {
              fontWeight: 800,
              fontSize: "14px",
              marginBottom: "4px",
            },
            message: {
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.5,
            },
          }}
        >
          {message}
        </MantineAlert>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-border bg-secondary hover:bg-accent text-foreground font-bold text-xs transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl font-black text-xs shadow-card transition-all cursor-pointer ${getConfirmButtonClasses()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { InfoIcon, Warning, CheckCircle, XCircle };

