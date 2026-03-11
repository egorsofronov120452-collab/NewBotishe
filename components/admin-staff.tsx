"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, Input, Modal, Spinner, Badge, Select } from "@/components/ui-kit";
import type { StaffMember } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  kurier: "Курьер",
  ss: "Ст. состав",
  rs: "Руководство",
};

const ROLE_COLORS: Record<string, "primary" | "warning" | "negative"> = {
  kurier: "primary",
  ss: "warning",
  rs: "negative",
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Record<string, StaffMember>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [addModal, setAddModal] = useState(false);

  const [newUid, setNewUid] = useState("");
  const [newNick, setNewNick] = useState("");
  const [newBank, setNewBank] = useState("");
  const [newRole, setNewRole] = useState<"kurier" | "ss" | "rs">("kurier");
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      const { profiles: _p, ...members } = data;
      setStaff(members as Record<string, StaffMember>);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const callAPI = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const addMember = async () => {
    if (!newUid || !newNick) return;
    setSaving(true);
    await callAPI({ action: "add_member", uid: parseInt(newUid), nick: newNick, bank: newBank, role: newRole });
    setAddModal(false); setNewUid(""); setNewNick(""); setNewBank(""); setNewRole("kurier");
    await fetchStaff();
    setSaving(false);
  };

  const deleteMember = async (uid: number) => {
    if (!confirm("Уволить сотрудника?")) return;
    await callAPI({ action: "delete_member", uid });
    setSelected(null);
    await fetchStaff();
  };

  const updateRole = async (uid: number, role: string) => {
    await callAPI({ action: "update_role", uid, role });
    await fetchStaff();
    setSelected(null);
  };

  const members = Object.values(staff);

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Сотрудники</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted-foreground)]">{members.length} чел.</span>
          <button onClick={fetchStaff} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)]" aria-label="Обновить">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><polyline points="3 3 3 8 8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <Button variant="primary" fullWidth onClick={() => setAddModal(true)}>
        + Принять сотрудника
      </Button>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : members.length === 0 ? (
        <p className="text-center text-[var(--color-muted-foreground)] py-8 text-sm">Нет сотрудников</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Card key={m.uid} onClick={() => setSelected(m)} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center shrink-0 font-bold text-sm text-[var(--color-primary)]">
                {m.nick[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.nick}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">ID: {m.uid}</p>
              </div>
              <Badge color={ROLE_COLORS[m.role] || "muted"}>{ROLE_LABELS[m.role] || m.role}</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Member detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.nick || ""}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">VK ID</span>
                <span className="text-sm font-medium">{selected.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Роль</span>
                <Badge color={ROLE_COLORS[selected.role] || "muted"}>{ROLE_LABELS[selected.role] || selected.role}</Badge>
              </div>
              {selected.bank && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Счёт</span>
                  <span className="text-sm font-medium">{selected.bank}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Заказы доставки</span>
                <span className="text-sm font-medium">{selected.stats?.deliveryOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Заказы такси</span>
                <span className="text-sm font-medium">{selected.stats?.taxiOrders || 0}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Изменить роль:</p>
              <div className="flex gap-2">
                {(["kurier", "ss", "rs"] as const).map((r) => (
                  <button
                    key={r}
                    disabled={r === selected.role}
                    onClick={() => updateRole(selected.uid, r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-40 ${r === selected.role ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]"}`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="negative" fullWidth onClick={() => deleteMember(selected.uid)}>
              Уволить
            </Button>
          </div>
        )}
      </Modal>

      {/* Add member modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Новый сотрудник">
        <div className="flex flex-col gap-3">
          <Input label="VK ID" placeholder="123456789" value={newUid} onChange={(e) => setNewUid(e.target.value)} type="number" />
          <Input label="Никнейм" placeholder="Ivanov_Ivan" value={newNick} onChange={(e) => setNewNick(e.target.value)} />
          <Input label="Номер счёта" placeholder="542928" value={newBank} onChange={(e) => setNewBank(e.target.value)} />
          <Select
            label="Роль"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "kurier" | "ss" | "rs")}
            options={[
              { value: "kurier", label: "Курьер" },
              { value: "ss", label: "Старший состав" },
              { value: "rs", label: "Руководство" },
            ]}
          />
          <Button variant="positive" fullWidth disabled={!newUid || !newNick || saving} onClick={addMember}>
            {saving ? "Сохранение..." : "Принять"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
