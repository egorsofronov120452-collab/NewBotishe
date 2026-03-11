"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Input, Modal, Spinner, Select } from "@/components/ui-kit";
import type { TaxiPoints, TaxiCategory, TaxiPoint } from "@/lib/types";

export default function AdminTaxiPointsPage() {
  const [data, setData] = useState<TaxiPoints>({ categories: [], points: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"categories" | "points">("categories");

  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const [pointModal, setPointModal] = useState(false);
  const [pointName, setPointName] = useState("");
  const [pointCat, setPointCat] = useState("");
  const [pointPrice, setPointPrice] = useState("");
  const [pointSaving, setPointSaving] = useState(false);

  const fetchPoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi-points");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  const callAPI = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/taxi-points", {
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
    await fetchPoints();
    setCatSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Удалить категорию и все её точки?")) return;
    await callAPI({ action: "delete_category", id });
    await fetchPoints();
  };

  const addPoint = async () => {
    if (!pointName.trim() || !pointCat) return;
    setPointSaving(true);
    await callAPI({ action: "add_point", name: pointName.trim(), categoryId: pointCat, defaultPrice: parseInt(pointPrice) || 0 });
    setPointName(""); setPointPrice(""); setPointModal(false);
    await fetchPoints();
    setPointSaving(false);
  };

  const deletePoint = async (id: string) => {
    if (!confirm("Удалить точку?")) return;
    await callAPI({ action: "delete_point", id });
    await fetchPoints();
  };

  const catOptions = data.categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Точки такси</h1>
        <button onClick={fetchPoints} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]" aria-label="Обновить">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><polyline points="3 3 3 8 8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="flex bg-[var(--color-surface-2)] rounded-xl p-1 gap-1">
        {(["categories", "points"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)]"}`}
          >
            {t === "categories" ? `Категории (${data.categories.length})` : `Точки (${data.points.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          {tab === "categories" && (
            <>
              <Button variant="primary" fullWidth onClick={() => { setCatName(""); setCatModal(true); }}>
                + Добавить категорию
              </Button>
              <div className="flex flex-col gap-2">
                {data.categories.length === 0 ? (
                  <p className="text-center text-[var(--color-muted-foreground)] py-6 text-sm">Нет категорий</p>
                ) : data.categories.map((cat) => (
                  <Card key={cat.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center text-sm font-bold text-[var(--color-primary)]">
                      {cat.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {data.points.filter((p) => p.categoryId === cat.id).length} точек
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

          {tab === "points" && (
            <>
              <Button variant="primary" fullWidth onClick={() => { setPointName(""); setPointCat(data.categories[0]?.id || ""); setPointPrice(""); setPointModal(true); }} disabled={data.categories.length === 0}>
                + Добавить точку
              </Button>
              {data.categories.length === 0 && (
                <p className="text-xs text-center text-[var(--color-muted-foreground)]">Сначала создайте категорию</p>
              )}
              <div className="flex flex-col gap-2">
                {data.points.length === 0 ? (
                  <p className="text-center text-[var(--color-muted-foreground)] py-6 text-sm">Нет точек маршрута</p>
                ) : data.categories.map((cat) => {
                  const pts = data.points.filter((p) => p.categoryId === cat.id);
                  if (pts.length === 0) return null;
                  return (
                    <div key={cat.id} className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide px-1">{cat.name}</p>
                      {pts.map((pt) => (
                        <Card key={pt.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="var(--color-primary)" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="var(--color-primary)" strokeWidth="1.5"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{pt.name}</p>
                            {pt.defaultPrice > 0 && (
                              <p className="text-xs text-[var(--color-primary)]">от {pt.defaultPrice} р.</p>
                            )}
                          </div>
                          <button onClick={() => deletePoint(pt.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-negative)]" aria-label="Удалить">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Новая категория маршрута">
        <div className="flex flex-col gap-4">
          <Input label="Название" placeholder="Жилые районы" value={catName} onChange={(e) => setCatName(e.target.value)} />
          <Button variant="primary" fullWidth disabled={!catName.trim() || catSaving} onClick={addCategory}>
            {catSaving ? "Сохранение..." : "Добавить"}
          </Button>
        </div>
      </Modal>

      <Modal open={pointModal} onClose={() => setPointModal(false)} title="Новая точка маршрута">
        <div className="flex flex-col gap-3">
          <Input label="Название точки" placeholder="Парк Победы" value={pointName} onChange={(e) => setPointName(e.target.value)} />
          <Select label="Категория" value={pointCat} onChange={(e) => setPointCat(e.target.value)} options={catOptions} />
          <Input label="Базовая цена (р.)" placeholder="100" value={pointPrice} onChange={(e) => setPointPrice(e.target.value)} type="number" />
          <Button variant="primary" fullWidth disabled={!pointName.trim() || !pointCat || pointSaving} onClick={addPoint}>
            {pointSaving ? "Сохранение..." : "Добавить"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
