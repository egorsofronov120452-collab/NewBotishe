"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "positive" | "negative" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-xl transition-opacity active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
    secondary: "bg-[var(--color-surface-2)] text-[var(--color-foreground)]",
    positive: "bg-[var(--color-positive)] text-[var(--color-positive-foreground)]",
    negative: "bg-[var(--color-negative)] text-[var(--color-negative-foreground)]",
    ghost: "bg-transparent text-[var(--color-primary)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-5 py-3 text-base gap-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] rounded-2xl p-4 ${onClick ? "cursor-pointer active:opacity-80" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-foreground)]">{label}</label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-negative)]">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-foreground)]">{label}</label>
      )}
      <select
        className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-label="Загрузка"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--color-border)"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color?: "primary" | "positive" | "negative" | "warning" | "muted";
}

export function Badge({ children, color = "primary" }: BadgeProps) {
  const colors = {
    primary: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
    positive: "bg-[var(--color-positive)] text-[var(--color-positive-foreground)]",
    negative: "bg-[var(--color-negative)] text-[var(--color-negative-foreground)]",
    warning: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
    muted: "bg-[var(--color-border)] text-[var(--color-muted-foreground)]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Divider() {
  return <div className="h-px bg-[var(--color-border)] my-2" />;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl p-6 pb-8 max-h-[90vh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
              aria-label="Закрыть"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex bg-[var(--color-surface-2)] rounded-xl p-1 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            active === tab.id
              ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
              : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface NavBarProps {
  items: { id: string; label: string; icon: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}

export function NavBar({ items, active, onChange }: NavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex safe-area-bottom">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
            active === item.id
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)]"
          }`}
        >
          <span className="w-6 h-6 flex items-center justify-center">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
