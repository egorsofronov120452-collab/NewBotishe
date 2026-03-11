import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Catalogue } from "@/lib/types";

const CATALOGUE_FILE = path.join(process.cwd(), "scripts", "data", "catalogue.json");

function readCatalogue(): Catalogue {
  try {
    if (fs.existsSync(CATALOGUE_FILE)) {
      return JSON.parse(fs.readFileSync(CATALOGUE_FILE, "utf8"));
    }
  } catch {}
  return { categories: [], items: [], sets: [] };
}

function writeCatalogue(data: Catalogue) {
  fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(data, null, 2), "utf8");
}

function genId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  return NextResponse.json(readCatalogue());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ...payload } = body;
  const cat = readCatalogue();

  if (action === "add_category") {
    const { name } = payload;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const newCat = { id: genId(), name, photo: null };
    cat.categories.push(newCat);
    writeCatalogue(cat);
    return NextResponse.json({ ok: true, category: newCat });
  }

  if (action === "delete_category") {
    const { id } = payload;
    cat.categories = cat.categories.filter((c) => c.id !== id);
    cat.items = cat.items.filter((i) => i.categoryId !== id);
    writeCatalogue(cat);
    return NextResponse.json({ ok: true });
  }

  if (action === "add_item") {
    const { name, price, cost, categoryId, temp, subItems, instruction, photoId } = payload;
    if (!name || !categoryId) return NextResponse.json({ error: "name+categoryId required" }, { status: 400 });
    const newItem = {
      id: genId(),
      name,
      price: parseInt(price) || 0,
      cost: parseInt(cost) || 0,
      temp: temp || "",
      categoryId,
      subItems: subItems || [],
      instruction: instruction || null,
      photoId: photoId || null,
    };
    cat.items.push(newItem);
    writeCatalogue(cat);
    return NextResponse.json({ ok: true, item: newItem });
  }

  if (action === "delete_item") {
    const { id } = payload;
    cat.items = cat.items.filter((i) => i.id !== id);
    writeCatalogue(cat);
    return NextResponse.json({ ok: true });
  }

  if (action === "add_set") {
    const { name, price, cost, subItems, photoId } = payload;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const newSet = {
      id: genId(),
      name,
      price: parseInt(price) || 0,
      cost: parseInt(cost) || 0,
      subItems: subItems || [],
      photoId: photoId || null,
    };
    cat.sets.push(newSet);
    writeCatalogue(cat);
    return NextResponse.json({ ok: true, set: newSet });
  }

  if (action === "delete_set") {
    const { id } = payload;
    cat.sets = cat.sets.filter((s) => s.id !== id);
    writeCatalogue(cat);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
