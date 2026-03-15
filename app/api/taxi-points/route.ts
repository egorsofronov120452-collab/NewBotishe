import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const TAXI_POINTS_FILE = path.join(process.cwd(), 'scripts', 'data', 'taxi_points.json')

export async function GET() {
  try {
    if (!existsSync(TAXI_POINTS_FILE)) {
      return NextResponse.json({ categories: [], points: [] })
    }
    const raw = readFileSync(TAXI_POINTS_FILE, 'utf8')
    const data = JSON.parse(raw)
    return NextResponse.json({
      categories: Array.isArray(data.categories) ? data.categories : [],
      points: Array.isArray(data.points) ? data.points : [],
    })
  } catch {
    return NextResponse.json({ categories: [], points: [] })
  }
}
