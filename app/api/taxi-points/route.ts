import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { TaxiPoints } from "@/lib/types";

const TAXI_POINTS_FILE = path.join(process.cwd(), "scripts", "data", "taxi_points.json");

function readPoints(): TaxiPoints {
  try {
    if (fs.existsSync(TAXI_POINTS_FILE)) {
      return JSON.parse(fs.readFileSync(TAXI_POINTS_FILE, "utf8"));
    }
  } catch {}
  return { categories: [], points: [] };
}

function writePoints(data: TaxiPoints) {
  fs.writeFileSync(TAXI_POINTS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function genId() {
  return `pt_${Date.now()}`;
}

function genCatId() {
  return `cat_${Date.now()}`;
}

export async function GET() {
  return NextResponse.json(readPoints());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ...payload } = body;
  const tp = readPoints();

  if (action === "add_category") {
    const { name } = payload;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const cat = { id: genCatId(), name };
    tp.categories.push(cat);
    writePoints(tp);
    return NextResponse.json({ ok: true, category: cat });
  }

  if (action === "delete_category") {
    const { id } = payload;
    tp.categories = tp.categories.filter((c) => c.id !== id);
    tp.points = tp.points.filter((p) => p.categoryId !== id);
    writePoints(tp);
    return NextResponse.json({ ok: true });
  }

  if (action === "add_point") {
    const { name, categoryId, defaultPrice, x, y } = payload;
    if (!name || !categoryId) return NextResponse.json({ error: "name+categoryId required" }, { status: 400 });
    const point = {
      id: genId(),
      name,
      categoryId,
      defaultPrice: parseInt(defaultPrice) || 0,
      x: x || 0,
      y: y || 0,
    };
    tp.points.push(point);
    writePoints(tp);
    return NextResponse.json({ ok: true, point });
  }

  if (action === "update_point") {
    const { id, ...updates } = payload;
    const idx = tp.points.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
    tp.points[idx] = { ...tp.points[idx], ...updates };
    writePoints(tp);
    return NextResponse.json({ ok: true, point: tp.points[idx] });
  }

  if (action === "delete_point") {
    const { id } = payload;
    tp.points = tp.points.filter((p) => p.id !== id);
    writePoints(tp);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
