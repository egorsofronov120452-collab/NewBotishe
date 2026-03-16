import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
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

// POST /api/taxi-route - Calculate route and save pick
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, from, to, price, routeImage } = body
    
    if (!token || !from || !to) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
    }

    // Calculate straight-line distance between named points
    let distance = 0
    let calculatedPrice = price || 0

    if (from.x !== undefined && to.x !== undefined &&
        from.y !== undefined && to.y !== undefined) {
      distance = Math.round(Math.hypot(to.x - from.x, to.y - from.y))
      if (!calculatedPrice) {
        const base = Math.round(distance * 0.5)
        const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })).getHours()
        const peak = (hour >= 18 && hour <= 22) ? 1.3 : 1.0
        calculatedPrice = Math.max(50, Math.round(base * peak))
      }
    } else {
      calculatedPrice = price || Math.round(((from.basePrice || 100) + (to.basePrice || 100)) / 2)
    }

    // Save picks with route info and image
    const picks = readPicks()
    picks[token] = {
      from: { id: from.id, name: from.name, x: from.x, y: from.y, pickedAt: Date.now() },
      to:   { id: to.id,   name: to.name,   x: to.x,   y: to.y,   pickedAt: Date.now() },
      distance,
      price: calculatedPrice,
      routeImage: routeImage || null,
    }
    writePicks(picks)
    
    return NextResponse.json({ 
      ok: true,
      distance,
      price: calculatedPrice,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// GET /api/taxi-route?token=TOKEN - Get saved route
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 })
  }
  
  const picks = readPicks()
  const entry = picks[token]
  if (!entry) {
    return NextResponse.json({ ok: false })
  }
  
  return NextResponse.json({ ok: true, data: entry })
}

// DELETE /api/taxi-route?token=TOKEN - Clean up after reading
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
