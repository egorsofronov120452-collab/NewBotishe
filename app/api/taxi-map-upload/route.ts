// =============================================================
// TAXI ВРЕМЕННО ОТКЛЮЧЁН — идёт работа над модулем доставки.
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
import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import path from 'path'

const PUBLIC_DIR  = path.join(process.cwd(), 'public', 'tools')
const MAP_PATH    = path.join(PUBLIC_DIR, 'taxi-map.jpg')
const POINTS_FILE = path.join(process.cwd(), 'scripts', 'data', 'taxi_points.json')

// ... (full original code preserved)
// To re-enable: uncomment this block and remove the stub above.
*/
