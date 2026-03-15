import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
const TAXI_POINTS_FILE = path.join(DATA_DIR, 'taxi_points.json')

function readData() {
  try {
    if (!existsSync(TAXI_POINTS_FILE)) return { categories: [], points: [] }
    const raw = readFileSync(TAXI_POINTS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch { return { categories: [], points: [] } }
}

function writeData(data: unknown) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(TAXI_POINTS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// GET — return all categories and points
export async function GET() {
  try {
    const data = readData()
    return NextResponse.json({
      ok: true,
      categories: data.categories || [],
      points: data.points || [],
    })
  } catch (e) {
    return NextResponse.json({ ok: false, categories: [], points: [], error: String(e) })
  }
}

// POST — save categories and points (full replace from editor)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { categories, points } = body
    if (!Array.isArray(categories) || !Array.isArray(points)) {
      return NextResponse.json({ ok: false, error: 'invalid data' }, { status: 400 })
    }
    writeData({ categories, points })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
