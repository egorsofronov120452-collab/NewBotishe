import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Orders } from "@/lib/types";

const ORDERS_FILE = path.join(process.cwd(), "scripts", "data", "orders.json");

function readOrders(): Orders {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
    }
  } catch {}
  return { delivery: [], taxi: [] };
}

function writeOrders(data: Orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const orders = readOrders();

  if (type === "delivery") {
    let list = orders.delivery;
    if (status) list = list.filter((o) => o.status === status);
    return NextResponse.json(list);
  }
  if (type === "taxi") {
    let list = orders.taxi;
    if (status) list = list.filter((o) => o.status === status);
    return NextResponse.json(list);
  }
  return NextResponse.json(orders);
}

function genId() {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, type, orderId, ...payload } = body;
  const orders = readOrders();

  if (action === "update_status") {
    if (type === "delivery") {
      const idx = orders.delivery.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        orders.delivery[idx] = { ...orders.delivery[idx], status: payload.status };
        writeOrders(orders);
        return NextResponse.json({ ok: true });
      }
    }
    if (type === "taxi") {
      const idx = orders.taxi.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        orders.taxi[idx] = { ...orders.taxi[idx], status: payload.status };
        writeOrders(orders);
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (action === "create_order") {
    const id = genId();
    if (type === "delivery") {
      const order = {
        id,
        type: "delivery" as const,
        clientId: payload.clientId || 0,
        nick: payload.nick || "Аноним",
        address: payload.address || "",
        basket: payload.basket || [],
        total: payload.total || 0,
        finalPrice: payload.finalPrice || payload.total || 0,
        promoDesc: payload.promoDesc || null,
        payment: payload.payment || { type: "cash" },
        status: "pending" as const,
        createdAt: Date.now(),
      };
      orders.delivery.unshift(order);
      writeOrders(orders);
      return NextResponse.json({ ok: true, order });
    }
    if (type === "taxi") {
      const order = {
        id,
        type: "taxi" as const,
        clientId: payload.clientId || 0,
        nick: payload.nick || "Аноним",
        from: payload.from || null,
        to: payload.to || null,
        passengers: payload.passengers || [],
        payment: payload.payment || { type: "cash" },
        finalPrice: payload.finalPrice || 0,
        status: "pending" as const,
        createdAt: Date.now(),
      };
      orders.taxi.unshift(order);
      writeOrders(orders);
      return NextResponse.json({ ok: true, order });
    }
  }

  if (action === "delete_order") {
    if (type === "delivery") {
      orders.delivery = orders.delivery.filter((o) => o.id !== orderId);
      writeOrders(orders);
      return NextResponse.json({ ok: true });
    }
    if (type === "taxi") {
      orders.taxi = orders.taxi.filter((o) => o.id !== orderId);
      writeOrders(orders);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
