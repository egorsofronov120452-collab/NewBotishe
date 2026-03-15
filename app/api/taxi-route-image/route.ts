import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
const ROADS_FILE = path.join(DATA_DIR, 'taxi_roads.json')
const PICKS_FILE = path.join(DATA_DIR, 'taxi_picks.json')

interface Point { x: number; y: number }

interface PickData {
  from: Point & { pickedAt: number }
  to: Point & { pickedAt: number }
  path?: Point[]
  distance?: number
}

interface RoadData {
  mapImageUrl: string
  mapWidth: number
  mapHeight: number
}

function readRoads(): RoadData {
  try {
    if (!existsSync(ROADS_FILE)) {
      return { mapImageUrl: '', mapWidth: 0, mapHeight: 0 }
    }
    return JSON.parse(readFileSync(ROADS_FILE, 'utf8'))
  } catch {
    return { mapImageUrl: '', mapWidth: 0, mapHeight: 0 }
  }
}

function readPicks(): Record<string, PickData> {
  try {
    if (!existsSync(PICKS_FILE)) return {}
    return JSON.parse(readFileSync(PICKS_FILE, 'utf8'))
  } catch { return {} }
}

// GET /api/taxi-route-image?token=TOKEN
// Returns SVG image of the route on the map
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 })
  }

  const picks = readPicks()
  const pick = picks[token]
  if (!pick || !pick.from || !pick.to) {
    return NextResponse.json({ ok: false, error: 'route not found' }, { status: 404 })
  }

  const roadData = readRoads()
  
  // Calculate bounds
  const padding = 100
  const minX = Math.min(pick.from.x, pick.to.x) - padding
  const minY = Math.min(pick.from.y, pick.to.y) - padding
  const maxX = Math.max(pick.from.x, pick.to.x) + padding
  const maxY = Math.max(pick.from.y, pick.to.y) + padding
  
  const width = Math.max(400, maxX - minX)
  const height = Math.max(400, maxY - minY)
  
  // Create SVG with embedded map and route
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#7c8cff"/>
    </marker>
  </defs>
  
  <!-- Background -->
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#1a1d2e"/>
  
  <!-- Map image if available -->
  ${roadData.mapImageUrl ? `<image x="0" y="0" width="${roadData.mapWidth || width}" height="${roadData.mapHeight || height}" 
         href="${roadData.mapImageUrl}" opacity="0.8"/>` : ''}
  
  <!-- Route line -->
  <line x1="${pick.from.x}" y1="${pick.from.y}" 
        x2="${pick.to.x}" y2="${pick.to.y}" 
        stroke="#7c8cff" stroke-width="4" stroke-dasharray="12,6"
        marker-end="url(#arrowhead)"/>
  
  <!-- From point (A) -->
  <circle cx="${pick.from.x}" cy="${pick.from.y}" r="18" fill="#22c55e" filter="url(#glow)"/>
  <circle cx="${pick.from.x}" cy="${pick.from.y}" r="18" fill="none" stroke="white" stroke-width="3"/>
  <text x="${pick.from.x}" y="${pick.from.y + 5}" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="white">A</text>
  
  <!-- To point (B) -->
  <circle cx="${pick.to.x}" cy="${pick.to.y}" r="18" fill="#ef4444" filter="url(#glow)"/>
  <circle cx="${pick.to.x}" cy="${pick.to.y}" r="18" fill="none" stroke="white" stroke-width="3"/>
  <text x="${pick.to.x}" y="${pick.to.y + 5}" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="white">B</text>
  
  <!-- Info box -->
  <rect x="${minX + 10}" y="${minY + 10}" width="200" height="60" rx="8" fill="rgba(0,0,0,0.75)"/>
  <text x="${minX + 20}" y="${minY + 32}" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">
    Kaskad Taxi - Маршрут
  </text>
  <text x="${minX + 20}" y="${minY + 52}" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="white">
    ${pick.distance ? `Расстояние: ~${Math.round(pick.distance)}px` : 'Расстояние: --'}
  </text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  })
}

// POST /api/taxi-route-image - Generate PNG data URL for Telegram
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 })
    }

    const picks = readPicks()
    const pick = picks[token]
    if (!pick || !pick.from || !pick.to) {
      return NextResponse.json({ ok: false, error: 'route not found' }, { status: 404 })
    }

    const roadData = readRoads()
    
    // Return route data for client-side rendering
    return NextResponse.json({
      ok: true,
      route: {
        from: pick.from,
        to: pick.to,
        path: pick.path || [pick.from, pick.to],
        distance: pick.distance,
      },
      mapImageUrl: roadData.mapImageUrl,
      mapWidth: roadData.mapWidth,
      mapHeight: roadData.mapHeight,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
