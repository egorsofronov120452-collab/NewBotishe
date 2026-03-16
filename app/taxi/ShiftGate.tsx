'use client'

import { useState, useEffect } from 'react'
import type { VKUser } from './TaxiApp'

interface ShiftGateProps {
  user: VKUser
  onProceed: () => void
}

export function ShiftGate({ user, onProceed }: ShiftGateProps) {
  const [loading, setLoading] = useState(true)
  const [onShift, setOnShift] = useState(false)
  const [drivers, setDrivers] = useState<{ nick: string; role: string }[]>([])

  useEffect(() => {
    fetch('/api/taxi-order-submit?action=shift-check')
      .then(r => r.json())
      .then(d => {
        setOnShift(d.onShift)
        setDrivers(d.drivers || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-6 text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-surface2 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M5 11L3 8H15L17 11M5 11H17M5 11V16M17 11V16M5 16H17M7 16V18M15 16V18M3 8V7H15L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"/>
          <circle cx="7" cy="16.5" r="1.5" fill="currentColor" className="text-accent"/>
          <circle cx="15" cy="16.5" r="1.5" fill="currentColor" className="text-accent"/>
        </svg>
      </div>

      {onShift ? (
        <>
          <div>
            <h2 className="text-foreground text-xl font-bold text-balance mb-2">
              Водители на смене
            </h2>
            <p className="text-muted text-sm text-balance">
              {drivers.length} {drivers.length === 1 ? 'водитель' : 'водителей'} готовы принять ваш заказ
            </p>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-2">
            {drivers.map((d, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface2 rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-positive" />
                <span className="text-foreground text-sm font-medium">{d.nick || '—'}</span>
                <span className="text-muted text-xs ml-auto uppercase">{d.role}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onProceed}
            className="w-full max-w-xs py-4 bg-accent text-background font-bold text-base rounded-2xl active:scale-95 transition-transform"
          >
            Заказать такси
          </button>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-foreground text-xl font-bold text-balance mb-2">
              Нет водителей на смене
            </h2>
            <p className="text-muted text-sm text-balance leading-relaxed">
              В данный момент нет доступных водителей. Попробуйте позже или следите за обновлениями в группе.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-surface2 rounded-xl px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-warning flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
            <p className="text-muted text-xs">Заказы принимаются только при наличии водителя</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 border border-border text-foreground text-sm rounded-xl"
          >
            Обновить
          </button>
        </>
      )}
    </div>
  )
}
