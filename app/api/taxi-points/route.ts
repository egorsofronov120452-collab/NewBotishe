// =============================================================
// TAXI ВРЕМЕННО ОТКЛЮЧЁН — идёт работа над модулем доставки.
// Оригинальный код сохранён ниже в комментарии.
// Для включения: раскомментировать блок и удалить заглушку.
// =============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  return NextResponse.json({ disabled: true, message: 'Такси временно отключено' }, { status: 503 })
}
export async function POST(_req: NextRequest) {
  return NextResponse.json({ disabled: true, message: 'Такси временно отключено' }, { status: 503 })
}

/*
import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const TAXI_POINTS_FILE = path.join(process.cwd(), 'scripts', 'data', 'taxi_points.json')
const TAXI_MAP_FILE = path.join(process.cwd(), 'scripts', 'data', 'taxi_map.json')

export async function GET() {
  try {
    let categories: unknown[] = []
    let points: unknown[] = []
    let mapImageUrl = ''

    if (existsSync(TAXI_POINTS_FILE)) {
      const raw = readFileSync(TAXI_POINTS_FILE, 'utf8')
      const data = JSON.parse(raw)
      categories = Array.isArray(data.categories) ? data.categories : []
      points = Array.isArray(data.points) ? data.points : []
    }

    if (existsSync(TAXI_MAP_FILE)) {
      try {
        const mapRaw = readFileSync(TAXI_MAP_FILE, 'utf8')
        const mapData = JSON.parse(mapRaw)
        mapImageUrl = mapData.mapImageUrl || ''
      } catch {}
    }

    return NextResponse.json({ categories, points, mapImageUrl })
  } catch {
    return NextResponse.json({ categories: [], points: [], mapImageUrl: '' })
  }
}
*/
