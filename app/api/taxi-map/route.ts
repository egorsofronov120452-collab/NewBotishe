import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
const ROADS_FILE = path.join(DATA_DIR, 'taxi_roads.json')

interface RoadData {
  mapImageUrl: string
  mapWidth: number
  mapHeight: number
  roadMask: string // Base64 PNG of road mask
  oneWays: {
    id: string
    segments: { x1: number; y1: number; x2: number; y2: number }[]
    direction: 'forward' | 'backward'
  }[]
  radars: { id: string; x: number; y: number; width: number }[]
  trafficLights: { id: string; x: number; y: number; width: number; delay?: number }[]
}

function readRoads(): RoadData {
  try {
    if (!existsSync(ROADS_FILE)) {
      return { 
        mapImageUrl: '', 
        mapWidth: 0, 
        mapHeight: 0, 
        roadMask: '', 
        oneWays: [], 
        radars: [], 
        trafficLights: [] 
      }
    }
    return JSON.parse(readFileSync(ROADS_FILE, 'utf8'))
  } catch {
    return { 
      mapImageUrl: '', 
      mapWidth: 0, 
      mapHeight: 0, 
      roadMask: '', 
      oneWays: [], 
      radars: [], 
      trafficLights: [] 
    }
  }
}

function writeRoads(data: RoadData) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(ROADS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// GET /api/taxi-map - Get road data
export async function GET() {
  try {
    const data = readRoads()
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// POST /api/taxi-map - Save road data from editor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data: RoadData = {
      mapImageUrl: body.mapImageUrl || '',
      mapWidth: body.mapWidth || 0,
      mapHeight: body.mapHeight || 0,
      roadMask: body.roadMask || '',
      oneWays: body.oneWays || [],
      radars: body.radars || [],
      trafficLights: body.trafficLights || [],
    }
    writeRoads(data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
