import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR    = path.join(process.cwd(), 'scripts', 'data')
const STAFF_FILE  = path.join(DATA_DIR, 'staff.json')
const ONLINE_FILE = path.join(DATA_DIR, 'online_journal.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const POINTS_FILE = path.join(DATA_DIR, 'taxi_points.json')
const PROMOS_FILE = path.join(DATA_DIR, 'promos.json')

function readJSON(file: string, def: unknown = {}) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  } catch { /* empty */ }
  return def
}
function writeJSON(file: string, data: unknown) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function getOrderNumber(): number {
  const counterFile = path.join(DATA_DIR, 'order_counter.json')
  const c: { delivery: number; taxi: number } = readJSON(counterFile, { delivery: 0, taxi: 0 }) as { delivery: number; taxi: number }
  c.taxi = (c.taxi || 0) + 1
  writeJSON(counterFile, c)
  return c.taxi
}

// ---------- Shift check ----------
// GET /api/taxi-order-submit?action=shift-check
// Returns { onShift: bool, drivers: [{ nick, role }] }
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'shift-check') {
    const online: { sessions?: Record<string, { status?: string; role?: string; nick?: string; org?: string }> } =
      readJSON(ONLINE_FILE, { sessions: {} }) as { sessions?: Record<string, { status?: string; role?: string; nick?: string; org?: string }> }
    const sessions = online.sessions || {}
    const drivers = Object.values(sessions).filter(
      (s) => s.status === 'online' && (s.org === 'taxi' || s.role === 'rs' || s.role === 'ss')
    )
    return NextResponse.json({ ok: true, onShift: drivers.length > 0, drivers: drivers.map(d => ({ nick: d.nick, role: d.role })) })
  }
  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
}

// ---------- Submit order ----------
// POST /api/taxi-order-submit
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vkUserId, nick, passengers, from, to, promo, payment, finalPrice, mapSnapshotUrl } = body

    if (!vkUserId || !nick || !from || !to || !payment) {
      return NextResponse.json({ ok: false, error: 'missing required fields' }, { status: 400 })
    }

    // Validate promo if provided
    let promoDesc: string | null = null
    let usedPromo: string | null = null
    if (promo) {
      const promos: { taxi?: { code: string; discount: number; type: string; uses?: number; maxUses?: number }[] } =
        readJSON(PROMOS_FILE, { taxi: [] }) as { taxi?: { code: string; discount: number; type: string; uses?: number; maxUses?: number }[] }
      const found = (promos.taxi || []).find((p) => p.code.toLowerCase() === promo.toLowerCase())
      if (found) {
        usedPromo = found.code
        promoDesc = found.type === 'percent' ? `Промокод ${found.code}: -${found.discount}%` : `Промокод ${found.code}: -${found.discount}р.`
        // Increment usage
        found.uses = (found.uses || 0) + 1
        writeJSON(PROMOS_FILE, promos)
      }
    }

    const orderId = randomUUID()
    const orderNum = getOrderNumber()
    const order = {
      id: orderId,
      num: orderNum,
      type: 'taxi',
      clientId: vkUserId,
      nick,
      passengers: passengers || [],
      from,
      to,
      basePrice: finalPrice,
      finalPrice,
      payment,
      promo: usedPromo,
      promoDesc,
      mapSnapshotUrl: mapSnapshotUrl || null,
      status: 'pending',
      createdAt: Date.now(),
    }

    // Save to orders
    const orders: { delivery: unknown[]; taxi: unknown[] } = readJSON(ORDERS_FILE, { delivery: [], taxi: [] }) as { delivery: unknown[]; taxi: unknown[] }
    orders.taxi.push(order)
    writeJSON(ORDERS_FILE, orders)

    // Notify VK bot via a pending dispatch file — bot polls this
    const dispatchFile = path.join(DATA_DIR, 'taxi_pending_dispatch.json')
    const pending: unknown[] = readJSON(dispatchFile, []) as unknown[]
    pending.push(order)
    writeJSON(dispatchFile, pending)

    return NextResponse.json({ ok: true, orderId, orderNum })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
