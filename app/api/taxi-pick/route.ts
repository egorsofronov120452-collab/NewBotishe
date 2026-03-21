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
export async function DELETE(_req: NextRequest) {
  return NextResponse.json({ disabled: true, message: 'Такси временно отключено' }, { status: 503 })
}

/*
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR   = path.join(process.cwd(), 'scripts', 'data')
const PICKS_FILE = path.join(DATA_DIR, 'taxi_picks.json')

// POST /api/taxi-pick  { token, step: 'from'|'to', point: {...} }
// GET  /api/taxi-pick?token=TOKEN
// DELETE /api/taxi-pick?token=TOKEN
// To re-enable: uncomment this block and remove the stub above.
*/
