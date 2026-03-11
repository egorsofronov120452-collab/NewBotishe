"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Card, Input, Modal, Spinner, Badge, Tabs, Divider } from "@/components/ui-kit";
import type { Catalogue, CatalogueCategory, CatalogueItem, CatalogueSet, BasketItem } from "@/lib/types";

type Step =
  | "menu"
  | "catalogue_cats"
  | "catalogue_items"
  | "order_cats"
  | "order_items"
  | "basket"
  | "checkout_address"
  | "checkout_promo"
  | "checkout_confirm"
  | "done";

export default function DeliveryPage() {
  const [step, setStep] = useState<Step>("menu");
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState<CatalogueCategory | null>(null);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [address, setAddress] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const loadCatalogue = useCallback(async () => {
    if (catalogue) return;
    setCatLoading(true);
    try {
      const res = await fetch("/api/catalogue");
      const data = await res.json();
      setCatalogue(data);
    } finally {
      setCatLoading(false);
    }
  }, [catalogue]);

  const showToast = (msg: string) => {
    setAddedToast(msg);
    setTimeout(() => setAddedToast(null), 1800);
  };

  const addToBasket = (item: CatalogueItem | CatalogueSet, isSet = false) => {
    const id = isSet ? `set_${item.id}` : item.id;
    setBasket((prev) => {
      const ex = prev.find((b) => b.id === id);
      if (ex) return prev.map((b) => (b.id === id ? { ...b, qty: b.qty + 1 } : b));
      return [...prev, { id, name: item.name, price: item.price, qty: 1 }];
    });
    showToast(`«${item.name}» добавлен`);
  };

  const removeFromBasket = (id: string) => {
    setBasket((prev) => {
      const ex = prev.find((b) => b.id === id);
      if (!ex) return prev;
      if (ex.qty > 1) return prev.map((b) => (b.id === id ? { ...b, qty: b.qty - 1 } : b));
      return prev.filter((b) => b.id !== id);
    });
  };

  const basketTotal = basket.reduce((s, b) => s + b.price * b.qty, 0);
  const basketCount = basket.reduce((s, b) => s + b.qty, 0);

  const getItemsForCat = (cat: CatalogueCategory) => {
    if (!catalogue) return [];
    if (cat.id === "cat_sets") return catalogue.sets;
    return catalogue.items.filter((i) => i.categoryId === cat.id);
  };

  if (step === "menu") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-bold text-balance">Доставка</h1>
        <Card
          onClick={() => { loadCatalogue(); setStep("catalogue_cats"); }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p className="font-semibold">Каталог</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">Посмотреть меню и цены</p>
          </div>
          <svg className="ml-auto" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"/></svg>
        </Card>
        <Card
          onClick={() => { loadCatalogue(); setStep("order_cats"); setBasket([]); }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--color-positive)] flex items-center justify-center shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="#fff" strokeWidth="2"/></svg>
          </div>
          <div>
            <p className="font-semibold">Заказать</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">Оформить заказ доставки</p>
          </div>
          <svg className="ml-auto" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"/></svg>
        </Card>
      </div>
    );
  }

  if (step === "catalogue_cats" || step === "catalogue_items") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (step === "catalogue_items") { setStep("catalogue_cats"); setSelectedCat(null); } else setStep("menu"); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">{step === "catalogue_items" && selectedCat ? selectedCat.name : "Каталог"}</h1>
        </div>
        {catLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : step === "catalogue_cats" ? (
          <div className="flex flex-col gap-2">
            {catalogue?.categories.map((cat) => (
              <Card key={cat.id} onClick={() => { setSelectedCat(cat); setStep("catalogue_items"); }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center shrink-0 text-sm font-bold text-[var(--color-primary)]">
                  {cat.name[0]}
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {cat.id === "cat_sets" ? `${catalogue.sets.length} сетов` : `${catalogue.items.filter(i => i.categoryId === cat.id).length} товаров`}
                  </p>
                </div>
                <svg className="ml-auto" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"/></svg>
              </Card>
            ))}
          </div>
        ) : selectedCat ? (
          <div className="flex flex-col gap-2">
            {getItemsForCat(selectedCat).length === 0 ? (
              <p className="text-center text-[var(--color-muted-foreground)] py-8">В этой категории пока нет товаров</p>
            ) : getItemsForCat(selectedCat).map((item) => (
              <Card key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center shrink-0 text-[var(--color-muted-foreground)]">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-[var(--color-primary)] font-semibold">{item.price} р.</p>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (step === "order_cats") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("menu")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Выберите категорию</h1>
          {basketCount > 0 && (
            <button onClick={() => setStep("basket")} className="ml-auto flex items-center gap-1 bg-[var(--color-primary)] text-white text-sm font-medium px-3 py-1.5 rounded-full">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2"/></svg>
              {basketCount}
            </button>
          )}
        </div>
        {catLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {catalogue?.categories.map((cat) => (
              <Card key={cat.id} onClick={() => { setSelectedCat(cat); setStep("order_items"); }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center shrink-0 text-sm font-bold text-[var(--color-primary)]">
                  {cat.name[0]}
                </div>
                <p className="font-medium">{cat.name}</p>
                <svg className="ml-auto" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"/></svg>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "order_items" && selectedCat) {
    const items = getItemsForCat(selectedCat);
    return (
      <div className="flex flex-col gap-3 p-4 pb-24">
        {addedToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-foreground)] text-white text-sm px-4 py-2 rounded-full shadow-lg animate-pulse">
            {addedToast}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => { setStep("order_cats"); setSelectedCat(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">{selectedCat.name}</h1>
          {basketCount > 0 && (
            <button onClick={() => setStep("basket")} className="ml-auto flex items-center gap-1 bg-[var(--color-primary)] text-white text-sm font-medium px-3 py-1.5 rounded-full">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2"/></svg>
              {basketCount} · {basketTotal} р.
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-center text-[var(--color-muted-foreground)] py-8">В этой категории пока нет товаров</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const isSet = selectedCat.id === "cat_sets";
              const id = isSet ? `set_${item.id}` : item.id;
              const inBasket = basket.find((b) => b.id === id);
              return (
                <Card key={item.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center shrink-0 text-[var(--color-muted-foreground)]">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-[var(--color-primary)] font-semibold">{item.price} р.</p>
                  </div>
                  {inBasket ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromBasket(id)} className="w-7 h-7 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-negative)]">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </button>
                      <span className="text-sm font-semibold w-4 text-center">{inBasket.qty}</span>
                      <button onClick={() => addToBasket(item, isSet)} className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToBasket(item, isSet)} className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (step === "basket") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("order_items")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Корзина</h1>
        </div>
        {basket.length === 0 ? (
          <p className="text-center text-[var(--color-muted-foreground)] py-8">Корзина пуста</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {basket.map((item) => (
                <Card key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{item.price} р. × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromBasket(item.id)} className="w-7 h-7 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-negative)]">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    </button>
                    <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                    <button onClick={() => {
                      setBasket(prev => prev.map(b => b.id === item.id ? { ...b, qty: b.qty + 1 } : b));
                    }} className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
            <Divider />
            <div className="flex justify-between items-center font-semibold text-base">
              <span>Итого</span>
              <span className="text-[var(--color-primary)]">{basketTotal} р.</span>
            </div>
            <Button variant="positive" fullWidth onClick={() => setStep("checkout_address")}>
              Оформить заказ
            </Button>
          </>
        )}
      </div>
    );
  }

  if (step === "checkout_address") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("basket")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Адрес доставки</h1>
        </div>
        <Input
          label="Введите адрес"
          placeholder="ул. Ленина, д. 5, кв. 12"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Button variant="primary" fullWidth disabled={!address.trim()} onClick={() => setStep("checkout_promo")}>
          Далее
        </Button>
      </div>
    );
  }

  if (step === "checkout_promo") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("checkout_address")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Промокод</h1>
        </div>
        <Input
          label="Промокод (необязательно)"
          placeholder="PROMO2025"
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
        />
        {promoResult && (
          <p className={`text-sm ${promoResult.startsWith("Скидка") || promoResult.startsWith("Бесплатно") ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>{promoResult}</p>
        )}
        <Button variant="secondary" fullWidth onClick={() => setPromoResult(promoInput ? "Промокод будет применён при подтверждении" : null as unknown as string)}>
          Применить
        </Button>
        <Button variant="primary" fullWidth onClick={() => setStep("checkout_confirm")}>
          Продолжить
        </Button>
      </div>
    );
  }

  if (step === "checkout_confirm") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("checkout_promo")} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h1 className="text-lg font-bold">Подтверждение</h1>
        </div>
        <Card>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-1">Адрес</p>
          <p className="font-medium">{address}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-2">Заказ</p>
          {basket.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span>{item.name} × {item.qty}</span>
              <span className="font-medium">{item.price * item.qty} р.</span>
            </div>
          ))}
          <Divider />
          <div className="flex justify-between font-semibold mt-1">
            <span>Итого</span>
            <span className="text-[var(--color-primary)]">{basketTotal} р.</span>
          </div>
        </Card>
        <p className="text-sm text-[var(--color-muted-foreground)] text-center text-pretty">
          Заказ будет оформлен через бот ВКонтакте. Для подтверждения заказа перейдите в бот доставки.
        </p>
        <Button variant="positive" fullWidth onClick={() => setStep("done")}>
          Подтвердить заказ
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
          Ваш заказ передан в обработку. Следите за статусом в боте доставки.
        </p>
        <Button variant="primary" onClick={() => { setStep("menu"); setBasket([]); setAddress(""); setPromoInput(""); setPromoResult(null); }}>
          На главную
        </Button>
      </div>
    );
  }

  return null;
}
