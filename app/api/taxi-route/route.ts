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
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

// POST /api/taxi-route — calculate route and save pick
// GET  /api/taxi-route?token=TOKEN — get saved route
// DELETE /api/taxi-route?token=TOKEN — clean up
// To re-enable: uncomment this block and remove the stub above.
*/
