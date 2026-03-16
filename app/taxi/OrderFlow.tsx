'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { VKUser } from './TaxiApp'
import { ShiftGate } from './ShiftGate'

// ─── Types ─────────────────────────────────────────────────────
type Point = { id: string; categoryId: string; name: string; x: number; y: number; basePrice?: number }
type Category = { id: string; name: string }
type Zone = { id: string; type: 'no_from' | 'no_to' | 'no_both'; label: string; polygon: { x: number; y: number }[] }
type TaxiConfig = {
  pricePerPixel: number; peakMultiplier: number; peakStart: number; peakEnd: number;
  minPrice: number; mapImageUrl: string | null; mapWidth: number; mapHeight: number
}
type MapData = { categories: Category[]; points: Point[]; zones: Zone[]; config: TaxiConfig }

type OrderStep =
  | 'shift_rs_check' | 'nick' | 'passengers' | 'pick_from' | 'pick_to'
  | 'promo' | 'payment' | 'confirm' | 'submitted'

interface OrderState {
  nick: string
  passengers: string
  from: Point | null
  to: Point | null
  promo: string
  promoValid: boolean | null
  promoMsg: string
  payment: 'cash' | 'phone' | 'bank'
  finalPrice: number
  orderId: string
  orderNum: number
}

interface Props { user: VKUser }

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Наличные (0%)',
  phone: 'Счёт телефона (+7%)',
  bank: 'Банковский счёт (+5%)',
}

