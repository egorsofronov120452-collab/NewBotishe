'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface Point { x: number; y: number }

type Step = 'from' | 'to' | 'confirm' | 'done'

export default function TaxiOrderClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mapImgRef = useRef<HTMLImageElement | null>(null)
  const roadMaskRef = useRef<HTMLCanvasElement | null>(null)

  const [step, setStep] = useState<Step>('from')
  const [fromPoint, setFromPoint] = useState<Point | null>(null)
  const [toPoint, setToPoint] = useState<Point | null>(null)
  const [path, setPath] = useState<Point[]>([])
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })

  // Pan/zoom state
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 })
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 })

  // Road data
  const roadDataRef = useRef<{
    radars: { id: string; x: number; y: number; width: number }[]
    trafficLights: { id: string; x: number; y: number; width: number }[]
    oneWays: { id: string; segments: { x1: number; y1: number; x2: number; y2: number }[]; direction: string }[]
  }>({ radars: [], trafficLights: [], oneWays: [] })

  // Load map and road data
  useEffect(() => {
    async function loadData() {
      try {
        // Load road data from API
        const roadRes = await fetch('/api/taxi-map')
        const roadJson = await roadRes.json()
        
        if (roadJson.ok && roadJson.data) {
          const data = roadJson.data
          roadDataRef.current = {
            radars: data.radars || [],
            trafficLights: data.trafficLights || [],
            oneWays: data.oneWays || [],
          }
          
          // Load map image
          if (data.mapImageUrl) {
            const img = new window.Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              mapImgRef.current = img
              setMapSize({ width: img.width, height: img.height })
              
              // Center map initially
              const canvas = canvasRef.current
              if (canvas) {
                viewRef.current.panX = (canvas.width - img.width) / 2
                viewRef.current.panY = (canvas.height - img.height) / 2
              }
              
              setMapLoaded(true)
            }
            img.onerror = () => {
              console.error('Failed to load map image')
              setMapLoaded(true)
            }
            img.src = data.mapImageUrl
          } else {
            setMapLoaded(true)
          }
          
          // Load road mask if exists
          if (data.roadMask) {
            const maskImg = new window.Image()
            maskImg.crossOrigin = 'anonymous'
            maskImg.onload = () => {
              const maskCanvas = document.createElement('canvas')
              maskCanvas.width = maskImg.width
              maskCanvas.height = maskImg.height
              const ctx = maskCanvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(maskImg, 0, 0)
                roadMaskRef.current = maskCanvas
              }
            }
            maskImg.src = data.roadMask
          }
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

  const s2w = useCallback((sx: number, sy: number) => {
    const { zoom, panX, panY } = viewRef.current
    return { x: (sx - panX) / zoom, y: (sy - panY) / zoom }
  }, [])

  // Check if point is on or near road
  const isOnRoad = useCallback((wx: number, wy: number): boolean => {
    if (!roadMaskRef.current) return true // Allow anywhere if no mask
    const ctx = roadMaskRef.current.getContext('2d')
    if (!ctx) return true
    
    const x = Math.round(wx)
    const y = Math.round(wy)
    if (x < 0 || y < 0 || x >= roadMaskRef.current.width || y >= roadMaskRef.current.height) {
      return false
    }
    
    // Check a small area for road
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -5; dy <= 5; dy++) {
        const px = x + dx
        const py = y + dy
        if (px >= 0 && py >= 0 && px < roadMaskRef.current.width && py < roadMaskRef.current.height) {
          const pixel = ctx.getImageData(px, py, 1, 1).data
          if (pixel[3] > 60) return true
        }
      }
    }
    return false
  }, [])

  // Snap point to nearest road
  const snapToRoad = useCallback((wx: number, wy: number): Point => {
    if (!roadMaskRef.current) return { x: wx, y: wy }
    const ctx = roadMaskRef.current.getContext('2d')
    if (!ctx) return { x: wx, y: wy }
    
    const x = Math.round(wx)
    const y = Math.round(wy)
    
    // Check if already on road
    if (x >= 0 && y >= 0 && x < roadMaskRef.current.width && y < roadMaskRef.current.height) {
      const pixel = ctx.getImageData(x, y, 1, 1).data
      if (pixel[3] > 60) return { x, y }
    }
    
    // Search in expanding squares
    for (let r = 1; r < 50; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const px = x + dx
            const py = y + dy
            if (px >= 0 && py >= 0 && px < roadMaskRef.current.width && py < roadMaskRef.current.height) {
              const pixel = ctx.getImageData(px, py, 1, 1).data
              if (pixel[3] > 60) return { x: px, y: py }
            }
          }
        }
      }
    }
    
    return { x: wx, y: wy }
  }, [])

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { zoom, panX, panY } = viewRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    const gridStep = 50 * zoom
    if (gridStep > 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = panX % gridStep; x < canvas.width; x += gridStep) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = panY % gridStep; y < canvas.height; y += gridStep) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    // Map image
    if (mapImgRef.current) {
      ctx.globalAlpha = 0.9
      ctx.drawImage(
        mapImgRef.current,
        panX,
        panY,
        mapImgRef.current.width * zoom,
        mapImgRef.current.height * zoom
      )
      ctx.globalAlpha = 1
    }

    // Road mask overlay (semi-transparent)
    if (roadMaskRef.current) {
      ctx.globalAlpha = 0.25
      ctx.drawImage(
        roadMaskRef.current,
        panX,
        panY,
        roadMaskRef.current.width * zoom,
        roadMaskRef.current.height * zoom
      )
      ctx.globalAlpha = 1
    }

    // Draw radars
    for (const radar of roadDataRef.current.radars) {
      const { x: sx, y: sy } = w2s(radar.x, radar.y)
      const size = (radar.width || 20) * zoom * 0.5
      
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)'
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      ctx.font = `bold ${Math.max(10, 12 * zoom)}px system-ui`
      ctx.fillStyle = '#f59e0b'
      ctx.textAlign = 'center'
      ctx.fillText('R', sx, sy + 4)
    }

    // Draw traffic lights
    for (const light of roadDataRef.current.trafficLights) {
      const { x: sx, y: sy } = w2s(light.x, light.y)
      const size = (light.width || 16) * zoom * 0.5
      
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      ctx.font = `bold ${Math.max(10, 12 * zoom)}px system-ui`
      ctx.fillStyle = '#22c55e'
      ctx.textAlign = 'center'
      ctx.fillText('S', sx, sy + 4)
    }

    // Draw one-way arrows
    for (const ow of roadDataRef.current.oneWays) {
      ctx.strokeStyle = 'rgba(124, 140, 255, 0.6)'
      ctx.fillStyle = 'rgba(124, 140, 255, 0.6)'
      ctx.lineWidth = 2 * zoom
      
      for (const seg of ow.segments) {
        const start = w2s(seg.x1, seg.y1)
        const end = w2s(seg.x2, seg.y2)
        
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        
        // Arrow head
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const arrowSize = 8 * zoom
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        
        ctx.beginPath()
        ctx.moveTo(midX + Math.cos(angle) * arrowSize, midY + Math.sin(angle) * arrowSize)
        ctx.lineTo(midX + Math.cos(angle + 2.5) * arrowSize * 0.6, midY + Math.sin(angle + 2.5) * arrowSize * 0.6)
        ctx.lineTo(midX + Math.cos(angle - 2.5) * arrowSize * 0.6, midY + Math.sin(angle - 2.5) * arrowSize * 0.6)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Draw path
    if (path.length > 1) {
      ctx.strokeStyle = '#7c8cff'
      ctx.lineWidth = 4 * zoom
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([10 * zoom, 6 * zoom])
      
      ctx.beginPath()
      const first = w2s(path[0].x, path[0].y)
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < path.length; i++) {
        const p = w2s(path[i].x, path[i].y)
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw FROM point (A)
    if (fromPoint) {
      const { x: sx, y: sy } = w2s(fromPoint.x, fromPoint.y)
      
      // Glow
      ctx.shadowColor = '#22c55e'
      ctx.shadowBlur = 20
      
      // Circle
      ctx.beginPath()
      ctx.arc(sx, sy, 14, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
      ctx.shadowBlur = 0
      
      // Border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.stroke()
      
      // Label
      ctx.font = 'bold 12px system-ui'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('A', sx, sy)
    }

    // Draw TO point (B)
    if (toPoint) {
      const { x: sx, y: sy } = w2s(toPoint.x, toPoint.y)
      
      // Glow
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 20
      
      // Circle
      ctx.beginPath()
      ctx.arc(sx, sy, 14, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.shadowBlur = 0
      
      // Border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.stroke()
      
      // Label
      ctx.font = 'bold 12px system-ui'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('B', sx, sy)
    }
  }, [fromPoint, toPoint, path, w2s, mapLoaded])

  useEffect(() => {
    draw()
  }, [draw])

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      draw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [draw])

  // Canvas interactions
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (step === 'done') return
    
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = s2w(sx, sy)
    
    // Snap to road
    const snapped = snapToRoad(world.x, world.y)
    
    if (step === 'from') {
      setFromPoint(snapped)
      setStep('to')
    } else if (step === 'to') {
      setToPoint(snapped)
      setStep('confirm')
      // Simple direct path for now
      if (fromPoint) {
        setPath([fromPoint, snapped])
      }
    }
    
    draw()
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button === 1 || e.button === 2) {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (panRef.current.active) {
      viewRef.current.panX += e.clientX - panRef.current.lastX
      viewRef.current.panY += e.clientY - panRef.current.lastY
      panRef.current.lastX = e.clientX
      panRef.current.lastY = e.clientY
      draw()
    }
  }

  function handleCanvasMouseUp() {
    panRef.current.active = false
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
    v.zoom = Math.max(0.1, Math.min(10, v.zoom * factor))
    draw()
  }

  // Reset selection
  function handleReset() {
    setFromPoint(null)
    setToPoint(null)
    setPath([])
    setStep('from')
    setStatus('idle')
    setErrorMsg('')
    draw()
  }

  // Generate route image as base64
  async function generateRouteImage(): Promise<string | null> {
    const canvas = document.createElement('canvas')
    const size = 600
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx || !fromPoint || !toPoint) return null

    // Calculate bounds
    const padding = 80
    const minX = Math.min(fromPoint.x, toPoint.x) - padding
    const minY = Math.min(fromPoint.y, toPoint.y) - padding
    const maxX = Math.max(fromPoint.x, toPoint.x) + padding
    const maxY = Math.max(fromPoint.y, toPoint.y) + padding
    
    const routeWidth = maxX - minX
    const routeHeight = maxY - minY
    const scale = Math.min(size / routeWidth, size / routeHeight) * 0.9
    const offsetX = (size - routeWidth * scale) / 2 - minX * scale
    const offsetY = (size - routeHeight * scale) / 2 - minY * scale

    // Background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, size, size)

    // Draw map if available
    if (mapImgRef.current) {
      ctx.globalAlpha = 0.8
      ctx.drawImage(
        mapImgRef.current,
        offsetX,
        offsetY,
        mapImgRef.current.width * scale,
        mapImgRef.current.height * scale
      )
      ctx.globalAlpha = 1
    }

    // Draw route line
    const fromSx = fromPoint.x * scale + offsetX
    const fromSy = fromPoint.y * scale + offsetY
    const toSx = toPoint.x * scale + offsetX
    const toSy = toPoint.y * scale + offsetY

    ctx.strokeStyle = '#7c8cff'
    ctx.lineWidth = 4
    ctx.setLineDash([12, 6])
    ctx.beginPath()
    ctx.moveTo(fromSx, fromSy)
    ctx.lineTo(toSx, toSy)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw FROM point
    ctx.shadowColor = '#22c55e'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(fromSx, fromSy, 20, 0, Math.PI * 2)
    ctx.fillStyle = '#22c55e'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.font = 'bold 14px system-ui'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('A', fromSx, fromSy)

    // Draw TO point
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(toSx, toSy, 20, 0, Math.PI * 2)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.font = 'bold 14px system-ui'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('B', toSx, toSy)

    // Draw info box
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath()
    ctx.roundRect(15, 15, 180, 50, 8)
    ctx.fill()
    ctx.font = '12px system-ui'
    ctx.fillStyle = '#7c8cff'
    ctx.textAlign = 'left'
    ctx.fillText('Kaskad Taxi', 25, 35)
    ctx.font = 'bold 14px system-ui'
    ctx.fillStyle = '#fff'
    const dist = Math.round(Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y))
    ctx.fillText(`Маршрут: ~${dist}px`, 25, 52)

    return canvas.toDataURL('image/png')
  }

  // Confirm and send order
  async function handleConfirm() {
    if (!fromPoint || !toPoint || !token) return
    
    setStatus('sending')
    setErrorMsg('')
    
    try {
      // Generate route image
      const routeImage = await generateRouteImage()
      
      const res = await fetch('/api/taxi-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          from: fromPoint,
          to: toPoint,
          routeImage, // Send image to server
        }),
      })
      
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error')
      
      if (data.path) {
        setPath(data.path)
      }
      
      setStep('done')
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setErrorMsg(String(e))
    }
  }

  // Step labels
  const stepInfo = {
    from: { title: 'Шаг 1/2', subtitle: 'Нажмите на карту, чтобы выбрать точку отправления (A)' },
    to: { title: 'Шаг 2/2', subtitle: 'Нажмите на карту, чтобы выбрать точку назначения (B)' },
    confirm: { title: 'Подтверждение', subtitle: 'Проверьте маршрут и подтвердите заказ' },
    done: { title: 'Готово!', subtitle: 'Маршрут отправлен. Вернитесь в бот.' },
  }

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Full screen canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onContextMenu={e => e.preventDefault()}
        onWheel={handleWheel}
        aria-label="Карта для выбора маршрута"
      />

      {/* Top bar */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}
      >
        <div>
          <div className="text-sm font-bold" style={{ color: '#7c8cff' }}>Kaskad Taxi</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {stepInfo[step].title}
          </div>
        </div>
        
        {/* Zoom controls */}
        <div className="flex gap-2">
          <button
            onClick={() => { viewRef.current.zoom = Math.min(10, viewRef.current.zoom * 1.2); draw() }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            +
          </button>
          <button
            onClick={() => { viewRef.current = { zoom: 1, panX: 0, panY: 0 }; draw() }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            ~
          </button>
          <button
            onClick={() => { viewRef.current.zoom = Math.max(0.1, viewRef.current.zoom / 1.2); draw() }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            -
          </button>
        </div>
      </div>

      {/* Bottom panel */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-4"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8), transparent)' }}
      >
        {/* Hint */}
        <div 
          className="text-center text-sm mb-4"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {stepInfo[step].subtitle}
        </div>

        {/* Route summary */}
        <div className="flex items-center gap-4 mb-4 justify-center">
          {/* From */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ 
              background: fromPoint ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${fromPoint ? '#22c55e' : 'rgba(255,255,255,0.1)'}` 
            }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#22c55e', color: '#fff' }}
            >
              A
            </div>
            <span style={{ color: fromPoint ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              {fromPoint ? `${Math.round(fromPoint.x)}, ${Math.round(fromPoint.y)}` : 'Не выбрано'}
            </span>
          </div>

          {/* Arrow */}
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>→</div>

          {/* To */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ 
              background: toPoint ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${toPoint ? '#ef4444' : 'rgba(255,255,255,0.1)'}` 
            }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              B
            </div>
            <span style={{ color: toPoint ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              {toPoint ? `${Math.round(toPoint.x)}, ${Math.round(toPoint.y)}` : 'Не выбрано'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center max-w-md mx-auto">
          {step !== 'done' && (
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{ 
                background: 'rgba(255,255,255,0.1)', 
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              Сбросить
            </button>
          )}
          
          {step === 'confirm' && (
            <button
              onClick={handleConfirm}
              disabled={status === 'sending'}
              className="flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{ 
                background: status === 'sending' ? 'rgba(124, 140, 255, 0.5)' : '#7c8cff', 
                color: '#fff',
                opacity: status === 'sending' ? 0.7 : 1
              }}
            >
              {status === 'sending' ? 'Отправка...' : 'Подтвердить маршрут'}
            </button>
          )}
          
          {step === 'done' && (
            <div 
              className="flex-1 px-6 py-3 rounded-lg text-sm font-semibold text-center"
              style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid #22c55e' }}
            >
              Маршрут отправлен в диспетчерскую
            </div>
          )}
        </div>

        {/* Error message */}
        {status === 'error' && (
          <div className="text-center text-sm mt-2" style={{ color: '#ef4444' }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <div className="text-center">
            <div 
              className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: '#7c8cff transparent transparent transparent', borderWidth: 3 }}
            />
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Загрузка карты...</div>
          </div>
        </div>
      )}

      {/* No map warning */}
      {mapLoaded && !mapImgRef.current && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center p-6 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 400 }}
        >
          <div className="text-lg font-semibold mb-2" style={{ color: '#fff' }}>
            Карта не загружена
          </div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Администратор должен загрузить карту через редактор map-editor.html
          </div>
        </div>
      )}
    </div>
  )
}
