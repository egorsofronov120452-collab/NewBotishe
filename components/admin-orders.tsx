"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Input, Modal, Spinner, Badge, Divider, Select } from "@/components/ui-kit";
import type { DeliveryOrder, TaxiOrder, Orders } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Принят",
  cooking: "Готовится",
  delivering: "В доставке",
  on_the_way: "В пути",
  done: "Выполнен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, "primary" | "positive" | "negative" | "warning" | "muted"> = {
  pending: "warning",
  accepted: "primary",
  cooking: "primary",
  delivering: "primary",
  on_the_way: "primary",
  done: "positive",
  cancelled: "muted",
};

const DELIVERY_STATUSES = ["pending", "accepted", "cooking", "delivering", "done", "cancelled"];
const TAXI_STATUSES = ["pending", "accepted", "on_the_way", "done", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Orders>({ delivery: [], taxi: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"delivery" | "taxi">("delivery");
  const [selected, setSelected] = useState<DeliveryOrder | TaxiOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 20000); return () => clearInterval(t); }, [fetchOrders]);

  const updateStatus = async (type: "delivery" | "taxi", orderId: string, status: string) => {
    setUpdating(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", type, orderId, status }),
      });
      await fetchOrders();
      setSelected(null);
    } finally {
      setUpdating(false);
    }
  };

  const deleteOrder = async (type: "delivery" | "taxi", orderId: string) => {
    if (!confirm("Удалить заказ?")) return;
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_order", type, orderId }),
    });
    setSelected(null);
    await fetchOrders();
  };

  const list = tab === "delivery" ? orders.delivery : orders.taxi;
  const filtered = filterStatus === "all" ? list : list.filter((o) => o.status === filterStatus);
  const active = filtered.filter((o) => o.status !== "done" && o.status !== "cancelled");
  const completed = filtered.filter((o) => o.status === "done" || o.status === "cancelled");

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Заказы</h1>
        <button onClick={fetchOrders} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]" aria-label="Обновить">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><polyline points="3 3 3 8 8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="flex bg-[var(--color-surface-2)] rounded-xl p-1 gap-1">
        {(["delivery", "taxi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setFilterStatus("all"); }}
            className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)]"}`}
          >
            {t === "delivery"
              ? `Доставка (${orders.delivery.filter((o) => o.status === "pending").length} новых)`
              : `Такси (${orders.taxi.filter((o) => o.status === "pending").length} новых)`}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", ...(tab === "delivery" ? DELIVERY_STATUSES : TAXI_STATUSES)].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === s ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"}`}
          >
            {s === "all" ? "Все" : STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[var(--color-muted-foreground)] py-8 text-sm">Нет заказов</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">Активные</p>
              {active.map((o) => (
                <Card key={o.id} onClick={() => setSelected(o)} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-muted-foreground)] font-mono">#{o.id.slice(-6)}</span>
                    <Badge color={STATUS_COLORS[o.status] || "muted"}>{STATUS_LABELS[o.status]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{o.nick}</span>
                    <span className="text-sm font-semibold text-[var(--color-primary)]">{o.finalPrice} р.</span>
                  </div>
                  {o.type === "delivery"
                    ? <p className="text-xs text-[var(--color-muted-foreground)] truncate">{(o as DeliveryOrder).address}</p>
                    : <p className="text-xs text-[var(--color-muted-foreground)] truncate">{(o as TaxiOrder).from?.name} → {(o as TaxiOrder).to?.name}</p>
                  }
                  <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(o.createdAt).toLocaleString("ru")}</p>
                </Card>
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">Завершённые</p>
              {completed.map((o) => (
                <Card key={o.id} onClick={() => setSelected(o)} className="flex flex-col gap-1.5 opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-muted-foreground)] font-mono">#{o.id.slice(-6)}</span>
                    <Badge color={STATUS_COLORS[o.status] || "muted"}>{STATUS_LABELS[o.status]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{o.nick}</span>
                    <span className="text-sm font-semibold">{o.finalPrice} р.</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Заказ #${selected?.id.slice(-6)}`}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Статус</span>
                <Badge color={STATUS_COLORS[selected.status] || "muted"}>{STATUS_LABELS[selected.status]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Клиент</span>
                <span className="text-sm font-medium">{selected.nick}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Сумма</span>
                <span className="text-sm font-semibold text-[var(--color-primary)]">{selected.finalPrice} р.</span>
              </div>
              {selected.type === "delivery" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Адрес</span>
                    <span className="text-sm font-medium text-right max-w-[200px]">{(selected as DeliveryOrder).address}</span>
                  </div>
                  <Divider />
                  <p className="text-sm font-medium">Состав:</p>
                  {(selected as DeliveryOrder).basket?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} × {item.qty}</span>
                      <span>{item.price * item.qty} р.</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Маршрут</span>
                    <span className="text-sm font-medium text-right max-w-[200px]">{(selected as TaxiOrder).from?.name} → {(selected as TaxiOrder).to?.name}</span>
                  </div>
                </>
              )}
              <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(selected.createdAt).toLocaleString("ru")}</p>
            </div>
            {selected.status !== "done" && selected.status !== "cancelled" && (
              <>
                <Divider />
                <p className="text-sm font-semibold">Изменить статус:</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.type === "delivery" ? DELIVERY_STATUSES : TAXI_STATUSES).map((s) => (
                    <button
                      key={s}
                      disabled={s === selected.status || updating}
                      onClick={() => updateStatus(selected.type as "delivery" | "taxi", selected.id, s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-40 ${s === selected.status ? "bg-[var(--color-primary)] text-white" : s === "done" ? "bg-[var(--color-positive)] text-white" : s === "cancelled" ? "bg-[var(--color-negative)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]"}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
            <Divider />
            <Button variant="negative" fullWidth onClick={() => deleteOrder(selected.type as "delivery" | "taxi", selected.id)}>
              Удалить заказ
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
