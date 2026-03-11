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

export async function POST(request: Request) {
  const body = await request.json();
  const { action, type, orderId, ...payload } = body;
  const orders = readOrders();

  if (action === "update_status") {
    if (type === "delivery") {
      const idx = orders.delivery.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        orders.delivery[idx] = { ...orders.delivery[idx], ...payload };
        writeOrders(orders);
        return NextResponse.json({ ok: true });
      }
    }
    if (type === "taxi") {
      const idx = orders.taxi.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        orders.taxi[idx] = { ...orders.taxi[idx], ...payload };
        writeOrders(orders);
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
