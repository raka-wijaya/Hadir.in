"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface ModalPortalProps {
  children: React.ReactNode;
}

let activeModalCount = 0;
let previousOverflow = "";
let previousDocOverflow = "";
let previousPaddingRight = "";

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (activeModalCount === 0) {
    // Save original styles
    previousOverflow = document.body.style.overflow;
    previousDocOverflow = document.documentElement.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift/jumping when scrollbar disappears
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  activeModalCount += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.documentElement.style.overflow = previousDocOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
}

export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    lockScroll();

    return () => {
      setMounted(false);
      unlockScroll();
    };
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

