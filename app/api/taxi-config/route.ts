// TAXI DISABLED
// import { NextRequest, NextResponse } from 'next/server'
// import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
// import path from 'path'
//
// const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
// const CONFIG_FILE = path.join(DATA_DIR, 'taxi_config.json')
// const POINTS_FILE = path.join(DATA_DIR, 'taxi_points.json')
// ... (весь код закомментирован)

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Такси временно недоступно' }, { status: 503 })
}

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Такси временно недоступно' }, { status: 503 })
}
