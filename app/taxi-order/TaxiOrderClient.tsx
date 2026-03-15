'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
  color: string
  icon: string
}

interface TaxiPoint {
  id: string
  name: string
  categoryId: string
  address?: string
}

type Step = 'from' | 'to' | 'confirm' | 'done'

export default function TaxiOrderClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [step, setStep] = useState<Step>('from')
  const [categories, setCategories] = useState<Category[]>([])
  const [points, setPoints] = useState<TaxiPoint[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [fromPoint, setFromPoint] = useState<TaxiPoint | null>(null)
  const [toPoint, setToPoint] = useState<TaxiPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/taxi-points')
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories || [])
        setPoints(d.points || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Reset category filter when switching step
  function goToStep(s: Step) {
    setSelectedCategory(null)
    setStep(s)
  }

  function handleSelectPoint(pt: TaxiPoint) {
    if (step === 'from') {
      setFromPoint(pt)
      goToStep('to')
    } else if (step === 'to') {
      setToPoint(pt)
      goToStep('confirm')
    }
  }

  async function handleConfirm() {
    if (!fromPoint || !toPoint || !token) return
    setSending(true)
    setError('')
    try {
      const fromCat = categories.find(c => c.id === fromPoint.categoryId)
      const toCat   = categories.find(c => c.id === toPoint.categoryId)

      const res = await fetch('/api/taxi-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          from: {
            id: fromPoint.id,
            name: fromPoint.name,
            address: fromPoint.address || '',
            categoryId: fromPoint.categoryId,
            categoryName: fromCat?.name || '',
          },
          to: {
            id: toPoint.id,
            name: toPoint.name,
            address: toPoint.address || '',
            categoryId: toPoint.categoryId,
            categoryName: toCat?.name || '',
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Ошибка')
      setDone(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setSending(false)
    }
  }

  function handleReset() {
    setFromPoint(null)
    setToPoint(null)
    setSelectedCategory(null)
    setDone(false)
    setError('')
    setStep('from')
  }

  const filteredPoints = selectedCategory
    ? points.filter(p => p.categoryId === selectedCategory)
    : points

  const getCategoryColor = (catId: string) =>
    categories.find(c => c.id === catId)?.color || '#6b7280'

  // ---- DONE screen ----
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 font-sans" style={{ background: '#0f0f15', color: '#fff' }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>Маршрут отправлен</h1>
        <p className="text-center mb-8" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 300 }}>
          Диспетчер получил ваш заказ. Вернитесь в Telegram-бот.
        </p>
        <div
          className="w-full max-w-sm rounded-xl p-4 mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#fff' }}>A</div>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#fff' }}>{fromPoint?.name}</div>
              {fromPoint?.address && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{fromPoint.address}</div>}
            </div>
          </div>
          <div className="w-0.5 h-4 ml-4 mb-3" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: '#ef4444', color: '#fff' }}>B</div>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#fff' }}>{toPoint?.name}</div>
              {toPoint?.address && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{toPoint.address}</div>}
            </div>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Новый заказ
        </button>
      </div>
    )
  }

  // ---- CONFIRM screen ----
  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex flex-col font-sans" style={{ background: '#0f0f15', color: '#fff' }}>
        {/* Header */}
        <div className="px-4 pt-8 pb-4">
          <button onClick={() => goToStep('to')} className="flex items-center gap-2 text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Назад
          </button>
          <h1 className="text-2xl font-bold">Подтверждение</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Проверьте маршрут</p>
        </div>

        {/* Route card */}
        <div className="px-4 flex-1">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* FROM */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#fff' }}>A</div>
                <div className="w-0.5 flex-1 my-2" style={{ background: 'rgba(255,255,255,0.1)', minHeight: 32 }} />
              </div>
              <div className="flex-1 pb-4">
                <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Откуда</div>
                <div className="font-semibold text-base">{fromPoint?.name}</div>
                {fromPoint?.address && <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{fromPoint.address}</div>}
                <div className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: getCategoryColor(fromPoint?.categoryId || '') + '22', color: getCategoryColor(fromPoint?.categoryId || '') }}>
                  {categories.find(c => c.id === fromPoint?.categoryId)?.name}
                </div>
              </div>
            </div>

            {/* TO */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: '#ef4444', color: '#fff' }}>B</div>
              </div>
              <div className="flex-1">
                <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Куда</div>
                <div className="font-semibold text-base">{toPoint?.name}</div>
                {toPoint?.address && <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{toPoint.address}</div>}
                <div className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: getCategoryColor(toPoint?.categoryId || '') + '22', color: getCategoryColor(toPoint?.categoryId || '') }}>
                  {categories.find(c => c.id === toPoint?.categoryId)?.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-4 pb-8">
          {error && <p className="text-sm text-center mb-3" style={{ color: '#ef4444' }}>{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={sending}
            className="w-full py-4 rounded-2xl text-base font-bold transition-opacity"
            style={{ background: '#5b6ef5', color: '#fff', opacity: sending ? 0.6 : 1 }}
          >
            {sending ? 'Отправка...' : 'Подтвердить заказ'}
          </button>
        </div>
      </div>
    )
  }

  // ---- FROM / TO selection screen ----
  const isFrom = step === 'from'

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: '#0f0f15', color: '#fff' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex-shrink-0">
        {step === 'to' && (
          <button onClick={() => goToStep('from')} className="flex items-center gap-2 text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Назад
          </button>
        )}

        {/* Route progress bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#22c55e', color: '#fff' }}>A</div>
            <span className="text-sm font-medium" style={{ color: isFrom ? '#fff' : 'rgba(255,255,255,0.4)' }}>Откуда</span>
          </div>
          <div className="flex-1 h-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded transition-all" style={{ background: '#5b6ef5', width: isFrom ? '0%' : '100%' }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: isFrom ? 'rgba(239,68,68,0.2)' : '#ef4444', color: isFrom ? '#ef4444' : '#fff', border: isFrom ? '2px solid #ef4444' : 'none' }}>B</div>
            <span className="text-sm font-medium" style={{ color: isFrom ? 'rgba(255,255,255,0.35)' : '#fff' }}>Куда</span>
          </div>
        </div>

        {/* Selected FROM when on TO step */}
        {step === 'to' && fromPoint && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#fff' }}>A</div>
            <div>
              <div className="text-xs" style={{ color: '#22c55e' }}>Откуда выбрано</div>
              <div className="text-sm font-semibold">{fromPoint.name}</div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold">
          {isFrom ? 'Выберите откуда' : 'Выберите куда'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {isFrom ? 'Точка отправления' : 'Точка назначения'}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Загрузка...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && points.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <div className="text-base font-semibold mb-2">Точки не добавлены</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Администратор должен добавить точки через редактор map-editor.html
          </div>
        </div>
      )}

      {!loading && points.length > 0 && (
        <>
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="px-4 mb-3 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: selectedCategory === null ? '#5b6ef5' : 'rgba(255,255,255,0.07)',
                    color: selectedCategory === null ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: selectedCategory === null ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  Все
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: selectedCategory === cat.id ? cat.color + '33' : 'rgba(255,255,255,0.07)',
                      color: selectedCategory === cat.id ? cat.color : 'rgba(255,255,255,0.6)',
                      border: `1px solid ${selectedCategory === cat.id ? cat.color + '66' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Points list */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {filteredPoints.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Нет точек в этой категории
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredPoints.map(pt => {
                  const cat = categories.find(c => c.id === pt.categoryId)
                  const isSelected = (isFrom ? fromPoint?.id : toPoint?.id) === pt.id
                  return (
                    <button
                      key={pt.id}
                      onClick={() => handleSelectPoint(pt)}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all"
                      style={{
                        background: isSelected ? '#5b6ef522' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? '#5b6ef5' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      {/* Color dot */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: (cat?.color || '#6b7280') + '22' }}
                      >
                        {cat?.icon || '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-tight truncate" style={{ color: '#fff' }}>{pt.name}</div>
                        {pt.address && (
                          <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{pt.address}</div>
                        )}
                        {cat && (
                          <div className="text-xs mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: cat.color + '18', color: cat.color }}>
                            {cat.name}
                          </div>
                        )}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
