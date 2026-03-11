"use client";

import React, { useState, useCallback } from "react";
import { Button, Card, Input, Spinner, Divider } from "@/components/ui-kit";
import { useApp } from "@/lib/app-context";
import type { TaxiPoints, TaxiPoint } from "@/lib/types";

type Step =
  | "menu"
  | "order_nick"
  | "order_from"
  | "order_to"
  | "order_passengers"
  | "order_payment"
  | "order_confirm"
  | "done";

const PAYMENT_TYPES = [
  { id: "cash", label: "Наличными", desc: "Без комиссии" },
  { id: "phone", label: "Счёт телефона", desc: "Комиссия 7%" },
  { id: "bank", label: "Банковский счёт", desc: "Комиссия 5%" },
];

export default function TaxiPage() {
  const { vkUser } = useApp();
  const [step, setStep] = useState<Step>("menu");
  const [points, setPoints] = useState<TaxiPoints | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nick, setNick] = useState("");
  const [from, setFrom] = useState<TaxiPoint | null>(null);
  const [to, setTo] = useState<TaxiPoint | null>(null);
  const [passengers, setPassengers] = useState<string[]>([]);
  const [passengerInput, setPassengerInput] = useState("");
  const [payment, setPayment] = useState("cash");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const loadPoints = useCallback(async () => {
    if (points) return;
    setLoading(true);
    try {
      const res = await fetch("/api/taxi-points");
      const data = await res.json();
      setPoints(data);
    } finally {
      setLoading(false);
    }
  }, [points]);

  const allPoints = points?.points || [];
  const allCategories = points?.categories || [];

  const filteredFrom = allPoints.filter((p) => {
    const matchCat = activeCategory === "all" || p.categoryId === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchFrom.toLowerCase());
    return matchCat && matchSearch && p.id !== to?.id;
  });

  const filteredTo = allPoints.filter((p) => {
    const matchCat = activeCategory === "all" || p.categoryId === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTo.toLowerCase());
    return matchCat && matchSearch && p.id !== from?.id;
  });

  const getPrice = () => {
    if (!from || !to) return 0;
    const base = Math.max(from.defaultPrice, to.defaultPrice);
    if (payment === "phone") return Math.round(base * 1.07);
    if (payment === "bank") return Math.round(base * 1.05);
    return base;
  };

  const addPassenger = () => {
    const v = passengerInput.trim();
    if (!v || passengers.length >= 2) return;
    setPassengers((p) => [...p, v]);
    setPassengerInput("");
  };

  const PointSelector = ({
    points: pts,
    onSelect,
    search,
    onSearch,
    title,
    onBack,
  }: {
    points: TaxiPoint[];
    onSelect: (p: TaxiPoint) => void;
    search: string;
    onSearch: (v: string) => void;
    title: string;
    onBack: () => void;
  }) => (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      <Input placeholder="Поиск точки..." value={search} onChange={(e) => onSearch(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {allCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === "all" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"}`}
              >
                Все
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {pts.length === 0 ? (
              <p className="text-center text-[var(--color-muted-foreground)] py-8">Точки не найдены</p>
            ) : pts.map((p) => {
              const cat = allCategories.find((c) => c.id === p.categoryId);
              return (
                <Card key={p.id} onClick={() => onSelect(p)} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="var(--color-primary)"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{cat?.name || ""} · от {p.defaultPrice} р.</p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"/></svg>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  if (step === "menu") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-bold">Такси</h1>
        <Card
          onClick={() => { loadPoints(); setStep("order_nick"); setNick(""); setFrom(null); setTo(null); setPassengers([]); setPayment("cash"); }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2h-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="7" cy="17" r="2" stroke="#fff" strokeWidth="2"/><circle cx="17" cy="17" r="2" stroke="#fff" strokeWidth="2"/></svg>
          </div>
          <div>
            <p className="font-semibold">Заказать такси</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">Быстро и удобно</p>
          </div>
          <svg className="ml-auto" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"/></svg>
        </Card>
        <Card className="bg-[var(--color-surface)]">
          <p className="text-sm font-semibold mb-2">Часто задаваемые вопросы</p>
          <div className="flex flex-col gap-3">
            {[
              { q: "Как рассчитывается цена?", a: "По тарифу точки назначения с учётом типа оплаты." },
              { q: "Можно добавить попутчика?", a: "Да, до 2 попутчиков." },
              { q: "Комиссия за оплату?", a: "Наличные — 0%, счёт телефона — 7%, банковский счёт — 5%." },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-[var(--color-foreground)]">{item.q}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">{item.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (step === "order_nick") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("menu")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Заказ такси</h1>
        </div>
        <Input
          label="Ваш никнейм"
          placeholder="Ivanov_Ivan"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />
        <Button variant="primary" fullWidth disabled={!nick.trim()} onClick={() => setStep("order_from")}>
          Далее
        </Button>
      </div>
    );
  }

  if (step === "order_from") {
    return (
      <PointSelector
        points={filteredFrom}
        onSelect={(p) => { setFrom(p); setStep("order_to"); setSearchTo(""); setActiveCategory("all"); }}
        search={searchFrom}
        onSearch={setSearchFrom}
        title="Откуда?"
        onBack={() => setStep("order_nick")}
      />
    );
  }

  if (step === "order_to") {
    return (
      <PointSelector
        points={filteredTo}
        onSelect={(p) => { setTo(p); setStep("order_passengers"); }}
        search={searchTo}
        onSearch={setSearchTo}
        title="Куда?"
        onBack={() => setStep("order_from")}
      />
    );
  }

  if (step === "order_passengers") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("order_to")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Попутчики</h1>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">Добавьте до 2 попутчиков (необязательно)</p>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Никнейм попутчика"
            value={passengerInput}
            onChange={(e) => setPassengerInput(e.target.value)}
          />
          <Button variant="secondary" onClick={addPassenger} disabled={!passengerInput.trim() || passengers.length >= 2}>
            Добавить
          </Button>
        </div>
        {passengers.length > 0 && (
          <div className="flex flex-col gap-2">
            {passengers.map((p, i) => (
              <Card key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium">{p}</span>
                <button onClick={() => setPassengers((prev) => prev.filter((_, j) => j !== i))} className="text-[var(--color-negative)] text-xs">
                  Удалить
                </button>
              </Card>
            ))}
          </div>
        )}
        <Button variant="primary" fullWidth onClick={() => setStep("order_payment")}>
          Далее
        </Button>
      </div>
    );
  }

  if (step === "order_payment") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("order_passengers")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Способ оплаты</h1>
        </div>
        <div className="flex flex-col gap-2">
          {PAYMENT_TYPES.map((pt) => (
            <Card
              key={pt.id}
              onClick={() => setPayment(pt.id)}
              className={`flex items-center gap-3 transition-all ${payment === pt.id ? "ring-2 ring-[var(--color-primary)]" : ""}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${payment === pt.id ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
                {payment === pt.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />}
              </div>
              <div>
                <p className="font-medium text-sm">{pt.label}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{pt.desc}</p>
              </div>
            </Card>
          ))}
        </div>
        <Button variant="primary" fullWidth onClick={() => setStep("order_confirm")}>
          Далее
        </Button>
      </div>
    );
  }

  if (step === "order_confirm") {
    const price = getPrice();
    const payLabel = PAYMENT_TYPES.find((p) => p.id === payment)?.label || payment;
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("order_payment")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Подтверждение</h1>
        </div>
        <Card>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Никнейм</span>
              <span className="text-sm font-medium">{nick}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Откуда</span>
              <span className="text-sm font-medium text-right max-w-[180px]">{from?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Куда</span>
              <span className="text-sm font-medium text-right max-w-[180px]">{to?.name}</span>
            </div>
            {passengers.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Попутчики</span>
                <span className="text-sm font-medium">{passengers.join(", ")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Оплата</span>
              <span className="text-sm font-medium">{payLabel}</span>
            </div>
            <Divider />
            <div className="flex justify-between font-semibold">
              <span>Стоимость</span>
              <span className="text-[var(--color-primary)]">{price} р.</span>
            </div>
          </div>
        </Card>
        <p className="text-sm text-[var(--color-muted-foreground)] text-center text-pretty">
          Заказ будет создан в системе и передан диспетчерам.
        </p>
        <Button variant="positive" fullWidth disabled={submitting} onClick={async () => {
          setSubmitting(true);
          try {
            await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "create_order",
                type: "taxi",
                clientId: vkUser?.id || 0,
                nick: nick || (vkUser?.id ? `id${vkUser.id}` : "Аноним"),
                from,
                to,
                passengers,
                payment: { type: payment },
                finalPrice: price,
              }),
            });
            setStep("done");
          } finally {
            setSubmitting(false);
          }
        }}>
          {submitting ? "Отправка..." : "Подтвердить"}
        </Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 p-4 py-12">
        <div className="w-16 h-16 rounded-full bg-[var(--color-positive)] flex items-center justify-center">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 className="text-xl font-bold text-center">Заказ оформлен!</h2>
        <p className="text-[var(--color-muted-foreground)] text-center text-pretty">
          Ваш заказ передан диспетчерам. Ожидайте подтверждения.
        </p>
        <Button variant="primary" onClick={() => setStep("menu")}>
          На главную
        </Button>
      </div>
    );
  }

  return null;
}
