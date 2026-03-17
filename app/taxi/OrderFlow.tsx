'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { VKUser } from './TaxiApp'
import { ShiftGate } from './ShiftGate'

// ─── Types ─────────────────────────────────────────────────────
type Point = { id: string; categoryId: string; name: string; x: number; y: number; basePrice?: number }
type Category = { id: string; name: string }
type Zone = { id: string; type: 'no_from' | 'no_to' | 'no_both'; label: string; polygon: { x: number; y: number }[] }
type TaxiConfig = {
  pricePerPixel: number; peakMultiplier: number; peakStart: number; peakEnd: number
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
  const [step, setStep]             = useState<OrderStep>(user.role === 'rs' ? 'shift_rs_check' : 'nick')
  const [map, setMap]               = useState<MapData | null>(null)
  const [order, setOrder]           = useState<OrderState>({
    nick: user.nick || '', passengers: '', from: null, to: null,
    promo: '', promoValid: null, promoMsg: '', payment: 'cash', finalPrice: 0,
    orderId: '', orderNum: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const confirmCanvasRef            = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch('/api/taxi-config').then(r => r.json()).then(d => d.ok && setMap(d.data))
  }, [])

  // ── Helpers ────────────────────────────────────────────────
  function calcPrice(from: Point, to: Point, cfg: TaxiConfig): number {
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const base = dist * (cfg.pricePerPixel || 0.5)
    const hour = new Date().getHours()
    const peak = hour >= cfg.peakStart && hour < cfg.peakEnd ? cfg.peakMultiplier : 1
    return Math.max(cfg.minPrice || 50, Math.round(base * peak))
  }

  function applyPaymentFee(base: number, method: 'cash' | 'phone' | 'bank'): number {
    if (method === 'phone') return Math.round(base * 1.07)
    if (method === 'bank')  return Math.round(base * 1.05)
    return base
  }

  // Draw confirmation map snapshot
  const drawConfirmMap = useCallback(() => {
    const canvas = confirmCanvasRef.current
    if (!canvas || !map?.config.mapImageUrl || !order.from || !order.to) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      // Zones
      for (const z of map.zones) {
        if (z.polygon.length < 3) continue
        ctx.beginPath()
        ctx.moveTo(z.polygon[0].x, z.polygon[0].y)
        z.polygon.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
        ctx.closePath()
        ctx.fillStyle = z.type === 'no_from' ? 'rgba(239,68,68,0.25)'
          : z.type === 'no_to' ? 'rgba(234,179,8,0.25)' : 'rgba(107,114,128,0.3)'
        ctx.fill()
      }
      // Route line
      ctx.beginPath()
      ctx.moveTo(order.from!.x, order.from!.y)
      ctx.lineTo(order.to!.x, order.to!.y)
      ctx.strokeStyle = 'rgba(245,197,24,0.7)'
      ctx.lineWidth = 4
      ctx.setLineDash([12, 8])
      ctx.stroke()
      ctx.setLineDash([])
      // Markers
      const drawPin = (pt: Point, label: string, color: string) => {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.font = 'bold 16px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'
        ctx.fillText(label, pt.x, pt.y)
      }
      drawPin(order.from!, 'A', '#22c55e')
      drawPin(order.to!,   'B', '#ef4444')
    }
    img.src = map.config.mapImageUrl!
  }, [map, order.from, order.to])

  useEffect(() => {
    if (step === 'confirm' || step === 'promo') drawConfirmMap()
  }, [step, drawConfirmMap])

  // ── Steps ───────────────────────────────────────────────────
  if (step === 'shift_rs_check') {
    return <ShiftGate user={user} onProceed={() => setStep('nick')} />
  }

  const allPoints = map?.points || []
  const zones     = map?.zones  || []

  return (
    <div className="flex flex-col h-full">

      {/* Nick */}
      {step === 'nick' && (
        <StepShell title="Ваш никнейм" step={1} total={5}>
          <p className="text-muted text-sm mb-4">Введите ваш игровой никнейм</p>
          <input
            id="nick-input"
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
            const inp = document.getElementById('nick-input') as HTMLInputElement
            const v = inp?.value.trim() || ''
            if (v) { setOrder(o => ({ ...o, nick: v })); setStep('passengers') }
          }} />
        </StepShell>
      )}

      {/* Passengers */}
      {step === 'passengers' && (
        <StepShell title="Попутчики" step={2} total={5}>
          <p className="text-muted text-sm mb-4">Добавьте попутчиков (до 2), или пропустите</p>
          <input
            id="passengers-input"
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-accent placeholder:text-muted"
            placeholder="Ник1, Ник2 (через запятую)"
            defaultValue={order.passengers}
          />
          <div className="flex gap-3 mt-2">
            <button onClick={() => setStep('nick')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button onClick={() => {
              const inp = document.getElementById('passengers-input') as HTMLInputElement
              setOrder(o => ({ ...o, passengers: inp?.value.trim() || '' }))
              setStep('pick_from')
            }} className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm">Далее</button>
          </div>
          <button onClick={() => { setOrder(o => ({ ...o, passengers: '' })); setStep('pick_from') }} className="w-full mt-2 py-2 text-muted text-xs">Пропустить</button>
        </StepShell>
      )}

      {/* Pick FROM — interactive map */}
      {step === 'pick_from' && (
        <MapPickStep
          title="Откуда"
          hint='Нажмите на точку отправления'
          step={3}
          total={5}
          mapData={map}
          kind="from"
          fromPoint={order.from}
          toPoint={order.to}
          onSelect={(pt) => {
            if (!map) return
            const price = order.to ? calcPrice(pt, order.to, map.config) : 0
            setOrder(o => ({ ...o, from: pt, finalPrice: price }))
            setStep('pick_to')
          }}
          onBack={() => setStep('passengers')}
        />
      )}

      {/* Pick TO — interactive map */}
      {step === 'pick_to' && (
        <MapPickStep
          title="Куда"
          hint='Нажмите на точку назначения'
          step={4}
          total={5}
          mapData={map}
          kind="to"
          fromPoint={order.from}
          toPoint={order.to}
          onSelect={(pt) => {
            if (!map || !order.from) return
            const price = calcPrice(order.from, pt, map.config)
            setOrder(o => ({ ...o, to: pt, finalPrice: price }))
            setStep('payment')
          }}
          onBack={() => setStep('pick_from')}
        />
      )}

      {/* Payment */}
      {step === 'payment' && (
        <StepShell title="Оплата" step={4} total={5}>
          {order.from && order.to && (
            <div className="bg-surface2 rounded-xl px-4 py-3 mb-4 flex justify-between text-sm">
              <div>
                <p className="text-muted text-xs mb-0.5">Маршрут</p>
                <p className="text-foreground font-medium">{order.from.name} → {order.to.name}</p>
              </div>
              <div className="text-right">
                <p className="text-muted text-xs mb-0.5">Цена</p>
                <p className="text-accent font-bold">{order.finalPrice}р.</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 mb-4">
            {(['cash', 'phone', 'bank'] as const).map(m => (
              <button
                key={m}
                onClick={() => setOrder(o => ({
                  ...o,
                  payment: m,
                  finalPrice: applyPaymentFee(map && o.from && o.to ? calcPrice(o.from, o.to, map.config) : 0, m)
                }))}
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
            <button onClick={() => setStep('pick_to')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button onClick={() => setStep('confirm')} className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm">Далее</button>
          </div>
        </StepShell>
      )}

      {/* Confirm */}
      {step === 'confirm' && (
        <StepShell title="Подтверждение" step={5} total={5}>
          {/* Map preview */}
          {map?.config.mapImageUrl && order.from && order.to && (
            <div className="rounded-xl overflow-hidden border border-border mb-3">
              <canvas ref={confirmCanvasRef} className="w-full h-auto" style={{ maxHeight: 200 }} />
            </div>
          )}
          <div className="bg-surface2 rounded-xl divide-y divide-border mb-4">
            <Row label="Никнейм"   value={order.nick} />
            {order.passengers && <Row label="Попутчики" value={order.passengers} />}
            <Row label="Откуда"    value={order.from?.name || '—'} />
            <Row label="Куда"      value={order.to?.name || '—'} />
            <Row label="Оплата"    value={PAYMENT_LABELS[order.payment]} />
            {order.promo && <Row label="Промокод" value={order.promo} />}
            <Row label="Стоимость" value={`${order.finalPrice}р.`} highlight />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('payment')} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
            <button
              disabled={submitting}
              onClick={async () => {
                if (!order.from || !order.to) return
                setSubmitting(true)
                try {
                  let snapshotUrl: string | null = null
                  if (confirmCanvasRef.current) snapshotUrl = confirmCanvasRef.current.toDataURL('image/png')
                  const r = await fetch('/api/taxi-order-submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vkUserId: user.id, nick: order.nick,
                      passengers: order.passengers ? order.passengers.split(',').map(s => s.trim()) : [],
                      from: order.from, to: order.to, promo: order.promo || null,
                      payment: order.payment, finalPrice: order.finalPrice,
                      mapSnapshotUrl: snapshotUrl,
                    }),
                  })
                  const d = await r.json()
                  if (d.ok) {
                    setOrder(o => ({ ...o, orderId: d.orderId, orderNum: d.orderNum }))
                    setStep('submitted')
                  }
                } finally { setSubmitting(false) }
              }}
              className="flex-1 py-3 bg-accent text-background font-bold rounded-xl text-sm disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Подтвердить'}
            </button>
          </div>
        </StepShell>
      )}

      {/* Submitted */}
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

// ─── MapPickStep — interactive map to tap a point ────────────────
interface MapPickStepProps {
  title: string
  hint: string
  step: number
  total: number
  mapData: MapData | null
  kind: 'from' | 'to'
  fromPoint: Point | null
  toPoint: Point | null
  onSelect: (pt: Point) => void
  onBack: () => void
}

function pointInPolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function MapPickStep({ title, hint, step, total, mapData, kind, fromPoint, toPoint, onSelect, onBack }: MapPickStepProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)
  const imgRef      = useRef<HTMLImageElement | null>(null)
  const imgLoadedRef = useRef(false)
  const [hoveredPt, setHoveredPt] = useState<Point | null>(null)
  const [tooltip, setTooltip]     = useState<{ x: number; y: number; name: string } | null>(null)

  const points = mapData?.points || []
  const zones  = mapData?.zones  || []
  const cfg    = mapData?.config

  function isBlocked(pt: Point): boolean {
    return zones.some(z => {
      const blocksThis = z.type === 'no_both' || z.type === `no_${kind}`
      if (!blocksThis) return false
      return pointInPolygon(pt.x, pt.y, z.polygon)
    })
  }

  // Convert canvas pixel coords → map coords
  function canvasToMap(cx: number, cy: number): { x: number; y: number } {
    const canvas = canvasRef.current
    if (!canvas) return { x: cx, y: cy }
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    return { x: cx * scaleX, y: cy * scaleY }
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img || !imgLoadedRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    // Zones overlay
    for (const z of zones) {
      if (z.polygon.length < 3) continue
      ctx.beginPath()
      ctx.moveTo(z.polygon[0].x, z.polygon[0].y)
      z.polygon.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fillStyle = z.type === 'no_from' ? 'rgba(239,68,68,0.2)'
        : z.type === 'no_to' ? 'rgba(234,179,8,0.2)' : 'rgba(107,114,128,0.25)'
      ctx.fill()
    }

    // Route line if both selected
    if (fromPoint && toPoint) {
      ctx.beginPath()
      ctx.moveTo(fromPoint.x, fromPoint.y)
      ctx.lineTo(toPoint.x, toPoint.y)
      ctx.strokeStyle = 'rgba(245,197,24,0.6)'
      ctx.lineWidth = 4
      ctx.setLineDash([12, 8])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw all points
    for (const pt of points) {
      const blocked  = isBlocked(pt)
      const isFrom   = fromPoint?.id === pt.id
      const isTo     = toPoint?.id   === pt.id
      const isHover  = hoveredPt?.id === pt.id
      const r        = isHover ? 14 : 10

      ctx.beginPath()
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
      ctx.fillStyle = blocked ? 'rgba(107,114,128,0.4)'
        : isFrom   ? '#22c55e'
        : isTo     ? '#ef4444'
        : isHover  ? '#f5c518'
        : 'rgba(245,197,24,0.75)'
      ctx.fill()
      ctx.strokeStyle = blocked ? '#6b7280' : isHover ? '#fff' : 'rgba(255,255,255,0.6)'
      ctx.lineWidth   = isHover ? 2.5 : 1.5
      ctx.stroke()

      // Label for selected
      if (isFrom || isTo) {
        ctx.font          = 'bold 12px Inter, sans-serif'
        ctx.textAlign     = 'center'
        ctx.textBaseline  = 'middle'
        ctx.fillStyle     = '#fff'
        ctx.fillText(isFrom ? 'A' : 'B', pt.x, pt.y)
      }
    }
  }, [points, zones, fromPoint, toPoint, hoveredPt])

  // Load image — use mapImageUrl or fallback to /tools/taxi-map.jpg
  useEffect(() => {
    const url = cfg?.mapImageUrl || '/tools/taxi-map.jpg'
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
      }
      imgRef.current       = img
      imgLoadedRef.current = true
      redraw()
    }
    img.onerror = () => {
      // Couldn't load image — show fallback list
      imgLoadedRef.current = false
      imgRef.current       = null
      redraw()
    }
    img.src = url
  }, [cfg?.mapImageUrl])

  useEffect(() => { redraw() }, [redraw])

  // Find nearest point to tap
  function findNearestPoint(mx: number, my: number): Point | null {
    let best: Point | null = null
    let bestDist = Infinity
    const HIT_RADIUS = 48 // pixels on the canvas — larger for finger taps
    for (const pt of points) {
      const d = Math.hypot(pt.x - mx, pt.y - my)
      if (d < HIT_RADIUS && d < bestDist) { best = pt; bestDist = d }
    }
    return best
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const { x: mx, y: my } = canvasToMap(e.clientX - rect.left, e.clientY - rect.top)
    const pt = findNearestPoint(mx, my)
    setHoveredPt(pt)

    if (pt) {
      // Show tooltip relative to wrapper
      const wrapRect = wrapRef.current?.getBoundingClientRect()
      if (wrapRect) {
        const canvas  = canvasRef.current!
        const cRect   = canvas.getBoundingClientRect()
        const scaleX  = cRect.width  / canvas.width
        const scaleY  = cRect.height / canvas.height
        setTooltip({
          x: cRect.left - wrapRect.left + pt.x * scaleX,
          y: cRect.top  - wrapRect.top  + pt.y * scaleY - 36,
          name: pt.name,
        })
      }
    } else {
      setTooltip(null)
    }
  }

  function handlePointerLeave() { setHoveredPt(null); setTooltip(null) }

  function handleTap(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const { x: mx, y: my } = canvasToMap(e.clientX - rect.left, e.clientY - rect.top)
    const pt = findNearestPoint(mx, my)
    if (!pt) return
    if (isBlocked(pt)) return
    // Don't allow picking the same point for both from/to
    if (kind === 'to' && fromPoint?.id === pt.id) return
    onSelect(pt)
  }

  const noMapImage = !imgLoadedRef.current

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex gap-1 mb-3">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-accent' : 'bg-border'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-lg font-bold">{title}</h2>
            <p className="text-muted text-xs mt-0.5">{hint}</p>
          </div>
          {/* Selected label */}
          {kind === 'from' && fromPoint && (
            <div className="flex items-center gap-1.5 bg-surface2 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-positive" />
              <span className="text-foreground text-xs font-medium truncate max-w-[120px]">{fromPoint.name}</span>
            </div>
          )}
          {kind === 'to' && toPoint && (
            <div className="flex items-center gap-1.5 bg-surface2 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-negative" />
              <span className="text-foreground text-xs font-medium truncate max-w-[120px]">{toPoint.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Map canvas */}
      <div ref={wrapRef} className="flex-1 relative overflow-hidden mx-4 mb-2 rounded-xl border border-border bg-surface2">
        {noMapImage ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-6 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-muted">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7M9 20l6-3M9 20V7M15 17l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9M15 17V9M9 7l6-3M15 9l-6-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-muted text-sm">Карта ещё не загружена.<br/>Попробуйте выбрать из списка ниже.</p>
            {/* Fallback list */}
            <div className="w-full mt-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
              {points.filter(p => !isBlocked(p) && (kind === 'from' || fromPoint?.id !== p.id)).map(pt => (
                <button key={pt.id} onClick={() => onSelect(pt)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface text-left hover:border-accent transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${kind === 'from' ? 'bg-positive' : 'bg-negative'}`} />
                  <span className="text-foreground text-sm font-medium">{pt.name}</span>
                </button>
              ))}
              {points.length === 0 && <p className="text-muted text-sm">Нет доступных точек</p>}
            </div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain cursor-crosshair touch-none"
              style={{ display: 'block' }}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onPointerUp={handleTap}
            />
            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute pointer-events-none bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground text-xs font-medium shadow-lg whitespace-nowrap"
                style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
              >
                {tooltip.name}
              </div>
            )}
            {/* Legend */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 bg-black/50 rounded-md px-2 py-1 backdrop-blur-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-positive" />
                <span className="text-white text-xs">Откуда</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/50 rounded-md px-2 py-1 backdrop-blur-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-negative" />
                <span className="text-white text-xs">Куда</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hovered point info + back button */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {hoveredPt && !isBlocked(hoveredPt) && (
          <div className="bg-surface2 border border-accent/40 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">{hoveredPt.name}</span>
            <span className="text-muted text-xs">{kind === 'from' ? 'Нажмите чтобы выбрать откуда' : 'Нажмите чтобы выбрать куда'}</span>
          </div>
        )}
        {hoveredPt && isBlocked(hoveredPt) && (
          <div className="bg-surface2 border border-negative/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-negative flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span className="text-negative text-sm">{hoveredPt.name} — {kind === 'from' ? 'отсюда нельзя' : 'сюда нельзя'}</span>
          </div>
        )}
        <button onClick={onBack} className="w-full py-3 border border-border rounded-xl text-muted text-sm">Назад</button>
      </div>
    </div>
  )
}

// ─── Shared components ───────────────────────────────────────────
function StepShell({ title, step, total, children }: { title: string; step: number; total: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col p-4 gap-4 max-w-lg mx-auto w-full pt-6">
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
