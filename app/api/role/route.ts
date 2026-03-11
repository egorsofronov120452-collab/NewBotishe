import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { StaffFile, UserRole } from "@/lib/types";

const STAFF_FILE = path.join(process.cwd(), "scripts", "data", "staff.json");

function readStaff(): StaffFile {
  try {
    if (fs.existsSync(STAFF_FILE)) {
      return JSON.parse(fs.readFileSync(STAFF_FILE, "utf8"));
    }
  } catch {}
  return {};
}

export function getUserRole(uid: number): UserRole {
  const staff = readStaff();
  const member = staff[uid];
  if (!member || typeof member !== "object") return null;
  const m = member as { role?: string };
  if (m.role === "rs" || m.role === "ss" || m.role === "kurier") {
    return m.role as UserRole;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = parseInt(searchParams.get("uid") || "0");

  if (!uid) {
    return NextResponse.json({ role: null, member: null });
  }

  const role = getUserRole(uid);
  const staff = readStaff();
  const member = staff[uid] || null;

  return NextResponse.json({ role, member });
}
