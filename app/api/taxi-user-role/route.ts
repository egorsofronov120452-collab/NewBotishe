// =============================================================
// TAXI ВРЕМЕННО ОТКЛЮЧЁН — идёт работа над модулем доставки.
// =============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  return NextResponse.json({ disabled: true, message: 'Такси временно отключено' }, { status: 503 })
}

/*
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const DATA_DIR    = path.join(process.cwd(), 'scripts', 'data')
const STAFF_FILE  = path.join(DATA_DIR, 'staff.json')

// GET /api/taxi-user-role?vkUserId=123
// Returns { role: 'rs' | 'ss' | 'staff' | 'client', nick, canEdit, org }
// To re-enable: uncomment this block and remove the stub above.
*/
