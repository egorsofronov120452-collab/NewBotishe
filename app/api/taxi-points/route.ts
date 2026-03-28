// TAXI DISABLED
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Такси временно недоступно' }, { status: 503 })
}
