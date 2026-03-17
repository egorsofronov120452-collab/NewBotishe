import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import path from 'path'

const PUBLIC_DIR  = path.join(process.cwd(), 'public', 'tools')
const MAP_PATH    = path.join(PUBLIC_DIR, 'taxi-map.jpg')
const POINTS_FILE = path.join(process.cwd(), 'scripts', 'data', 'taxi_points.json')

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true })
    writeFileSync(MAP_PATH, buffer)

    // Update taxi_points.json config.mapImageUrl with public path
    const dataFile = POINTS_FILE
    let data: Record<string, unknown> = { categories: [], points: [], zones: [] }
    try {
      if (existsSync(dataFile)) data = JSON.parse(readFileSync(dataFile, 'utf8'))
    } catch { /* ignore */ }

    const config = (data.config as Record<string, unknown> | undefined) || {}
    data.config = {
      pricePerPixel:  0.5,
      peakMultiplier: 1.3,
      peakStart: 18,
      peakEnd:   22,
      minPrice:  50,
      mapWidth:  1000,
      mapHeight: 800,
      ...config,
      mapImageUrl: '/tools/taxi-map.jpg',
    }

    writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8')

    return NextResponse.json({ ok: true, url: '/tools/taxi-map.jpg' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
