import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { StaffFile, StaffMember } from "@/lib/types";

const STAFF_FILE = path.join(process.cwd(), "scripts", "data", "staff.json");

function readStaff(): StaffFile {
  try {
    if (fs.existsSync(STAFF_FILE)) {
      return JSON.parse(fs.readFileSync(STAFF_FILE, "utf8"));
    }
  } catch {}
  return {};
}

function writeStaff(data: StaffFile) {
  fs.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function GET() {
  const raw = readStaff();
  const members: StaffMember[] = Object.entries(raw)
    .filter(([k, v]) => k !== "profiles" && typeof v === "object" && v !== null && "uid" in (v as object))
    .map(([, v]) => v as StaffMember);
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ...payload } = body;
  const staff = readStaff();

  if (action === "add") {
    const { uid, nick, bank, role } = payload;
    if (!uid || !nick) return NextResponse.json({ error: "uid+nick required" }, { status: 400 });
    const member: StaffMember = {
      uid: parseInt(uid),
      nick,
      bank: bank || "",
      role: role || "kurier",
      groups: [],
      vehicles: [],
      orgVehicles: [],
      stats: { deliveryOrders: 0, taxiOrders: 0 },
      createdAt: Date.now(),
    };
    staff[uid] = member;
    writeStaff(staff);
    return NextResponse.json({ ok: true, member });
  }

  if (action === "update") {
    const { uid, ...updates } = payload;
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
    const existing = staff[uid];
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    staff[uid] = { ...(existing as object), ...updates };
    writeStaff(staff);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { uid } = payload;
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
    delete staff[uid];
    writeStaff(staff);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
