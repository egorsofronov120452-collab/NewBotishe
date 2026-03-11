import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Promos, PromoCode } from "@/lib/types";

const PROMOS_FILE = path.join(process.cwd(), "scripts", "data", "promos.json");

function readPromos(): Promos {
  try {
    if (fs.existsSync(PROMOS_FILE)) {
      return JSON.parse(fs.readFileSync(PROMOS_FILE, "utf8"));
    }
  } catch {}
  return { delivery: [], taxi: [] };
}

function writePromos(data: Promos) {
  fs.writeFileSync(PROMOS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function genId() {
  return `promo_${Date.now()}`;
}

export async function GET() {
  return NextResponse.json(readPromos());
}

export async function POST(request: Request) {
  const body = await request.json();
  // Support both `service` and legacy `promoType`
  const { action, service, promoType, ...payload } = body;
  const promos = readPromos();
  const target = (service || promoType) as "delivery" | "taxi";
  const list = target === "taxi" ? promos.taxi : promos.delivery;

  // Support "add" and "add_promo"
  if (action === "add" || action === "add_promo") {
    const { code, type, value, freeItem, maxUses } = payload;
    if (!code || !type) return NextResponse.json({ error: "code+type required" }, { status: 400 });
    const promo: PromoCode = {
      id: genId(),
      code: String(code).toUpperCase(),
      type,
      value: parseFloat(value) || 0,
      freeItem: freeItem || undefined,
      active: true,
      uses: 0,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      createdAt: Date.now(),
    };
    list.push(promo);
    if (target === "taxi") promos.taxi = list;
    else promos.delivery = list;
    writePromos(promos);
    return NextResponse.json({ ok: true, promo });
  }

  // Support "toggle" and "toggle_promo"
  if (action === "toggle" || action === "toggle_promo") {
    const { id, active } = payload;
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
    list[idx].active = active !== undefined ? active : !list[idx].active;
    if (target === "taxi") promos.taxi = list;
    else promos.delivery = list;
    writePromos(promos);
    return NextResponse.json({ ok: true });
  }

  // Support "delete" and "delete_promo"
  if (action === "delete" || action === "delete_promo") {
    const { id } = payload;
    const filtered = list.filter((p) => p.id !== id);
    if (target === "taxi") promos.taxi = filtered;
    else promos.delivery = filtered;
    writePromos(promos);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
