import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
const CONFIG_FILE = path.join(DATA_DIR, 'taxi_config.json')
const POINTS_FILE = path.join(DATA_DIR, 'taxi_points.json')

interface TaxiConfig {
  pricePerPixel: number   // roubles per pixel of straight-line distance
  peakMultiplier: number  // e.g. 1.3
  peakStart: number       // hour (MSK), e.g. 18
  peakEnd: number         // hour (MSK), e.g. 22
  minPrice: number
  mapImageUrl: string | null
  mapWidth: number
  mapHeight: number
}

interface Zone {
  id: string
  type: 'no_from' | 'no_to' | 'no_both'
  label: string
  polygon: { x: number; y: number }[]
}

interface TaxiPoints {
  categories: { id: string; name: string }[]
  points: {
    id: string
    categoryId: string
    name: string
    x: number
    y: number
    basePrice?: number
  }[]
  zones: Zone[]
  config: TaxiConfig
}

function read(): TaxiPoints {
  const defaults: TaxiPoints = {
    categories: [],
    points: [],
    zones: [],
    config: {
      pricePerPixel: 0.5,
      peakMultiplier: 1.3,
      peakStart: 18,
      peakEnd: 22,
      minPrice: 50,
      mapImageUrl: null,
      mapWidth: 1000,
      mapHeight: 800,
    },
  }
  try {
    if (!existsSync(POINTS_FILE)) return defaults
    const data = JSON.parse(readFileSync(POINTS_FILE, 'utf8'))
    return {
      categories: data.categories || [],
      points: data.points || [],
      zones: data.zones || [],
      config: { ...defaults.config, ...(data.config || {}) },
    }
  } catch { return defaults }
}

function write(data: TaxiPoints) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// GET /api/taxi-config — read full taxi config + points + zones
export async function GET() {
  const data = read()
  return NextResponse.json({ ok: true, data })
}

// POST /api/taxi-config — update config fields, zones, or points
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = read()

    if (body.config) {
      data.config = { ...data.config, ...body.config }
    }
    if (body.zones) {
      data.zones = body.zones
    }
    if (body.categories) {
      data.categories = body.categories
    }
    if (body.points) {
      data.points = body.points
    }

    write(data)
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
