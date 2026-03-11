"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Input, Modal, Spinner, Badge, Select } from "@/components/ui-kit";
import type { PromoCode, Promos } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  percent: "Скидка %",
  fixed: "Скидка р.",
  free_item: "Бесплатный товар",
};

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promos>({ delivery: [], taxi: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"delivery" | "taxi">("delivery");
  const [addModal, setAddModal] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed" | "free_item">("percent");
  const [value, setValue] = useState("");
  const [freeItem, setFreeItem] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promos");
      setPromos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  const callAPI = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const addPromo = async () => {
    if (!code.trim()) return;
    setSaving(true);
    await callAPI({
      action: "add_promo",
      service: tab,
      code: code.trim().toUpperCase(),
      type,
      value: parseFloat(value) || 0,
      freeItem: type === "free_item" ? freeItem : undefined,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
    });
    setCode(""); setValue(""); setFreeItem(""); setMaxUses("");
    setAddModal(false);
    await fetchPromos();
    setSaving(false);
  };

  const deletePromo = async (service: "delivery" | "taxi", id: string) => {
    if (!confirm("Удалить промокод?")) return;
    await callAPI({ action: "delete_promo", service, id });
    await fetchPromos();
  };

  const togglePromo = async (service: "delivery" | "taxi", id: string, active: boolean) => {
    await callAPI({ action: "toggle_promo", service, id, active: !active });
    await fetchPromos();
  };

  const list = tab === "delivery" ? promos.delivery : promos.taxi;

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Промокоды</h1>
        <button onClick={fetchPromos} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]" aria-label="Обновить">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><polyline points="3 3 3 8 8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="flex bg-[var(--color-surface-2)] rounded-xl p-1 gap-1">
        {(["delivery", "taxi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)]"}`}
          >
            {t === "delivery" ? `Доставка (${promos.delivery.length})` : `Такси (${promos.taxi.length})`}
          </button>
        ))}
      </div>

      <Button variant="primary" fullWidth onClick={() => setAddModal(true)}>
        + Создать промокод
      </Button>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : list.length === 0 ? (
        <p className="text-center text-[var(--color-muted-foreground)] py-8 text-sm">Нет промокодов</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((promo) => (
            <Card key={promo.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base tracking-wide text-[var(--color-primary)]">{promo.code}</span>
                <Badge color={promo.active ? "positive" : "muted"}>{promo.active ? "Активен" : "Откл."}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">{TYPE_LABELS[promo.type] || promo.type}</span>
                <span className="font-medium">
                  {promo.type === "percent" ? `${promo.value}%` : promo.type === "fixed" ? `${promo.value} р.` : promo.freeItem || "—"}
                </span>
              </div>
              {promo.maxUses && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Использований: {promo.uses || 0} / {promo.maxUses}
                </p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => togglePromo(tab, promo.id, promo.active)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${promo.active ? "bg-[var(--color-surface-2)] text-[var(--color-foreground)]" : "bg-[var(--color-positive)] text-white"}`}
                >
                  {promo.active ? "Отключить" : "Включить"}
                </button>
                <button
                  onClick={() => deletePromo(tab, promo.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-negative)] transition-colors"
                >
                  Удалить
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Новый промокод">
        <div className="flex flex-col gap-3">
          <Input label="Код" placeholder="SUMMER25" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Select
            label="Тип скидки"
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed" | "free_item")}
            options={[
              { value: "percent", label: "Процент (напр. 15%)" },
              { value: "fixed", label: "Фиксированная сумма (р.)" },
              { value: "free_item", label: "Бесплатный товар" },
            ]}
          />
          {type !== "free_item" ? (
            <Input label={type === "percent" ? "Размер скидки (%)" : "Размер скидки (р.)"} placeholder={type === "percent" ? "15" : "100"} value={value} onChange={(e) => setValue(e.target.value)} type="number" />
          ) : (
            <Input label="Название бесплатного товара" placeholder="Кофе" value={freeItem} onChange={(e) => setFreeItem(e.target.value)} />
          )}
          <Input label="Макс. использований (необяз.)" placeholder="50" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" />
          <Button variant="primary" fullWidth disabled={!code.trim() || saving} onClick={addPromo}>
            {saving ? "Создание..." : "Создать"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
