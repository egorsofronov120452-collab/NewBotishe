import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const DATA_DIR   = path.join(process.cwd(), 'scripts', 'data')
const STAFF_FILE = path.join(DATA_DIR, 'staff.json')
const ONLINE_FILE = path.join(DATA_DIR, 'online_journal.json')

function readJSON(file: string, def: unknown = {}) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  } catch { /* empty */ }
  return def
}

// GET /api/taxi-user-role?vkUserId=123
// Returns { role: 'rs' | 'ss' | 'staff' | 'client', nick: string | null }
// role 'rs' = руководящий состав (can edit map)
export async function GET(req: NextRequest) {
  const vkUserId = req.nextUrl.searchParams.get('vkUserId')
  if (!vkUserId) {
    return NextResponse.json({ ok: false, error: 'missing vkUserId' }, { status: 400 })
  }

  const staff: Record<string, { role?: string; nick?: string; org?: string }> =
    readJSON(STAFF_FILE, {}) as Record<string, { role?: string; nick?: string; org?: string }>

  const profile = staff[vkUserId]

  if (!profile) {
    return NextResponse.json({ ok: true, role: 'client', nick: null })
  }

  const role = profile.role || 'staff'
  const canEdit = role === 'rs'

  return NextResponse.json({
    ok: true,
    role,
    canEdit,
    nick: profile.nick || null,
    org: profile.org || null,
  })
}
