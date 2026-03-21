// TAXI DISABLED
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Такси временно недоступно' }, { status: 503 })
}

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Такси временно недоступно' }, { status: 503 })
}

export async function DELETE() {
  return NextResponse.json({ ok: false, error: 'Такси временно недоступно' }, { status: 503 })
}
