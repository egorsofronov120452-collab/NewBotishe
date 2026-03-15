import { Suspense } from 'react'
import TaxiOrderClient from './TaxiOrderClient'

export const metadata = { title: 'Выбор точки — Kaskad Taxi' }

export default function TaxiOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ color: 'var(--color-muted)' }}>
        Загрузка карты...
      </div>
    }>
      <TaxiOrderClient />
    </Suspense>
  )
}
