'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface TaxiPoint {
  id: string
  name: string
  categoryId: string
  defaultPrice?: number
  x?: number
  y?: number
}

interface TaxiCategory {
  id: string
  name: string
}

type Step = 'from' | 'to'

const POINT_COLORS = ['#7c8cff', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6']

export default function TaxiOrderClient() {
  const searchParams = useSearchParams()
  const token  = searchParams.get('token') || ''
  const initStep = (searchParams.get('step') === 'to' ? 'to' : 'from') as Step

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const mapImgRef  = useRef<HTMLImageElement | null>(null)

  const [categories,  setCategories]  = useState<TaxiCategory[]>([])
  const [points,      setPoints]      = useState<TaxiPoint[]>([])
  const [filterCat,   setFilterCat]   = useState<string | null>(null)
  const [step,        setStep]        = useState<Step>(initStep)
  const [fromPoint,   setFromPoint]   = useState<TaxiPoint | null>(null)
  const [toPoint,     setToPoint]     = useState<TaxiPoint | null>(null)
  const [selected,    setSelected]    = useState<TaxiPoint | null>(null)
  const [status,      setStatus]      = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [mapLoaded,   setMapLoaded]   = useState(false)

  // pan/zoom state in a ref to avoid re-render on every mouse move
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 })
  const panRef  = useRef({ active: false, lastX: 0, lastY: 0 })

  // ── Load points ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/taxi-points')
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories || [])
        setPoints(d.points || [])
      })
      .catch(() => {})

    // Load map image from localStorage (set by map-editor)
    try {
      const raw = localStorage.getItem('taxi_map_editor_v1')
      if (raw) {
        const data = JSON.parse(raw)
        if (data.mapImageUrl) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => { mapImgRef.current = img; setMapLoaded(true) }
          img.src = data.mapImageUrl
        }
      }
    } catch {}
  }, [])

  // ── Canvas draw ─────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { zoom, panX, panY } = viewRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // BG
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    const step = 50 * zoom
    if (step > 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let x = panX % step; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = panY % step; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
    }

    // Map image
    if (mapImgRef.current) {
      ctx.globalAlpha = 0.85
      ctx.drawImage(mapImgRef.current, panX, panY, mapImgRef.current.width * zoom, mapImgRef.current.height * zoom)
      ctx.globalAlpha = 1
    }

    // Draw points
    const visible = filterCat ? points.filter(p => p.categoryId === filterCat) : points
    for (const pt of visible) {
      if (pt.x === undefined || pt.y === undefined) continue
      const sx = pt.x * zoom + panX
      const sy = pt.y * zoom + panY
      const catIdx = categories.findIndex(c => c.id === pt.categoryId)
      const color = POINT_COLORS[catIdx % POINT_COLORS.length] || '#7c8cff'

      const isFrom     = fromPoint?.id === pt.id
      const isTo       = toPoint?.id === pt.id
      const isSel      = selected?.id === pt.id
      const highlighted = isFrom || isTo || isSel
      const r = highlighted ? 11 : 7

      ctx.shadowColor = color
      ctx.shadowBlur  = highlighted ? 14 : 4

      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = isFrom ? '#22c55e' : isTo ? '#ef4444' : color
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.strokeStyle = highlighted ? '#fff' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth   = highlighted ? 2 : 1
      ctx.stroke()

      // Label
      ctx.font      = highlighted ? 'bold 12px system-ui' : '11px system-ui'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4
      ctx.fillText(pt.name, sx, sy - 16)
      ctx.shadowBlur = 0

      // Badge: A / B
      if (isFrom || isTo) {
        ctx.font = 'bold 9px system-ui'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.shadowColor = '#000'; ctx.shadowBlur = 3
        ctx.fillText(isFrom ? 'A' : 'B', sx, sy + 4)
        ctx.shadowBlur = 0
      }
    }
  }, [points, categories, filterCat, fromPoint, toPoint, selected, mapLoaded]) // eslint-disable-line

  useEffect(() => { draw() }, [draw])

  // ── Resize canvas ────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width  = canvas.parentElement!.clientWidth
      canvas.height = canvas.parentElement!.clientHeight
      draw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [draw])

  // ── Canvas interactions ──────────────────────────────────────
  function hitTest(sx: number, sy: number): TaxiPoint | null {
    const { zoom, panX, panY } = viewRef.current
    for (const pt of [...points].reverse()) {
      if (pt.x === undefined || pt.y === undefined) continue
      const px = pt.x * zoom + panX
      const py = pt.y * zoom + panY
      if (Math.hypot(sx - px, sy - py) <= 14) return pt
    }
    return null
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button === 1 || e.button === 2) {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
      return
    }
    const rect = canvasRef.current!.getBoundingClientRect()
    const hit  = hitTest(e.clientX - rect.left, e.clientY - rect.top)
    if (hit) { setSelected(hit); draw() }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (panRef.current.active) {
      viewRef.current.panX += e.clientX - panRef.current.lastX
      viewRef.current.panY += e.clientY - panRef.current.lastY
      panRef.current.lastX  = e.clientX
      panRef.current.lastY  = e.clientY
      draw()
    }
  }

  function handleCanvasMouseUp() { panRef.current.active = false }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const rect   = canvasRef.current!.getBoundingClientRect()
    const sx     = e.clientX - rect.left
    const sy     = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    const v      = viewRef.current
    v.panX = sx - (sx - v.panX) * factor
    v.panY = sy - (sy - v.panY) * factor
    v.zoom = Math.max(0.1, Math.min(10, v.zoom * factor))
    draw()
  }

  // ── Confirm pick ─────────────────────────────────────────────
  async function confirmPick() {
    if (!selected) return
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/taxi-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, step, point: selected }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'ошибка')

      if (step === 'from') {
        setFromPoint(selected)
        setSelected(null)
        setStep('to')
        setStatus('idle')
      } else {
        setToPoint(selected)
        setStatus('done')
      }
    } catch (e) {
      setStatus('error')
      setErrorMsg(String(e))
    }
  }

  const visibleCats = categories.filter(c => points.some(p => p.categoryId === c.id))

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full font-sans overflow-hidden" style={{ background: 'var(--color-background)' }}>

      {/* Sidebar */}
      <aside
        className="flex flex-col"
        style={{
          width: 280, minWidth: 280,
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>Kaskad Taxi</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {step === 'from'
              ? 'Шаг 1/2 — выберите точку отправления'
              : 'Шаг 2/2 — выберите точку назначения'}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--color-border)' }}>
          <div
            style={{
              height: '100%',
              width: step === 'from' ? '50%' : '100%',
              background: 'var(--color-accent)',
              transition: 'width .3s',
            }}
          />
        </div>

        {/* Category filter */}
        {visibleCats.length > 0 && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Категории
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterCat(null)}
                className="text-xs px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: !filterCat ? 'var(--color-accent)' : 'var(--color-border)',
                  color: !filterCat ? '#fff' : 'var(--color-foreground)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Все
              </button>
              {visibleCats.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCat(c.id)}
                  className="text-xs px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: filterCat === c.id ? POINT_COLORS[i % POINT_COLORS.length] : 'var(--color-border)',
                    color: filterCat === c.id ? '#fff' : 'var(--color-foreground)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Route summary */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <RouteRow label="A  Откуда" point={fromPoint} color="#22c55e" placeholder="не выбрано" />
          <div style={{ width: 1, height: 12, background: 'var(--color-border)', margin: '4px 0 4px 7px' }} />
          <RouteRow label="B  Куда"   point={toPoint}   color="#ef4444" placeholder="не выбрано" />
        </div>

        {/* Selected point */}
        {selected && status !== 'done' && (
          <div style={{ padding: '12px 12px 0' }}>
            <div
              className="rounded-lg p-3"
              style={{ background: '#131627', border: '1px solid var(--color-accent)' }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {selected.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {categories.find(c => c.id === selected.categoryId)?.name || '—'}
                {selected.defaultPrice ? ` · от ${selected.defaultPrice}₽` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: 12, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {status === 'done' ? (
            <div
              className="rounded-lg p-3 text-sm text-center font-semibold"
              style={{ background: '#14532d', color: '#86efac', border: '1px solid #22c55e' }}
            >
              Маршрут выбран! Вернитесь в бот.
            </div>
          ) : (
            <>
              <button
                onClick={confirmPick}
                disabled={!selected || status === 'sending'}
                className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity"
                style={{
                  background: selected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: selected ? '#fff' : 'var(--color-muted)',
                  border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
                  opacity: status === 'sending' ? 0.6 : 1,
                }}
              >
                {status === 'sending'
                  ? 'Отправка...'
                  : step === 'from'
                    ? 'Подтвердить отправление'
                    : 'Подтвердить назначение'}
              </button>
              {status === 'error' && (
                <div className="text-xs text-center" style={{ color: 'var(--color-negative)' }}>
                  {errorMsg}
                </div>
              )}
              <div className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                {selected
                  ? `Выбрано: ${selected.name}`
                  : 'Нажмите на точку на карте'}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Map canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'crosshair', width: '100%', height: '100%' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onContextMenu={e => e.preventDefault()}
          onWheel={handleWheel}
          aria-label="Карта для выбора точки"
        />

        {/* Zoom controls */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { id: 'in',    label: '+',  action: () => { viewRef.current.zoom = Math.min(10, viewRef.current.zoom * 1.2); draw() } },
            { id: 'reset', label: '⟳', action: () => { viewRef.current = { zoom: 1, panX: 0, panY: 0 }; draw() } },
            { id: 'out',   label: '−',  action: () => { viewRef.current.zoom = Math.max(0.1, viewRef.current.zoom / 1.2); draw() } },
          ].map(b => (
            <button
              key={b.id}
              onClick={b.action}
              style={{
                width: 32, height: 32,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-foreground)',
                fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label={b.label}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Hint */}
        {points.filter(p => p.x !== undefined).length === 0 && (
          <div
            style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,.75)', padding: '6px 16px', borderRadius: 20,
              fontSize: 12, color: 'var(--color-muted)', pointerEvents: 'none', whiteSpace: 'nowrap',
            }}
          >
            Точки с координатами не добавлены — добавьте в map-editor.html
          </div>
        )}
      </div>
    </div>
  )
}

function RouteRow({ label, point, color, placeholder }: { label: string; point: TaxiPoint | null; color: string; placeholder: string }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</div>
        <div className="text-sm font-semibold" style={{ color: point ? 'var(--color-foreground)' : 'var(--color-border)' }}>
          {point ? point.name : placeholder}
        </div>
      </div>
    </div>
  )
}
