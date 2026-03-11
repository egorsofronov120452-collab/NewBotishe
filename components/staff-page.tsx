"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Card, Badge, Divider, Spinner, Tabs, Modal, Input } from "@/components/ui-kit";
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

export default function StaffPage() {
  const [tab, setTab] = useState<"delivery" | "taxi">("delivery");
  const [orders, setOrders] = useState<Orders>({ delivery: [], taxi: [] });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | TaxiOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (type: "delivery" | "taxi", orderId: string, status: string) => {
    setUpdating(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", type, orderId, status }),
      });
      await fetchOrders();
      setSelectedOrder(null);
    } finally {
      setUpdating(false);
    }
  };

  const list = tab === "delivery" ? orders.delivery : orders.taxi;
  const filtered = filterStatus === "all" ? list : list.filter((o) => o.status === filterStatus);
  const active = filtered.filter((o) => o.status !== "done" && o.status !== "cancelled");
  const completed = filtered.filter((o) => o.status === "done" || o.status === "cancelled");

  const OrderCard = ({ order }: { order: DeliveryOrder | TaxiOrder }) => {
    const isDelivery = order.type === "delivery";
    const d = order as DeliveryOrder;
    const t = order as TaxiOrder;
    return (
      <Card onClick={() => setSelectedOrder(order)} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted-foreground)] font-mono">#{order.id.slice(-6)}</span>
          <Badge color={STATUS_COLORS[order.status] || "muted"}>{STATUS_LABELS[order.status] || order.status}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{order.nick}</span>
          <span className="text-sm font-semibold text-[var(--color-primary)]">{isDelivery ? d.finalPrice : t.finalPrice} р.</span>
        </div>
        {isDelivery ? (
          <p className="text-xs text-[var(--color-muted-foreground)] truncate">{d.address}</p>
        ) : (
          <p className="text-xs text-[var(--color-muted-foreground)] truncate">{t.from?.name} → {t.to?.name}</p>
        )}
        {order.courierNick && (
          <p className="text-xs text-[var(--color-muted-foreground)]">Курьер: {order.courierNick}</p>
        )}
        <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(order.createdAt).toLocaleString("ru")}</p>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Диспетчерская</h1>
        <button onClick={fetchOrders} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]" aria-label="Обновить">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><polyline points="3 3 3 8 8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      <Tabs
        tabs={[
          { id: "delivery", label: `Доставка (${orders.delivery.filter(o => o.status === "pending").length})` },
          { id: "taxi", label: `Такси (${orders.taxi.filter(o => o.status === "pending").length})` },
        ]}
        active={tab}
        onChange={(id) => { setTab(id as "delivery" | "taxi"); setFilterStatus("all"); }}
      />

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
        <div className="text-center py-10 text-[var(--color-muted-foreground)]">
          <p className="text-sm">Нет заказов</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">Активные</p>
              {active.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          )}
          {completed.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">Завершённые</p>
              {completed.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          )}
        </>
      )}

      {selectedOrder && (
        <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Заказ #${selectedOrder.id.slice(-6)}`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Статус</span>
                <Badge color={STATUS_COLORS[selectedOrder.status] || "muted"}>{STATUS_LABELS[selectedOrder.status]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Клиент</span>
                <span className="text-sm font-medium">{selectedOrder.nick}</span>
              </div>
              {selectedOrder.type === "delivery" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Адрес</span>
                    <span className="text-sm font-medium text-right max-w-[200px]">{(selectedOrder as DeliveryOrder).address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Сумма</span>
                    <span className="text-sm font-medium text-[var(--color-primary)]">{(selectedOrder as DeliveryOrder).finalPrice} р.</span>
                  </div>
                  <Divider />
                  <p className="text-sm font-medium">Состав заказа:</p>
                  {(selectedOrder as DeliveryOrder).basket?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} × {item.qty}</span>
                      <span>{item.price * item.qty} р.</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Откуда</span>
                    <span className="text-sm font-medium">{(selectedOrder as TaxiOrder).from?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Куда</span>
                    <span className="text-sm font-medium">{(selectedOrder as TaxiOrder).to?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">Сумма</span>
                    <span className="text-sm font-medium text-[var(--color-primary)]">{(selectedOrder as TaxiOrder).finalPrice} р.</span>
                  </div>
                  {(selectedOrder as TaxiOrder).passengers?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-muted-foreground)]">Попутчики</span>
                      <span className="text-sm">{(selectedOrder as TaxiOrder).passengers.join(", ")}</span>
                    </div>
                  )}
                </>
              )}
              {selectedOrder.courierNick && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Курьер</span>
                  <span className="text-sm font-medium">{selectedOrder.courierNick}</span>
                </div>
              )}
            </div>

            {selectedOrder.status !== "done" && selectedOrder.status !== "cancelled" && (
              <>
                <Divider />
                <p className="text-sm font-semibold">Изменить статус:</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedOrder.type === "delivery" ? DELIVERY_STATUSES : TAXI_STATUSES).map((s) => (
                    <button
                      key={s}
                      disabled={s === selectedOrder.status || updating}
                      onClick={() => updateStatus(selectedOrder.type as "delivery" | "taxi", selectedOrder.id, s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-40 ${
                        s === selectedOrder.status
                          ? "bg-[var(--color-primary)] text-white"
                          : s === "done"
                          ? "bg-[var(--color-positive)] text-white"
                          : s === "cancelled"
                          ? "bg-[var(--color-negative)] text-white"
                          : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
                      }`}
                    >
                      {STATUS_LABELS[s] || s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
