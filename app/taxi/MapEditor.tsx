'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { VKUser } from './TaxiApp'

type Point = { id: string; categoryId: string; name: string; x: number; y: number; basePrice?: number }
type Category = { id: string; name: string }
type Zone = { id: string; type: 'no_from' | 'no_to' | 'no_both'; label: string; polygon: { x: number; y: number }[] }
type TaxiConfig = {
  pricePerPixel: number; peakMultiplier: number; peakStart: number; peakEnd: number;
  minPrice: number; mapImageUrl: string | null; mapWidth: number; mapHeight: number
}
type MapData = { categories: Category[]; points: Point[]; zones: Zone[]; config: TaxiConfig }

type EditorMode = 'view' | 'zone_draw' | 'point_add' | 'settings'
type ZoneType = 'no_from' | 'no_to' | 'no_both'

interface Props { user: VKUser }

const ZONE_COLORS: Record<ZoneType, string> = {
  no_from: 'rgba(239,68,68,0.35)',
  no_to:   'rgba(234,179,8,0.35)',
  no_both: 'rgba(107,114,128,0.4)',
}
const ZONE_LABELS: Record<ZoneType, string> = {
  no_from: 'Нельзя вызвать (откуда)',
  no_to:   'Нельзя вызвать (куда)',
  no_both: 'Запрещено полностью',
}

