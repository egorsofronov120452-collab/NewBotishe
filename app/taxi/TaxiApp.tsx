'use client'

import { useState, useEffect } from 'react'
import { ShiftGate } from './ShiftGate'
import { OrderFlow } from './OrderFlow'
import { MapEditor } from './MapEditor'

export type VKUser = {
  id: number
  role: 'rs' | 'ss' | 'staff' | 'client'
  canEdit: boolean
  nick: string | null
}

type Screen = 'loading' | 'shift_gate' | 'order' | 'editor'

export default function TaxiApp() {
  const [user, setUser]       = useState<VKUser | null>(null)
  const [screen, setScreen]   = useState<Screen>('loading')
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // Parse VK launch params from URL hash/search
    const params = new URLSearchParams(
      typeof window !== 'undefined'
        ? (window.location.search || window.location.hash.replace('#', ''))
        : ''
    )
    const vkUserId = params.get('vk_user_id') || params.get('uid')

    if (!vkUserId) {
      // In development/preview — allow with a mock user id
      const devId = params.get('dev_uid') || '0'
      loadUser(devId)
      return
    }
    loadUser(vkUserId)
  }, [])

  async function loadUser(vkUserId: string) {
    try {
      const res  = await fetch(`/api/taxi-user-role?vkUserId=${vkUserId}`)
      const data = await res.json()
      const u: VKUser = {
        id: parseInt(vkUserId) || 0,
        role: data.role || 'client',
        canEdit: data.canEdit || false,
        nick: data.nick || null,
      }
      setUser(u)

      // Non-RS users: check shift immediately before showing order screen
      if (u.role !== 'rs') {
        setScreen('shift_gate')
      } else {
        setScreen('order')
      }
    } catch {
      setError('Не удалось загрузить данные. Попробуйте позже.')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 font-sans bg-background text-foreground">
        <div className="text-center">
          <p className="text-negative text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-accent text-background text-sm font-semibold rounded-lg"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'loading' || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center">
            <span className="text-background text-xs font-bold">T</span>
          </div>
          <span className="text-foreground font-semibold text-sm">Kaskad Taxi</span>
        </div>
        {user.canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setScreen('order')}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                screen === 'order'
                  ? 'bg-accent text-background'
                  : 'bg-surface2 text-muted hover:text-foreground'
              }`}
            >
              Заказ
            </button>
            <button
              onClick={() => setScreen('editor')}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                screen === 'editor'
                  ? 'bg-accent text-background'
                  : 'bg-surface2 text-muted hover:text-foreground'
              }`}
            >
              Карта
            </button>
          </div>
        )}
      </header>

      {/* Main area */}
      <main className="flex-1 overflow-y-auto">
        {screen === 'shift_gate' && (
          <ShiftGate user={user} onProceed={() => setScreen('order')} />
        )}
        {screen === 'order' && user && (
          <OrderFlow user={user} />
        )}
        {screen === 'editor' && user?.canEdit && (
          <MapEditor user={user} />
        )}
      </main>
    </div>
  )
}