export function OrderFlow({ user }: Props) {
  const [step, setStep]       = useState<OrderStep>(user.role === 'rs' ? 'shift_rs_check' : 'nick')
  const [map, setMap]         = useState<MapData | null>(null)
  const [order, setOrder]     = useState<OrderState>({
    nick: user.nick || '', passengers: '', from: null, to: null,
    promo: '', promoValid: null, promoMsg: '', payment: 'cash', finalPrice: 0,
    orderId: '', orderNum: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [filterCat, setFilterCat]  = useState<string>('all')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch('/api/taxi-config').then(r => r.json()).then(d => d.ok && setMap(d.data))
  }, [])

  // ── Helpers ────────────────────────────────────────────────
  function calcPrice(from: Point, to: Point, cfg: TaxiConfig): number {
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const base  = dist * (cfg.pricePerPixel || 0.5)
    const hour  = new Date().getHours()
    const peak  = hour >= cfg.peakStart && hour < cfg.peakEnd ? cfg.peakMultiplier : 1
    return Math.max(cfg.minPrice || 50, Math.round(base * peak))
  }

  function isPointBlocked(pt: Point, kind: 'from' | 'to', zones: Zone[]): boolean {
    return zones.some(z => {
      const blocksThis = z.type === 'no_both' || z.type === `no_${kind}` as string
      if (!blocksThis) return false
      return pointInPolygon(pt.x, pt.y, z.polygon)
    })
  }

  function pointInPolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y
      if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }

  function applyPaymentFee(base: number, method: 'cash' | 'phone' | 'bank'): number {
    if (method === 'phone') return Math.round(base * 1.07)
    if (method === 'bank')  return Math.round(base * 1.05)
    return base
  }

  // Draw map thumbnail with points
  const drawMapPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map?.config.mapImageUrl) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      // Draw forbidden zones (semi-transparent)
      for (const z of map.zones) {
        if (z.polygon.length < 3) continue
        const color = z.type === 'no_from' ? 'rgba(239,68,68,0.25)'
          : z.type === 'no_to'   ? 'rgba(234,179,8,0.25)'
          : 'rgba(107,114,128,0.3)'
        ctx.beginPath()
        ctx.moveTo(z.polygon[0].x, z.polygon[0].y)
        z.polygon.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
      }
      // Draw from/to points
      const drawPt = (pt: Point, label: string, color: string) => {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.font = 'bold 14px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'
        ctx.fillText(label, pt.x, pt.y)
      }
      if (order.from) drawPt(order.from, 'A', '#22c55e')
      if (order.to)   drawPt(order.to,   'B', '#ef4444')
    }
    img.src = map.config.mapImageUrl
  }, [map, order.from, order.to])

  useEffect(() => { drawMapPreview() }, [drawMapPreview])

  // ── Render steps ───────────────────────────────────────────
  if (step === 'shift_rs_check') {
    return <ShiftGate user={user} onProceed={() => setStep('nick')} />
  }

  const categories = map?.categories || []
  const allPoints  = map?.points     || []
  const zones      = map?.zones      || []

  // Filter points for pick_from / pick_to
  const visiblePoints = allPoints.filter(pt => {
    if (filterCat !== 'all' && pt.categoryId !== filterCat) return false
    return true
  })

  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Step: Nick */}
      {step === 'nick' && (
        <StepShell title="Ваш никнейм" step={1} total={6}>
          <p className="text-muted text-sm mb-4">Введите ваш игровой никнейм</p>
          <input
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-accent placeholder:text-muted"
            placeholder="Никнейм"
            defaultValue={order.nick}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim()
                if (v) { setOrder(o => ({ ...o, nick: v })); setStep('passengers') }
              }
            }}
          />
          <NextButton label="Далее" onClick={() => {
            const inp = document.querySelector<HTMLInputElement>('input[placeholder="Никнейм"]')
            const v = inp?.value.trim() || ''
            if (v) { setOrder(o => ({ ...o, nick: v })); setStep('passengers') }
          }} />
        </StepShell>
      )}

      {/* Step: Passengers */}
      {step === 'passengers' && (
        <StepShell title="Попутчики" step={2} total={6}>
          <p className="text-muted text-sm mb-4">Добавьте попутчиков (до 2), или пропустите</p>
          <input
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-accent placeholder:text-muted"
            placeholder="Ник1, Ник2 (через запятую)"
            defaultValue={order.passengers}
          />
          <div className="flex gap-3 mt-2">
            <button onClick={() => setStep('nick')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button onClick={() => {
              const inp = document.querySelector<HTMLInputElement>('input[placeholder="Ник1, Ник2 (через запятую)"]')
              setOrder(o => ({ ...o, passengers: inp?.value.trim() || '' }))
              setStep('pick_from')
            }} className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm">Далее</button>
          </div>
          <button onClick={() => { setOrder(o => ({ ...o, passengers: '' })); setStep('pick_from') }} className="w-full mt-2 py-2 text-muted text-xs">Пропустить</button>
        </StepShell>
      )}

      {/* Step: Pick FROM */}
      {step === 'pick_from' && (
        <PickStep
          title="Откуда"
          subtitle="Выберите точку отправления"
          step={3}
          total={6}
          categories={categories}
          points={visiblePoints}
          zones={zones}
          kind="from"
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          onSelect={(pt) => {
            if (!map) return
            const price = order.to ? calcPrice(pt, order.to, map.config) : 0
            setOrder(o => ({ ...o, from: pt, finalPrice: price }))
            setStep('pick_to')
          }}
          onBack={() => setStep('passengers')}
        />
      )}

      {/* Step: Pick TO */}
      {step === 'pick_to' && (
        <PickStep
          title="Куда"
          subtitle="Выберите точку назначения"
          step={4}
          total={6}
          categories={categories}
          points={visiblePoints.filter(p => p.id !== order.from?.id)}
          zones={zones}
          kind="to"
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          onSelect={(pt) => {
            if (!map || !order.from) return
            const price = calcPrice(order.from, pt, map.config)
            setOrder(o => ({ ...o, to: pt, finalPrice: price }))
            setStep('promo')
          }}
          onBack={() => setStep('pick_from')}
        />
      )}

      {/* Step: Promo */}
      {step === 'promo' && (
        <StepShell title="Промокод" step={5} total={6}>
          {map && order.from && order.to && (
            <div className="bg-surface2 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Откуда</span>
                <span className="text-foreground font-medium">{order.from.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Куда</span>
                <span className="text-foreground font-medium">{order.to.name}</span>
              </div>
              {/* Map preview */}
              {map.config.mapImageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  <canvas ref={canvasRef} className="w-full h-auto" style={{ maxHeight: 180, objectFit: 'cover' }} />
                </div>
              )}
            </div>
          )}
          <p className="text-muted text-sm mb-3">Есть промокод? Введите его ниже</p>
          <input
            id="promo-input"
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-accent placeholder:text-muted uppercase"
            placeholder="ПРОМОКОД"
            defaultValue={order.promo}
          />
          {order.promoMsg && (
            <p className={`text-xs mt-2 ${order.promoValid ? 'text-positive' : 'text-negative'}`}>{order.promoMsg}</p>
          )}
          <div className="flex gap-3 mt-3">
            <button onClick={() => setStep('pick_to')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button onClick={async () => {
              const inp = document.getElementById('promo-input') as HTMLInputElement
              const code = inp?.value.trim() || ''
              if (code) {
                // Optimistic — validate on submit; show no error here
                setOrder(o => ({ ...o, promo: code }))
              } else {
                setOrder(o => ({ ...o, promo: '' }))
              }
              setStep('payment')
            }} className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm">Далее</button>
          </div>
          <button onClick={() => { setOrder(o => ({ ...o, promo: '' })); setStep('payment') }} className="w-full mt-2 py-2 text-muted text-xs">Пропустить</button>
        </StepShell>
      )}

      {/* Step: Payment */}
      {step === 'payment' && (
        <StepShell title="Оплата" step={5} total={6}>
          <div className="flex flex-col gap-3 mb-4">
            {(['cash', 'phone', 'bank'] as const).map(m => (
              <button
                key={m}
                onClick={() => setOrder(o => ({ ...o, payment: m, finalPrice: applyPaymentFee(map ? calcPrice(o.from!, o.to!, map.config) : 0, m) }))}
                className={`flex items-center justify-between px-4 py-4 rounded-xl border transition-colors ${
                  order.payment === m
                    ? 'border-accent bg-surface2 text-foreground'
                    : 'border-border bg-surface text-muted'
                }`}
              >
                <span className="text-sm font-medium">{PAYMENT_LABELS[m]}</span>
                {order.payment === m && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('promo')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button onClick={() => setStep('confirm')} className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm">Далее</button>
          </div>
        </StepShell>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <StepShell title="Подтверждение" step={6} total={6}>
          <div className="bg-surface2 rounded-xl divide-y divide-border mb-6">
            <Row label="Никнейм" value={order.nick} />
            {order.passengers && <Row label="Попутчики" value={order.passengers} />}
            <Row label="Откуда" value={order.from?.name || '—'} />
            <Row label="Куда" value={order.to?.name || '—'} />
            <Row label="Оплата" value={PAYMENT_LABELS[order.payment]} />
            {order.promo && <Row label="Промокод" value={order.promo} />}
            <Row label="Стоимость" value={`${order.finalPrice}р.`} highlight />
          </div>
          {/* Map snapshot */}
          {map?.config.mapImageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border">
              <canvas ref={canvasRef} className="w-full h-auto" style={{ maxHeight: 200 }} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('payment')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button
              disabled={submitting}
              onClick={async () => {
                if (!order.from || !order.to) return
                setSubmitting(true)
                try {
                  // Get map snapshot as base64
                  let snapshotUrl: string | null = null
                  if (canvasRef.current) snapshotUrl = canvasRef.current.toDataURL('image/png')

                  const r = await fetch('/api/taxi-order-submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vkUserId: user.id,
                      nick: order.nick,
                      passengers: order.passengers ? order.passengers.split(',').map(s => s.trim()) : [],
                      from: order.from,
                      to: order.to,
                      promo: order.promo || null,
                      payment: order.payment,
                      finalPrice: order.finalPrice,
                      mapSnapshotUrl: snapshotUrl,
                    }),
                  })
                  const d = await r.json()
                  if (d.ok) {
                    setOrder(o => ({ ...o, orderId: d.orderId, orderNum: d.orderNum }))
                    setStep('submitted')
                  }
                } finally {
                  setSubmitting(false)
                }
              }}
              className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Подтвердить'}
            </button>
          </div>
        </StepShell>
      )}

      {/* Step: Submitted */}
      {step === 'submitted' && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-6 text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-surface2 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-positive">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-foreground text-xl font-bold mb-2">Заказ принят!</h2>
            <p className="text-muted text-sm leading-relaxed text-balance">
              Заказ #{order.orderNum} отправлен в диспетчерскую. Ожидайте сообщения от водителя в личных сообщениях.
            </p>
          </div>
          <button
            onClick={() => {
              setStep('nick')
              setOrder({ nick: user.nick || '', passengers: '', from: null, to: null, promo: '', promoValid: null, promoMsg: '', payment: 'cash', finalPrice: 0, orderId: '', orderNum: 0 })
            }}
            className="px-8 py-3 bg-accent text-background font-bold rounded-xl"
          >
            Новый заказ
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────
function StepShell({ title, step, total, children }: { title: string; step: number; total: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col p-4 gap-4 max-w-lg mx-auto w-full pt-6">
      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>
      <h2 className="text-foreground text-lg font-bold">{title}</h2>
      {children}
    </div>
  )
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full mt-4 py-4 bg-accent text-background font-bold rounded-2xl text-base active:scale-95 transition-transform">
      {label}
    </button>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-muted text-sm">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-accent' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

interface PickStepProps {
  title: string
  subtitle: string
  step: number
  total: number
  categories: Category[]
  points: Point[]
  zones: Zone[]
  kind: 'from' | 'to'
  filterCat: string
  setFilterCat: (c: string) => void
  onSelect: (pt: Point) => void
  onBack: () => void
}

function PickStep({ title, subtitle, step, total, categories, points, zones, kind, filterCat, setFilterCat, onSelect, onBack }: PickStepProps) {
  function isBlocked(pt: Point): boolean {
    return zones.some(z => {
      const blocksThis = z.type === 'no_both' || z.type === `no_${kind}`
      if (!blocksThis) return false
      return pointInPolygon(pt.x, pt.y, z.polygon)
    })
  }

  function pointInPolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y
      if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }

  const filtered = points.filter(p => filterCat === 'all' || p.categoryId === filterCat)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 pb-0">
        <div className="flex gap-1 mb-4">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-accent' : 'bg-border'}`} />
          ))}
        </div>
        <h2 className="text-foreground text-lg font-bold">{title}</h2>
        <p className="text-muted text-sm mb-3">{subtitle}</p>
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilterCat('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-accent text-background' : 'bg-surface2 text-muted'}`}
          >
            Все
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === c.id ? 'bg-accent text-background' : 'bg-surface2 text-muted'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {/* Points list */}
      <div className="flex-1 overflow-y-auto p-4 pt-2 flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-muted text-sm text-center py-6">Нет точек в этой категории</p>}
        {filtered.map(pt => {
          const blocked = isBlocked(pt)
          return (
            <button
              key={pt.id}
              disabled={blocked}
              onClick={() => onSelect(pt)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                blocked ? 'border-border bg-surface opacity-40 cursor-not-allowed' : 'border-border bg-surface2 hover:border-accent active:scale-95'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${blocked ? 'bg-negative/20' : 'bg-accent/10'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={blocked ? 'text-negative' : 'text-accent'}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{pt.name}</p>
                {blocked && <p className="text-negative text-xs mt-0.5">{kind === 'from' ? 'Отсюда нельзя' : 'Сюда нельзя'}</p>}
              </div>
              {!blocked && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-muted flex-shrink-0">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>
      <div className="p-4 pt-0">
        <button onClick={onBack} className="w-full py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
      </div>
    </div>
  )
}