export function MapEditor({ user }: Props) {
  const [mapData, setMapData]     = useState<MapData | null>(null)
  const [mode, setMode]           = useState<EditorMode>('view')
  const [zoneType, setZoneType]   = useState<ZoneType>('no_from')
  const [zoneLabel, setZoneLabel] = useState('')
  const [drawing, setDrawing]     = useState<{ x: number; y: number }[]>([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  // Point add form
  const [ptName, setPtName]       = useState('')
  const [ptCat, setPtCat]         = useState('')
  const [ptPrice, setPtPrice]     = useState(100)
  const [ptCoord, setPtCoord]     = useState<{ x: number; y: number } | null>(null)
  // Settings
  const [cfg, setCfg]             = useState<TaxiConfig>({ pricePerPixel: 0.5, peakMultiplier: 1.3, peakStart: 18, peakEnd: 22, minPrice: 50, mapImageUrl: null, mapWidth: 1000, mapHeight: 800 })
  const [newCatName, setNewCatName] = useState('')

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const imgRef     = useRef<HTMLImageElement | null>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/taxi-config').then(r => r.json()).then(d => {
      if (d.ok) { setMapData(d.data); setCfg(d.data.config) }
    })
  }, [])

  // ── Draw canvas ─────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background image
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#1a1d2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = '14px Inter, sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.textAlign = 'center'
      ctx.fillText('Загрузите карту', canvas.width / 2, canvas.height / 2)
    }

    if (!mapData) return

    // Draw saved zones
    for (const z of mapData.zones) {
      if (z.polygon.length < 3) continue
      ctx.beginPath()
      ctx.moveTo(z.polygon[0].x, z.polygon[0].y)
      z.polygon.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fillStyle = ZONE_COLORS[z.type]
      ctx.fill()
      ctx.strokeStyle = z.type === 'no_from' ? '#ef4444' : z.type === 'no_to' ? '#f5c518' : '#6b7280'
      ctx.lineWidth = 2
      ctx.stroke()
      // Label
      if (z.polygon.length) {
        const cx = z.polygon.reduce((a, p) => a + p.x, 0) / z.polygon.length
        const cy = z.polygon.reduce((a, p) => a + p.y, 0) / z.polygon.length
        ctx.font = '11px Inter, sans-serif'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.fillText(z.label || ZONE_LABELS[z.type], cx, cy)
      }
    }

    // Draw current drawing polygon
    if (drawing.length) {
      ctx.beginPath()
      ctx.moveTo(drawing[0].x, drawing[0].y)
      drawing.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = '#f5c518'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 4])
      ctx.stroke()
      ctx.setLineDash([])
      drawing.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#f5c518'
        ctx.fill()
      })
    }

    // Draw points
    for (const pt of mapData.points) {
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#f5c518'
      ctx.fill()
      ctx.strokeStyle = '#0f1117'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.fillStyle = '#0f1117'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pt.name.charAt(0).toUpperCase(), pt.x, pt.y)
      ctx.textBaseline = 'alphabetic'
      ctx.font = '9px Inter, sans-serif'
      ctx.fillStyle = '#e8eaf6'
      ctx.textAlign = 'center'
      ctx.fillText(pt.name, pt.x, pt.y + 16)
    }

    // Pending point coord indicator
    if (ptCoord && mode === 'point_add') {
      ctx.beginPath()
      ctx.arc(ptCoord.x, ptCoord.y, 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(245,197,24,0.4)'
      ctx.fill()
      ctx.strokeStyle = '#f5c518'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [mapData, drawing, ptCoord, mode])

  useEffect(() => {
    if (!mapData?.config.mapImageUrl) { redraw(); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgRef.current = img; redraw() }
    img.onerror = () => { imgRef.current = null; redraw() }
    img.src = mapData.config.mapImageUrl
  }, [mapData?.config.mapImageUrl, redraw])

  useEffect(() => { redraw() }, [redraw])

  // ── Canvas interactions ──────────────────────────────────────
  function getCanvasXY(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: Math.round((clientX - rect.left) * scaleX), y: Math.round((clientY - rect.top) * scaleY) }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasXY(e)
    if (mode === 'zone_draw') {
      setDrawing(d => [...d, { x, y }])
    } else if (mode === 'point_add') {
      setPtCoord({ x, y })
    }
  }

  function handleCanvasTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const { x, y } = getCanvasXY(e)
    if (mode === 'zone_draw') {
      setDrawing(d => [...d, { x, y }])
    } else if (mode === 'point_add') {
      setPtCoord({ x, y })
    }
  }

  // ── File upload ──────────────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Upload to server → saves to public/tools/taxi-map.jpg
    const fd = new FormData()
    fd.append('file', file)
    fetch('/api/taxi-map-upload', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { alert('Ошибка загрузки: ' + d.error); return }
        const url = d.url + '?t=' + Date.now() // cache-bust
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          imgRef.current = img
          const canvas = canvasRef.current!
          canvas.width  = img.naturalWidth
          canvas.height = img.naturalHeight
          if (mapData) {
            const updated: MapData = {
              ...mapData,
              config: {
                ...mapData.config,
                mapImageUrl: '/tools/taxi-map.jpg',
                mapWidth:  img.naturalWidth,
                mapHeight: img.naturalHeight,
              },
            }
            setMapData(updated)
            setCfg(updated.config)
          }
          redraw()
        }
        img.onerror = () => alert('Карта загружена на сервер, но не удалось отобразить. Попробуйте перезагрузить страницу.')
        img.src = url
      })
      .catch(err => alert('Ошибка: ' + err.message))

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  // ── Save ─────────────────────────────────────────────────────
  async function saveAll() {
    if (!mapData) return
    setSaving(true)
    try {
      await fetch('/api/taxi-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg, zones: mapData.zones, categories: mapData.categories, points: mapData.points }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // ── Zone finish ──────────────────────────────────────────────
  function finishZone() {
    if (drawing.length < 3 || !mapData) return
    const newZone: Zone = { id: crypto.randomUUID(), type: zoneType, label: zoneLabel || ZONE_LABELS[zoneType], polygon: drawing }
    setMapData(d => d ? { ...d, zones: [...d.zones, newZone] } : d)
    setDrawing([])
    setZoneLabel('')
    setMode('view')
  }

  // ── Add point ────────────────────────────────────────────────
  function confirmAddPoint() {
    if (!ptCoord || !ptName.trim() || !mapData) return
    const catId = ptCat || mapData.categories[0]?.id || 'default'
    const newPt: Point = { id: crypto.randomUUID(), categoryId: catId, name: ptName.trim(), x: ptCoord.x, y: ptCoord.y, basePrice: ptPrice }
    setMapData(d => d ? { ...d, points: [...d.points, newPt] } : d)
    setPtName(''); setPtCoord(null); setPtCat(''); setPtPrice(100)
    setMode('view')
  }

  const mapWidth  = cfg.mapWidth  || 1000
  const mapHeight = cfg.mapHeight || 800

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto no-scrollbar">
        <ToolBtn active={mode === 'view'}     onClick={() => { setMode('view'); setDrawing([]) }}     label="Вид" />
        <ToolBtn active={mode === 'zone_draw'} onClick={() => { setMode('zone_draw'); setDrawing([]) }} label="Зона" />
        <ToolBtn active={mode === 'point_add'} onClick={() => setMode('point_add')}                   label="Точка" />
        <ToolBtn active={mode === 'settings'} onClick={() => setMode('settings')}                     label="Настройки" />
        <div className="flex-1" />
        {/* Upload map */}
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-foreground text-xs font-medium"
        >
          Загрузить карту
        </button>
        <button
          onClick={() => {
            // Use already-uploaded file at /tools/taxi-map.jpg
            const url = '/tools/taxi-map.jpg?t=' + Date.now()
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              imgRef.current = img
              const canvas = canvasRef.current!
              canvas.width  = img.naturalWidth
              canvas.height = img.naturalHeight
              if (mapData) {
                const updated: MapData = {
                  ...mapData,
                  config: { ...mapData.config, mapImageUrl: '/tools/taxi-map.jpg', mapWidth: img.naturalWidth, mapHeight: img.naturalHeight },
                }
                setMapData(updated)
                setCfg(updated.config)
              }
              redraw()
            }
            img.onerror = () => alert('Файл /tools/taxi-map.jpg не найден. Используйте кнопку "Загрузить карту".')
            img.src = url
          }}
          className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-foreground text-xs font-medium"
        >
          tools/taxi-map.jpg
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-4 py-1.5 bg-accent text-background text-xs font-bold rounded-lg disabled:opacity-60"
        >
          {saved ? 'Сохранено' : saving ? '...' : 'Сохранить'}
        </button>
      </div>

      {/* Mode panel */}
      {mode === 'zone_draw' && (
        <div className="p-3 bg-surface border-b border-border flex flex-wrap gap-2 items-center">
          <span className="text-muted text-xs">Тип зоны:</span>
          {(['no_from', 'no_to', 'no_both'] as ZoneType[]).map(t => (
            <button key={t} onClick={() => setZoneType(t)}
              className={`px-2 py-1 rounded text-xs font-medium ${zoneType === t ? 'bg-accent text-background' : 'bg-surface2 text-muted'}`}>
              {ZONE_LABELS[t]}
            </button>
          ))}
          <input
            className="flex-1 min-w-24 bg-surface2 border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none"
            placeholder="Метка зоны (необязательно)"
            value={zoneLabel}
            onChange={e => setZoneLabel(e.target.value)}
          />
          <button onClick={finishZone} disabled={drawing.length < 3}
            className="px-3 py-1 bg-positive text-background text-xs font-bold rounded disabled:opacity-40">
            Завершить ({drawing.length} точек)
          </button>
          <button onClick={() => setDrawing([])} className="px-3 py-1 bg-surface2 text-muted text-xs rounded">Сброс</button>
          <p className="w-full text-muted text-xs mt-1">Кликайте по карте для добавления вершин зоны. Минимум 3 точки.</p>
        </div>
      )}

      {mode === 'point_add' && (
        <div className="p-3 bg-surface border-b border-border flex flex-wrap gap-2 items-center">
          <input value={ptName} onChange={e => setPtName(e.target.value)} placeholder="Название точки" className="flex-1 min-w-28 bg-surface2 border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none" />
          <select value={ptCat} onChange={e => setPtCat(e.target.value)} className="bg-surface2 border border-border rounded px-2 py-1 text-xs text-foreground">
            <option value="">Категория</option>
            {mapData?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" value={ptPrice} onChange={e => setPtPrice(parseInt(e.target.value) || 0)} placeholder="Цена" className="w-20 bg-surface2 border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none" />
          <button onClick={confirmAddPoint} disabled={!ptCoord || !ptName.trim()}
            className="px-3 py-1 bg-accent text-background text-xs font-bold rounded disabled:opacity-40">
            Добавить{ptCoord ? ` (${ptCoord.x}, ${ptCoord.y})` : ''}
          </button>
          <p className="w-full text-muted text-xs mt-1">Нажмите на карту, чтобы выбрать координаты точки.</p>
        </div>
      )}

      {mode === 'settings' && mapData && (
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <h3 className="text-foreground font-semibold">Настройки тарификации</h3>
          <SettingRow label="Цена за пиксель (₽)">
            <input type="number" step="0.1" value={cfg.pricePerPixel} onChange={e => setCfg(c => ({ ...c, pricePerPixel: parseFloat(e.target.value) || 0 }))} className="settings-input" />
          </SettingRow>
          <SettingRow label="Множитель час-пик">
            <input type="number" step="0.05" value={cfg.peakMultiplier} onChange={e => setCfg(c => ({ ...c, peakMultiplier: parseFloat(e.target.value) || 1 }))} className="settings-input" />
          </SettingRow>
          <SettingRow label="Час-пик с (МСК)">
            <input type="number" min="0" max="23" value={cfg.peakStart} onChange={e => setCfg(c => ({ ...c, peakStart: parseInt(e.target.value) || 0 }))} className="settings-input" />
          </SettingRow>
          <SettingRow label="Час-пик до (МСК)">
            <input type="number" min="0" max="23" value={cfg.peakEnd} onChange={e => setCfg(c => ({ ...c, peakEnd: parseInt(e.target.value) || 23 }))} className="settings-input" />
          </SettingRow>
          <SettingRow label="Мин. цена (₽)">
            <input type="number" value={cfg.minPrice} onChange={e => setCfg(c => ({ ...c, minPrice: parseInt(e.target.value) || 0 }))} className="settings-input" />
          </SettingRow>

          <h3 className="text-foreground font-semibold mt-2">Категории точек</h3>
          <div className="flex flex-col gap-2">
            {mapData.categories.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                <span className="text-foreground text-sm">{c.name}</span>
                <button onClick={() => setMapData(d => d ? { ...d, categories: d.categories.filter(x => x.id !== c.id) } : d)}
                  className="text-negative text-xs px-2 py-0.5 bg-negative/10 rounded">Удалить</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Новая категория" className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted focus:outline-none" />
            <button onClick={() => {
              if (!newCatName.trim()) return
              const cat: Category = { id: crypto.randomUUID(), name: newCatName.trim() }
              setMapData(d => d ? { ...d, categories: [...d.categories, cat] } : d)
              setNewCatName('')
            }} className="px-4 py-2 bg-accent text-background text-sm font-bold rounded-lg">+</button>
          </div>

          <h3 className="text-foreground font-semibold mt-2">Точки на карте</h3>
          <div className="flex flex-col gap-2">
            {mapData.points.map(pt => (
              <div key={pt.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                <div>
                  <p className="text-foreground text-sm">{pt.name}</p>
                  <p className="text-muted text-xs">{pt.x}, {pt.y} — {pt.basePrice || 0}₽</p>
                </div>
                <button onClick={() => setMapData(d => d ? { ...d, points: d.points.filter(p => p.id !== pt.id) } : d)}
                  className="text-negative text-xs px-2 py-0.5 bg-negative/10 rounded">Удалить</button>
              </div>
            ))}
          </div>

          <h3 className="text-foreground font-semibold mt-2">Зоны ограничений</h3>
          <div className="flex flex-col gap-2">
            {mapData.zones.map(z => (
              <div key={z.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                <div>
                  <p className="text-foreground text-sm">{z.label || ZONE_LABELS[z.type]}</p>
                  <p className="text-muted text-xs">{ZONE_LABELS[z.type]} — {z.polygon.length} вершин</p>
                </div>
                <button onClick={() => setMapData(d => d ? { ...d, zones: d.zones.filter(x => x.id !== z.id) } : d)}
                  className="text-negative text-xs px-2 py-0.5 bg-negative/10 rounded">Удалить</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canvas map */}
      {mode !== 'settings' && (
        <div ref={wrapRef} className="flex-1 overflow-auto p-2 bg-background">
          <canvas
            ref={canvasRef}
            width={mapWidth}
            height={mapHeight}
            onClick={handleCanvasClick}
            onTouchEnd={handleCanvasTouch}
            className={`rounded-xl border border-border max-w-full h-auto ${mode !== 'view' ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ display: 'block', touchAction: 'none' }}
          />
        </div>
      )}
    </div>
  )
}

function ToolBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-accent text-background' : 'bg-surface2 text-muted hover:text-foreground'}`}>
      {label}
    </button>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-muted text-sm flex-1">{label}</label>
      {children}
    </div>
  )
}
