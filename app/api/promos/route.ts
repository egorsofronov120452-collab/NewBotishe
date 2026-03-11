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
  const { action, promoType, ...payload } = body;
  const promos = readPromos();
  const list = promoType === "taxi" ? promos.taxi : promos.delivery;

  if (action === "add") {
    const { code, type, value, freeItem, maxUses } = payload;
    if (!code || !type) return NextResponse.json({ error: "code+type required" }, { status: 400 });
    const promo: PromoCode = {
      id: genId(),
      code,
      type,
      value: parseFloat(value) || 0,
      freeItem: freeItem || undefined,
      active: true,
      uses: 0,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      createdAt: Date.now(),
    };
    list.push(promo);
    if (promoType === "taxi") promos.taxi = list;
    else promos.delivery = list;
    writePromos(promos);
    return NextResponse.json({ ok: true, promo });
  }

  if (action === "toggle") {
    const { id } = payload;
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
    list[idx].active = !list[idx].active;
    if (promoType === "taxi") promos.taxi = list;
    else promos.delivery = list;
    writePromos(promos);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { id } = payload;
    const filtered = list.filter((p) => p.id !== id);
    if (promoType === "taxi") promos.taxi = filtered;
    else promos.delivery = filtered;
    writePromos(promos);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
