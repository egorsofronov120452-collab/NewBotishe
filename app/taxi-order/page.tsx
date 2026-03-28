// TAXI DISABLED
// import { Suspense } from 'react'
// import TaxiOrderClient from './TaxiOrderClient'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Такси — временно недоступно',
}

export default function TaxiOrderPage() {
  return (
    <main className="min-h-screen flex items-center justify-center font-sans px-4" style={{ background: '#0a0a0f', color: '#fff' }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-3">Такси временно недоступно</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Сервис такси приостановлен. Следите за обновлениями.</p>
      </div>
    </main>
  )
}
