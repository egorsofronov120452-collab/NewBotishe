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
  // Return the full raw file (including profiles key) so UI can strip profiles itself
  const raw = readStaff();
  return NextResponse.json(raw);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ...payload } = body;
  const staff = readStaff();

  // Support both "add" and "add_member"
  if (action === "add" || action === "add_member") {
    const { uid, nick, bank, role } = payload;
    if (!uid || !nick) return NextResponse.json({ error: "uid+nick required" }, { status: 400 });
    const member: StaffMember = {
      uid: parseInt(uid),
      nick,
      bank: bank || "",
      role: (role as StaffMember["role"]) || "kurier",
      groups: [],
      vehicles: [],
      orgVehicles: [],
      stats: { deliveryOrders: 0, taxiOrders: 0 },
      createdAt: Date.now(),
    };
    staff[uid] = member;
    if (!staff.profiles) staff.profiles = {};
    writeStaff(staff);
    return NextResponse.json({ ok: true, member });
  }

  // Support "update", "update_role"
  if (action === "update" || action === "update_role") {
    const { uid, role, ...updates } = payload;
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
    const existing = staff[uid];
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    const mergeUpdates = role ? { role } : updates;
    staff[uid] = { ...(existing as object), ...mergeUpdates };
    writeStaff(staff);
    return NextResponse.json({ ok: true });
  }

  // Support "delete" and "delete_member"
  if (action === "delete" || action === "delete_member") {
    const { uid } = payload;
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
    delete staff[String(uid)];
    writeStaff(staff);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
