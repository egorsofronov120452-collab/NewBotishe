// TAXI DISABLED
// import type { Metadata, Viewport } from 'next'
// import TaxiApp from './TaxiApp'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Такси — временно недоступно',
}

export default function TaxiPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background font-sans px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-3">Такси временно недоступно</h1>
        <p className="text-muted text-sm">Сервис такси приостановлен. Следите за обновлениями.</p>
      </div>
    </main>
  )
}
