import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR   = path.join(process.cwd(), 'scripts', 'data')
const PICKS_FILE = path.join(DATA_DIR, 'taxi_picks.json')

function readPicks(): Record<string, unknown> {
  try {
    if (!existsSync(PICKS_FILE)) return {}
    return JSON.parse(readFileSync(PICKS_FILE, 'utf8'))
  } catch { return {} }
}

function writePicks(data: Record<string, unknown>) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(PICKS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// POST — save from/to point selection
// body: { token, from: { id, name, categoryId, categoryName }, to: { id, name, categoryId, categoryName } }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, from, to } = body

    if (!token || !from || !to) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
    }

    const picks = readPicks()
    picks[token] = {
      from: { ...from, pickedAt: Date.now() },
      to:   { ...to,   pickedAt: Date.now() },
    }
    writePicks(picks)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// GET — bot reads the picked points
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 })

  const picks = readPicks()
  const entry = picks[token]
  if (!entry) return NextResponse.json({ ok: false })

  return NextResponse.json({ ok: true, data: entry })
}

// DELETE — bot cleans up after reading
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false }, { status: 400 })

  const picks = readPicks()
  if (picks[token]) {
    delete picks[token]
    writePicks(picks)
  }
  return NextResponse.json({ ok: true })
}
