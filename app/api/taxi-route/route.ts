import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
const ROADS_FILE = path.join(DATA_DIR, 'taxi_roads.json')
const PICKS_FILE = path.join(DATA_DIR, 'taxi_picks.json')

interface Point { x: number; y: number }

interface RoadData {
  mapImageUrl: string
  roadMask: string
  oneWays: {
    id: string
    segments: { x1: number; y1: number; x2: number; y2: number }[]
    direction: 'forward' | 'backward'
  }[]
  radars: { id: string; x: number; y: number; width: number }[]
  trafficLights: { id: string; x: number; y: number; width: number; delay?: number }[]
  mapWidth: number
  mapHeight: number
}

function readRoads(): RoadData {
  try {
    if (!existsSync(ROADS_FILE)) {
      return { mapImageUrl: '', roadMask: '', oneWays: [], radars: [], trafficLights: [], mapWidth: 0, mapHeight: 0 }
    }
    return JSON.parse(readFileSync(ROADS_FILE, 'utf8'))
  } catch {
    return { mapImageUrl: '', roadMask: '', oneWays: [], radars: [], trafficLights: [], mapWidth: 0, mapHeight: 0 }
  }
}

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

// Calculate direct route distance
function calculateDistance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

// POST /api/taxi-route - Calculate route and save pick
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, from, to, routeImage } = body
    
    if (!token || !from || !to) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
    }
    
    const roadData = readRoads()
    
    // Calculate simple path (direct line with intermediate points for curves)
    const fromPt = { x: Math.round(from.x), y: Math.round(from.y) }
    const toPt = { x: Math.round(to.x), y: Math.round(to.y) }
    
    // Simple path - just start and end (A* is done client-side where we have canvas)
    const simplePath = [fromPt, toPt]
    const distance = calculateDistance(fromPt, toPt)
    
    // Count radars and traffic lights along direct path (rough estimate)
    let radarCount = 0
    let trafficLightCount = 0
    
    for (const radar of roadData.radars || []) {
      // Check if radar is near the direct line
      const distToLine = pointToLineDistance(
        { x: radar.x, y: radar.y },
        fromPt,
        toPt
      )
      if (distToLine < (radar.width || 20) * 2) {
        radarCount++
      }
    }
    
    for (const light of roadData.trafficLights || []) {
      const distToLine = pointToLineDistance(
        { x: light.x, y: light.y },
        fromPt,
        toPt
      )
      if (distToLine < (light.width || 16) * 2) {
        trafficLightCount++
      }
    }
    
    // Save picks with route info and image
    const picks = readPicks()
    picks[token] = {
      from: { ...fromPt, pickedAt: Date.now() },
      to: { ...toPt, pickedAt: Date.now() },
      path: simplePath,
      distance: Math.round(distance),
      radarCount,
      trafficLightCount,
      routeImage: routeImage || null, // Base64 PNG image of the route
    }
    writePicks(picks)
    
    return NextResponse.json({ 
      ok: true, 
      path: simplePath,
      distance: Math.round(distance),
      radarCount,
      trafficLightCount,
      radars: roadData.radars || [],
      trafficLights: roadData.trafficLights || [],
      oneWays: roadData.oneWays || [],
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// Calculate distance from point to line segment
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  if (lenSq !== 0) param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }

  return Math.hypot(point.x - xx, point.y - yy)
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
