"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Input, Modal, Spinner, Badge, Divider, Select } from "@/components/ui-kit";
import type { Catalogue, CatalogueCategory, CatalogueItem, CatalogueSet } from "@/lib/types";

export default function AdminCataloguePage() {
  const [catalogue, setCatalogue] = useState<Catalogue>({ categories: [], items: [], sets: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"categories" | "items" | "sets">("categories");

  // Category modal
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Item modal
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState<CatalogueItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [itemCat, setItemCat] = useState("");
  const [itemTemp, setItemTemp] = useState("");
  const [itemSaving, setItemSaving] = useState(false);

  // Set modal
  const [setModal, setSetModal] = useState(false);
  const [setName, setSetName] = useState("");
  const [setPrice, setSetPrice] = useState("");
  const [setCost, setSetCost] = useState("");
  const [setSaving, setSetSaving] = useState(false);

  const fetchCatalogue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalogue");
      setCatalogue(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalogue(); }, [fetchCatalogue]);

  const callAPI = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    await callAPI({ action: "add_category", name: catName.trim() });
    setCatName(""); setCatModal(false);
    await fetchCatalogue();
    setCatSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Удалить категорию и все её товары?")) return;
    await callAPI({ action: "delete_category", id });
    await fetchCatalogue();
  };

  const openAddItem = () => {
    setEditItem(null);
    setItemName(""); setItemPrice(""); setItemCost(""); setItemCat(catalogue.categories[0]?.id || ""); setItemTemp("");
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!itemName.trim() || !itemCat) return;
    setItemSaving(true);
    if (editItem) {
      await callAPI({ action: "delete_item", id: editItem.id });
      await callAPI({ action: "add_item", name: itemName, price: itemPrice, cost: itemCost, categoryId: itemCat, temp: itemTemp });
    } else {
      await callAPI({ action: "add_item", name: itemName, price: itemPrice, cost: itemCost, categoryId: itemCat, temp: itemTemp });
    }
    setItemModal(false);
    await fetchCatalogue();
    setItemSaving(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Удалить товар?")) return;
    await callAPI({ action: "delete_item", id });
    await fetchCatalogue();
  };

  const saveSet = async () => {
    if (!setName.trim()) return;
    setSetSaving(true);
    await callAPI({ action: "add_set", name: setName, price: setPrice, cost: setCost });
    setSetModal(false); setSetName(""); setSetPrice(""); setSetCost("");
    await fetchCatalogue();
    setSetSaving(false);
  };

  const deleteSet = async (id: string) => {
    if (!confirm("Удалить сет?")) return;
    await callAPI({ action: "delete_set", id });
    await fetchCatalogue();
  };

  const catOptions = catalogue.categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Каталог</h1>
        <button onClick={fetchCatalogue} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]" aria-label="Обновить">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><polyline points="3 3 3 8 8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-[var(--color-surface-2)] rounded-xl p-1 gap-1">
        {(["categories", "items", "sets"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)]"}`}
          >
            {t === "categories" ? `Категории (${catalogue.categories.length})` : t === "items" ? `Товары (${catalogue.items.length})` : `Сеты (${catalogue.sets.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          {tab === "categories" && (
            <>
              <Button variant="primary" fullWidth onClick={() => setCatModal(true)}>
                + Добавить категорию
              </Button>
              <div className="flex flex-col gap-2">
                {catalogue.categories.length === 0 ? (
                  <p className="text-center text-[var(--color-muted-foreground)] py-6 text-sm">Нет категорий</p>
                ) : catalogue.categories.map((cat) => (
                  <Card key={cat.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center text-sm font-bold text-[var(--color-primary)]">
                      {cat.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {catalogue.items.filter((i) => i.categoryId === cat.id).length} товаров
                      </p>
                    </div>
                    <button onClick={() => deleteCategory(cat.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-negative)]" aria-label="Удалить">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}

          {tab === "items" && (
            <>
              <Button variant="primary" fullWidth onClick={openAddItem} disabled={catalogue.categories.length === 0}>
                + Добавить товар
              </Button>
              {catalogue.categories.length === 0 && (
                <p className="text-xs text-center text-[var(--color-muted-foreground)]">Сначала создайте категорию</p>
              )}
              <div className="flex flex-col gap-2">
                {catalogue.items.length === 0 ? (
                  <p className="text-center text-[var(--color-muted-foreground)] py-6 text-sm">Нет товаров</p>
                ) : catalogue.items.map((item) => {
                  const cat = catalogue.categories.find((c) => c.id === item.categoryId);
                  return (
                    <Card key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--color-primary)] font-semibold">{item.price} р.</span>
                          {cat && <Badge color="muted">{cat.name}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditItem(item); setItemName(item.name); setItemPrice(String(item.price)); setItemCost(String(item.cost)); setItemCat(item.categoryId); setItemTemp(item.temp || ""); setItemModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-primary)]" aria-label="Редактировать">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-negative)]" aria-label="Удалить">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {tab === "sets" && (
            <>
              <Button variant="primary" fullWidth onClick={() => { setSetName(""); setSetPrice(""); setSetCost(""); setSetModal(true); }}>
                + Добавить сет
              </Button>
              <div className="flex flex-col gap-2">
                {catalogue.sets.length === 0 ? (
                  <p className="text-center text-[var(--color-muted-foreground)] py-6 text-sm">Нет сетов</p>
                ) : catalogue.sets.map((set) => (
                  <Card key={set.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{set.name}</p>
                      <span className="text-xs text-[var(--color-primary)] font-semibold">{set.price} р.</span>
                    </div>
                    <button onClick={() => deleteSet(set.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-negative)]" aria-label="Удалить">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Category Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Новая категория">
        <div className="flex flex-col gap-4">
          <Input label="Название" placeholder="Напитки" value={catName} onChange={(e) => setCatName(e.target.value)} />
          <Button variant="primary" fullWidth disabled={!catName.trim() || catSaving} onClick={addCategory}>
            {catSaving ? "Сохранение..." : "Добавить"}
          </Button>
        </div>
      </Modal>

      {/* Add/Edit Item Modal */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editItem ? "Редактировать товар" : "Новый товар"}>
        <div className="flex flex-col gap-3">
          <Input label="Название" placeholder="Бургер классик" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <div className="flex gap-3">
            <Input label="Цена (р.)" placeholder="250" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} type="number" />
            <Input label="Себест. (р.)" placeholder="100" value={itemCost} onChange={(e) => setItemCost(e.target.value)} type="number" />
          </div>
          <Select label="Категория" value={itemCat} onChange={(e) => setItemCat(e.target.value)} options={catOptions} />
          <Input label="Температура (необяз.)" placeholder="Горячее / Холодное" value={itemTemp} onChange={(e) => setItemTemp(e.target.value)} />
          <Button variant="primary" fullWidth disabled={!itemName.trim() || !itemCat || itemSaving} onClick={saveItem}>
            {itemSaving ? "Сохранение..." : editItem ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </Modal>

      {/* Add Set Modal */}
      <Modal open={setModal} onClose={() => setSetModal(false)} title="Новый сет">
        <div className="flex flex-col gap-3">
          <Input label="Название" placeholder="Сет 'Завтрак'" value={setName} onChange={(e) => setSetName(e.target.value)} />
          <div className="flex gap-3">
            <Input label="Цена (р.)" placeholder="500" value={setPrice} onChange={(e) => setSetPrice(e.target.value)} type="number" />
            <Input label="Себест. (р.)" placeholder="200" value={setCost} onChange={(e) => setSetCost(e.target.value)} type="number" />
          </div>
          <Button variant="primary" fullWidth disabled={!setName.trim() || setSaving} onClick={saveSet}>
            {setSaving ? "Сохранение..." : "Добавить"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
