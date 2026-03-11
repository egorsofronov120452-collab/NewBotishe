"use client";

import React, { useState } from "react";
import { AppProvider, useApp } from "@/lib/app-context";
import { Spinner } from "@/components/ui-kit";
import DeliveryPage from "@/components/delivery-page";
import TaxiPage from "@/components/taxi-page";
import StaffPage from "@/components/staff-page";
import AdminCataloguePage from "@/components/admin-catalogue";
import AdminTaxiPointsPage from "@/components/admin-taxi-points";
import AdminStaffPage from "@/components/admin-staff";
import AdminOrdersPage from "@/components/admin-orders";
import AdminPromosPage from "@/components/admin-promos";

// --- SVG Icons ---
const IconDelivery = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconTaxi = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="5" y="17" width="4" height="2" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="15" y="17" width="4" height="2" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M7 7V4h10v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconOrders = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconCatalogue = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconTaxiPoints = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconStaff = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconPromo = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const IconDispatch = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// Client layout — delivery + taxi
function ClientLayout() {
  const [tab, setTab] = useState<"delivery" | "taxi">("delivery");
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "delivery" ? <DeliveryPage /> : <TaxiPage />}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button
          onClick={() => setTab("delivery")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "delivery" ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`}
        >
          <IconDelivery />
          Доставка
        </button>
        <button
          onClick={() => setTab("taxi")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "taxi" ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`}
        >
          <IconTaxi />
          Такси
        </button>
      </nav>
    </div>
  );
}

// Staff layout — dispatcher + their order tabs
function StaffLayout() {
  const [tab, setTab] = useState<"dispatch" | "delivery" | "taxi">("dispatch");
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "dispatch" || tab === "delivery" || tab === "taxi" ? <StaffPage /> : null}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button
          onClick={() => setTab("dispatch")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "dispatch" ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`}
        >
          <IconDispatch />
          Диспетч.
        </button>
        <button
          onClick={() => setTab("delivery")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "delivery" ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`}
        >
          <IconDelivery />
          Доставка
        </button>
        <button
          onClick={() => setTab("taxi")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "taxi" ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`}
        >
          <IconTaxi />
          Такси
        </button>
      </nav>
    </div>
  );
}

type AdminTab = "orders" | "catalogue" | "taxi_points" | "staff" | "promos" | "delivery" | "taxi";

// Admin / RS layout — everything
function AdminLayout() {
  const [tab, setTab] = useState<AdminTab>("orders");
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {([
            { id: "orders", label: "Заказы", icon: <IconOrders /> },
            { id: "delivery", label: "Доставка", icon: <IconDelivery /> },
            { id: "taxi", label: "Такси", icon: <IconTaxi /> },
            { id: "catalogue", label: "Каталог", icon: <IconCatalogue /> },
            { id: "taxi_points", label: "Точки", icon: <IconTaxiPoints /> },
            { id: "staff", label: "Сотруд.", icon: <IconStaff /> },
            { id: "promos", label: "Промо", icon: <IconPromo /> },
          ] as { id: AdminTab; label: string; icon: React.ReactNode }[]).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === item.id ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"}`}
            >
              <span className="w-4 h-4">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {tab === "orders" && <AdminOrdersPage />}
        {tab === "delivery" && <DeliveryPage />}
        {tab === "taxi" && <TaxiPage />}
        {tab === "catalogue" && <AdminCataloguePage />}
        {tab === "taxi_points" && <AdminTaxiPointsPage />}
        {tab === "staff" && <AdminStaffPage />}
        {tab === "promos" && <AdminPromosPage />}
      </main>
    </div>
  );
}

// Root — role-based switcher
function AppShell() {
  const { role, loading, vkUser } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] gap-4">
        <Spinner size={36} />
        <p className="text-sm text-[var(--color-muted-foreground)]">Загрузка...</p>
      </div>
    );
  }

  // RS — full admin
  if (role === "rs") return <AdminLayout />;

  // SS — dispatcher + all orders + can also order for themselves
  if (role === "ss") return <AdminLayout />;

  // Kurier — dispatcher view only
  if (role === "kurier") return <StaffLayout />;

  // No role — client view
  return <ClientLayout />;
}

export default function HomePage() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
