"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PaginationProps extends React.ComponentProps<"nav"> {}

export function Pagination({ className = "", ...props }: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className = "",
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...props}
    />
  );
}

export function PaginationItem({
  className = "",
  ...props
}: React.ComponentProps<"li">) {
  return <li className={className} {...props} />;
}

export type PaginationLinkProps = {
  isActive?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
} & React.ComponentProps<"button"> &
  React.ComponentProps<"a">;

export function PaginationLink({
  className = "",
  isActive = false,
  size = "icon",
  children,
  href,
  onClick,
  ...props
}: PaginationLinkProps) {
  const baseStyles =
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none";

  const activeStyles = isActive
    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-black hover:brightness-95"
    : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground";

  const sizeStyles =
    size === "icon"
      ? "h-8 w-8 md:h-9 md:w-9"
      : size === "sm"
      ? "h-8 px-3 text-xs"
      : size === "lg"
      ? "h-10 px-4 text-sm"
      : "h-8 md:h-9 px-3.5 py-2";

  const combinedClass = `${baseStyles} ${activeStyles} ${sizeStyles} ${className}`;

  if (href && !onClick) {
    return (
      <a
        aria-current={isActive ? "page" : undefined}
        className={combinedClass}
        href={href}
        {...(props as React.ComponentProps<"a">)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={combinedClass}
      onClick={onClick}
      {...(props as React.ComponentProps<"button">)}
    >
      {children}
    </button>
  );
}

export function PaginationPrevious({
  className = "",
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={`gap-1.5 pl-2.5 pr-3 ${className}`}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Sebelumnya</span>
    </PaginationLink>
  );
}

export function PaginationNext({
  className = "",
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={`gap-1.5 pl-3 pr-2.5 ${className}`}
      {...props}
    >
      <span>Berikutnya</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className = "",
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center text-muted-foreground ${className}`}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Halaman lainnya</span>
    </span>
  );
}

export function PaginationDemo() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

