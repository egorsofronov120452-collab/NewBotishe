'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface TaxiPoint {
  id: string
  name: string
  categoryId: string
  basePrice: number
  x?: number
  y?: number
}

interface TaxiCategory {
  id: string
  name: string
}

type Step = 'from' | 'to' | 'confirm' | 'done'

export default function TaxiOrderClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mapImgRef = useRef<HTMLImageElement | null>(null)

  const [step, setStep] = useState<Step>('from')
  const [fromPoint, setFromPoint] = useState<TaxiPoint | null>(null)
  const [toPoint, setToPoint] = useState<TaxiPoint | null>(null)
  const [categories, setCategories] = useState<TaxiCategory[]>([])
  const [points, setPoints] = useState<TaxiPoint[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Pan/zoom state
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 })
  const panRef = useRef({ active: false, lastX: 0, lastY: 0, moved: false })

  // Load categories, points and map
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/taxi-points')
        const json = await res.json()
        setCategories(json.categories || [])
        setPoints(json.points || [])

        if (json.mapImageUrl) {
          setMapImageUrl(json.mapImageUrl)
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            mapImgRef.current = img
            // Fit to screen
            const canvas = canvasRef.current
            if (canvas) {
              const scaleX = canvas.width / img.width
              const scaleY = canvas.height / img.height
              const scale = Math.min(scaleX, scaleY) * 0.95
              viewRef.current.zoom = scale
              viewRef.current.panX = (canvas.width - img.width * scale) / 2
              viewRef.current.panY = (canvas.height - img.height * scale) / 2
            }
            setMapLoaded(true)
          }
          img.onerror = () => setMapLoaded(true)
          img.src = json.mapImageUrl
        } else {
          setMapLoaded(true)
        }
      } catch {
        setMapLoaded(true)
      }
    }
    loadData()
  }, [])

  // Coordinate transforms
  const w2s = useCallback((wx: number, wy: number) => {
    const { zoom, panX, panY } = viewRef.current
    return { x: wx * zoom + panX, y: wy * zoom + panY }
  }, [])

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { zoom, panX, panY } = viewRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Subtle grid
    const gridStep = 60 * zoom
    if (gridStep > 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = panX % gridStep; x < canvas.width; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = panY % gridStep; y < canvas.height; y += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
    }

    // Map image
    if (mapImgRef.current) {
      ctx.globalAlpha = 0.92
      ctx.drawImage(
        mapImgRef.current,
        panX, panY,
        mapImgRef.current.width * zoom,
        mapImgRef.current.height * zoom
      )
      ctx.globalAlpha = 1
    }

    // Draw all points as dots
    for (const pt of points) {
      if (pt.x === undefined || pt.y === undefined) continue
      const { x: sx, y: sy } = w2s(pt.x, pt.y)
      const isFrom = fromPoint?.id === pt.id
      const isTo = toPoint?.id === pt.id

      if (isFrom || isTo) continue // drawn separately below

      ctx.beginPath()
      ctx.arc(sx, sy, 5 * Math.min(zoom, 2), 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(124, 140, 255, 0.7)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()

      if (zoom > 0.6) {
        ctx.font = `${Math.max(9, 10 * zoom)}px system-ui`
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(pt.name, sx, sy - 6 * zoom)
      }
    }

    // Draw straight-line route
    if (fromPoint?.x !== undefined && fromPoint?.y !== undefined &&
        toPoint?.x !== undefined && toPoint?.y !== undefined) {
      const from = w2s(fromPoint.x, fromPoint.y)
      const to = w2s(toPoint.x, toPoint.y)

      // Dashed line
      ctx.strokeStyle = '#7c8cff'
      ctx.lineWidth = 3
      ctx.setLineDash([10 * Math.min(zoom, 2), 6 * Math.min(zoom, 2)])
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw FROM point
    if (fromPoint?.x !== undefined && fromPoint?.y !== undefined) {
      const { x: sx, y: sy } = w2s(fromPoint.x, fromPoint.y)
      ctx.shadowColor = '#22c55e'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(sx, sy, 14, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.font = 'bold 12px system-ui'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('A', sx, sy)
    }

    // Draw TO point
    if (toPoint?.x !== undefined && toPoint?.y !== undefined) {
      const { x: sx, y: sy } = w2s(toPoint.x, toPoint.y)
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(sx, sy, 14, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.font = 'bold 12px system-ui'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('B', sx, sy)
    }
  }, [fromPoint, toPoint, points, w2s])

  useEffect(() => { draw() }, [draw])

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      // Re-fit map on resize
      if (mapImgRef.current) {
        const img = mapImgRef.current
        const scaleX = canvas.width / img.width
        const scaleY = canvas.height / img.height
        const scale = Math.min(scaleX, scaleY) * 0.95
        viewRef.current.zoom = scale
        viewRef.current.panX = (canvas.width - img.width * scale) / 2
        viewRef.current.panY = (canvas.height - img.height * scale) / 2
      }
      draw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [draw])

  // Pan interactions
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false }
  }
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!panRef.current.active) return
    const dx = e.clientX - panRef.current.lastX
    const dy = e.clientY - panRef.current.lastY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panRef.current.moved = true
    viewRef.current.panX += dx
    viewRef.current.panY += dy
    panRef.current.lastX = e.clientX
    panRef.current.lastY = e.clientY
    draw()
  }
  function handleMouseUp() { panRef.current.active = false }

  // Touch pan
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }
  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x
      const dy = e.touches[0].clientY - lastTouchRef.current.y
      viewRef.current.panX += dx
      viewRef.current.panY += dy
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      draw()
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    const v = viewRef.current
    v.panX = sx - (sx - v.panX) * factor
    v.panY = sy - (sy - v.panY) * factor
    v.zoom = Math.max(0.05, Math.min(15, v.zoom * factor))
    draw()
  }

  // Select a point
  function selectPoint(pt: TaxiPoint) {
    if (step === 'from') {
      setFromPoint(pt)
      setSelectedCategory(null)
      setStep('to')
    } else if (step === 'to') {
      setToPoint(pt)
      setSelectedCategory(null)
      setStep('confirm')
    }
  }

  function handleReset() {
    setFromPoint(null)
    setToPoint(null)
    setStep('from')
    setStatus('idle')
    setErrorMsg('')
    setSelectedCategory(null)
  }

  // Calculate price (straight-line distance)
  function calculatePrice(from: TaxiPoint, to: TaxiPoint): number {
    if (from.x !== undefined && to.x !== undefined &&
        from.y !== undefined && to.y !== undefined) {
      const dist = Math.hypot(to.x - from.x, to.y - from.y)
      const base = Math.round(dist * 0.5) // 0.5р per pixel unit
      const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })).getHours()
      const peak = (hour >= 18 && hour <= 22) ? 1.3 : 1.0
      return Math.max(50, Math.round(base * peak))
    }
    return Math.round(((from.basePrice || 100) + (to.basePrice || 100)) / 2)
  }

  // Generate route image
  async function generateRouteImage(): Promise<string | null> {
    if (!fromPoint || !toPoint) return null
    const canvas = document.createElement('canvas')
    const size = 600
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, size, size)

    if (mapImgRef.current && fromPoint.x !== undefined && toPoint.x !== undefined) {
      const img = mapImgRef.current
      const padding = 100
      const minX = Math.min(fromPoint.x, toPoint.x) - padding
      const minY = Math.min(fromPoint.y, toPoint.y) - padding
      const maxX = Math.max(fromPoint.x, toPoint.x) + padding
      const maxY = Math.max(fromPoint.y, toPoint.y) + padding
      const routeW = maxX - minX || 200
      const routeH = maxY - minY || 200
      const scale = Math.min(size / routeW, size / routeH) * 0.88
      const offsetX = (size - routeW * scale) / 2 - minX * scale
      const offsetY = (size - routeH * scale) / 2 - minY * scale

      ctx.globalAlpha = 0.85
      ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale)
      ctx.globalAlpha = 1

      const fsx = fromPoint.x * scale + offsetX
      const fsy = fromPoint.y * scale + offsetY
      const tsx = toPoint.x * scale + offsetX
      const tsy = toPoint.y * scale + offsetY

      ctx.strokeStyle = '#7c8cff'
      ctx.lineWidth = 4
      ctx.setLineDash([12, 6])
      ctx.beginPath(); ctx.moveTo(fsx, fsy); ctx.lineTo(tsx, tsy); ctx.stroke()
      ctx.setLineDash([])

      for (const [cx, cy, color, label] of [[fsx, fsy, '#22c55e', 'A'], [tsx, tsy, '#ef4444', 'B']] as [number, number, string, string][]) {
        ctx.shadowColor = color; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2)
        ctx.fillStyle = color; ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke()
        ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(label, cx, cy)
      }
    }

    const price = calculatePrice(fromPoint, toPoint)
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath(); ctx.roundRect(14, 14, 220, 54, 8); ctx.fill()
    ctx.font = '11px system-ui'; ctx.fillStyle = '#7c8cff'
    ctx.textAlign = 'left'; ctx.fillText('Kaskad Taxi', 24, 33)
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#fff'
    ctx.fillText(`${fromPoint.name} → ${toPoint.name}`, 24, 52)
    ctx.fillText(`Стоимость: ~${price}р.`, 24, 68)

    return canvas.toDataURL('image/png')
  }

  async function handleConfirm() {
    if (!fromPoint || !toPoint || !token) return
    setStatus('sending')
    setErrorMsg('')
    try {
      const routeImage = await generateRouteImage()
      const price = calculatePrice(fromPoint, toPoint)

      const res = await fetch('/api/taxi-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          from: { ...fromPoint },
          to: { ...toPoint },
          price,
          routeImage,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error')
      setStep('done')
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setErrorMsg(String(e))
    }
  }

  const price = fromPoint && toPoint ? calculatePrice(fromPoint, toPoint) : null

  const filteredPoints = selectedCategory
    ? points.filter(p => p.categoryId === selectedCategory)
    : []

  const stepLabel = {
    from: 'Шаг 1 из 2 — Откуда едете?',
    to: 'Шаг 2 из 2 — Куда едете?',
    confirm: 'Подтверждение заказа',
    done: 'Заказ отправлен',
  }[step]

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>

      {/* Map area */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onContextMenu={e => e.preventDefault()}
          onWheel={handleWheel}
          aria-label="Карта маршрута"
        />

        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 pb-6"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }}
        >
          <div>
            <div className="text-sm font-bold" style={{ color: '#7c8cff' }}>Kaskad Taxi</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{stepLabel}</div>
          </div>
          {/* Zoom controls */}
          <div className="flex gap-2" style={{ pointerEvents: 'all' }}>
            <button
              onClick={() => { const v = viewRef.current; v.zoom = Math.min(15, v.zoom * 1.25); draw() }}
              className="w-9 h-9 rounded-lg font-bold text-base flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              aria-label="Приблизить"
            >+</button>
            <button
              onClick={() => { if (mapImgRef.current) { const canvas = canvasRef.current!; const img = mapImgRef.current; const s = Math.min(canvas.width/img.width, canvas.height/img.height)*0.95; viewRef.current = { zoom: s, panX: (canvas.width - img.width*s)/2, panY: (canvas.height - img.height*s)/2 }; } else viewRef.current = { zoom: 1, panX: 0, panY: 0 }; draw() }}
              className="w-9 h-9 rounded-lg text-sm flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              aria-label="Сбросить масштаб"
            >~</button>
            <button
              onClick={() => { const v = viewRef.current; v.zoom = Math.max(0.05, v.zoom / 1.25); draw() }}
              className="w-9 h-9 rounded-lg font-bold text-base flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              aria-label="Отдалить"
            >-</button>
          </div>
        </div>

        {/* Loading overlay */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-3" style={{ border: '3px solid transparent', borderTopColor: '#7c8cff' }} />
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Загрузка карты...</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-4"
        style={{ background: 'rgba(10,10,20,0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', maxHeight: '55vh', overflowY: 'auto' }}
      >
        {/* Route summary row */}
        {(step === 'confirm' || step === 'done') ? (
          // Confirm screen
          <div>
            <div className="mb-3">
              <div className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Маршрут</div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#fff' }}>A</div>
                <div className="text-sm font-medium" style={{ color: '#fff' }}>{fromPoint?.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#ef4444', color: '#fff' }}>B</div>
                <div className="text-sm font-medium" style={{ color: '#fff' }}>{toPoint?.name}</div>
              </div>
            </div>

            {price !== null && (
              <div className="rounded-xl p-3 mb-3 flex items-center justify-between" style={{ background: 'rgba(124,140,255,0.12)', border: '1px solid rgba(124,140,255,0.25)' }}>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Стоимость (по прямой)</span>
                <span className="text-lg font-bold" style={{ color: '#7c8cff' }}>{price}р.</span>
              </div>
            )}

            {step === 'done' ? (
              <div className="rounded-xl p-3 text-center text-sm font-semibold" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#22c55e' }}>
                Заказ отправлен диспетчеру
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  Изменить
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={status === 'sending'}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: status === 'sending' ? 'rgba(124,140,255,0.5)' : '#7c8cff', color: '#fff', opacity: status === 'sending' ? 0.7 : 1 }}
                >
                  {status === 'sending' ? 'Отправка...' : 'Подтвердить'}
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center text-xs mt-2" style={{ color: '#ef4444' }}>{errorMsg}</div>
            )}
          </div>
        ) : (
          // Point selection screen
          <div>
            {/* Selected points mini-row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2" style={{ background: fromPoint ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${fromPoint ? '#22c55e' : 'rgba(255,255,255,0.08)'}` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#22c55e', color: '#fff' }}>A</span>
                <span className="text-xs truncate" style={{ color: fromPoint ? '#fff' : 'rgba(255,255,255,0.3)' }}>{fromPoint ? fromPoint.name : 'Откуда'}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>→</span>
              <div className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2" style={{ background: toPoint ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${toPoint ? '#ef4444' : 'rgba(255,255,255,0.08)'}` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#ef4444', color: '#fff' }}>B</span>
                <span className="text-xs truncate" style={{ color: toPoint ? '#fff' : 'rgba(255,255,255,0.3)' }}>{toPoint ? toPoint.name : 'Куда'}</span>
              </div>
              {(fromPoint || toPoint) && (
                <button
                  onClick={handleReset}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                  aria-label="Сбросить"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {step === 'from' ? 'Выберите точку отправления:' : 'Выберите точку назначения:'}
            </div>

            {points.length === 0 ? (
              <div className="text-center py-4 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Точки маршрута не добавлены администратором
              </div>
            ) : selectedCategory === null ? (
              // Category grid
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => {
                  const count = points.filter(p => p.categoryId === cat.id).length
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{ background: 'rgba(124,140,255,0.1)', border: '1px solid rgba(124,140,255,0.2)', color: '#fff' }}
                    >
                      <div className="text-sm font-semibold">{cat.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{count} {count === 1 ? 'точка' : count < 5 ? 'точки' : 'точек'}</div>
                    </button>
                  )
                })}
              </div>
            ) : (
              // Points list
              <div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1.5 text-xs mb-2 px-2 py-1 rounded-lg"
                  style={{ color: '#7c8cff', background: 'rgba(124,140,255,0.1)' }}
                >
                  ← {categories.find(c => c.id === selectedCategory)?.name}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {filteredPoints.map(pt => {
                    const isDisabled = step === 'to' && fromPoint?.id === pt.id
                    return (
                      <button
                        key={pt.id}
                        onClick={() => !isDisabled && selectPoint(pt)}
                        disabled={isDisabled}
                        className="rounded-xl p-3 text-left transition-all"
                        style={{
                          background: isDisabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isDisabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
                          color: isDisabled ? 'rgba(255,255,255,0.25)' : '#fff',
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >
                        <div className="text-sm font-medium leading-tight">{pt.name}</div>
                        {pt.basePrice > 0 && (
                          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>от {pt.basePrice}р.</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
